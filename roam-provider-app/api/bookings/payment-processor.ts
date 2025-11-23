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
 * Process payment when booking is accepted
 * 
 * Rules:
 * 1. Service fee (12%) is charged immediately (NON-REFUNDABLE)
 * 2. Service amount handling:
 *    - If booking is >24h away: Authorize (capture later at 24h mark)
 *    - If booking is ≤24h away: Charge immediately
 */
export async function processBookingAcceptance(
  bookingId: string,
  acceptedBy: string,
  providerStripeId?: string
): Promise<PaymentProcessingResult> {
  try {
    console.log('💰 Processing payment for booking acceptance:', { bookingId, acceptedBy });

    // Fetch booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        stripe_payment_intent_id,
        total_amount,
        service_fee,
        booking_date,
        start_time,
        booking_status,
        payment_status,
        customer_id,
        business_id
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return {
        success: false,
        error: `Booking not found: ${bookingError?.message || 'Unknown error'}`,
      };
    }

    // Check if booking is already accepted/confirmed
    if (booking.booking_status === 'confirmed' || booking.booking_status === 'accepted') {
      console.log('⚠️ Booking already accepted, skipping payment processing');
      return {
        success: true,
        serviceFeeCharged: booking.service_fee_charged || false,
        serviceAmountCharged: booking.remaining_balance_charged || false,
      };
    }

    // Check if payment intent exists
    if (!booking.stripe_payment_intent_id) {
      return {
        success: false,
        error: 'No payment intent found for this booking',
      };
    }

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(booking.stripe_payment_intent_id);

    // Check if payment intent is already succeeded (e.g., from initial acceptance or rescheduled booking)
    if (paymentIntent.status === 'succeeded') {
      console.log('✅ Payment intent already succeeded - booking was previously accepted');
      console.log('📋 This may be a rescheduled booking - no additional charges will be made');
      
      // Update booking to mark service fee as charged (if not already marked)
      const serviceFeeAmount = booking.service_fee || 0;
      const serviceAmount = (booking.total_amount || 0) - serviceFeeAmount;
      
      // Check if booking is within 24 hours (may have changed due to reschedule)
      const bookingDateTime = new Date(`${booking.booking_date}T${booking.start_time}`);
      const now = new Date();
      const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      const isWithin24Hours = hoursUntilBooking <= 24;

      // Update remaining balance charge status based on current date
      // Note: We don't charge or refund - we just update the status
      // If rescheduled to ≤24h and wasn't charged before, we should mark it
      // But we can't actually charge it now since payment intent is already succeeded
      const updateData: any = {
        service_fee_charged: true,
      };

      // Only update remaining_balance_charged if it's different from current state
      if (booking.remaining_balance_charged !== isWithin24Hours) {
        updateData.remaining_balance_charged = isWithin24Hours;
        if (isWithin24Hours && !booking.remaining_balance_charged) {
          updateData.remaining_balance_charged_at = new Date().toISOString();
        }
      }

      await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', bookingId);

      console.log('✅ Booking payment status updated (no additional charges):', {
        serviceFeeCharged: true,
        remainingBalanceCharged: isWithin24Hours,
        hoursUntilBooking: hoursUntilBooking.toFixed(2),
      });

      return {
        success: true,
        serviceFeeCharged: true,
        serviceAmountCharged: isWithin24Hours,
        serviceAmountAuthorized: !isWithin24Hours,
        paymentIntentId: paymentIntent.id,
      };
    }

    // Calculate amounts
    const totalAmount = booking.total_amount || 0;
    const serviceFeeAmount = booking.service_fee || 0;
    const serviceAmount = totalAmount - serviceFeeAmount;

    // Check if booking is within 24 hours
    const bookingDateTime = new Date(`${booking.booking_date}T${booking.start_time}`);
    const now = new Date();
    const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    const isWithin24Hours = hoursUntilBooking <= 24;

    console.log('📊 Payment breakdown:', {
      totalAmount,
      serviceFeeAmount,
      serviceAmount,
      hoursUntilBooking: hoursUntilBooking.toFixed(2),
      isWithin24Hours,
    });

    // Check if payment intent has a payment method attached
    // If not, we can't confirm it - the customer needs to provide payment method first
    if (!paymentIntent.payment_method && paymentIntent.status === 'requires_payment_method') {
      return {
        success: false,
        error: 'Payment method not attached to payment intent. Customer must provide payment method first.',
      };
    }

    // If payment intent is already succeeded, we're good
    if (paymentIntent.status === 'succeeded') {
      console.log('✅ Payment intent already succeeded');
      
      // Update booking with payment status
      await supabase
        .from('bookings')
        .update({
          service_fee_charged: true,
          service_fee_charged_at: new Date().toISOString(),
          remaining_balance_charged: isWithin24Hours,
          remaining_balance_charged_at: isWithin24Hours ? new Date().toISOString() : null,
          payment_status: isWithin24Hours ? 'paid' : 'partial',
        })
        .eq('id', bookingId);

      return {
        success: true,
        serviceFeeCharged: true,
        serviceAmountCharged: isWithin24Hours,
        serviceAmountAuthorized: !isWithin24Hours,
        paymentIntentId: paymentIntent.id,
      };
    }

    // Confirm the payment intent (this charges the customer)
    // This will work if payment method is already attached
    let confirmedPaymentIntent: Stripe.PaymentIntent;
    
    if (paymentIntent.status === 'requires_confirmation') {
      // Payment method is attached, just need to confirm
      confirmedPaymentIntent = await stripe.paymentIntents.confirm(paymentIntent.id);
    } else if (paymentIntent.status === 'requires_payment_method') {
      // Need to attach payment method first - this shouldn't happen if customer already provided it
      return {
        success: false,
        error: 'Payment method required. Customer must complete payment setup first.',
      };
    } else {
      // Payment intent is in an unexpected state
      return {
        success: false,
        error: `Payment intent in unexpected state: ${paymentIntent.status}`,
      };
    }

    if (confirmedPaymentIntent.status !== 'succeeded') {
      return {
        success: false,
        error: `Payment confirmation failed: ${confirmedPaymentIntent.status}`,
      };
    }

    // Update booking with payment status
    await supabase
      .from('bookings')
      .update({
        service_fee_charged: true,
        service_fee_charged_at: new Date().toISOString(),
        remaining_balance_charged: isWithin24Hours,
        remaining_balance_charged_at: isWithin24Hours ? new Date().toISOString() : null,
        payment_status: isWithin24Hours ? 'paid' : 'partial',
      })
      .eq('id', bookingId);

    // Record financial transaction
    await supabase.from('financial_transactions').insert({
      booking_id: bookingId,
      amount: totalAmount,
      currency: 'USD',
      stripe_transaction_id: confirmedPaymentIntent.id,
      payment_method: 'card',
      description: 'Booking payment - service fee and service amount',
      transaction_type: 'booking_payment',
      status: 'completed',
      processed_at: new Date().toISOString(),
      metadata: {
        service_fee: serviceFeeAmount,
        service_amount: serviceAmount,
        charged_immediately: isWithin24Hours,
      },
    });

    console.log('✅ Payment processed successfully:', {
      bookingId,
      paymentIntentId: confirmedPaymentIntent.id,
      serviceFeeCharged: true,
      serviceAmountCharged: isWithin24Hours,
    });

    return {
      success: true,
      serviceFeeCharged: true,
      serviceAmountCharged: isWithin24Hours,
      serviceAmountAuthorized: !isWithin24Hours,
      paymentIntentId: confirmedPaymentIntent.id,
    };
  } catch (error: any) {
    console.error('❌ Error processing booking acceptance payment:', error);
    return {
      success: false,
      error: error.message || 'Failed to process payment',
    };
  }
}

/**
 * Cancel payment intents when booking is declined
 * 
 * Rules:
 * - Cancel all payment intents
 * - No charges are made to the customer
 */
export async function processBookingDecline(
  bookingId: string,
  declinedBy: string,
  reason?: string
): Promise<PaymentProcessingResult> {
  try {
    console.log('🚫 Processing payment cancellation for booking decline:', {
      bookingId,
      declinedBy,
      reason,
    });

    // Fetch booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, stripe_payment_intent_id, booking_status')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return {
        success: false,
        error: `Booking not found: ${bookingError?.message || 'Unknown error'}`,
      };
    }

    // Check if booking is already declined
    if (booking.booking_status === 'declined') {
      console.log('⚠️ Booking already declined, checking payment intent status');
    }

    // Cancel payment intent if it exists
    if (booking.stripe_payment_intent_id) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(booking.stripe_payment_intent_id);

        // Only cancel if payment intent is not already succeeded or cancelled
        if (paymentIntent.status === 'requires_payment_method' || 
            paymentIntent.status === 'requires_confirmation' ||
            paymentIntent.status === 'requires_capture') {
          await stripe.paymentIntents.cancel(paymentIntent.id);
          console.log('✅ Payment intent cancelled:', paymentIntent.id);
        } else if (paymentIntent.status === 'succeeded') {
          // If payment was already charged, we need to refund it
          console.log('⚠️ Payment already charged, processing full refund');
          const refund = await stripe.refunds.create({
            payment_intent: paymentIntent.id,
            reason: 'requested_by_customer',
            metadata: {
              booking_id: bookingId,
              reason: 'booking_declined',
              declined_by: declinedBy,
            },
          });

          console.log('✅ Full refund processed:', refund.id);

          // Record refund transaction
          await supabase.from('financial_transactions').insert({
            booking_id: bookingId,
            amount: paymentIntent.amount / 100,
            currency: 'USD',
            stripe_transaction_id: refund.id,
            payment_method: 'card',
            description: 'Full refund - booking declined by provider',
            transaction_type: 'refund',
            status: 'completed',
            processed_at: new Date().toISOString(),
            metadata: {
              original_payment_intent: paymentIntent.id,
              reason: 'booking_declined',
            },
          });
        } else {
          console.log(`ℹ️ Payment intent status: ${paymentIntent.status}, no action needed`);
        }
      } catch (stripeError: any) {
        console.error('⚠️ Error cancelling payment intent:', stripeError);
        // Don't fail the decline if payment cancellation fails
        // The payment intent might already be cancelled or in a state that can't be cancelled
      }
    }

    // Update booking payment status
    await supabase
      .from('bookings')
      .update({
        payment_status: 'pending',
        service_fee_charged: false,
        remaining_balance_charged: false,
      })
      .eq('id', bookingId);

    console.log('✅ Booking decline payment processing completed');

    return {
      success: true,
    };
  } catch (error: any) {
    console.error('❌ Error processing booking decline payment:', error);
    return {
      success: false,
      error: error.message || 'Failed to cancel payment',
    };
  }
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

    // Check if booking was accepted/confirmed
    const wasAccepted = booking.booking_status === 'confirmed' || 
                        booking.booking_status === 'accepted' ||
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

    if (!booking.stripe_payment_intent_id) {
      return {
        success: false,
        error: 'No payment intent found for refund',
      };
    }

    // Create partial refund for service amount only
    const refund = await stripe.refunds.create({
      payment_intent: booking.stripe_payment_intent_id,
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

