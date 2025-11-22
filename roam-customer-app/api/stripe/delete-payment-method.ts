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
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Support both DELETE and POST for flexibility
  if (req.method !== 'DELETE' && req.method !== 'POST') {
    res.setHeader('Allow', 'DELETE, POST');
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
      .select('stripe_customer_id, payment_methods, default_payment_method_id')
      .eq('user_id', customer_id)
      .single();

    if (profileError || !stripeProfile?.stripe_customer_id) {
      return res.status(404).json({ 
        error: 'Stripe customer profile not found' 
      });
    }

    // Detach payment method from Stripe customer
    try {
      await stripe.paymentMethods.detach(payment_method_id);
    } catch (stripeError: any) {
      // If payment method is already detached or doesn't exist, continue
      if (stripeError.code !== 'resource_missing') {
        console.warn('Warning detaching payment method:', stripeError);
      }
    }

    // Remove from payment methods array
    const paymentMethods = stripeProfile?.payment_methods 
      ? (typeof stripeProfile.payment_methods === 'string' 
          ? JSON.parse(stripeProfile.payment_methods) 
          : stripeProfile.payment_methods)
      : [];

    const filteredMethods = paymentMethods.filter((pm: any) => pm.id !== payment_method_id);

    // If deleted method was default, clear default
    const updateData: any = {
      payment_methods: filteredMethods,
    };

    if (stripeProfile.default_payment_method_id === payment_method_id) {
      updateData.default_payment_method_id = null;
    }

    // Update database
    const { error: updateError } = await supabase
      .from('customer_stripe_profiles')
      .update(updateData)
      .eq('user_id', customer_id);

    if (updateError) {
      console.error('Error deleting payment method:', updateError);
      return res.status(500).json({ 
        error: 'Failed to delete payment method',
        details: updateError.message 
      });
    }

    console.log('✅ Payment method deleted:', {
      payment_method_id,
      customer_id
    });

    return res.status(200).json({
      success: true,
      message: 'Payment method deleted successfully'
    });

  } catch (error: any) {
    console.error('❌ Error deleting payment method:', error);
    return res.status(500).json({
      error: 'Failed to delete payment method',
      details: error.message
    });
  }
}

