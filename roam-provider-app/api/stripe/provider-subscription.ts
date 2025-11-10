import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createStripePaymentService } from '@roam/shared';
import { createClient } from "@supabase/supabase-js";

const stripeService = createStripePaymentService();
const stripe = stripeService.getStripe();

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

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
      userId,
      businessId,
      priceId,
      paymentMethodId,
      metadata = {},
      subscriptionId,
    } = req.body;

    if (!action) {
      return res.status(400).json({ error: 'Action is required' });
    }

    // Get or create Stripe customer for the provider
    const getOrCreateCustomer = async () => {
      // Check if customer already exists in database
      const { data: existingCustomer } = await supabase
        .from('stripe_customers')
        .select('stripe_customer_id')
        .eq('user_id', userId)
        .single();

      if (existingCustomer?.stripe_customer_id) {
        return existingCustomer.stripe_customer_id;
      }

      // Get user profile to create customer
      const { data: userProfile } = await supabase
        .from('users')
        .select('email, first_name, last_name')
        .eq('id', userId)
        .single();

      if (!userProfile) {
        throw new Error('User profile not found');
      }

      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: userProfile.email,
        name: `${userProfile.first_name} ${userProfile.last_name}`,
        metadata: {
          userId,
          businessId,
          customerType: 'provider',
        },
      });

      // Store customer in database
      await supabase
        .from('stripe_customers')
        .insert({
          user_id: userId,
          business_id: businessId,
          stripe_customer_id: customer.id,
          customer_type: 'provider',
          created_at: new Date().toISOString(),
        });

      return customer.id;
    };

    switch (action) {
      case 'create_subscription': {
        if (!userId || !businessId || !priceId) {
          return res.status(400).json({ error: 'User ID, Business ID, and Price ID are required' });
        }

        const customerId = await getOrCreateCustomer();

        // Create subscription
        const subscription = await stripe.subscriptions.create({
          customer: customerId,
          items: [{ price: priceId }],
          payment_behavior: 'default_incomplete',
          payment_settings: { save_default_payment_method: 'on_subscription' },
          expand: ['latest_invoice.payment_intent'],
          metadata: {
            ...metadata,
            userId,
            businessId,
            subscriptionType: 'provider_platform',
          },
        });

        // Store subscription in database
        await supabase
          .from('provider_subscriptions')
          .insert({
            user_id: userId,
            business_id: businessId,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: customerId,
            price_id: priceId,
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            created_at: new Date().toISOString(),
          });

        return res.status(200).json({
          success: true,
          subscriptionId: subscription.id,
          customerId,
          status: subscription.status,
          clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
        });
      }

      case 'cancel_subscription': {
        if (!subscriptionId) {
          return res.status(400).json({ error: 'Subscription ID is required' });
        }

        const subscription = await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });

        // Update database
        await supabase
          .from('provider_subscriptions')
          .update({
            status: subscription.status,
            canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscriptionId);

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

        const subscription = await stripe.subscriptions.update(subscriptionId, {
          default_payment_method: paymentMethodId,
        });

        return res.status(200).json({
          success: true,
          subscriptionId: subscription.id,
          status: subscription.status,
        });
      }

      case 'get_subscription': {
        if (!subscriptionId) {
          return res.status(400).json({ error: 'Subscription ID is required' });
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        
        return res.status(200).json({
          success: true,
          subscription: {
            id: subscription.id,
            status: subscription.status,
            currentPeriodStart: subscription.current_period_start,
            currentPeriodEnd: subscription.current_period_end,
            cancelAt: subscription.cancel_at,
            canceledAt: subscription.canceled_at,
            metadata: subscription.metadata,
          },
        });
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (error) {
    console.error('Provider subscription error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
