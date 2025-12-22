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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { business_id, limit = '25' } = req.query;

    if (!business_id) {
      return res.status(400).json({ error: 'Business ID required' });
    }

    // Get Stripe Connect account for this business
    const { data: connectAccount, error: connectError } = await supabase
      .from('stripe_connect_accounts')
      .select('account_id, charges_enabled, payouts_enabled')
      .eq('business_id', business_id)
      .single();

    if (connectError || !connectAccount) {
      return res.status(404).json({ error: 'Stripe Connect account not found' });
    }

    if (!connectAccount.account_id) {
      return res.status(400).json({ error: 'Stripe account not connected' });
    }

    // Get balance transactions (charges, refunds, payouts, etc.)
    const transactions = await stripe.balanceTransactions.list(
      { limit: parseInt(limit as string) },
      { stripeAccount: connectAccount.account_id }
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

