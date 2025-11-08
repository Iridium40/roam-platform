import type { Request, Response } from 'express';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia' as any,
});

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { business_id, limit = '25' } = req.query;

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

    // Get balance transactions (charges, refunds, payouts, etc.)
    const transactions = await stripe.balanceTransactions.list(
      { limit: parseInt(limit as string) },
      { stripeAccount: business.stripe_account_id }
    );

    return res.json({
      transactions: transactions.data.map(t => ({
        id: t.id,
        amount: t.amount / 100,
        net: t.net / 100,
        fee: t.fee / 100,
        currency: t.currency,
        type: t.type,
        status: t.status,
        created: t.created,
        description: t.description,
        available_on: t.available_on,
      }))
    });

  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch transactions',
      details: error.message 
    });
  }
}

