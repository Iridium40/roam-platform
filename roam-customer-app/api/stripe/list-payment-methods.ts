import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { customer_id } = req.query;

    if (!customer_id || typeof customer_id !== 'string') {
      return res.status(400).json({ 
        error: 'Missing required parameter: customer_id' 
      });
    }

    // Get customer's payment methods from customer_stripe_profiles
    const { data: stripeProfile, error: profileError } = await supabase
      .from('customer_stripe_profiles')
      .select('payment_methods, default_payment_method_id')
      .eq('user_id', customer_id)
      .single();

    if (profileError) {
      if (profileError.code === 'PGRST116') {
        // No profile found, return empty array
        return res.status(200).json({
          payment_methods: [],
          default_payment_method_id: null
        });
      }
      console.error('Error fetching payment methods:', profileError);
      return res.status(500).json({ 
        error: 'Failed to fetch payment methods',
        details: profileError.message 
      });
    }

    // Parse payment methods
    const allPaymentMethods = stripeProfile?.payment_methods 
      ? (typeof stripeProfile.payment_methods === 'string' 
          ? JSON.parse(stripeProfile.payment_methods) 
          : stripeProfile.payment_methods)
      : [];

    // Filter out payment methods that can't be reused (they serve no purpose)
    const paymentMethods = allPaymentMethods.filter((pm: any) => pm.can_reuse !== false);

    // If the default payment method was filtered out, find a new default
    let defaultPaymentMethodId = stripeProfile?.default_payment_method_id || null;
    if (defaultPaymentMethodId && !paymentMethods.find((pm: any) => pm.id === defaultPaymentMethodId)) {
      // Default was filtered out, use the first available payment method or null
      defaultPaymentMethodId = paymentMethods.length > 0 ? paymentMethods[0].id : null;
    }

    return res.status(200).json({
      payment_methods: paymentMethods,
      default_payment_method_id: defaultPaymentMethodId
    });

  } catch (error: any) {
    console.error('❌ Error listing payment methods:', error);
    return res.status(500).json({
      error: 'Failed to list payment methods',
      details: error.message
    });
  }
}

