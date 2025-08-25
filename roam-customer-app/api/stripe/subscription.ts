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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      action,
      customerId,
      priceId,
      paymentMethodId,
      metadata = {},
      subscriptionId,
    } = req.body;

    if (!action) {
      return res.status(400).json({ error: 'Action is required' });
    }

    switch (action) {
      case 'create_subscription': {
        if (!customerId || !priceId) {
          return res.status(400).json({ error: 'Customer ID and Price ID are required' });
        }

        // Create subscription using Stripe
        const subscription = await stripeService.getStripe().subscriptions.create({
          customer: customerId,
          items: [{ price: priceId }],
          payment_behavior: 'default_incomplete',
          payment_settings: { save_default_payment_method: 'on_subscription' },
          expand: ['latest_invoice.payment_intent'],
          metadata: {
            ...metadata,
            subscriptionType: 'customer',
          },
        });

        return res.status(200).json({
          success: true,
          subscriptionId: subscription.id,
          status: subscription.status,
          clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
        });
      }

      case 'cancel_subscription': {
        if (!subscriptionId) {
          return res.status(400).json({ error: 'Subscription ID is required' });
        }

        const subscription = await stripeService.getStripe().subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });

        return res.status(200).json({
          success: true,
          subscriptionId: subscription.id,
          status: subscription.status,
          cancelAt: subscription.cancel_at,
        });
      }

      case 'update_payment_method': {
        if (!subscriptionId || !paymentMethodId) {
          return res.status(400).json({ error: 'Subscription ID and Payment Method ID are required' });
        }

        const subscription = await stripeService.getStripe().subscriptions.update(subscriptionId, {
          default_payment_method: paymentMethodId,
        });

        return res.status(200).json({
          success: true,
          subscriptionId: subscription.id,
          status: subscription.status,
        });
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (error) {
    console.error('Subscription error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
