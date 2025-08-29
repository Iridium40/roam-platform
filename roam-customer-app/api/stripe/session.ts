import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createStripePaymentService } from '@roam/shared';

const stripeService = createStripePaymentService();

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
    const { session_id } = req.query;

    if (!session_id || typeof session_id !== 'string') {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Retrieve session details from Stripe
    const stripe = stripeService.getStripe();
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['payment_intent', 'customer']
    });

    // Return relevant session information
    return res.status(200).json({
      success: true,
      session: {
        id: session.id,
        payment_status: session.payment_status,
        payment_intent_id: session.payment_intent,
        customer_id: session.customer,
        amount_total: session.amount_total,
        currency: session.currency,
        metadata: session.metadata
      }
    });

  } catch (error) {
    console.error('❌ Error retrieving session:', error);
    return res.status(500).json({
      error: 'Failed to retrieve session details',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
