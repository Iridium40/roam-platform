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

/**
 * GET /api/stripe/payout-transactions
 * 
 * Fetches the balance transactions that were included in a specific payout.
 * This shows which bookings/charges contributed to a payout.
 * 
 * Query params:
 * - business_id: UUID (required)
 * - payout_id: string (required) - Stripe payout ID (e.g., "po_xxx")
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { business_id, payout_id } = req.query;

    if (!business_id) {
      return res.status(400).json({ error: 'Business ID required' });
    }

    if (!payout_id || typeof payout_id !== 'string') {
      return res.status(400).json({ error: 'Payout ID required' });
    }

    // Get Stripe Connect account for this business
    const { data: connectAccount, error: connectError } = await supabase
      .from('stripe_connect_accounts')
      .select('account_id')
      .eq('business_id', business_id)
      .single();

    if (connectError || !connectAccount) {
      return res.status(404).json({ error: 'Stripe Connect account not found' });
    }

    if (!connectAccount.account_id) {
      return res.status(400).json({ error: 'Stripe account not connected' });
    }

    // Fetch balance transactions for this payout
    // The payout field on balance transactions links them to a specific payout
    const balanceTransactions = await stripe.balanceTransactions.list(
      {
        payout: payout_id,
        limit: 100,
        expand: ['data.source'], // Expand to get charge/payment details
      },
      { stripeAccount: connectAccount.account_id }
    );

    // Transform the transactions into a more useful format
    const transactions = balanceTransactions.data.map(bt => {
      const source = bt.source as Stripe.Charge | Stripe.Transfer | null;
      
      // Try to get booking reference from metadata
      let bookingReference = null;
      let bookingId = null;
      let description = bt.description || '';
      
      if (source && typeof source === 'object') {
        if ('metadata' in source && source.metadata) {
          bookingReference = source.metadata.booking_reference || null;
          bookingId = source.metadata.booking_id || source.metadata.bookingId || null;
        }
        if ('description' in source && source.description) {
          description = source.description;
        }
      }

      return {
        id: bt.id,
        type: bt.type, // 'charge', 'payment', 'transfer', 'payout', 'adjustment', etc.
        amount: bt.amount / 100, // Convert from cents
        fee: bt.fee / 100,
        net: bt.net / 100,
        currency: bt.currency,
        created: bt.created,
        description: description,
        status: bt.status,
        booking_reference: bookingReference,
        booking_id: bookingId,
        source_id: typeof bt.source === 'string' ? bt.source : bt.source?.id,
      };
    });

    // Filter to show only relevant transaction types (charges/payments)
    // Exclude the payout transaction itself
    const relevantTransactions = transactions.filter(t => 
      t.type !== 'payout' && t.amount !== 0
    );

    // Calculate summary
    const summary = {
      total_charges: relevantTransactions
        .filter(t => t.type === 'charge' || t.type === 'payment')
        .reduce((sum, t) => sum + t.amount, 0),
      total_fees: relevantTransactions.reduce((sum, t) => sum + t.fee, 0),
      total_refunds: relevantTransactions
        .filter(t => t.type === 'refund' || t.type === 'payment_refund')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0),
      transaction_count: relevantTransactions.length,
    };

    return res.json({
      payout_id,
      transactions: relevantTransactions,
      summary,
    });

  } catch (error: any) {
    console.error('Error fetching payout transactions:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch payout transactions',
      details: error.message 
    });
  }
}
