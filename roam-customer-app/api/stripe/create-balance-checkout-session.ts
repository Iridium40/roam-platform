import { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CreateBalanceCheckoutSessionRequest {
  booking_id: string;
  customer_id: string;
  success_url?: string;
  cancel_url?: string;
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
      success_url,
      cancel_url,
    }: CreateBalanceCheckoutSessionRequest = req.body;

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
    const platformFee = Math.round(remainingBalance * platformFeePercentage * 100) / 100; // in dollars
    const providerAmount = remainingBalance; // Provider receives the full amount they charged
    const totalCustomerPays = remainingBalance + platformFee; // What customer pays
    const totalCustomerPaysCents = Math.round(totalCustomerPays * 100);

    // Determine domain for redirect URLs
    const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
    const DOMAIN = isProd
      ? 'https://roamservices.app'
      : (process.env.VITE_APP_URL || 'http://localhost:5174');

    const serviceName = (booking.services as any)?.name || 'Service';
    const businessName = (booking.business_profiles as any)?.business_name || 'Business';
    const providerName = (booking.providers as any) 
      ? `${(booking.providers as any).first_name} ${(booking.providers as any).last_name}` 
      : 'Provider';

    // Get customer's Stripe customer ID to enable saved payment methods
    let stripeCustomerId: string | undefined;
    
    const { data: customerProfile } = await supabase
      .from('customer_profiles')
      .select('user_id')
      .eq('id', customer_id)
      .single();

    if (customerProfile?.user_id) {
      const { data: stripeProfile } = await supabase
        .from('customer_stripe_profiles')
        .select('stripe_customer_id')
        .eq('user_id', customerProfile.user_id)
        .single();
      
      if (stripeProfile?.stripe_customer_id) {
        stripeCustomerId = stripeProfile.stripe_customer_id;
        console.log('✅ Using existing Stripe customer for balance payment:', stripeCustomerId);
      }
    }

    // Create Checkout Session for remaining balance payment
    // Customer pays: provider amount + platform fee
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId, // Use existing Stripe customer to show saved payment methods
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Remaining Balance - ${serviceName}`,
              description: `Final balance payment for ${serviceName} with ${providerName} at ${businessName}`,
              metadata: {
                booking_id,
                business_id: booking.business_id,
                provider_id: booking.provider_id,
              },
            },
            unit_amount: totalCustomerPaysCents, // Provider amount + 20% platform fee
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      locale: 'en',  // Explicitly set locale to prevent './en' module loading error
      success_url: success_url || `${DOMAIN}/balance-payment-success?session_id={CHECKOUT_SESSION_ID}&booking_id=${booking_id}`,
      cancel_url: cancel_url || `${DOMAIN}/my-bookings/${booking_id}?payment_cancelled=true`,
      metadata: {
        type: 'remaining_balance_payment',
        booking_id,
        customer_id,
        provider_id: booking.provider_id,
        business_id: booking.business_id,
        balance_amount: remainingBalance.toString(), // What provider charged
        platform_fee: platformFee.toString(), // 20% platform fee
        provider_amount: providerAmount.toString(), // What provider receives
        total_customer_pays: totalCustomerPays.toString(), // What customer pays
        booking_reference: booking.booking_reference || '',
      },
    });

    console.log('✅ Created balance payment checkout session:', session.id);

    return res.status(200).json({
      session_id: session.id,
      checkout_url: session.url,
      success: true,
      balance_amount: remainingBalance,
    });

  } catch (error: any) {
    console.error('❌ Error creating balance payment checkout session:', error);
    return res.status(500).json({
      error: "Failed to create checkout session",
      details: error.message,
    });
  }
}
