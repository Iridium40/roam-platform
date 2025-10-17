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
      return res.status(400).json({ error: 'Stripe account not connected' });
    }

    if (req.method === 'GET') {
      // List payouts
      const payouts = await stripe.payouts.list(
        { limit: 50 },
        { stripeAccount: business.stripe_account_id }
      );

      return res.json({
        payouts: payouts.data.map(p => ({
          id: p.id,
          amount: p.amount / 100,
          currency: p.currency,
          status: p.status,
          arrival_date: p.arrival_date,
          created: p.created,
          method: p.method,
          type: p.type,
          automatic: p.automatic,
        }))
      });

    } else if (req.method === 'POST') {
      // Create payout
      const { amount, method = 'standard' } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
      }

      // Verify available balance
      const balance = await stripe.balance.retrieve({
        stripeAccount: business.stripe_account_id,
      });

      const availableAmount = balance.available[0]?.amount || 0;
      const requestedAmount = Math.round(amount * 100); // Convert to cents

      if (requestedAmount > availableAmount) {
        return res.status(400).json({ 
          error: 'Insufficient balance',
          available: availableAmount / 100,
          requested: amount
        });
      }

      // Create payout
      const payout = await stripe.payouts.create(
        {
          amount: requestedAmount,
          currency: 'usd',
          method: method, // 'instant' or 'standard'
        },
        {
          stripeAccount: business.stripe_account_id,
        }
      );

      return res.json({
        payout: {
          id: payout.id,
          amount: payout.amount / 100,
          currency: payout.currency,
          status: payout.status,
          arrival_date: payout.arrival_date,
          created: payout.created,
          method: payout.method,
          fee: payout.method === 'instant' ? (payout.amount * 0.015) / 100 : 0,
        }
      });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error: any) {
    console.error('Error with payouts:', error);
    return res.status(500).json({ 
      error: 'Failed to process payout request',
      details: error.message 
    });
  }
}

