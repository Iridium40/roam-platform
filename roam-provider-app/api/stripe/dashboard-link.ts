import type { Request, Response } from 'express';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: Request, res: Response) {
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

    if (!business.stripe_account_id) {
      return res.status(400).json({ error: 'Stripe account not connected' });
    }

    // Create login link (expires in 5 minutes)
    const loginLink = await stripe.accounts.createLoginLink(
      business.stripe_account_id
    );

    return res.json({
      url: loginLink.url,
      created: loginLink.created,
      expiresIn: 300, // 5 minutes
    });

  } catch (error: any) {
    console.error('Error creating dashboard link:', error);
    return res.status(500).json({ 
      error: 'Failed to create dashboard link',
      details: error.message 
    });
  }
}

