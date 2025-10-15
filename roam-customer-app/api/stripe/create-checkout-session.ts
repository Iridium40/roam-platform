import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Use the latest stable API version instead of beta
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { 
  apiVersion: '2024-11-20.acacia' as any
});

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
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
    const {
      service_id,
      business_id,
      customer_id,
      provider_id,
      booking_date,
      start_time,
      guest_name,
      guest_email,
      guest_phone,
      delivery_type,
      business_location_id,
      customer_location_id,
      special_instructions,
      promotionId,
      promotionCode,
      discountApplied,
      originalAmount,
      total_amount,
      serviceName,
      businessName
    } = req.body;

    // Validate required fields
    if (!service_id || !business_id || !customer_id || !total_amount) {
      return res.status(400).json({ 
        error: 'Missing required fields: service_id, business_id, customer_id, total_amount' 
      });
    }

    // Get customer details from Supabase
    const { data: customer, error: customerError} = await supabase
      .from('customer_profiles')
      .select('id, user_id, email, first_name, last_name, phone')
      .eq('id', customer_id)
      .single();

    if (customerError || !customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Get or create Stripe customer
    let stripeCustomerId: string | undefined;
    
    // Check if customer already has a Stripe profile (using user_id)
    const { data: existingProfile, error: profileError } = await supabase
      .from('customer_stripe_profiles')
      .select('stripe_customer_id')
      .eq('user_id', customer.user_id)
      .single();

    if (existingProfile && existingProfile.stripe_customer_id) {
      stripeCustomerId = existingProfile.stripe_customer_id;
      
      // Verify the Stripe customer exists
      try {
        await stripe.customers.retrieve(stripeCustomerId);
        console.log('✅ Using existing Stripe customer:', stripeCustomerId);
      } catch (error) {
        console.warn('⚠️ Stripe customer not found, creating new one. Old ID:', stripeCustomerId);
        stripeCustomerId = undefined; // Will create new customer below
        
        // Delete invalid profile
        await supabase
          .from('customer_stripe_profiles')
          .delete()
          .eq('user_id', customer.user_id);
      }
    }
    
    // Create new Stripe customer if needed
    if (!stripeCustomerId) {
      console.log('Creating new Stripe customer for user:', customer.user_id);
      
      const stripeCustomer = await stripe.customers.create({
        email: guest_email || customer.email,
        name: guest_name || `${customer.first_name} ${customer.last_name}`,
        phone: guest_phone || customer.phone,
        metadata: {
          user_id: customer.user_id,
          customer_profile_id: customer_id,
          source: 'roam_booking'
        }
      });

      stripeCustomerId = stripeCustomer.id;
      console.log('✅ Created Stripe customer:', stripeCustomerId);

      // Save to database (using user_id)
      await supabase
        .from('customer_stripe_profiles')
        .upsert({
          user_id: customer.user_id,
          stripe_customer_id: stripeCustomerId,
          stripe_email: guest_email || customer.email
        }, {
          onConflict: 'user_id'
        });
    }

    // Calculate platform fee (2.9% + 30 cents)
    const platformFeePercentage = 0.029;
    const platformFee = Math.round(total_amount * platformFeePercentage * 100); // in cents
    const processingFee = 30; // Stripe processing fee in cents
    const totalAmountCents = Math.round(total_amount * 100);

    // Determine domain for redirect URLs
    const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
    const DOMAIN = isProd
      ? 'https://roamservices.app'
      : (process.env.VITE_APP_URL || 'http://localhost:5174');

    // Create Checkout Session with all booking data in metadata
    // The webhook will create the booking after successful payment
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: serviceName || 'Service Booking',
              description: `Booking for ${businessName || 'Business'} - ${delivery_type || 'Service'}`,
              metadata: {
                service_id,
                business_id,
                delivery_type: delivery_type || ''
              }
            },
            unit_amount: totalAmountCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${DOMAIN}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${DOMAIN}/book-service?serviceId=${service_id}&businessId=${business_id}`,
      // All booking data in metadata - webhook will use this to create booking
      metadata: {
        customer_id,
        service_id,
        business_id,
        provider_id: provider_id || '',
        total_amount: total_amount.toString(),
        platform_fee: (platformFee / 100).toString(),
        booking_date: booking_date || '',
        start_time: start_time || '',
        delivery_type: delivery_type || '',
        business_location_id: business_location_id || '',
        customer_location_id: customer_location_id || '',
        special_instructions: special_instructions || '',
        guest_name: guest_name || '',
        guest_email: guest_email || '',
        guest_phone: guest_phone || '',
        // Promotion data
        promotion_id: promotionId || '',
        promotion_code: promotionCode || '',
        discount_applied: discountApplied?.toString() || '0',
        original_amount: originalAmount?.toString() || total_amount.toString()
      },
      // Apply branding
      billing_address_collection: 'required',
      customer_update: {
        address: 'auto',
        name: 'auto'
      },
      // Disable automatic tax calculation for now (requires Stripe tax configuration)
      // automatic_tax: {
      //   enabled: true
      // }
    });

    console.log('✅ Checkout session created:', session.id);
    console.log('📋 Booking data stored in metadata - webhook will create booking after payment');

    // Return checkout session details to frontend
    return res.status(200).json({
      sessionId: session.id,
      url: session.url,
      amount: total_amount,
      breakdown: {
        serviceAmount: total_amount,
        platformFee: platformFee / 100,
        processingFee: processingFee / 100,
        total: total_amount
      }
    });

  } catch (error: any) {
    console.error('Checkout session creation failed:', error);
    return res.status(500).json({
      error: 'Checkout setup failed',
      details: error.message
    });
  }
}
