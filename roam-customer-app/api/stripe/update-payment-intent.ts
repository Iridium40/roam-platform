import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { payment_intent_id, payment_method_id } = req.body;

    if (!payment_intent_id || typeof payment_intent_id !== 'string') {
      return res.status(400).json({ 
        error: 'Missing required parameter: payment_intent_id' 
      });
    }

    if (!payment_method_id || typeof payment_method_id !== 'string') {
      return res.status(400).json({ 
        error: 'Missing required parameter: payment_method_id' 
      });
    }

    // Update payment intent with payment method
    const paymentIntent = await stripe.paymentIntents.update(payment_intent_id, {
      payment_method: payment_method_id,
    });

    return res.status(200).json({
      success: true,
      payment_intent: {
        id: paymentIntent.id,
        status: paymentIntent.status,
      }
    });

  } catch (error: any) {
    console.error('❌ Error updating payment intent:', error);
    return res.status(500).json({
      error: 'Failed to update payment intent',
      details: error.message
    });
  }
}

