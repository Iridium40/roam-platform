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

    // Check if payment method is already attached to this customer
    let isAttached = false;
    let canReuse = true;
    let paymentMethod: Stripe.PaymentMethod;
    
    try {
      // First, retrieve the payment method to check its status
      paymentMethod = await stripe.paymentMethods.retrieve(payment_method_id);
      isAttached = paymentMethod.customer === stripeProfile.stripe_customer_id;
      
      // If not attached, try to attach it
      if (!isAttached) {
        try {
          await stripe.paymentMethods.attach(payment_method_id, {
            customer: stripeProfile.stripe_customer_id,
          });
          isAttached = true;
          console.log('✅ Payment method attached to customer');
        } catch (attachError: any) {
          // Handle different error cases
          const errorMessage = attachError.message || attachError.raw?.message || '';
          const errorType = attachError.type || attachError.rawType || '';
          
          if (attachError.code === 'resource_already_exists') {
            // Already attached to this or another customer
            console.log('ℹ️ Payment method already attached to a customer');
            isAttached = true;
          } else if (
            (errorType === 'invalid_request_error' || attachError.statusCode === 400) &&
            (errorMessage.includes('previously used without being attached') ||
             errorMessage.includes('may not be used again') ||
             errorMessage.includes('was detached from a Customer') ||
             errorMessage.includes('cannot be used again'))
          ) {
            // Payment method was used in a payment intent before being attached
            // This is okay - we'll save it to our database but can't attach it to Stripe
            console.log('ℹ️ Payment method was already used - saving reference only (cannot attach to customer)');
            console.log('Error details:', { errorMessage, errorType, statusCode: attachError.statusCode });
            canReuse = false;
            // Don't throw - we'll still save it to our database for reference
            // Continue execution to save payment method data
          } else {
            // Other errors should be thrown
            console.error('Error attaching payment method:', attachError);
            console.error('Error details:', {
              code: attachError.code,
              type: errorType,
              message: errorMessage,
              statusCode: attachError.statusCode,
              raw: attachError.raw
            });
            throw attachError;
          }
        }
      } else {
        console.log('ℹ️ Payment method already attached to customer');
      }
    } catch (retrieveError: any) {
      // If we can't retrieve the payment method, we can't proceed
      console.error('Error retrieving payment method:', retrieveError);
      throw retrieveError;
    }

    // Set as default if requested and payment method is attached
    if (set_as_default && isAttached) {
      try {
        await stripe.customers.update(stripeProfile.stripe_customer_id, {
          invoice_settings: {
            default_payment_method: payment_method_id,
          },
        });
      } catch (updateError: any) {
        console.warn('⚠️ Could not set payment method as default:', updateError.message);
        // Don't fail - continue to save payment method to database
      }
    }

    // Payment method details already retrieved above, reuse it

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
      is_default: set_as_default && isAttached, // Only set as default if attached
      is_attached: isAttached, // Track if payment method is attached to Stripe customer
      can_reuse: canReuse, // Track if payment method can be reused for future payments
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

