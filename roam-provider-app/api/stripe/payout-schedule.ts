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
  try {
    const { business_id } = req.method === 'GET' ? req.query : req.body;

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
      // Get current payout schedule
      const account = await stripe.accounts.retrieve(business.stripe_account_id);

      return res.json({
        schedule: {
          interval: account.settings?.payouts?.schedule?.interval || 'daily',
          weekly_anchor: account.settings?.payouts?.schedule?.weekly_anchor,
          monthly_anchor: account.settings?.payouts?.schedule?.monthly_anchor,
          delay_days: account.settings?.payouts?.schedule?.delay_days || 2,
        }
      });

    } else if (req.method === 'PUT') {
      // Update payout schedule
      const { interval, weekly_anchor, monthly_anchor } = req.body;

      const updateData: any = {
        settings: {
          payouts: {
            schedule: {
              interval: interval || 'daily',
            }
          }
        }
      };

      if (interval === 'weekly' && weekly_anchor) {
        updateData.settings.payouts.schedule.weekly_anchor = weekly_anchor;
      }

      if (interval === 'monthly' && monthly_anchor) {
        updateData.settings.payouts.schedule.monthly_anchor = monthly_anchor;
      }

      const account = await stripe.accounts.update(
        business.stripe_account_id,
        updateData
      );

      return res.json({
        schedule: {
          interval: account.settings?.payouts?.schedule?.interval,
          weekly_anchor: account.settings?.payouts?.schedule?.weekly_anchor,
          monthly_anchor: account.settings?.payouts?.schedule?.monthly_anchor,
        }
      });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error: any) {
    console.error('Error with payout schedule:', error);
    return res.status(500).json({ 
      error: 'Failed to manage payout schedule',
      details: error.message 
    });
  }
}

