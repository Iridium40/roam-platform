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
 * Payment processing result
 */
export interface PaymentProcessingResult {
  success: boolean;
  error?: string;
  serviceFeeCharged?: boolean;
  serviceAmountCharged?: boolean;
  serviceAmountAuthorized?: boolean;
  paymentIntentId?: string;
  refundAmount?: number;
}

/**
 * Handle refunds when customer cancels booking
 * 
 * Rules:
 * - If cancelled BEFORE acceptance: Cancel payment intents (no charges)
 * - If cancelled AFTER acceptance:
 *   - >24h before booking: Refund service amount ONLY (service fee is NON-REFUNDABLE)
 *   - ≤24h before booking: NO refunds (keep everything)
 */
export async function handleBookingCancellation(
  bookingId: string,
  cancelledBy: string,
  reason?: string
): Promise<PaymentProcessingResult> {
  try {
    console.log('🔄 Processing refund for booking cancellation:', {
      bookingId,
      cancelledBy,
      reason,
    });

    // Fetch booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        stripe_payment_intent_id,
        stripe_service_amount_payment_intent_id,
        total_amount,
        service_fee,
        service_fee_charged,
        remaining_balance_charged,
        booking_date,
        start_time,
        booking_status,
        payment_status
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return {
        success: false,
        error: `Booking not found: ${bookingError?.message || 'Unknown error'}`,
      };
    }

    // Check if booking was confirmed
    const wasAccepted = booking.booking_status === 'confirmed' ||
                        booking.service_fee_charged === true;

    if (!wasAccepted) {
      // Booking was cancelled before acceptance - cancel payment intents
      console.log('📋 Booking cancelled before acceptance - cancelling payment intents');

      if (booking.stripe_payment_intent_id) {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(booking.stripe_payment_intent_id);

          if (paymentIntent.status !== 'succeeded' && paymentIntent.status !== 'canceled') {
            await stripe.paymentIntents.cancel(paymentIntent.id);
            console.log('✅ Payment intent cancelled:', paymentIntent.id);
          }
        } catch (stripeError: any) {
          console.error('⚠️ Error cancelling payment intent:', stripeError);
        }
      }

      return {
        success: true,
        refundAmount: 0,
      };
    }

    // Booking was accepted - check timing for refund eligibility
    const bookingDateTime = new Date(`${booking.booking_date}T${booking.start_time}`);
    const now = new Date();
    const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    const isWithin24Hours = hoursUntilBooking <= 24;

    console.log('⏰ Cancellation timing:', {
      hoursUntilBooking: hoursUntilBooking.toFixed(2),
      isWithin24Hours,
      serviceFeeCharged: booking.service_fee_charged,
      serviceAmountCharged: booking.remaining_balance_charged,
    });

    if (isWithin24Hours) {
      // No refunds for cancellations within 24 hours
      console.log('❌ No refund - cancellation within 24 hours');
      
      await supabase
        .from('bookings')
        .update({
          cancellation_fee: booking.total_amount || 0,
          refund_amount: 0,
        })
        .eq('id', bookingId);

      return {
        success: true,
        refundAmount: 0,
      };
    }

    // Refund service amount only (service fee is NON-REFUNDABLE)
    const serviceFeeAmount = booking.service_fee || 0;
    const serviceAmount = (booking.total_amount || 0) - serviceFeeAmount;
    const refundAmount = serviceAmount;

    console.log('💰 Processing partial refund:', {
      totalAmount: booking.total_amount,
      serviceFeeAmount,
      serviceAmount,
      refundAmount,
    });

    // Use service amount payment intent if available, otherwise try to refund from main payment intent
    const paymentIntentIdToRefund = booking.stripe_service_amount_payment_intent_id || booking.stripe_payment_intent_id;

    if (!paymentIntentIdToRefund) {
      return {
        success: false,
        error: 'No payment intent found for refund',
      };
    }

    // Check payment intent status
    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentIdToRefund);
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to retrieve payment intent: ${error.message}`,
      };
    }

    // If payment intent is authorized but not captured, just cancel it
    if (paymentIntent.status === 'requires_capture') {
      try {
        await stripe.paymentIntents.cancel(paymentIntent.id);
        console.log('✅ Cancelled authorized payment intent (no refund needed):', paymentIntent.id);
        
        // Update booking
        await supabase
          .from('bookings')
          .update({
            cancellation_fee: serviceFeeAmount,
            refund_amount: 0, // No refund needed - payment wasn't captured
          })
          .eq('id', bookingId);

        return {
          success: true,
          refundAmount: 0, // No refund - payment was never captured
        };
      } catch (cancelError: any) {
        console.error('⚠️ Error cancelling payment intent:', cancelError);
        return {
          success: false,
          error: `Failed to cancel payment intent: ${cancelError.message}`,
        };
      }
    }

    // If payment intent was already captured, create refund
    if (paymentIntent.status !== 'succeeded') {
      return {
        success: false,
        error: `Payment intent not in succeeded status: ${paymentIntent.status}`,
      };
    }

    // Create partial refund for service amount only
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentIdToRefund,
      amount: Math.round(refundAmount * 100), // Convert to cents
      reason: 'requested_by_customer',
      metadata: {
        booking_id: bookingId,
        reason: 'customer_cancellation',
        cancelled_by: cancelledBy,
        refund_type: 'service_amount_only',
        service_fee_kept: serviceFeeAmount.toString(),
      },
    });

    console.log('✅ Partial refund processed:', refund.id);

    // Record refund transaction
    await supabase.from('financial_transactions').insert({
      booking_id: bookingId,
      amount: refundAmount,
      currency: 'USD',
      stripe_transaction_id: refund.id,
      payment_method: 'card',
      description: 'Partial refund - service amount (service fee non-refundable)',
      transaction_type: 'refund',
      status: 'completed',
      processed_at: new Date().toISOString(),
      metadata: {
        original_payment_intent: booking.stripe_payment_intent_id,
        refund_amount: refundAmount,
        service_fee_kept: serviceFeeAmount,
        reason: 'customer_cancellation',
      },
    });

    // Update booking with refund details
    await supabase
      .from('bookings')
      .update({
        cancellation_fee: serviceFeeAmount, // Service fee is kept
        refund_amount: refundAmount,
      })
      .eq('id', bookingId);

    return {
      success: true,
      refundAmount,
    };
  } catch (error: any) {
    console.error('❌ Error processing booking cancellation refund:', error);
    return {
      success: false,
      error: error.message || 'Failed to process refund',
    };
  }
}

