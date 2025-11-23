import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia' as any,
  typescript: true,
});

// Initialize Supabase
const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Endpoint called by Supabase pg_cron function to capture scheduled payments
 * This is called from the database function, so it needs to be accessible
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { schedule_id, booking_id, payment_intent_id } = req.body;

    if (!schedule_id || !booking_id || !payment_intent_id) {
      return res.status(400).json({ 
        error: 'Missing required fields: schedule_id, booking_id, payment_intent_id' 
      });
    }

    console.log('💰 Capturing scheduled payment:', {
      scheduleId: schedule_id,
      bookingId: booking_id,
      paymentIntentId: payment_intent_id,
    });

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    // Check if payment intent is in requires_capture status
    if (paymentIntent.status !== 'requires_capture') {
      if (paymentIntent.status === 'succeeded') {
        // Already captured - update schedule and booking
        await supabase
          .from('booking_payment_schedules')
          .update({
            status: 'processed',
            processed_at: new Date().toISOString(),
          })
          .eq('id', schedule_id);

        await supabase
          .from('bookings')
          .update({
            remaining_balance_charged: true,
            remaining_balance_charged_at: new Date().toISOString(),
            payment_status: 'paid',
          })
          .eq('id', booking_id);

        return res.status(200).json({
          success: true,
          message: 'Payment already captured',
          paymentIntentId: payment_intent_id,
        });
      }

      return res.status(400).json({
        success: false,
        error: `Payment intent not in requires_capture status: ${paymentIntent.status}`,
      });
    }

    // Capture the payment intent
    const capturedPaymentIntent = await stripe.paymentIntents.capture(payment_intent_id);

    if (capturedPaymentIntent.status === 'succeeded') {
      // Update booking payment schedule
      await supabase
        .from('booking_payment_schedules')
        .update({
          status: 'processed',
          processed_at: new Date().toISOString(),
        })
        .eq('id', schedule_id);

      // Update booking
      await supabase
        .from('bookings')
        .update({
          remaining_balance_charged: true,
          remaining_balance_charged_at: new Date().toISOString(),
          payment_status: 'paid',
        })
        .eq('id', booking_id);

      // Update financial transaction status
      await supabase
        .from('financial_transactions')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString(),
        })
        .eq('stripe_transaction_id', payment_intent_id);

      console.log('✅ Successfully captured payment:', {
        scheduleId: schedule_id,
        bookingId: booking_id,
        paymentIntentId: payment_intent_id,
      });

      return res.status(200).json({
        success: true,
        message: 'Payment captured successfully',
        paymentIntentId: payment_intent_id,
      });
    } else {
      // Mark as failed
      await supabase
        .from('booking_payment_schedules')
        .update({
          status: 'failed',
          failure_reason: `Capture status: ${capturedPaymentIntent.status}`,
          retry_count: 1,
        })
        .eq('id', schedule_id);

      return res.status(500).json({
        success: false,
        error: `Failed to capture payment: ${capturedPaymentIntent.status}`,
      });
    }
  } catch (error: any) {
    console.error('❌ Error capturing scheduled payment:', error);

    // Try to update schedule with error if we have schedule_id
    if (req.body.schedule_id) {
      await supabase
        .from('booking_payment_schedules')
        .update({
          status: 'failed',
          failure_reason: error.message || 'Unknown error',
          retry_count: 1,
        })
        .eq('id', req.body.schedule_id);
    }

    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to capture payment',
    });
  }
}

