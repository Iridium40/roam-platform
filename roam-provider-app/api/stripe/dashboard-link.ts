import { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia' as any,
});

const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(
  supabaseUrl!,
  supabaseServiceKey!
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
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { business_id } = req.body;

    if (!business_id) {
      return res.status(400).json({ error: 'Business ID required' });
    }

    // Get business profile with stripe account
    const { data: business, error: businessError } = await supabase
      .from('business_profiles')
      .select('stripe_account_id, owner_id')
      .eq('id', business_id)
      .single();

    if (businessError || !business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Use stripe_account_id from business_profiles
    const stripeAccountId = business.stripe_account_id;

    if (!stripeAccountId) {
      return res.status(400).json({ error: 'Stripe account not connected' });
    }

    try {
      // Retrieve account to verify it exists and get account type
      const account = await stripe.accounts.retrieve(stripeAccountId);
      
      // Create login link
      // For Express accounts, this creates a one-time login link that automatically logs them in
      // Users don't need separate Stripe login credentials - the link handles authentication
      // The link expires after a short period (typically 5 minutes) for security
      const loginLink = await stripe.accounts.createLoginLink(stripeAccountId);

      return res.json({
        url: loginLink.url,
        created: loginLink.created,
        accountType: account.type, // 'express' or 'standard'
      });
    } catch (stripeError: any) {
      console.error('Stripe API error:', stripeError);
      
      // If login link creation fails, provide helpful error message
      if (stripeError.type === 'StripeInvalidRequestError') {
        return res.status(400).json({ 
          error: 'Unable to create dashboard access link',
          details: 'Your Stripe account may need additional setup. Please contact support.',
          stripeError: stripeError.message
        });
      }
      
      throw stripeError;
    }

  } catch (error: any) {
    console.error('Error creating dashboard link:', error);
    return res.status(500).json({ 
      error: 'Failed to create dashboard link',
      details: error.message 
    });
  }
}

