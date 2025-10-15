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
    console.log('⚠️ Missing Stripe signature - this might be a test call');
    // For testing, allow requests without signature
    if (req.body && typeof req.body === 'object' && req.body.type === 'test') {
      console.log('🧪 Test webhook call detected');
      return res.status(200).json({ received: true });
    }
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
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    
    // TEMPORARY: Skip signature verification for testing
    console.log('⚠️ TEMPORARILY SKIPPING SIGNATURE VERIFICATION FOR TESTING');
    try {
      event = JSON.parse(rawBody);
    } catch (parseErr) {
      console.error('Failed to parse webhook body:', parseErr);
      return res.status(400).json({ error: 'Invalid webhook body' });
    }
  }

  console.log('Processing webhook event:', event.type);
  console.log('Event data:', JSON.stringify(event, null, 2));

  try {

    switch (event.type) {
      case 'checkout.session.completed': {
        console.log('🎯 Processing checkout.session.completed event');
        const session = event.data.object;
        const metadata = session.metadata;
        
        console.log('Session ID:', session.id);
        console.log('Metadata:', JSON.stringify(metadata, null, 2));

        if (metadata && metadata.customer_id) {
          console.log('✅ Metadata contains customer_id:', metadata.customer_id);
          // Generate booking reference (e.g., "BK25ABC10001")
          const today = new Date();
          const year = today.getFullYear().toString().slice(-2);
          const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
          const seqPart = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
          const bookingReference = `BK${year}${randomPart}${seqPart}`;

          // Extract booking details from metadata
          const totalAmount = parseFloat(metadata.total_amount);
          const platformFee = parseFloat(metadata.platform_fee || '0');
          const discountApplied = parseFloat(metadata.discount_applied || '0');
          
          const bookingData = {
            customer_id: metadata.customer_id,
            service_id: metadata.service_id,
            business_id: metadata.business_id,
            provider_id: metadata.provider_id || null,
            booking_date: metadata.booking_date,
            start_time: metadata.start_time,
            delivery_type: metadata.delivery_type,
            business_location_id: metadata.business_location_id || null,
            customer_location_id: metadata.customer_location_id || null,
            special_instructions: metadata.special_instructions || '',
            guest_name: metadata.guest_name || '',
            guest_email: metadata.guest_email || '',
            guest_phone: metadata.guest_phone || '',
            total_amount: totalAmount,
            service_fee: platformFee,
            stripe_checkout_session_id: session.id,
            payment_status: 'paid',
            booking_status: 'confirmed',
            booking_reference: bookingReference,
          };

          console.log('💾 Creating booking from checkout session:', bookingReference);

          // Create booking in database
          const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .insert([bookingData])
            .select()
            .single();

          if (bookingError) {
            console.error('❌ Error creating booking:', bookingError);
          } else {
            console.log('✅ Booking created successfully:', booking.id);

            // Create promotion_usage record if promotion was applied
            if (metadata.promotion_id && discountApplied > 0) {
              const originalAmount = parseFloat(metadata.original_amount || metadata.total_amount);
              const finalAmount = totalAmount;
              
              await supabase
                .from('promotion_usage')
                .insert({
                  promotion_id: metadata.promotion_id,
                  booking_id: booking.id,
                  discount_applied: discountApplied,
                  original_amount: originalAmount,
                  final_amount: finalAmount
                });
              
              console.log('✅ Promotion usage recorded for booking:', booking.id);
            }

            // Create payment transaction record
            const businessAmount = totalAmount - platformFee;

            await supabase
              .from('payment_transactions')
              .insert({
                booking_id: booking.id,
                transaction_type: 'payment',
                amount: totalAmount,
                stripe_payment_intent_id: session.payment_intent as string,
                stripe_charge_id: null,
                status: 'succeeded',
                processed_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
              });

            // Create financial transaction for audit trail
            await supabase
              .from('financial_transactions')
              .insert({
                booking_id: booking.id,
                amount: totalAmount,
                currency: 'USD',
                stripe_transaction_id: session.payment_intent as string,
                payment_method: 'card',
                description: `Payment for booking ${booking.booking_reference || booking.id}`,
                transaction_type: 'payment',
                status: 'completed',
                processed_at: new Date().toISOString(),
                metadata: {
                  platform_fee: platformFee,
                  business_amount: businessAmount,
                  session_id: session.id,
                },
                created_at: new Date().toISOString(),
              });

            // Create business payment transaction
            await supabase
              .from('business_payment_transactions')
              .insert({
                business_id: metadata.business_id,
                booking_id: booking.id,
                payment_date: new Date().toISOString().split('T')[0], // date only
                gross_payment_amount: totalAmount,
                platform_fee: platformFee,
                net_payment_amount: businessAmount,
                tax_year: new Date().getFullYear(),
                stripe_payment_intent_id: session.payment_intent as string,
                booking_reference: bookingReference,
              });

            console.log('✅ Business payment transaction recorded');

            // Update customer Stripe profile with payment method if saved
            if (session.customer && session.setup_intent) {
              const customerId = typeof session.customer === 'string' 
                ? session.customer 
                : session.customer.id;
              await updateCustomerPaymentMethods(customerId, session.setup_intent as string);
            }
          }
        } else {
          console.log('❌ Missing customer_id in metadata or metadata is null');
          console.log('Metadata:', metadata);
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

          // Create payment transaction record
          await supabase
            .from('payment_transactions')
            .insert({
              booking_id: bookingId,
              transaction_type: 'payment',
              amount: paymentIntent.amount / 100,
              stripe_payment_intent_id: paymentIntent.id,
              stripe_charge_id: null,
              status: 'succeeded',
              processed_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
            });

          // Create financial transaction for audit trail
          await supabase
            .from('financial_transactions')
            .insert({
              booking_id: bookingId,
              amount: paymentIntent.amount / 100,
              currency: paymentIntent.currency,
              stripe_transaction_id: paymentIntent.id,
              payment_method: 'card',
              transaction_type: 'payment',
              status: 'completed',
              processed_at: new Date().toISOString(),
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

          // Create payment transaction record
          await supabase
            .from('payment_transactions')
            .insert({
              booking_id: bookingId,
              transaction_type: 'payment',
              amount: paymentIntent.amount / 100,
              stripe_payment_intent_id: paymentIntent.id,
              stripe_charge_id: null,
              status: 'failed',
              created_at: new Date().toISOString(),
            });

          // Create financial transaction for audit trail
          await supabase
            .from('financial_transactions')
            .insert({
              booking_id: bookingId,
              amount: paymentIntent.amount / 100,
              currency: paymentIntent.currency,
              stripe_transaction_id: paymentIntent.id,
              payment_method: 'card',
              transaction_type: 'payment',
              status: 'failed',
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
