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
    console.log('💰 Tip Payment Intent request received');
    console.log('Environment check:', {
      hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
      hasSupabaseUrl: !!process.env.VITE_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    });

    const {
      tip_amount,
      booking_id,
      customer_id,
      provider_id,
      business_id,
      customer_message
    } = req.body;

    // Validate required fields
    if (!tip_amount || !booking_id || !customer_id || !provider_id || !business_id) {
      return res.status(400).json({ 
        error: 'Missing required fields: tip_amount, booking_id, customer_id, provider_id, business_id' 
      });
    }

    // Validate tip amount (minimum $10)
    if (tip_amount < 10) {
      return res.status(400).json({ 
        error: 'Invalid tip amount',
        details: 'Tip amount must be at least $10'
      });
    }

    // Get customer details - customer_id is the customer_profile id, not user_id
    const { data: customer, error: customerError } = await supabase
      .from('customer_profiles')
      .select('id, user_id, email, first_name, last_name, phone')
      .eq('id', customer_id)
      .single();

    if (customerError || !customer) {
      console.error('❌ Customer lookup error:', customerError);
      return res.status(404).json({ 
        error: 'Customer not found',
        details: customerError?.message 
      });
    }

    // Get or create Stripe customer
    let stripeCustomerId: string;
    
    // Check if customer already has Stripe profile (using user_id from customer profile)
    const { data: existingStripeProfile } = await supabase
      .from('customer_stripe_profiles')
      .select('stripe_customer_id')
      .eq('user_id', customer.user_id)
      .single();

    if (existingStripeProfile?.stripe_customer_id) {
      stripeCustomerId = existingStripeProfile.stripe_customer_id;
      console.log('✅ Using existing Stripe customer:', stripeCustomerId);
    } else {
      // Create new Stripe customer
      console.log('Creating new Stripe customer for tip:', customer.user_id);
      
      const stripeCustomer = await stripe.customers.create({
        email: customer.email,
        name: `${customer.first_name} ${customer.last_name}`,
        phone: customer.phone,
        metadata: {
          user_id: customer.user_id,
          customer_profile_id: customer_id,
          source: 'roam_tip'
        }
      });

      stripeCustomerId = stripeCustomer.id;
      console.log('✅ Created Stripe customer for tip:', stripeCustomerId);

      // Save to database
      const { error: upsertError } = await supabase
        .from('customer_stripe_profiles')
        .upsert({
          user_id: customer.user_id,
          stripe_customer_id: stripeCustomerId,
          stripe_email: customer.email
        }, {
          onConflict: 'user_id'
        });
      
      if (upsertError) {
        console.warn('⚠️ Failed to save Stripe profile (non-fatal):', upsertError);
      }
    }

    // Calculate amounts in cents
    const tipAmountCents = Math.round(tip_amount * 100);
    
    // Calculate Stripe processing fees (2.9% + 30 cents)
    const stripeFeePercentage = 0.029; // 2.9%
    const stripeFeeFixed = 30; // 30 cents
    const stripeFeeAmount = Math.round(tip_amount * stripeFeePercentage * 100) + stripeFeeFixed;
    const providerNetAmount = tipAmountCents - stripeFeeAmount;

    console.log('💰 Tip calculation:', {
      tip_amount,
      tipAmountCents,
      stripeFeeAmount,
      providerNetAmount: providerNetAmount / 100
    });

    // Create Payment Intent for tip
    const paymentIntent = await stripe.paymentIntents.create({
      amount: tipAmountCents,
      currency: 'usd',
      customer: stripeCustomerId,
      description: `Tip for service provider${customer_message ? ` - ${customer_message}` : ''}`,
      metadata: {
        type: 'tip',
        booking_id,
        customer_id,
        provider_id,
        business_id,
        tip_amount: tip_amount.toString(),
        stripe_fee: (stripeFeeAmount / 100).toString(),
        provider_net: (providerNetAmount / 100).toString(),
        customer_message: customer_message || '',
      },
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never', // Disable redirect-based payment methods like Cash App
      },
      payment_method_types: ['card'], // Only allow card payments (includes Apple Pay & Google Pay)
    });

    console.log('✅ Created tip payment intent:', paymentIntent.id);

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      amount: tip_amount,
      breakdown: {
        tipAmount: tip_amount,
        stripeFee: stripeFeeAmount / 100,
        providerNet: providerNetAmount / 100
      }
    });

  } catch (error: any) {
    console.error('❌ Tip payment intent creation failed:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      type: error.type,
      code: error.code
    });
    
    return res.status(500).json({
      error: 'Tip payment setup failed',
      details: error.message,
      code: error.code || 'TIP_PAYMENT_INTENT_ERROR'
    });
  }
}
