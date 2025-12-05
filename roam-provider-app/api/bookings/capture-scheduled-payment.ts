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

    // Fetch booking details for business_payment_transactions
    const { data: bookingData, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        total_amount,
        service_fee,
        business_id,
        booking_reference,
        business_profiles!inner (
          id,
          stripe_connect_accounts (
            account_id,
            charges_enabled,
            payouts_enabled
          )
        )
      `)
      .eq('id', booking_id)
      .single();

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

        // Update financial transaction status
        await supabase
          .from('financial_transactions')
          .update({
            status: 'completed',
            processed_at: new Date().toISOString(),
          })
          .eq('stripe_transaction_id', payment_intent_id);

        // Create business_payment_transaction if it doesn't exist
        if (bookingData && bookingData.business_id) {
          const business = Array.isArray(bookingData.business_profiles) 
            ? bookingData.business_profiles[0] 
            : bookingData.business_profiles;
          
          const { data: existingTransaction } = await supabase
            .from('business_payment_transactions')
            .select('id')
            .eq('booking_id', booking_id)
            .maybeSingle();

          if (!existingTransaction) {
            const totalAmount = bookingData.total_amount || 0;
            const serviceFeeAmount = bookingData.service_fee || 0;
            const serviceAmount = totalAmount - serviceFeeAmount;
            const paymentDate = new Date().toISOString().split('T')[0];
            const currentYear = new Date().getFullYear();

            await supabase.from('business_payment_transactions').insert({
              booking_id: booking_id,
              business_id: bookingData.business_id,
              payment_date: paymentDate,
              gross_payment_amount: totalAmount,
              platform_fee: serviceFeeAmount,
              net_payment_amount: serviceAmount,
              tax_year: currentYear,
              stripe_payment_intent_id: payment_intent_id,
              stripe_connect_account_id: (Array.isArray(business?.stripe_connect_accounts) ? business?.stripe_connect_accounts[0] : business?.stripe_connect_accounts)?.account_id || null,
              booking_reference: bookingData.booking_reference || null,
              transaction_description: `Service payment for booking ${bookingData.booking_reference || booking_id}`,
            });
          }
        }

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

      // Create business_payment_transaction
      if (bookingData && bookingData.business_id) {
        const business = Array.isArray(bookingData.business_profiles) 
          ? bookingData.business_profiles[0] 
          : bookingData.business_profiles;
        
        // Get stripe_connect_account_id from stripe_connect_accounts table
        const stripeConnectAccount = Array.isArray(business?.stripe_connect_accounts)
          ? business?.stripe_connect_accounts[0]
          : business?.stripe_connect_accounts;
        const stripeConnectAccountId = stripeConnectAccount?.account_id || null;
        
        const { data: existingTransaction } = await supabase
          .from('business_payment_transactions')
          .select('id')
          .eq('booking_id', booking_id)
          .maybeSingle();

        if (!existingTransaction) {
          const totalAmount = bookingData.total_amount || 0;
          const serviceFeeAmount = bookingData.service_fee || 0;
          const serviceAmount = totalAmount - serviceFeeAmount;
          const paymentDate = new Date().toISOString().split('T')[0];
          const currentYear = new Date().getFullYear();

          await supabase.from('business_payment_transactions').insert({
            booking_id: booking_id,
            business_id: bookingData.business_id,
            payment_date: paymentDate,
            gross_payment_amount: totalAmount,
            platform_fee: serviceFeeAmount,
            net_payment_amount: serviceAmount,
            tax_year: currentYear,
            stripe_payment_intent_id: payment_intent_id,
            stripe_connect_account_id: stripeConnectAccountId,
            booking_reference: bookingData.booking_reference || null,
            transaction_description: `Service payment for booking ${bookingData.booking_reference || booking_id}`,
            transaction_type: 'initial_booking', // Will be added after migration
          } as any); // Type assertion needed until migration adds column

          console.log('✅ Created business_payment_transaction for booking', booking_id);
        }
      }

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

