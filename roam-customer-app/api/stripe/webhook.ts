import { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { notifyProvidersNewBooking } from '../../lib/notifications/notify-providers-new-booking';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Utility function to read raw body from request stream
async function buffer(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req as any) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

// Disable body parsing for this endpoint - we need raw body for Stripe signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('🔔 Webhook received:', req.method);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  console.log('🔐 Verifying webhook signature...');
  let event: Stripe.Event;

  try {
    // Get raw body as buffer for signature verification
    const buf = await buffer(req);
    const rawBody = buf.toString('utf8');
    
    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
    console.log('✅ Webhook signature verified:', event.type);
  } catch (err: any) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
  }

  // Record webhook event in database for audit trail
  let webhookEventId: string | null = null;
  try {
    const { data: webhookEvent, error: webhookError } = await supabase
      .from('stripe_tax_webhook_events')
      .insert({
        stripe_event_id: event.id,
        stripe_event_type: event.type,
        stripe_object_id: (event.data.object as any).id || null,
        stripe_object_type: (event.data.object as any).object || null,
        event_data: event.data as any,
        processed: false,
        api_version: event.api_version,
        webhook_received_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (webhookError) {
      console.error('⚠️ Failed to record webhook event:', webhookError);
      // Continue processing anyway - don't fail webhook due to logging
    } else {
      webhookEventId = webhookEvent?.id || null;
      console.log('✅ Webhook event recorded:', event.id);
    }
  } catch (err) {
    console.error('⚠️ Error recording webhook event:', err);
    // Continue processing anyway
  }

  try {
    console.log('📋 Processing event type:', event.type);
    
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      default:
        console.log(`⚠️ Unhandled event type: ${event.type}`);
    }

    // Mark webhook event as processed
    if (webhookEventId) {
      await supabase
        .from('stripe_tax_webhook_events')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
        })
        .eq('id', webhookEventId);
    }

    console.log('✅ Webhook processed successfully');
    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('❌ Webhook handler error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });

    // Mark webhook event as failed with error
    if (webhookEventId) {
      await supabase
        .from('stripe_tax_webhook_events')
        .update({
          processed: false,
          processing_error: error.message || 'Unknown error',
          processed_at: new Date().toISOString(),
        })
        .eq('id', webhookEventId);
    }

    return res.status(500).json({ error: error.message });
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('✅ Checkout session completed:', session.id);
  
  // Check if this is a tip payment
  if (session.metadata?.type === 'tip') {
    await handleTipPayment(session);
  } else {
    // Handle regular booking payments
    await handleBookingPayment(session);
  }
}

async function handleTipPayment(session: Stripe.Checkout.Session) {
  const {
    booking_id,
    customer_id,
    provider_id,
    business_id,
    tip_amount,
    stripe_fee,
    provider_net,
    customer_message,
  } = session.metadata!;

  try {
    console.log('💳 Processing tip payment:', {
      sessionId: session.id,
      bookingId: booking_id,
      tipAmount: tip_amount,
    });

    // Create tip record in database
    const { data, error } = await supabase
      .from('tips')
      .insert({
        booking_id,
        customer_id,
        provider_id,
        business_id,
        tip_amount: parseFloat(tip_amount),
        tip_percentage: 0, // We'll calculate this if needed
        payment_status: 'completed',
        stripe_payment_intent_id: session.payment_intent as string,
        stripe_session_id: session.id,
        platform_fee_amount: parseFloat(stripe_fee), // Stripe processing fees only
        provider_net_amount: parseFloat(provider_net), // Tip minus Stripe fees
        customer_message: customer_message || '',
      })
      .select()
        .single();

        if (error) {
      console.error('❌ Error creating tip record:', error);
      throw error;
    }

    console.log('✅ Tip record created successfully:', data.id);

    // Update booking with tip information (optional)
    await supabase
      .from('bookings')
      .update({
        has_tip: true,
        tip_amount: parseFloat(tip_amount),
      })
      .eq('id', booking_id);

  } catch (error) {
    console.error('❌ Error processing tip payment:', error);
    throw error;
  }
}

async function handleBookingPayment(session: Stripe.Checkout.Session) {
  // Handle regular booking payments (existing logic)
  console.log('📅 Processing booking payment:', session.id);
  // Add existing booking payment logic here if needed
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log('✅ Payment intent succeeded:', paymentIntent.id);
  console.log('💳 Payment metadata:', paymentIntent.metadata);
  
  try {
    // Check if this is a tip payment
    if (paymentIntent.metadata?.type === 'tip') {
      console.log('💰 Processing as tip payment');
      await handleTipPaymentIntent(paymentIntent);
      return;
    }

    const bookingId = paymentIntent.metadata.bookingId;
    
    if (!bookingId) {
      console.error('❌ No booking ID in payment intent metadata');
      console.error('Available metadata:', paymentIntent.metadata);
      return;
    }

    console.log(`📋 Confirming booking: ${bookingId}`);

    // Get booking details for transaction recording and notifications
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        business_id,
        provider_id,
        total_amount,
        booking_date,
        start_time,
        special_instructions,
        services (
          name
        ),
        customer_profiles (
          id,
          first_name,
          last_name,
          email,
          phone
        ),
        business_profiles (
          id,
          name,
          business_address
        )
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError) {
      console.error('❌ Error fetching booking:', bookingError);
      throw bookingError;
    }

    console.log('📦 Booking data:', booking);

    // Update booking status to confirmed
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        booking_status: 'confirmed',
        payment_status: 'completed',
        stripe_payment_intent_id: paymentIntent.id,
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (updateError) {
      console.error('❌ Error updating booking:', updateError);
      throw updateError;
    }

    console.log(`✅ Booking ${bookingId} status updated to confirmed`);

    // Notify providers about the new booking (non-blocking)
    try {
      const service = Array.isArray(booking.services) ? booking.services[0] : booking.services;
      const customer = Array.isArray(booking.customer_profiles) ? booking.customer_profiles[0] : booking.customer_profiles;
      const business = Array.isArray(booking.business_profiles) ? booking.business_profiles[0] : booking.business_profiles;

      if (service && customer && business) {
        await notifyProvidersNewBooking({
          booking: {
            id: booking.id,
            business_id: booking.business_id,
            provider_id: booking.provider_id,
            booking_date: booking.booking_date,
            start_time: booking.start_time,
            total_amount: booking.total_amount,
            special_instructions: booking.special_instructions,
          },
          service: {
            name: service.name,
          },
          customer: {
            first_name: customer.first_name || '',
            last_name: customer.last_name || '',
            email: customer.email,
            phone: customer.phone,
          },
          business: {
            name: business.name,
            business_address: business.business_address,
          },
        });
      }
    } catch (notificationError) {
      console.error('⚠️ Error sending provider notifications (non-fatal):', notificationError);
      // Continue - don't fail the webhook if notifications fail
    }

    // Record in financial_transactions (overall payment ledger)
    const totalAmount = paymentIntent.amount / 100;
    console.log(`💵 Recording financial transaction: $${totalAmount}`);
    
    const { error: financialError } = await supabase.from('financial_transactions').insert({
      booking_id: bookingId,
      amount: totalAmount,
      currency: paymentIntent.currency.toUpperCase(),
      stripe_transaction_id: paymentIntent.id,
      payment_method: 'card',
      description: 'Service booking payment received',
      transaction_type: 'service_payment',
      status: 'completed',
      processed_at: new Date().toISOString(),
      metadata: {
        charge_id: paymentIntent.latest_charge,
        customer_id: paymentIntent.customer,
        payment_method_types: paymentIntent.payment_method_types
      }
    });

    if (financialError) {
      console.error('❌ Error recording financial transaction:', financialError);
      throw financialError;
    }

    console.log('✅ Financial transaction recorded');

    // Record payment splits in payment_transactions
    const platformFee = totalAmount * 0.12; // 12% platform fee
    const providerAmount = totalAmount - platformFee;

    console.log(`💰 Recording payment splits: Platform $${platformFee.toFixed(2)}, Provider $${providerAmount.toFixed(2)}`);

    // Platform fee transaction
    const { error: platformError } = await supabase.from('payment_transactions').insert({
      booking_id: bookingId,
      transaction_type: 'service_fee',
      amount: platformFee,
      destination_account: 'roam_platform',
      stripe_payment_intent_id: paymentIntent.id,
      stripe_charge_id: paymentIntent.latest_charge as string,
      status: 'completed',
      processed_at: new Date().toISOString()
    });

    if (platformError) {
      console.error('❌ Error recording platform fee:', platformError);
      throw platformError;
    }

    console.log('✅ Platform fee transaction recorded');

    // Provider payment transaction (pending transfer)
    const { error: providerError } = await supabase.from('payment_transactions').insert({
      booking_id: bookingId,
      transaction_type: 'remaining_balance',
      amount: providerAmount,
      destination_account: 'provider_connected',
      stripe_payment_intent_id: paymentIntent.id,
      stripe_charge_id: paymentIntent.latest_charge as string,
      status: 'pending', // Will be completed when transferred to provider
      processed_at: null
    });

    if (providerError) {
      console.error('❌ Error recording provider payment:', providerError);
      throw providerError;
    }

    console.log('✅ Provider payment transaction recorded');
    console.log(`✅ All financial transactions recorded for booking ${bookingId}`);

  } catch (error: any) {
    console.error('❌ Error handling payment intent succeeded:', error);
    console.error('Error stack:', error.stack);
    throw error;
  }
}

async function handleTipPaymentIntent(paymentIntent: Stripe.PaymentIntent) {
  const {
    booking_id,
    customer_id,
    provider_id,
    business_id,
    tip_amount,
    stripe_fee,
    provider_net,
    customer_message,
  } = paymentIntent.metadata;

  try {
    console.log('💳 Processing tip payment intent:', {
      paymentIntentId: paymentIntent.id,
      bookingId: booking_id,
      tipAmount: tip_amount,
    });

    // Create tip record in database
    const { data, error } = await supabase
      .from('tips')
      .insert({
        booking_id,
        customer_id,
        provider_id,
        business_id,
        tip_amount: parseFloat(tip_amount),
        tip_percentage: 0, // We'll calculate this if needed
        payment_status: 'completed',
        stripe_payment_intent_id: paymentIntent.id,
        platform_fee_amount: parseFloat(stripe_fee), // Stripe processing fees only
        provider_net_amount: parseFloat(provider_net), // Tip minus Stripe fees
        customer_message: customer_message || '',
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating tip record:', error);
      throw error;
    }

    console.log('✅ Tip record created successfully:', data.id);

    // Update booking with tip information
    await supabase
      .from('bookings')
      .update({
        has_tip: true,
        tip_amount: parseFloat(tip_amount),
      })
      .eq('id', booking_id);

    // Record in financial_transactions
    await supabase.from('financial_transactions').insert({
      booking_id,
      amount: parseFloat(tip_amount),
      currency: paymentIntent.currency.toUpperCase(),
      stripe_transaction_id: paymentIntent.id,
      payment_method: 'card',
      description: 'Tip payment received',
      transaction_type: 'tip_payment',
      status: 'completed',
      processed_at: new Date().toISOString(),
      metadata: {
        charge_id: paymentIntent.latest_charge,
        customer_id: paymentIntent.customer,
        provider_id,
        business_id,
        tip_amount: parseFloat(tip_amount),
        stripe_fee: parseFloat(stripe_fee),
        provider_net: parseFloat(provider_net),
        customer_message: customer_message || ''
      }
    });

    console.log('✅ Tip payment processed successfully');

  } catch (error) {
    console.error('❌ Error processing tip payment intent:', error);
    throw error;
  }
}