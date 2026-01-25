import { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia' as any,
  typescript: true,
});

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CreateBalancePaymentIntentRequest {
  booking_id: string;
  customer_id: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log('📝 Balance Payment Intent request received');

    // Validate required environment variables
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("Missing STRIPE_SECRET_KEY environment variable");
      return res.status(500).json({ 
        error: "Stripe configuration error",
        details: "STRIPE_SECRET_KEY is not configured"
      });
    }

    const {
      booking_id,
      customer_id,
    }: CreateBalancePaymentIntentRequest = req.body;

    // Validate required fields
    if (!booking_id || !customer_id) {
      return res.status(400).json({ 
        error: "Missing required fields",
        required: ["booking_id", "customer_id"]
      });
    }

    // Fetch booking details to get remaining balance and related info
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        customer_id,
        business_id,
        provider_id,
        booking_reference,
        booking_status,
        total_amount,
        service_fee,
        remaining_balance,
        remaining_balance_charged,
        services (
          id,
          name
        ),
        business_profiles (
          id,
          business_name
        ),
        providers (
          id,
          first_name,
          last_name
        )
      `)
      .eq('id', booking_id)
      .eq('customer_id', customer_id)
      .single();

    if (bookingError || !booking) {
      console.error('Error fetching booking:', bookingError);
      return res.status(404).json({ 
        error: "Booking not found",
        details: "The booking could not be found or you don't have access to it."
      });
    }

    // Validate booking status and remaining balance
    if (booking.booking_status !== 'completed') {
      return res.status(400).json({ 
        error: "Invalid booking status",
        details: "Balance payment is only available for completed bookings."
      });
    }

    if (booking.remaining_balance_charged) {
      return res.status(400).json({ 
        error: "Balance already paid",
        details: "The remaining balance has already been charged for this booking."
      });
    }

    const remainingBalance = parseFloat(booking.remaining_balance || '0');
    if (remainingBalance <= 0) {
      return res.status(400).json({ 
        error: "No balance due",
        details: "There is no remaining balance to pay for this booking."
      });
    }

    // Calculate amounts
    // remaining_balance = what provider charges (and receives)
    // Platform fee (20%) is added ON TOP - customer pays provider amount + platform fee
    const platformFeePercentage = 0.20;
    const platformFee = Math.round(remainingBalance * platformFeePercentage * 100); // in cents
    const totalCustomerPaysCents = Math.round(remainingBalance * 100) + platformFee; // provider amount + platform fee
    const providerAmount = remainingBalance; // Provider receives the full amount they charged

    const serviceName = (booking.services as any)?.name || 'Service';
    const businessName = (booking.business_profiles as any)?.business_name || 'Business';
    const providerName = (booking.providers as any) 
      ? `${(booking.providers as any).first_name} ${(booking.providers as any).last_name}` 
      : 'Provider';

    // Get customer details from Supabase
    const { data: customer, error: customerError } = await supabase
      .from('customer_profiles')
      .select('id, user_id, email, first_name, last_name, phone')
      .eq('id', customer_id)
      .single();

    if (customerError || !customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Get or create Stripe customer
    // IMPORTANT: Use customer.user_id (not customerId) to lookup Stripe profile
    let stripeCustomerId: string | undefined;
    
    // Check if customer already has a Stripe profile
    const { data: existingProfile } = await supabase
      .from('customer_stripe_profiles')
      .select('stripe_customer_id')
      .eq('user_id', customer.user_id)
      .single();

    if (existingProfile?.stripe_customer_id) {
      stripeCustomerId = existingProfile.stripe_customer_id;
      console.log('✅ Using existing Stripe customer for balance payment:', stripeCustomerId);
      
      // Verify customer has payment methods
      try {
        const paymentMethods = await stripe.paymentMethods.list({
          customer: stripeCustomerId,
          type: 'card',
        });
        console.log('💳 Customer has', paymentMethods.data.length, 'saved payment methods');
      } catch (error) {
        console.warn('⚠️ Could not fetch payment methods:', error);
      }
    } else {
      // Create new Stripe customer
      const stripeCustomer = await stripe.customers.create({
        email: customer.email,
        name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.email,
        phone: customer.phone || undefined,
        metadata: {
          user_id: customer.user_id,
          customer_profile_id: customer_id,
          source: 'roam_balance_payment'
        }
      });

      stripeCustomerId = stripeCustomer.id;
      console.log('✅ Created Stripe customer:', stripeCustomerId);

      // Save to database
      await supabase
        .from('customer_stripe_profiles')
        .insert({
          user_id: customer.user_id,
          stripe_customer_id: stripeCustomerId,
          stripe_email: customer.email
        });
    }

    // Validate business has an active Stripe Connect account
    const { data: connectedAccount, error: connectError } = await supabase
      .from('stripe_connect_accounts')
      .select('account_id, charges_enabled, payouts_enabled')
      .eq('business_id', booking.business_id)
      .single();

    if (connectError || !connectedAccount?.account_id) {
      console.error('❌ Business does not have a Stripe Connect account:', { businessId: booking.business_id, connectError });
      return res.status(400).json({ 
        error: 'Business not ready for payments',
        details: 'This business has not completed payment setup. Please contact support.',
        code: 'BUSINESS_PAYMENT_NOT_CONFIGURED'
      });
    }

    if (!connectedAccount.charges_enabled) {
      console.error('❌ Business Stripe Connect account cannot accept charges:', { businessId: booking.business_id, accountId: connectedAccount.account_id });
      return res.status(400).json({ 
        error: 'Business payment account restricted',
        details: 'This business cannot currently accept payments. Please contact support.',
        code: 'BUSINESS_CHARGES_DISABLED'
      });
    }

    console.log('✅ Business Stripe Connect account validated:', {
      businessId: booking.business_id,
      accountId: connectedAccount.account_id,
      chargesEnabled: connectedAccount.charges_enabled,
      payoutsEnabled: connectedAccount.payouts_enabled
    });

    // Create Payment Intent for remaining balance
    // Customer pays: provider amount + platform fee
    // This will be automatically captured (charged immediately) when confirmed
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalCustomerPaysCents, // Provider amount + 20% platform fee
      currency: 'usd',
      customer: stripeCustomerId, // Enable saved payment methods
      description: `Remaining Balance - ${serviceName} (${booking.booking_reference || booking_id})`,
      capture_method: 'automatic', // Charge immediately when confirmed
      confirm: false, // Will be confirmed on frontend
      // IMPORTANT: setup_future_usage enables saving payment methods for future use
      setup_future_usage: 'off_session',
      metadata: {
        type: 'remaining_balance_payment',
        booking_id,
        customer_id,
        provider_id: booking.provider_id,
        business_id: booking.business_id,
        balance_amount: remainingBalance.toString(), // What provider charged
        platform_fee: (platformFee / 100).toString(), // 20% platform fee
        provider_amount: providerAmount.toString(), // What provider receives (same as balance_amount)
        total_customer_pays: (totalCustomerPaysCents / 100).toString(), // What customer pays
        booking_reference: booking.booking_reference || '',
        connectedAccountId: connectedAccount.account_id,
        transferAmount: Math.round(providerAmount * 100).toString(), // Transfer provider amount to connected account
      },
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never', // Disable redirect-based payment methods
      },
    });

    console.log('✅ Created balance payment intent:', paymentIntent.id);

    // Save payment intent to business_payment_transactions
    // gross_payment_amount = what customer pays (provider amount + platform fee)
    // net_payment_amount = what provider receives (providerAmount)
    const paymentDate = new Date().toISOString().split('T')[0];
    const taxYear = new Date().getFullYear();

    const { error: bptError } = await supabase
      .from('business_payment_transactions')
      .insert({
        booking_id,
        business_id: booking.business_id,
        payment_date: paymentDate,
        gross_payment_amount: totalCustomerPaysCents / 100, // What customer pays
        platform_fee: platformFee / 100, // 20% platform fee
        net_payment_amount: providerAmount, // What provider receives
        tax_year: taxYear,
        stripe_payment_intent_id: paymentIntent.id,
        stripe_connect_account_id: connectedAccount.account_id,
        transaction_description: 'Remaining balance payment',
        transaction_type: 'additional_service',
      });

    if (bptError && bptError.code !== '23505') { // Ignore duplicate errors
      console.warn('⚠️ Failed to save payment intent to business_payment_transactions:', bptError);
    } else {
      console.log('✅ Payment intent saved to business_payment_transactions');
    }

    // Also save to financial_transactions for audit trail
    const { error: ftError } = await supabase
      .from('financial_transactions')
      .insert({
        booking_id,
        amount: totalCustomerPaysCents / 100, // What customer pays
        currency: 'USD',
        stripe_transaction_id: paymentIntent.id,
        payment_method: 'card',
        description: `Remaining balance payment for ${serviceName}`,
        transaction_type: 'booking_payment',
        status: 'pending',
        processed_at: new Date().toISOString(),
        metadata: {
          customer_id,
          business_id: booking.business_id,
          provider_id: booking.provider_id,
          payment_type: 'balance_payment',
          provider_amount: providerAmount,
          platform_fee: platformFee / 100,
        },
      });

    if (ftError && ftError.code !== '23505') {
      console.warn('⚠️ Failed to save to financial_transactions:', ftError);
    } else {
      console.log('✅ Payment intent saved to financial_transactions');
    }

    const breakdown = {
      balanceAmount: remainingBalance,
      platformFee: platformFee / 100,
      providerAmount: providerAmount,
      total: remainingBalance,
    };

    console.log('💰 Balance payment breakdown:', breakdown);

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      amount: remainingBalance,
      breakdown,
      bookingReference: booking.booking_reference,
      serviceName,
      businessName,
      providerName,
    });

  } catch (error: any) {
    console.error('❌ Balance payment intent creation failed:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      type: error.type,
      code: error.code
    });
    
    return res.status(500).json({
      error: 'Payment setup failed',
      details: error.message,
      code: error.code || 'PAYMENT_INTENT_ERROR'
    });
  }
}
