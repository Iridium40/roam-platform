import type { VercelRequest, VercelResponse } from "@vercel/node";
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { payment_method_id, customer_id } = req.body;

    if (!payment_method_id || !customer_id) {
      return res.status(400).json({ 
        error: 'Missing required fields: payment_method_id, customer_id' 
      });
    }

    // Get customer's Stripe customer ID
    const { data: stripeProfile, error: profileError } = await supabase
      .from('customer_stripe_profiles')
      .select('stripe_customer_id, payment_methods')
      .eq('user_id', customer_id)
      .single();

    if (profileError || !stripeProfile?.stripe_customer_id) {
      return res.status(404).json({ 
        error: 'Stripe customer profile not found' 
      });
    }

    // Update Stripe customer default payment method
    await stripe.customers.update(stripeProfile.stripe_customer_id, {
      invoice_settings: {
        default_payment_method: payment_method_id,
      },
    });

    // Update payment methods array to set default
    const paymentMethods = stripeProfile?.payment_methods 
      ? (typeof stripeProfile.payment_methods === 'string' 
          ? JSON.parse(stripeProfile.payment_methods) 
          : stripeProfile.payment_methods)
      : [];

    // Update is_default flags
    paymentMethods.forEach((pm: any) => {
      pm.is_default = pm.id === payment_method_id;
    });

    // Update database
    const { error: updateError } = await supabase
      .from('customer_stripe_profiles')
      .update({
        default_payment_method_id: payment_method_id,
        payment_methods: paymentMethods,
      })
      .eq('user_id', customer_id);

    if (updateError) {
      console.error('Error updating default payment method:', updateError);
      return res.status(500).json({ 
        error: 'Failed to set default payment method',
        details: updateError.message 
      });
    }

    console.log('✅ Default payment method updated:', {
      payment_method_id,
      customer_id
    });

    return res.status(200).json({
      success: true,
      message: 'Default payment method updated successfully'
    });

  } catch (error: any) {
    console.error('❌ Error setting default payment method:', error);
    return res.status(500).json({
      error: 'Failed to set default payment method',
      details: error.message
    });
  }
}

