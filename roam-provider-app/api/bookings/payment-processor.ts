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

    // Fetch booking details including business info for Stripe Connect
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        stripe_payment_intent_id,
        stripe_service_amount_payment_intent_id,
        total_amount,
        service_fee,
        booking_date,
        start_time,
        booking_status,
        payment_status,
        customer_id,
        business_id,
        booking_reference,
        business_profiles!inner (
          id,
          stripe_connect_account_id
        )
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return {
        success: false,
        error: `Booking not found: ${bookingError?.message || 'Unknown error'}`,
      };
    }

    // Check if booking is already confirmed
    if (booking.booking_status === 'confirmed') {
      console.log('⚠️ Booking already confirmed, skipping payment processing');
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

    // Get payment method from original payment intent
    let paymentMethodId: string | null = null;
    let stripeCustomerId: string | null = null;

    if (paymentIntent.payment_method) {
      paymentMethodId = typeof paymentIntent.payment_method === 'string' 
        ? paymentIntent.payment_method 
        : paymentIntent.payment_method.id;
    }

    if (paymentIntent.customer) {
      stripeCustomerId = typeof paymentIntent.customer === 'string'
        ? paymentIntent.customer
        : paymentIntent.customer.id;
    }

    if (!paymentMethodId || !stripeCustomerId) {
      return {
        success: false,
        error: 'Payment method or customer not found in original payment intent. Customer must complete payment setup first.',
      };
    }

    // Cancel the original payment intent since we're creating two separate ones
    try {
      if (paymentIntent.status !== 'succeeded' && paymentIntent.status !== 'canceled') {
        await stripe.paymentIntents.cancel(paymentIntent.id);
        console.log('✅ Cancelled original payment intent:', paymentIntent.id);
      }
    } catch (cancelError: any) {
      console.warn('⚠️ Could not cancel original payment intent:', cancelError.message);
      // Continue anyway - we'll create new payment intents
    }

    // Create TWO separate payment intents:
    // 1. Service fee payment intent (charged immediately)
    // 2. Service amount payment intent (authorized, captured 24h before if >24h away)

    // 1. Create and charge service fee payment intent immediately
    const serviceFeePaymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(serviceFeeAmount * 100), // Convert to cents
      currency: 'usd',
      customer: stripeCustomerId,
      payment_method: paymentMethodId,
      confirm: true, // Charge immediately
      description: `Service fee for booking ${bookingId}`,
      metadata: {
        bookingId: bookingId,
        paymentType: 'service_fee',
        chargedImmediately: 'true',
      },
    });

    if (serviceFeePaymentIntent.status !== 'succeeded') {
      return {
        success: false,
        error: `Service fee payment failed: ${serviceFeePaymentIntent.status}`,
      };
    }

    console.log('✅ Service fee charged immediately:', serviceFeePaymentIntent.id);

    // 2. Create service amount payment intent
    let serviceAmountPaymentIntent: Stripe.PaymentIntent;
    let serviceAmountCharged = false;

    if (isWithin24Hours) {
      // Charge immediately if ≤24h away
      serviceAmountPaymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(serviceAmount * 100), // Convert to cents
        currency: 'usd',
        customer: stripeCustomerId,
        payment_method: paymentMethodId,
        confirm: true, // Charge immediately
        description: `Service amount for booking ${bookingId}`,
        metadata: {
          bookingId: bookingId,
          paymentType: 'service_amount',
          chargedImmediately: 'true',
        },
      });

      if (serviceAmountPaymentIntent.status !== 'succeeded') {
        return {
          success: false,
          error: `Service amount payment failed: ${serviceAmountPaymentIntent.status}`,
        };
      }

      serviceAmountCharged = true;
      console.log('✅ Service amount charged immediately (≤24h):', serviceAmountPaymentIntent.id);
    } else {
      // Authorize but don't capture if >24h away (will be captured by cron job)
      serviceAmountPaymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(serviceAmount * 100), // Convert to cents
        currency: 'usd',
        customer: stripeCustomerId,
        payment_method: paymentMethodId,
        confirm: true,
        capture_method: 'manual', // Authorize but don't capture
        description: `Service amount for booking ${bookingId} (capture 24h before)`,
        metadata: {
          bookingId: bookingId,
          paymentType: 'service_amount',
          chargedImmediately: 'false',
          captureAt24Hours: 'true',
        },
      });

      // Check if it's authorized (requires_capture) or succeeded
      if (serviceAmountPaymentIntent.status === 'requires_capture') {
        console.log('✅ Service amount authorized (will capture 24h before):', serviceAmountPaymentIntent.id);
      } else if (serviceAmountPaymentIntent.status === 'succeeded') {
        // Some payment methods capture immediately even with manual capture
        serviceAmountCharged = true;
        console.log('✅ Service amount charged (payment method auto-captured):', serviceAmountPaymentIntent.id);
      } else {
        return {
          success: false,
          error: `Service amount authorization failed: ${serviceAmountPaymentIntent.status}`,
        };
      }
    }

    // Update booking with both payment intent IDs and status
    await supabase
      .from('bookings')
      .update({
        stripe_payment_intent_id: serviceFeePaymentIntent.id, // Store service fee payment intent ID
        stripe_service_amount_payment_intent_id: serviceAmountPaymentIntent.id,
        service_fee_charged: true,
        service_fee_charged_at: new Date().toISOString(),
        remaining_balance_charged: serviceAmountCharged,
        remaining_balance_charged_at: serviceAmountCharged ? new Date().toISOString() : null,
        payment_status: serviceAmountCharged ? 'paid' : 'partial',
      })
      .eq('id', bookingId);

    // Get business info for Stripe Connect
    const business = Array.isArray(booking.business_profiles) 
      ? booking.business_profiles[0] 
      : booking.business_profiles;
    const businessId = booking.business_id;
    const stripeConnectAccountId = business?.stripe_connect_account_id || null;
    const currentYear = new Date().getFullYear();
    const paymentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // Record financial transactions
    // Service fee transaction (charged immediately)
    await supabase.from('financial_transactions').insert({
      booking_id: bookingId,
      amount: serviceFeeAmount,
      currency: 'USD',
      stripe_transaction_id: serviceFeePaymentIntent.id,
      payment_method: 'card',
      description: 'Service fee - charged immediately',
      transaction_type: 'booking_payment',
      status: 'completed',
      processed_at: new Date().toISOString(),
      metadata: {
        payment_type: 'service_fee',
        charged_immediately: true,
      },
    });

    // Service amount transaction
    await supabase.from('financial_transactions').insert({
      booking_id: bookingId,
      amount: serviceAmount,
      currency: 'USD',
      stripe_transaction_id: serviceAmountPaymentIntent.id,
      payment_method: 'card',
      description: serviceAmountCharged 
        ? 'Service amount - charged immediately (≤24h)' 
        : 'Service amount - authorized (will capture 24h before)',
      transaction_type: 'booking_payment',
      status: serviceAmountCharged ? 'completed' : 'pending',
      processed_at: serviceAmountCharged ? new Date().toISOString() : null,
      metadata: {
        payment_type: 'service_amount',
        charged_immediately: serviceAmountCharged,
        capture_at_24h: !serviceAmountCharged,
      },
    });

    // Create booking_payment_schedules entry ONLY for remaining balance (service amount)
    // Service fee is charged immediately and doesn't need scheduling
    if (serviceAmountCharged) {
      // If charged immediately, mark as processed (for tracking purposes)
      const { error: serviceAmountScheduleError } = await supabase
        .from('booking_payment_schedules')
        .insert({
          booking_id: bookingId,
          payment_type: 'remaining_balance',
          scheduled_at: new Date().toISOString(),
          amount: serviceAmount,
          status: 'processed',
          stripe_payment_intent_id: serviceAmountPaymentIntent.id,
          processed_at: new Date().toISOString(),
        });

      if (serviceAmountScheduleError) {
        console.error('⚠️ Failed to create service amount payment schedule:', serviceAmountScheduleError);
      }

      // Create business_payment_transaction for immediate charge
      if (businessId) {
        await supabase.from('business_payment_transactions').insert({
          booking_id: bookingId,
          business_id: businessId,
          payment_date: paymentDate,
          gross_payment_amount: totalAmount,
          platform_fee: serviceFeeAmount,
          net_payment_amount: serviceAmount,
          tax_year: currentYear,
          stripe_payment_intent_id: serviceAmountPaymentIntent.id,
          stripe_connect_account_id: stripeConnectAccountId,
          booking_reference: booking.booking_reference || null,
          transaction_description: `Service payment for booking ${booking.booking_reference || bookingId}`,
        });
      }
    } else {
      // If authorized but not charged, create scheduled payment record for remaining balance
      const bookingDateTime = new Date(`${booking.booking_date}T${booking.start_time}`);
      const scheduledCaptureTime = new Date(bookingDateTime.getTime() - (24 * 60 * 60 * 1000)); // 24 hours before

      const { error: scheduleError } = await supabase
        .from('booking_payment_schedules')
        .insert({
          booking_id: bookingId,
          payment_type: 'remaining_balance',
          scheduled_at: scheduledCaptureTime.toISOString(),
          amount: serviceAmount,
          status: 'scheduled',
          stripe_payment_intent_id: serviceAmountPaymentIntent.id,
        });

      if (scheduleError) {
        console.error('⚠️ Failed to create payment schedule:', scheduleError);
      } else {
        console.log('✅ Created payment schedule for remaining balance (24h capture):', {
          bookingId,
          scheduledAt: scheduledCaptureTime.toISOString(),
          amount: serviceAmount,
        });
      }
    }

    console.log('✅ Payment processed successfully:', {
      bookingId,
      serviceFeePaymentIntentId: serviceFeePaymentIntent.id,
      serviceAmountPaymentIntentId: serviceAmountPaymentIntent.id,
      serviceFeeCharged: true,
      serviceAmountCharged,
      serviceAmountAuthorized: !serviceAmountCharged,
    });

    return {
      success: true,
      serviceFeeCharged: true,
      serviceAmountCharged,
      serviceAmountAuthorized: !serviceAmountCharged,
      paymentIntentId: serviceFeePaymentIntent.id,
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
      .select('id, stripe_payment_intent_id, stripe_service_amount_payment_intent_id, booking_status')
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

    // Cancel both payment intents if they exist
    const paymentIntentIds = [
      { id: booking.stripe_payment_intent_id, type: 'service_fee' },
      { id: booking.stripe_service_amount_payment_intent_id, type: 'service_amount' },
    ].filter(pi => pi.id);

    for (const { id: paymentIntentId, type } of paymentIntentIds) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        // Only cancel if payment intent is not already succeeded or cancelled
        if (paymentIntent.status === 'requires_payment_method' || 
            paymentIntent.status === 'requires_confirmation' ||
            paymentIntent.status === 'requires_capture') {
          await stripe.paymentIntents.cancel(paymentIntent.id);
          console.log(`✅ ${type} payment intent cancelled:`, paymentIntent.id);
        } else if (paymentIntent.status === 'succeeded') {
          // If payment was already charged, we need to refund it
          console.log(`⚠️ ${type} payment already charged, processing refund`);
          const refund = await stripe.refunds.create({
            payment_intent: paymentIntent.id,
            reason: 'requested_by_customer',
            metadata: {
              booking_id: bookingId,
              reason: 'booking_declined',
              declined_by: declinedBy,
              payment_type: type,
            },
          });

          console.log(`✅ ${type} refund processed:`, refund.id);

          // Record refund transaction
          await supabase.from('financial_transactions').insert({
            booking_id: bookingId,
            amount: paymentIntent.amount / 100,
            currency: 'USD',
            stripe_transaction_id: refund.id,
            payment_method: 'card',
            description: `Refund - ${type} (booking declined by provider)`,
            transaction_type: 'refund',
            status: 'completed',
            processed_at: new Date().toISOString(),
            metadata: {
              original_payment_intent: paymentIntent.id,
              reason: 'booking_declined',
              payment_type: type,
            },
          });
        } else {
          console.log(`ℹ️ ${type} payment intent status: ${paymentIntent.status}, no action needed`);
        }
      } catch (stripeError: any) {
        console.error(`⚠️ Error cancelling ${type} payment intent:`, stripeError);
        // Don't fail the decline if payment cancellation fails
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

