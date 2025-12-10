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
    const { payment_method_id, customer_id, set_as_default } = req.body;

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

    // Get customer profile
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('user_id, email, first_name, last_name, phone')
      .eq('user_id', customer_id)
      .single();

    if (customerError || !customer) {
      console.error('Error fetching customer:', customerError);
      return res.status(404).json({ 
        error: 'Customer not found' 
      });
    }

    // Get or create Stripe customer profile
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

    let stripeCustomerId: string;

    if (stripeProfile) {
      stripeCustomerId = stripeProfile.stripe_customer_id;
      console.log('✅ Using existing Stripe customer:', stripeCustomerId);
    } else {
      // Create new Stripe customer
      console.log('Creating new Stripe customer for user:', customer_id);
      
      const stripeCustomer = await stripe.customers.create({
        email: customer.email,
        name: customer.first_name && customer.last_name 
          ? `${customer.first_name} ${customer.last_name}`
          : customer.email,
        phone: customer.phone || undefined,
        metadata: {
          user_id: customer.user_id,
          source: 'roam_attach_payment_method'
        }
      });

      stripeCustomerId = stripeCustomer.id;
      console.log('✅ Created Stripe customer:', stripeCustomerId);

      // Save to database
      await supabase
        .from('customer_stripe_profiles')
        .upsert({
          user_id: customer.user_id,
          stripe_customer_id: stripeCustomerId,
          stripe_email: customer.email,
          payment_methods: []
        }, {
          onConflict: 'user_id'
        });
    }

    // Attach payment method to customer
    try {
      await stripe.paymentMethods.attach(payment_method_id, {
        customer: stripeCustomerId,
      });
      console.log('✅ Payment method attached to customer');
    } catch (attachError: any) {
      if (attachError.code === 'resource_already_exists') {
        // Already attached - that's fine
        console.log('ℹ️ Payment method already attached to customer');
      } else {
        console.error('Error attaching payment method:', attachError);
        return res.status(400).json({
          error: 'Failed to attach payment method',
          details: attachError.message,
          code: attachError.code
        });
      }
    }

    // Set as default if requested
    if (set_as_default) {
      try {
        await stripe.customers.update(stripeCustomerId, {
          invoice_settings: {
            default_payment_method: payment_method_id,
          },
        });
      } catch (updateError: any) {
        console.warn('⚠️ Could not set payment method as default:', updateError.message);
        // Don't fail - continue
      }
    }

    // Retrieve payment method details
    const paymentMethod = await stripe.paymentMethods.retrieve(payment_method_id);

    // Save to database
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
      is_default: set_as_default || false,
      is_attached: true,
      can_reuse: true, // Since we attached it before use, it can be reused
    };

    // Get existing payment methods
    const { data: existingProfile } = await supabase
      .from('customer_stripe_profiles')
      .select('payment_methods, default_payment_method_id')
      .eq('user_id', customer_id)
      .single();

    const existingMethods = existingProfile?.payment_methods 
      ? (typeof existingProfile.payment_methods === 'string' 
          ? JSON.parse(existingProfile.payment_methods) 
          : existingProfile.payment_methods)
      : [];

    // Check if payment method already exists
    const existingIndex = existingMethods.findIndex((pm: any) => pm.id === payment_method_id);
    
    if (existingIndex >= 0) {
      existingMethods[existingIndex] = paymentMethodData;
    } else {
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

    // Update database
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
      console.error('Error updating payment methods in database:', updateError);
      // Don't fail - payment method is attached to Stripe, which is what matters
    }

    return res.status(200).json({
      success: true,
      payment_method_id: payment_method_id,
      attached: true,
      can_reuse: true
    });

  } catch (error: any) {
    console.error('❌ Error attaching payment method:', error);
    return res.status(500).json({
      error: 'Failed to attach payment method',
      details: error.message
    });
  }
}

