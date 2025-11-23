import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
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

    if (!payment_method_id || typeof payment_method_id !== 'string') {
      return res.status(400).json({ 
        error: 'Missing required parameter: payment_method_id' 
      });
    }

    if (!customer_id || typeof customer_id !== 'string') {
      return res.status(400).json({ 
        error: 'Missing required parameter: customer_id' 
      });
    }

    // Get Stripe customer ID
    const { data: stripeProfile, error: profileError } = await supabase
      .from('customer_stripe_profiles')
      .select('stripe_customer_id')
      .eq('user_id', customer_id)
      .single();

    if (profileError || !stripeProfile) {
      return res.status(404).json({ 
        error: 'Stripe customer profile not found' 
      });
    }

    // Retrieve payment method to check which customer it belongs to
    const paymentMethod = await stripe.paymentMethods.retrieve(payment_method_id);

    // Check if payment method belongs to this customer
    if (paymentMethod.customer !== stripeProfile.stripe_customer_id) {
      return res.status(400).json({
        error: 'Payment method does not belong to this customer',
        payment_method_customer: paymentMethod.customer,
        expected_customer: stripeProfile.stripe_customer_id
      });
    }

    return res.status(200).json({
      valid: true,
      payment_method_id: payment_method_id,
      customer_id: stripeProfile.stripe_customer_id
    });

  } catch (error: any) {
    console.error('❌ Error verifying payment method:', error);
    return res.status(500).json({
      error: 'Failed to verify payment method',
      details: error.message
    });
  }
}

