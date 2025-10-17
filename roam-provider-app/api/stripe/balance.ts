import type { Request, Response } from 'express';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { business_id } = req.query;

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
      return res.status(400).json({ 
        error: 'Stripe account not connected',
        needsOnboarding: true 
      });
    }

    // Get balance from Stripe
    const balance = await stripe.balance.retrieve({
      stripeAccount: business.stripe_account_id,
    });

    // Get account to check payout settings
    const account = await stripe.accounts.retrieve(business.stripe_account_id);

    // Format response
    const available = balance.available.length > 0 
      ? balance.available[0].amount / 100 
      : 0;

    const pending = balance.pending.length > 0
      ? balance.pending.reduce((sum, p) => sum + p.amount, 0) / 100
      : 0;

    return res.json({
      available,
      pending,
      currency: balance.available[0]?.currency || 'usd',
      payoutsEnabled: account.payouts_enabled,
      chargesEnabled: account.charges_enabled,
      requirements: account.requirements,
    });

  } catch (error: any) {
    console.error('Error fetching Stripe balance:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch balance',
      details: error.message 
    });
  }
}

