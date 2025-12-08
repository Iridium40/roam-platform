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

    // Fetch booking details including Stripe Connect account for transfer reversal
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        total_amount,
        service_fee,
        service_fee_charged,
        remaining_balance_charged,
        booking_date,
        start_time,
        booking_status,
        payment_status,
        business_id,
        business_profiles!inner (
          id,
          stripe_connect_accounts (
            account_id
          )
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

    // Fetch payment intent IDs from business_payment_transactions
    const { data: paymentTransactions, error: transactionsError } = await supabase
      .from('business_payment_transactions')
      .select('stripe_payment_intent_id, stripe_transfer_id, stripe_connect_account_id, net_payment_amount')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false });

    if (transactionsError) {
      console.warn('⚠️ Could not fetch payment transactions:', transactionsError);
    }

    // Get the most recent payment intent (in case there are multiple)
    const latestTransaction = paymentTransactions?.[0];
    const stripePaymentIntentId = latestTransaction?.stripe_payment_intent_id;

    // Check if booking was confirmed
    const wasAccepted = booking.booking_status === 'confirmed' ||
                        booking.service_fee_charged === true;

    if (!wasAccepted) {
      // Booking was cancelled before acceptance - cancel payment intents
      console.log('📋 Booking cancelled before acceptance - cancelling payment intents');

      if (stripePaymentIntentId) {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(stripePaymentIntentId);

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

    // Use payment intent from business_payment_transactions
    if (!stripePaymentIntentId) {
      console.error('❌ No payment intent found in transactions table');
      return {
        success: false,
        error: 'No payment intent found for refund',
      };
    }

    const paymentIntentIdToRefund = stripePaymentIntentId;

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

    // Cancel any scheduled payments for this booking
    if (stripePaymentIntentId) {
      await supabase
        .from('booking_payment_schedules')
        .update({
          status: 'cancelled',
          failure_reason: `Booking cancelled by ${cancelledBy}`,
        })
        .eq('booking_id', bookingId)
        .eq('status', 'scheduled')
        .eq('payment_type', 'remaining_balance');
      
      console.log('✅ Cancelled scheduled payment for cancelled booking');
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

    // Use the payment transaction we already fetched
    const businessPaymentTransaction = latestTransaction;

    let transferReversed = false;
    let transferReversalId: string | null = null;

    // If business received a transfer and service amount was charged, reverse it
    if (businessPaymentTransaction?.stripe_transfer_id && booking.remaining_balance_charged) {
      const business = Array.isArray(booking.business_profiles) 
        ? booking.business_profiles[0] 
        : booking.business_profiles;
      
      // Get Stripe Connect account ID from the nested stripe_connect_accounts table
      const stripeConnectAccounts = business?.stripe_connect_accounts;
      const connectAccount = Array.isArray(stripeConnectAccounts) 
        ? stripeConnectAccounts[0] 
        : stripeConnectAccounts;
      
      const stripeConnectAccountId = businessPaymentTransaction.stripe_connect_account_id || connectAccount?.account_id;

      if (stripeConnectAccountId) {
        try {
          console.log('🔄 Reversing Stripe Connect transfer to business:', {
            transferId: businessPaymentTransaction.stripe_transfer_id,
            amount: businessPaymentTransaction.net_payment_amount,
            connectAccountId: stripeConnectAccountId,
          });

          // Reverse the transfer
          const reversal = await stripe.transfers.createReversal(
            businessPaymentTransaction.stripe_transfer_id,
            {
              amount: Math.round(businessPaymentTransaction.net_payment_amount * 100), // Convert to cents
              description: `Transfer reversal - booking ${bookingId} cancelled`,
              metadata: {
                booking_id: bookingId,
                reason: 'customer_cancellation',
                cancelled_by: cancelledBy,
              },
            }
          );

          transferReversed = true;
          transferReversalId = reversal.id;

          console.log('✅ Stripe Connect transfer reversed:', reversal.id);

          // Update business_payment_transactions to record the reversal
          await supabase
            .from('business_payment_transactions')
            .update({
              stripe_tax_reported: false, // Mark as needing tax report update
              stripe_tax_report_error: `Transfer reversed due to cancellation. Reversal ID: ${reversal.id}`,
            })
            .eq('id', businessPaymentTransaction.id);

          // Record reversal transaction
          await supabase.from('financial_transactions').insert({
            booking_id: bookingId,
            amount: businessPaymentTransaction.net_payment_amount,
            currency: 'USD',
            stripe_transaction_id: reversal.id,
            payment_method: 'transfer_reversal',
            description: `Transfer reversal - business service amount refunded due to cancellation`,
            transaction_type: 'refund',
            status: 'completed',
            processed_at: new Date().toISOString(),
            metadata: {
              original_transfer_id: businessPaymentTransaction.stripe_transfer_id,
              reversal_type: 'business_service_amount',
              reason: 'customer_cancellation',
              connect_account_id: stripeConnectAccountId,
            },
          });

        } catch (reversalError: any) {
          console.error('⚠️ Error reversing Stripe Connect transfer:', reversalError);
          // Don't fail the refund if transfer reversal fails - log and continue
          // The transfer reversal might fail if:
          // - Transfer was already reversed
          // - Transfer hasn't been paid out yet (can't reverse pending transfers)
          // - Transfer is too old
          console.warn('⚠️ Transfer reversal failed, but customer refund will proceed:', reversalError.message);
        }
      }
    }

    // Create partial refund for service amount only (to customer)
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
        transfer_reversed: transferReversed.toString(),
        transfer_reversal_id: transferReversalId || '',
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
        original_payment_intent: paymentIntentIdToRefund,
        refund_amount: refundAmount,
        service_fee_kept: serviceFeeAmount,
        reason: 'customer_cancellation',
        transferReversed,
        transfer_reversal_id: transferReversalId,
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

