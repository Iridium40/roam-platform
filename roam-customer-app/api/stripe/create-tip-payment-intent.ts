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

    // Validate tip amount (minimum $1.00)
    if (tip_amount < 1) {
      return res.status(400).json({ 
        error: 'Invalid tip amount',
        details: 'Tip amount must be at least $1.00'
      });
    }

    // Validate business has an active Stripe Connect account for tip transfer
    const { data: connectedAccount, error: connectError } = await supabase
      .from('stripe_connect_accounts')
      .select('account_id, charges_enabled, payouts_enabled')
      .eq('business_id', business_id)
      .single();

    if (connectError || !connectedAccount?.account_id) {
      console.error('❌ Business does not have a Stripe Connect account for tips:', { business_id, connectError });
      return res.status(400).json({ 
        error: 'Tips not available',
        details: 'This business has not completed payment setup for receiving tips.',
        code: 'BUSINESS_TIP_NOT_CONFIGURED'
      });
    }

    if (!connectedAccount.charges_enabled || !connectedAccount.payouts_enabled) {
      console.warn('⚠️ Business Stripe Connect account has restricted capabilities for tips:', { 
        business_id, 
        chargesEnabled: connectedAccount.charges_enabled,
        payoutsEnabled: connectedAccount.payouts_enabled 
      });
      // Allow tips but log warning - payouts may be pending
    }

    console.log('✅ Business Stripe Connect account validated for tips:', {
      businessId: business_id,
      accountId: connectedAccount.account_id,
    });

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

      // Save to database - check if record exists first, then update or insert
      const { data: existingProfile } = await supabase
        .from('customer_stripe_profiles')
        .select('id')
        .eq('user_id', customer.user_id)
        .maybeSingle();
      
      if (existingProfile) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('customer_stripe_profiles')
          .update({
            stripe_customer_id: stripeCustomerId,
            stripe_email: customer.email,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', customer.user_id);
        
        if (updateError) {
          console.warn('⚠️ Failed to update Stripe profile (non-fatal):', updateError);
        }
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from('customer_stripe_profiles')
          .insert({
            user_id: customer.user_id,
            stripe_customer_id: stripeCustomerId,
            stripe_email: customer.email
          });
        
        if (insertError) {
          console.warn('⚠️ Failed to insert Stripe profile (non-fatal):', insertError);
        }
      }
    }

    // Calculate amounts in cents
    const tipAmountCents = Math.round(tip_amount * 100);
    
    // Calculate platform fee (5% of tip to cover Stripe fees)
    // Business receives 95% of the tip
    const platformFeePercentage = 0.05; // 5%
    const platformFeeAmount = Math.round(tip_amount * platformFeePercentage * 100); // in cents
    const providerNetAmount = tipAmountCents - platformFeeAmount; // 95% to provider

    console.log('💰 Tip calculation:', {
      tip_amount,
      tipAmountCents,
      platformFeePercentage: '5%',
      platformFeeAmount: platformFeeAmount / 100,
      providerNetAmount: providerNetAmount / 100,
      connectedAccountId: connectedAccount.account_id,
    });

    // Create Payment Intent for tip
    // Tips are charged immediately (automatic capture) when customer submits
    const paymentIntent = await stripe.paymentIntents.create({
      amount: tipAmountCents,
      currency: 'usd',
      customer: stripeCustomerId,
      description: `Tip for service provider${customer_message ? ` - ${customer_message}` : ''}`,
      // Note: No capture_method specified = automatic capture (charges immediately)
      metadata: {
        type: 'tip',
        booking_id,
        customer_id,
        provider_id,
        business_id,
        tip_amount: tip_amount.toString(),
        platform_fee: (platformFeeAmount / 100).toString(), // 5% platform fee
        provider_net: (providerNetAmount / 100).toString(), // 95% to provider
        transfer_amount_cents: providerNetAmount.toString(), // For webhook to create transfer
        customer_message: customer_message || '',
        // Stripe Connect: Store connected account for transfer
        connectedAccountId: connectedAccount.account_id,
      },
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never', // Disable redirect-based payment methods like Cash App
        // Note: Cannot use payment_method_types when automatic_payment_methods is enabled
        // automatic_payment_methods handles card, Apple Pay, Google Pay automatically
      },
    });

    console.log('✅ Created tip payment intent:', paymentIntent.id);

    // Create tip record in database with 'pending' status
    const { data: tipRecord, error: tipError } = await supabase
      .from('tips')
      .insert({
        booking_id,
        customer_id,
        provider_id,
        business_id,
        tip_amount: tip_amount,
        tip_percentage: null, // Can be calculated later if needed
        stripe_payment_intent_id: paymentIntent.id,
        payment_status: 'pending',
        platform_fee_amount: platformFeeAmount / 100, // 5% platform fee
        provider_net_amount: providerNetAmount / 100, // 95% to provider
        customer_message: customer_message || null,
      })
      .select()
      .single();

    if (tipError) {
      console.error('⚠️ Failed to create tip record (non-fatal):', tipError);
      // Don't fail the request - tip record can be created by webhook
    } else {
      console.log('✅ Tip record created:', tipRecord.id);
    }

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      amount: tip_amount,
      breakdown: {
        tipAmount: tip_amount,
        platformFee: platformFeeAmount / 100, // 5% platform fee
        providerNet: providerNetAmount / 100  // 95% to provider
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
