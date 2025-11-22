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
    const { payment_method_id, customer_id, set_as_default = false } = req.body;

    if (!payment_method_id || !customer_id) {
      return res.status(400).json({ 
        error: 'Missing required fields: payment_method_id, customer_id' 
      });
    }

    // Get customer's Stripe customer ID
    const { data: stripeProfile, error: profileError } = await supabase
      .from('customer_stripe_profiles')
      .select('stripe_customer_id')
      .eq('user_id', customer_id)
      .single();

    if (profileError || !stripeProfile?.stripe_customer_id) {
      return res.status(404).json({ 
        error: 'Stripe customer profile not found' 
      });
    }

    // Attach payment method to Stripe customer
    await stripe.paymentMethods.attach(payment_method_id, {
      customer: stripeProfile.stripe_customer_id,
    });

    // Set as default if requested
    if (set_as_default) {
      await stripe.customers.update(stripeProfile.stripe_customer_id, {
        invoice_settings: {
          default_payment_method: payment_method_id,
        },
      });
    }

    // Retrieve payment method details
    const paymentMethod = await stripe.paymentMethods.retrieve(payment_method_id);

    // Prepare payment method data for storage
    const paymentMethodData = {
      id: payment_method_id,
      type: paymentMethod.type,
      card: paymentMethod.card ? {
        brand: paymentMethod.card.brand,
        last4: paymentMethod.card.last4,
        exp_month: paymentMethod.card.exp_month,
        exp_year: paymentMethod.card.exp_year,
      } : null,
      created: paymentMethod.created,
      is_default: set_as_default,
    };

    // Get existing payment methods from customer_stripe_profiles
    const { data: existingProfile, error: fetchError } = await supabase
      .from('customer_stripe_profiles')
      .select('payment_methods, default_payment_method_id')
      .eq('user_id', customer_id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching existing profile:', fetchError);
      return res.status(500).json({ 
        error: 'Failed to fetch existing payment methods',
        details: fetchError.message 
      });
    }

    // Parse existing payment methods or initialize empty array
    const existingMethods = existingProfile?.payment_methods 
      ? (typeof existingProfile.payment_methods === 'string' 
          ? JSON.parse(existingProfile.payment_methods) 
          : existingProfile.payment_methods)
      : [];

    // Check if payment method already exists
    const existingIndex = existingMethods.findIndex((pm: any) => pm.id === payment_method_id);
    
    if (existingIndex >= 0) {
      // Update existing payment method
      existingMethods[existingIndex] = paymentMethodData;
    } else {
      // Add new payment method
      existingMethods.push(paymentMethodData);
    }

    // If setting as default, update all others to not be default
    if (set_as_default) {
      existingMethods.forEach((pm: any) => {
        if (pm.id !== payment_method_id) {
          pm.is_default = false;
        }
      });
    }

    // Update customer_stripe_profiles
    const updateData: any = {
      payment_methods: existingMethods,
    };

    if (set_as_default) {
      updateData.default_payment_method_id = payment_method_id;
    }

    const { error: updateError } = await supabase
      .from('customer_stripe_profiles')
      .update(updateData)
      .eq('user_id', customer_id);

    if (updateError) {
      console.error('Error updating payment methods:', updateError);
      return res.status(500).json({ 
        error: 'Failed to save payment method',
        details: updateError.message 
      });
    }

    console.log('✅ Payment method saved successfully:', {
      payment_method_id,
      customer_id,
      set_as_default
    });

    return res.status(200).json({
      success: true,
      payment_method: paymentMethodData,
      message: 'Payment method saved successfully'
    });

  } catch (error: any) {
    console.error('❌ Error saving payment method:', error);
    return res.status(500).json({
      error: 'Failed to save payment method',
      details: error.message
    });
  }
}

