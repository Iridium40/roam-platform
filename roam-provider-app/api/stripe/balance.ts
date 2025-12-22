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
    console.log('💰 Fetching Stripe balance for business:', req.query.business_id);
    const { business_id } = req.query;

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
      return res.status(400).json({ 
        error: 'Stripe account not connected',
        needsOnboarding: true 
      });
    }

    // Get balance from Stripe
    const balance = await stripe.balance.retrieve({
      stripeAccount: connectAccount.account_id,
    });

    // Get account to check payout settings
    const account = await stripe.accounts.retrieve(connectAccount.account_id);

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
    console.error('❌ Error fetching Stripe balance:', error);
    console.error('Error details:', {
      message: error.message,
      type: error.type,
      code: error.code,
      stack: error.stack
    });
    
    return res.status(500).json({ 
      error: 'Failed to fetch balance',
      details: error.message,
      code: error.code || 'BALANCE_FETCH_ERROR'
    });
  }
}

