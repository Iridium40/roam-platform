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
 * Scheduled endpoint to capture service amount payments 24 hours before bookings
 * 
 * This endpoint should be called by a cron job daily to:
 * 1. Find bookings where service amount is authorized but not captured
 * 2. Check if booking is exactly 24 hours away
 * 3. Capture the payment intent
 * 4. Update booking status
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Require authorization for cron jobs (use a secret token)
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET || 'your-cron-secret-here';
  
  if (req.method === 'POST' || req.method === 'GET') {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    console.log('🕐 Starting scheduled service amount capture job...');
    const now = new Date();
    
    // Query booking_payment_schedules table for payments that are due
    // This is more efficient and uses the existing table structure
    const { data: scheduledPayments, error: schedulesError } = await supabase
      .from('booking_payment_schedules')
      .select(`
        id,
        booking_id,
        stripe_payment_intent_id,
        amount,
        scheduled_at,
        status,
        retry_count,
        bookings!inner (
          id,
          booking_date,
          start_time,
          booking_status,
          remaining_balance_charged,
          total_amount,
          service_fee,
          business_id,
          booking_reference,
          business_profiles!inner (
            id,
            stripe_connect_account_id
          )
        )
      `)
      .eq('status', 'scheduled')
      .eq('payment_type', 'remaining_balance')
      .lte('scheduled_at', now.toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(100); // Process max 100 at a time
      // Note: We filter by booking_status in the loop below since Supabase
      // doesn't support filtering on joined table columns directly

    if (schedulesError) {
      console.error('❌ Error fetching scheduled payments:', schedulesError);
      return res.status(500).json({ 
        error: 'Failed to fetch scheduled payments',
        details: schedulesError.message 
      });
    }

    if (!scheduledPayments || scheduledPayments.length === 0) {
      console.log('ℹ️ No scheduled payments found that need capture');
      return res.status(200).json({ 
        success: true,
        message: 'No scheduled payments to process',
        processed: 0,
      });
    }

    console.log(`📋 Found ${scheduledPayments.length} scheduled payments to process`);

    let processed = 0;
    let captured = 0;
    let failed = 0;
    const results: Array<{ scheduleId: string; bookingId: string; status: string; error?: string }> = [];

    for (const schedule of scheduledPayments) {
      try {
        const booking = Array.isArray(schedule.bookings) ? schedule.bookings[0] : schedule.bookings;
        
        if (!booking || booking.booking_status !== 'confirmed') {
          // Skip if booking is not in valid status
          continue;
        }

        // Skip if already charged
        if (booking.remaining_balance_charged) {
          // Update schedule status to processed
          await supabase
            .from('booking_payment_schedules')
            .update({ status: 'processed', processed_at: new Date().toISOString() })
            .eq('id', schedule.id);
          continue;
        }

        processed++;

        console.log(`💰 Processing scheduled payment ${schedule.id}:`, {
          bookingId: schedule.booking_id,
          paymentIntentId: schedule.stripe_payment_intent_id,
          scheduledAt: schedule.scheduled_at,
        });

        // Retrieve payment intent from Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(
          schedule.stripe_payment_intent_id!
        );

        // Check if payment intent is in requires_capture status
        if (paymentIntent.status !== 'requires_capture') {
          console.log(`⚠️ Payment intent ${paymentIntent.id} is not in requires_capture status: ${paymentIntent.status}`);
          
          // If it's already succeeded, update booking status
          if (paymentIntent.status === 'succeeded') {
            await supabase
              .from('bookings')
              .update({
                remaining_balance_charged: true,
                remaining_balance_charged_at: new Date().toISOString(),
                payment_status: 'paid',
              })
              .eq('id', booking.id);
            
            results.push({ 
              scheduleId: schedule.id,
              bookingId: booking.id, 
              status: 'already_captured' 
            });
            continue;
          }

          // If it's canceled or failed, mark as failed
          if (paymentIntent.status === 'canceled' || paymentIntent.status === 'requires_payment_method') {
            results.push({ 
              scheduleId: schedule.id,
              bookingId: booking.id, 
              status: 'failed',
              error: `Payment intent status: ${paymentIntent.status}` 
            });
            failed++;
            continue;
          }
        }

        // Capture the payment intent
        const capturedPaymentIntent = await stripe.paymentIntents.capture(
          paymentIntent.id
        );

        if (capturedPaymentIntent.status === 'succeeded') {
          // Update booking payment schedule
          await supabase
            .from('booking_payment_schedules')
            .update({
              status: 'processed',
              processed_at: new Date().toISOString(),
            })
            .eq('id', schedule.id);

          // Update booking
          await supabase
            .from('bookings')
            .update({
              remaining_balance_charged: true,
              remaining_balance_charged_at: new Date().toISOString(),
              payment_status: 'paid',
            })
            .eq('id', schedule.booking_id);

          // Update financial transaction status
          await supabase
            .from('financial_transactions')
            .update({
              status: 'completed',
              processed_at: new Date().toISOString(),
            })
            .eq('stripe_transaction_id', paymentIntent.id);

          // Create business_payment_transaction for the captured payment
          const booking = Array.isArray(schedule.bookings) ? schedule.bookings[0] : schedule.bookings;
          if (booking && booking.business_id) {
            const business = Array.isArray(booking.business_profiles) 
              ? booking.business_profiles[0] 
              : booking.business_profiles;
            
            const totalAmount = booking.total_amount || 0;
            const serviceFeeAmount = booking.service_fee || 0;
            const serviceAmount = totalAmount - serviceFeeAmount;
            const paymentDate = new Date().toISOString().split('T')[0];
            const currentYear = new Date().getFullYear();

            // Check if business_payment_transaction already exists (shouldn't, but check anyway)
            const { data: existingTransaction } = await supabase
              .from('business_payment_transactions')
              .select('id')
              .eq('booking_id', schedule.booking_id)
              .maybeSingle();

            if (!existingTransaction) {
              await supabase.from('business_payment_transactions').insert({
                booking_id: schedule.booking_id,
                business_id: booking.business_id,
                payment_date: paymentDate,
                gross_payment_amount: totalAmount,
                platform_fee: serviceFeeAmount,
                net_payment_amount: serviceAmount,
                tax_year: currentYear,
                stripe_payment_intent_id: paymentIntent.id,
                stripe_connect_account_id: business?.stripe_connect_account_id || null,
                booking_reference: booking.booking_reference || null,
                transaction_description: `Service payment for booking ${booking.booking_reference || schedule.booking_id}`,
                transaction_type: 'initial_booking', // Will be added after migration
              } as any); // Type assertion needed until migration adds column

              console.log(`✅ Created business_payment_transaction for booking ${schedule.booking_id}`);
            } else {
              console.log(`ℹ️ business_payment_transaction already exists for booking ${schedule.booking_id}`);
            }
          }

          console.log(`✅ Successfully captured payment for schedule ${schedule.id}`);
          captured++;
          results.push({ 
            scheduleId: schedule.id,
            bookingId: schedule.booking_id, 
            status: 'captured' 
          });
        } else {
          // Mark as failed
          await supabase
            .from('booking_payment_schedules')
            .update({
              status: 'failed',
              failure_reason: `Capture status: ${capturedPaymentIntent.status}`,
              retry_count: (schedule.retry_count || 0) + 1,
            })
            .eq('id', schedule.id);

          console.error(`❌ Failed to capture payment for schedule ${schedule.id}: ${capturedPaymentIntent.status}`);
          failed++;
          results.push({ 
            scheduleId: schedule.id,
            bookingId: schedule.booking_id, 
            status: 'failed',
            error: `Capture status: ${capturedPaymentIntent.status}` 
          });
        }
      } catch (error: any) {
        console.error(`❌ Error processing schedule ${schedule.id}:`, error);
        
        // Mark as failed
        await supabase
          .from('booking_payment_schedules')
          .update({
            status: 'failed',
            failure_reason: error.message || 'Unknown error',
            retry_count: (schedule.retry_count || 0) + 1,
          })
          .eq('id', schedule.id);

        failed++;
        results.push({ 
          scheduleId: schedule.id,
          bookingId: schedule.booking_id, 
          status: 'error',
          error: error.message || 'Unknown error' 
        });
      }
    }

    console.log(`✅ Capture job completed:`, {
      total: scheduledPayments.length,
      processed,
      captured,
      failed,
    });

    return res.status(200).json({
      success: true,
      message: 'Scheduled payment capture job completed',
      stats: {
        total: scheduledPayments.length,
        processed,
        captured,
        failed,
      },
      results,
    });

  } catch (error: any) {
    console.error('❌ Error in capture service amount job:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message || 'Unknown error',
    });
  }
}

