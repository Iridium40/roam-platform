import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-11-20.acacia' as any });
const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Disable the default body parser (equivalent to Next.js config)
export const config = { api: { bodyParser: false } };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const signature = req.headers['stripe-signature'] as string;
  if (!signature) {
    return res.status(400).json({ error: 'Missing Stripe signature' });
  }

  let event: Stripe.Event;

  try {
    // Get raw body for signature verification
    const rawBody = await getRawBody(req);

    // Verify webhook signature and construct event
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SIGNING_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  console.log('Processing webhook event:', event.type);

  try {

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const metadata = session.metadata;

        if (metadata && metadata.customer_id) {
          // Extract booking details from metadata
          const bookingData = {
            customer_id: metadata.customer_id,
            service_id: metadata.service_id,
            business_id: metadata.business_id,
            provider_id: metadata.provider_id || null,
            booking_date: metadata.booking_date,
            start_time: metadata.start_time,
            delivery_type: metadata.delivery_type,
            special_instructions: metadata.special_instructions || '',
            promotion_id: metadata.promotion_id || null,
            guest_phone: metadata.guest_phone || '',
            total_amount: parseFloat(metadata.total_amount),
            service_price: parseFloat(metadata.total_amount), // Use total_amount as service_price for now
            service_fee: parseFloat(metadata.platform_fee || '0'),
            discount_applied: 0, // Not passed in metadata yet
            stripe_checkout_session_id: session.id,
            stripe_payment_intent_id: session.payment_intent as string,
            payment_status: 'paid',
            booking_status: 'confirmed',
            paid_at: new Date().toISOString()
          };

          // Create booking in database
          const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .insert([bookingData])
            .select()
            .single();

          if (bookingError) {
            console.error('Error creating booking:', bookingError);
          } else {
            console.log('✅ Booking created successfully:', booking.id);

            // Update customer Stripe profile with payment method if saved
            if (session.customer && session.setup_intent) {
              await updateCustomerPaymentMethods(session.customer, session.setup_intent);
            }
          }
        }
        break;
      }

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
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string | { id: string } };
        const subscriptionId = typeof invoice.subscription === 'string' 
          ? invoice.subscription 
          : invoice.subscription?.id;
        
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
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string | { id: string } };
        const subscriptionId = typeof invoice.subscription === 'string' 
          ? invoice.subscription 
          : invoice.subscription?.id;
        
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

// Helper function to get raw body for signature verification
async function getRawBody(req: VercelRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      resolve(data);
    });
    req.on('error', (err) => {
      reject(err);
    });
  });
}

async function updateCustomerPaymentMethods(customerId: string, setupIntentId: string) {
  try {

    // Get the setup intent to find the payment method
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);

    if (setupIntent.payment_method) {
      // Get payment method details
      const paymentMethod = await stripe.paymentMethods.retrieve(
        setupIntent.payment_method as string
      );

      // Get existing customer profile
      const { data: existingProfile } = await supabase
        .from('customer_stripe_profiles')
        .select('payment_methods')
        .eq('stripe_customer_id', customerId)
        .single();

      const existingMethods = existingProfile?.payment_methods || [];

      // Add new payment method if not already exists
      const methodExists = existingMethods.some((method: any) => method.id === paymentMethod.id);

      if (!methodExists) {
        const updatedMethods = [...existingMethods, {
          id: paymentMethod.id,
          type: paymentMethod.type,
          card: paymentMethod.card,
          created: paymentMethod.created
        }];

        // Update customer Stripe profile
        const { error } = await supabase
          .from('customer_stripe_profiles')
          .update({
            default_payment_method_id: paymentMethod.id,
            payment_methods: updatedMethods
          })
          .eq('stripe_customer_id', customerId);

        if (error) {
          console.error('Error updating customer payment methods:', error);
        } else {
          console.log('✅ Customer payment methods updated for:', customerId);
        }
      }
    }
  } catch (error) {
    console.error('Error updating customer payment methods:', error);
  }
}
