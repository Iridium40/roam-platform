import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Initialize Stripe directly (not from server lib for Vercel compatibility)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia' as any,
  typescript: true,
});

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    console.log('🎫 Guest Payment Intent request received');
    
    const {
      bookingId,
      serviceId,
      businessId,
      guestName,
      guestEmail,
      guestPhone,
      bookingDate,
      startTime,
      deliveryType,
      specialInstructions,
      customerAddress,
      addon_ids,
      addons_total,
      guestCheckoutEmail, // The email for Stripe receipt
    } = req.body;

    // Validate required fields
    if (!serviceId || !businessId || !bookingId || !guestEmail) {
      return res.status(400).json({ 
        error: 'Missing required fields for guest checkout' 
      });
    }

    // Validate business has an active Stripe Connect account for payment splitting
    const { data: connectedAccount, error: connectError } = await supabase
      .from('stripe_connect_accounts')
      .select('account_id, charges_enabled, payouts_enabled')
      .eq('business_id', businessId)
      .single();

    if (connectError || !connectedAccount?.account_id) {
      console.error('❌ Business does not have a Stripe Connect account:', { businessId, connectError });
      return res.status(400).json({ 
        error: 'Business not ready for payments',
        details: 'This business has not completed payment setup. Please contact support.',
        code: 'BUSINESS_PAYMENT_NOT_CONFIGURED'
      });
    }

    if (!connectedAccount.charges_enabled) {
      console.error('❌ Business Stripe Connect account cannot accept charges:', { businessId, accountId: connectedAccount.account_id });
      return res.status(400).json({ 
        error: 'Business payment account restricted',
        details: 'This business cannot currently accept payments. Please contact support.',
        code: 'BUSINESS_CHARGES_DISABLED'
      });
    }

    console.log('✅ Business Stripe Connect account validated:', {
      businessId,
      accountId: connectedAccount.account_id,
      chargesEnabled: connectedAccount.charges_enabled,
    });

    // Pull authoritative pricing from Supabase
    const { data: businessService, error: businessServiceError } = await supabase
      .from('business_services')
      .select(`
        business_price,
        delivery_type,
        is_active,
        services:service_id (
          id,
          name,
          description,
          min_price,
          duration_minutes
        )
      `)
      .eq('business_id', businessId)
      .eq('service_id', serviceId)
      .eq('is_active', true)
      .single();

    if (businessServiceError || !businessService) {
      return res.status(404).json({ 
        error: 'Service not available from this business' 
      });
    }

    const service = businessService.services as any;
    let serviceAmount = businessService.business_price;
    
    // Validate service pricing
    if (serviceAmount < service.min_price) {
      return res.status(400).json({ 
        error: `Invalid pricing configuration for ${service.name}` 
      });
    }
    
    // Add addons total to service amount if any addons were selected
    if (addons_total && typeof addons_total === 'number' && addons_total > 0) {
      console.log('✅ Adding addons to service amount:', {
        baseServiceAmount: serviceAmount,
        addonsTotal: addons_total,
        addonIds: addon_ids || [],
      });
      serviceAmount += addons_total;
    }

    // Fetch platform fee from system configuration
    let platformFeePercentage = 20; // Default to 20%
    try {
      const { data: feeConfig, error: feeError } = await supabase
        .from('system_config')
        .select('config_value')
        .eq('config_key', 'platform_fee_percentage')
        .single();
      
      if (!feeError && feeConfig) {
        platformFeePercentage = parseFloat(feeConfig.config_value) || 20;
        console.log(`✅ Platform fee loaded from config: ${platformFeePercentage}%`);
      }
    } catch (error) {
      console.error('Error fetching platform fee configuration:', error);
    }
    
    // Calculate platform fee (percentage of service amount)
    const platformFee = Math.round(serviceAmount * (platformFeePercentage / 100) * 100); // in cents
    
    // Calculate subtotal before tax
    const serviceAmountCents = Math.round(serviceAmount * 100);
    const subtotalAmount = serviceAmountCents + platformFee;

    // Calculate tax using Stripe Tax Calculation API
    let taxAmount = 0;
    let taxCalculation = null;
    
    if (customerAddress && customerAddress.postal_code && customerAddress.state) {
      try {
        console.log('🧮 Calculating tax for guest address:', { 
          city: customerAddress.city, 
          state: customerAddress.state, 
          postal_code: customerAddress.postal_code 
        });

        taxCalculation = await stripe.tax.calculations.create({
          currency: 'usd',
          line_items: [
            {
              amount: subtotalAmount,
              reference: `service-${serviceId}`,
            },
          ],
          customer_details: {
            address: {
              line1: customerAddress.line1 || '',
              city: customerAddress.city || '',
              state: customerAddress.state,
              postal_code: customerAddress.postal_code,
              country: customerAddress.country || 'US',
            },
            address_source: 'shipping',
          },
        });

        taxAmount = taxCalculation.tax_amount_exclusive;
        console.log('✅ Tax calculated:', {
          taxAmount: taxAmount / 100,
          taxRate: taxCalculation.tax_breakdown?.[0]?.tax_rate_details?.percentage_decimal
        });
      } catch (taxError) {
        console.error('⚠️ Tax calculation failed:', taxError);
        taxAmount = 0;
      }
    }

    // Calculate final total including tax
    const totalAmount = subtotalAmount + taxAmount;

    if (totalAmount <= 0) {
      return res.status(400).json({ error: 'Invalid total amount' });
    }

    // Create a guest Stripe customer (for this transaction only, not saved to our DB)
    // IMPORTANT: Guest customers are created for receipt purposes only
    // We do NOT save their payment method or create a customer_stripe_profiles record
    const guestStripeCustomer = await stripe.customers.create({
      email: guestCheckoutEmail || guestEmail,
      name: guestName || 'Guest Customer',
      phone: guestPhone || undefined,
      metadata: {
        source: 'roam_guest_booking',
        booking_id: bookingId,
        is_guest: 'true',
      }
    });

    console.log('✅ Guest Stripe customer created:', guestStripeCustomer.id);

    // Fetch booking reference number for the Stripe description
    let bookingReference = '';
    if (bookingId) {
      const { data: booking } = await supabase
        .from('bookings')
        .select('booking_reference')
        .eq('id', bookingId)
        .single();
      
      bookingReference = booking?.booking_reference || '';
    }
    
    // Create Payment Intent for guest
    // Guest payments use manual capture (authorize now, charge on booking acceptance)
    // IMPORTANT: Do NOT set setup_future_usage for guest checkout - card should not be saved
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: 'usd',
      customer: guestStripeCustomer.id,
      description: bookingReference 
        ? `${bookingReference}: ${service?.name || 'Service'}` 
        : `ROAM Booking: ${service?.name || 'Service'}`,
      capture_method: 'manual', // Authorize only, capture when booking is accepted
      confirm: false,
      // DO NOT set setup_future_usage for guest checkout - card is NOT saved
      // setup_future_usage: 'off_session', // REMOVED for guest checkout
      receipt_email: guestCheckoutEmail || guestEmail, // Send receipt to guest
      metadata: {
        bookingId: bookingId || '',
        serviceId,
        businessId,
        isGuestCheckout: 'true', // Flag for webhook to identify guest bookings
        guestEmail: guestEmail,
        guestName: guestName || '',
        serviceAmount: serviceAmount.toString(),
        serviceAmountCents: serviceAmountCents.toString(),
        platformFee: (platformFee / 100).toString(),
        bookingDate: bookingDate || '',
        startTime: startTime || '',
        deliveryType: deliveryType || '',
        specialInstructions: specialInstructions || '',
        guestPhone: guestPhone || '',
        paymentType: 'guest_checkout',
        addon_ids: addon_ids ? JSON.stringify(addon_ids) : '',
        addons_total: addons_total?.toString() || '0',
        connectedAccountId: connectedAccount.account_id,
        transferAmount: serviceAmountCents.toString(),
      },
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
    });

    console.log('✅ Guest Payment Intent created:', paymentIntent.id);

    // Update booking with payment details
    if (bookingId) {
      await supabase
        .from('bookings')
        .update({
          total_amount: totalAmount / 100,
          service_fee: platformFee / 100,
          remaining_balance: serviceAmount, // Service amount for provider
          payment_status: 'pending',
          stripe_payment_intent_id: paymentIntent.id, // CRITICAL: Store payment intent ID for capture on acceptance
        })
        .eq('id', bookingId);

      // Save payment intent to business_payment_transactions
      const paymentDate = new Date().toISOString().split('T')[0];
      const taxYear = new Date().getFullYear();

      const { error: bptError } = await supabase
        .from('business_payment_transactions')
        .insert({
          booking_id: bookingId,
          business_id: businessId,
          payment_date: paymentDate,
          gross_payment_amount: totalAmount / 100,
          platform_fee: platformFee / 100,
          net_payment_amount: serviceAmount,
          tax_year: taxYear,
          stripe_payment_intent_id: paymentIntent.id,
          stripe_connect_account_id: connectedAccount.account_id,
          transaction_description: 'Guest checkout payment (pending capture)',
          transaction_type: 'guest_booking',
        });

      if (bptError) {
        console.warn('⚠️ Failed to save payment intent to business_payment_transactions:', bptError);
      }

      // Save to financial_transactions for audit trail
      await supabase
        .from('financial_transactions')
        .insert({
          booking_id: bookingId,
          amount: totalAmount / 100,
          currency: 'USD',
          stripe_transaction_id: paymentIntent.id,
          payment_method: 'card',
          description: 'Guest checkout payment authorized (pending capture)',
          transaction_type: 'booking_payment',
          status: 'pending',
          processed_at: new Date().toISOString(),
          metadata: {
            service_id: serviceId,
            business_id: businessId,
            capture_status: 'requires_capture',
            payment_type: 'guest_checkout',
            is_guest: true,
          },
        });
    }

    // Calculate base service amount (without addons) for breakdown display
    const addonsAmount = (addons_total && typeof addons_total === 'number') ? addons_total : 0;
    const baseServiceAmount = serviceAmount - addonsAmount;
    
    const breakdown = {
      serviceAmount: baseServiceAmount,
      addonsAmount: addonsAmount,
      addonsCount: addon_ids?.length || 0,
      platformFee: platformFee / 100,
      discountAmount: 0, // No discounts for guest checkout
      taxAmount: taxAmount / 100,
      taxRate: taxCalculation?.tax_breakdown?.[0]?.tax_rate_details?.percentage_decimal || null,
      subtotal: subtotalAmount / 100,
      total: totalAmount / 100
    };

    console.log('💰 Guest payment breakdown:', {
      serviceAmountDollars: serviceAmount,
      platformFeeDollars: platformFee / 100,
      totalAmountDollars: totalAmount / 100,
      breakdown,
    });

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      amount: totalAmount / 100,
      breakdown,
      isGuestCheckout: true
    });

  } catch (error: any) {
    console.error('❌ Guest payment intent creation failed:', error);
    return res.status(500).json({
      error: 'Payment setup failed',
      details: error.message,
      code: error.code || 'GUEST_PAYMENT_INTENT_ERROR'
    });
  }
}
