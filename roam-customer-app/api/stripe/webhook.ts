import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createStripePaymentService } from '@roam/shared';
import { createClient } from "@supabase/supabase-js";

const stripeService = createStripePaymentService();
const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const signature = req.headers['stripe-signature'] as string;
  if (!signature) {
    return res.status(400).json({ error: 'Missing Stripe signature' });
  }

  try {
    // Process webhook
    const result = await stripeService.processWebhook(JSON.stringify(req.body), signature);
    
    if (!result.success || !result.event) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const event = result.event;
    console.log('Processing webhook event:', event.type);

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        const bookingId = paymentIntent.metadata?.bookingId;
        
        if (bookingId) {
          // Update booking status
          await supabase
            .from('bookings')
            .update({
              payment_status: 'paid',
              stripe_payment_intent_id: paymentIntent.id,
              paid_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', bookingId);

          // Create payment record
          await supabase
            .from('payments')
            .insert({
              booking_id: bookingId,
              stripe_payment_intent_id: paymentIntent.id,
              amount: paymentIntent.amount / 100,
              currency: paymentIntent.currency,
              status: 'succeeded',
              customer_id: paymentIntent.customer,
              created_at: new Date().toISOString(),
            });
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        const bookingId = paymentIntent.metadata?.bookingId;
        
        if (bookingId) {
          // Update booking status
          await supabase
            .from('bookings')
            .update({
              payment_status: 'failed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', bookingId);

          // Create payment record
          await supabase
            .from('payments')
            .insert({
              booking_id: bookingId,
              stripe_payment_intent_id: paymentIntent.id,
              amount: paymentIntent.amount / 100,
              currency: paymentIntent.currency,
              status: 'failed',
              customer_id: paymentIntent.customer,
              failure_reason: paymentIntent.last_payment_error?.message,
              created_at: new Date().toISOString(),
            });
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        
        if (subscriptionId) {
          // Update subscription status
          await supabase
            .from('customer_subscriptions')
            .update({
              status: 'active',
              current_period_start: new Date(invoice.period_start * 1000).toISOString(),
              current_period_end: new Date(invoice.period_end * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', subscriptionId);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        
        if (subscriptionId) {
          // Update subscription status
          await supabase
            .from('customer_subscriptions')
            .update({
              status: 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', subscriptionId);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        
        // Update subscription status
        await supabase
          .from('customer_subscriptions')
          .update({
            status: 'canceled',
            canceled_at: new Date(subscription.canceled_at * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(400).json({ error: 'Webhook processing failed' });
  }
}
