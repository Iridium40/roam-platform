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
    const { customer_id } = req.body;

    if (!customer_id || typeof customer_id !== 'string') {
      return res.status(400).json({ 
        error: 'Missing required parameter: customer_id' 
      });
    }

    // Get or create Stripe customer
    const { data: stripeProfile, error: profileError } = await supabase
      .from('customer_stripe_profiles')
      .select('stripe_customer_id')
      .eq('user_id', customer_id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching Stripe profile:', profileError);
      return res.status(500).json({ 
        error: 'Failed to fetch customer profile',
        details: profileError.message 
      });
    }

    if (!stripeProfile) {
      return res.status(404).json({ 
        error: 'Stripe customer profile not found. Please ensure customer exists.' 
      });
    }

    // Create Setup Intent for collecting payment method
    const setupIntent = await stripe.setupIntents.create({
      customer: stripeProfile.stripe_customer_id,
      payment_method_types: ['card'],
    });

    return res.status(200).json({
      clientSecret: setupIntent.client_secret,
    });

  } catch (error: any) {
    console.error('❌ Error creating setup intent:', error);
    return res.status(500).json({
      error: 'Failed to create setup intent',
      details: error.message
    });
  }
}

