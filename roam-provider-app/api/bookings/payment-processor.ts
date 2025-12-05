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
 * 1. Service fee (platform fee) is charged immediately (NON-REFUNDABLE)
 * 2. Business service fee (service amount) is charged immediately
 * 3. Both fees are charged immediately upon acceptance, regardless of booking date/time
 */
export async function processBookingAcceptance(
  bookingId: string,
  acceptedBy: string,
  providerStripeId?: string
): Promise<PaymentProcessingResult> {
  try {
    console.log('💰 ======= PAYMENT PROCESSING START =======');
    console.log('💰 Processing payment for booking acceptance:', { bookingId, acceptedBy, timestamp: new Date().toISOString() });

    // Fetch booking details including business info for Stripe Connect
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
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
        service_fee_charged,
        remaining_balance_charged,
        business_profiles!inner (
          id,
          stripe_connect_accounts (
            account_id,
            charges_enabled,
            payouts_enabled
          )
        )
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('❌ PAYMENT PROCESSING ERROR: Booking not found', { bookingId, error: bookingError });
      return {
        success: false,
        error: `Booking not found: ${bookingError?.message || 'Unknown error'}`,
      };
    }

    // Look up payment intent from business_payment_transactions table
    // Note: stripe_payment_intent_id is NOT stored on bookings table
    const { data: businessPaymentTransaction, error: transactionError } = await supabase
      .from('business_payment_transactions')
      .select('stripe_payment_intent_id')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (transactionError) {
      console.error('❌ Error fetching payment transaction:', transactionError);
    }

    const paymentIntentId = businessPaymentTransaction?.stripe_payment_intent_id;

    // Log booking payment details
    console.log('📋 Booking payment details:', {
      bookingId: booking.id,
      stripe_payment_intent_id: paymentIntentId || 'NOT FOUND',
      stripe_service_amount_payment_intent_id: booking.stripe_service_amount_payment_intent_id || 'NOT SET',
      total_amount: booking.total_amount,
      service_fee: booking.service_fee,
      payment_status: booking.payment_status,
      booking_status: booking.booking_status,
    });

    // Check if payment intent exists
    if (!paymentIntentId) {
      console.error('❌ PAYMENT PROCESSING ERROR: No stripe_payment_intent_id found in business_payment_transactions');
      console.error('❌ This booking was created without a payment intent - customer may not have completed checkout');
      console.error('❌ Booking details:', {
        bookingId: booking.id,
        bookingStatus: booking.booking_status,
        paymentStatus: booking.payment_status,
        totalAmount: booking.total_amount,
        serviceFee: booking.service_fee,
        customerId: booking.customer_id,
        businessId: booking.business_id,
      });
      console.error('❌ This is likely a webhook issue - the stripe_payment_intent_id should have been saved in business_payment_transactions by the webhook');
      return {
        success: false,
        error: 'No payment intent found for this booking. Customer may not have completed checkout. The webhook may have failed to save the payment intent ID in business_payment_transactions.',
      };
    }
    
    console.log('✅ Payment intent ID found in business_payment_transactions:', paymentIntentId);

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    console.log('💳 Payment Intent Status:', paymentIntent.status);

    // Check if booking is already confirmed AND payment is already captured
    if (booking.booking_status === 'confirmed' && paymentIntent.status === 'succeeded') {
      console.log('⚠️ Booking already confirmed and payment already captured, skipping payment processing');
      return {
        success: true,
        serviceFeeCharged: booking.service_fee_charged || false,
        serviceAmountCharged: booking.remaining_balance_charged || false,
      };
    }

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

    // Check if payment intent requires capture (authorized but not charged)
    // This happens when checkout uses manual capture
    if (paymentIntent.status === 'requires_capture') {
      console.log('💰 Payment intent is authorized but not charged - capturing now');
      
      try {
        // Capture the payment intent (charge the customer)
        const capturedPaymentIntent = await stripe.paymentIntents.capture(paymentIntent.id);
        
        if (capturedPaymentIntent.status === 'succeeded') {
          console.log('✅ Payment captured successfully:', capturedPaymentIntent.id);
          
          // Calculate amounts
          const totalAmount = booking.total_amount || 0;
          let serviceFeeAmount = booking.service_fee || 0;
          
          // If service_fee is not set, calculate it (20% of service amount)
          // total_amount = serviceAmount + serviceFee = serviceAmount + (serviceAmount * 0.2) = serviceAmount * 1.2
          // So: serviceAmount = totalAmount / 1.2, serviceFee = serviceAmount * 0.2
          if (!serviceFeeAmount || serviceFeeAmount === 0) {
            const platformFeePercentage = 0.2; // Fixed 20% service fee
            const serviceAmount = totalAmount / (1 + platformFeePercentage);
            serviceFeeAmount = serviceAmount * platformFeePercentage;
            
            // Update booking with calculated service_fee
            await supabase
              .from('bookings')
              .update({
                service_fee: serviceFeeAmount,
                remaining_balance: serviceAmount,
              })
              .eq('id', bookingId);
            
            console.log(`💰 Calculated and updated service_fee: $${serviceFeeAmount.toFixed(2)}, remaining_balance: $${serviceAmount.toFixed(2)}`);
          }
          
          const serviceAmount = totalAmount - serviceFeeAmount;
          
          // Update booking to mark as charged
          await supabase
            .from('bookings')
            .update({
              service_fee_charged: true,
              service_fee_charged_at: new Date().toISOString(),
              remaining_balance_charged: true,
              remaining_balance_charged_at: new Date().toISOString(),
              payment_status: 'paid',
            })
            .eq('id', bookingId);

          // Record financial transactions
          const { data: financialTransaction, error: financialError } = await supabase
            .from('financial_transactions')
            .insert({
              booking_id: bookingId,
              amount: totalAmount,
              currency: 'USD',
              stripe_transaction_id: capturedPaymentIntent.id,
              payment_method: 'card',
              description: 'Service booking payment - captured on acceptance',
              transaction_type: 'booking_payment',
              status: 'completed',
              processed_at: new Date().toISOString(),
              metadata: {
                payment_type: 'full_payment',
                captured_on_acceptance: true,
              },
            })
            .select()
            .single();

          if (financialError) {
            console.error('❌ Error recording financial transaction:', financialError);
            console.error('❌ Error code:', financialError.code);
            console.error('❌ Error message:', financialError.message);
            if (financialError.code !== '23505') { // Ignore duplicates
              // Don't throw - webhook will create transaction as fallback
              console.error('⚠️ Financial transaction creation failed - webhook will create it as fallback');
            } else {
              console.log('⚠️ Financial transaction already exists (duplicate)');
            }
          } else {
            console.log('✅ Financial transaction recorded:', financialTransaction?.id);
          }

          // Create business_payment_transaction
          const business = Array.isArray(booking.business_profiles) 
            ? booking.business_profiles[0] 
            : booking.business_profiles;
          const businessId = booking.business_id;
          const stripeConnectAccount = Array.isArray(business?.stripe_connect_accounts)
            ? business?.stripe_connect_accounts[0]
            : business?.stripe_connect_accounts;
          const stripeConnectAccountId = stripeConnectAccount?.account_id || null;
          const currentYear = new Date().getFullYear();
          const paymentDate = new Date().toISOString().split('T')[0];

          // Calculate platform fee (20% of service amount)
          const platformFeePercentage = 0.2;
          const platformFee = serviceAmount * platformFeePercentage;
          const netPaymentAmount = serviceAmount;

          // Check if business_payment_transaction already exists (avoid duplicates)
          const { data: existingBusinessTransaction } = await supabase
            .from('business_payment_transactions')
            .select('id')
            .eq('stripe_payment_intent_id', capturedPaymentIntent.id)
            .limit(1)
            .maybeSingle();

          if (existingBusinessTransaction) {
            console.log('⚠️ Business payment transaction already exists for this payment intent:', existingBusinessTransaction.id);
            console.log('⚠️ Skipping duplicate insert - webhook may have already created it');
          } else {
            const { data: businessTransaction, error: businessError } = await supabase
              .from('business_payment_transactions')
              .insert({
                booking_id: bookingId,
                business_id: businessId,
                payment_date: paymentDate,
                gross_payment_amount: totalAmount,
                platform_fee: platformFee,
                net_payment_amount: netPaymentAmount,
                tax_year: currentYear,
                stripe_payment_intent_id: capturedPaymentIntent.id,
                stripe_connect_account_id: stripeConnectAccountId,
                transaction_description: 'Platform service payment',
                booking_reference: booking.booking_reference || null,
                transaction_type: 'initial_booking',
              } as any)
              .select()
              .single();

            if (businessError) {
              console.error('❌ Error recording business payment transaction:', businessError);
              console.error('❌ Error code:', businessError.code);
              console.error('❌ Error message:', businessError.message);
              if (businessError.code !== '23505') { // Ignore duplicates
                // Don't throw - webhook will create transaction as fallback
                console.error('⚠️ Business payment transaction creation failed - webhook will create it as fallback');
              } else {
                console.log('⚠️ Business payment transaction already exists (duplicate)');
              }
            } else {
              console.log('✅ Business payment transaction recorded:', businessTransaction?.id);
            }
          }

          console.log('✅ Payment processing completed:', {
            serviceFeeCharged: true,
            serviceAmountCharged: true,
            paymentIntentId: capturedPaymentIntent.id,
          });

          return {
            success: true,
            serviceFeeCharged: true,
            serviceAmountCharged: true,
            serviceAmountAuthorized: false,
            paymentIntentId: capturedPaymentIntent.id,
          };
        } else {
          return {
            success: false,
            error: `Payment capture failed - status: ${capturedPaymentIntent.status}`,
          };
        }
      } catch (captureError: any) {
        console.error('❌ Error capturing payment intent:', captureError);
        return {
          success: false,
          error: `Failed to capture payment: ${captureError.message}`,
        };
      }
    }

    // Calculate amounts
    const totalAmount = booking.total_amount || 0;
    const serviceFeeAmount = booking.service_fee || 0;
    const serviceAmount = totalAmount - serviceFeeAmount;

    console.log('📊 Payment breakdown:', {
      totalAmount,
      serviceFeeAmount,
      serviceAmount,
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
      const piStatus = paymentIntent.status;
      // At this point, payment intent is not 'succeeded' (we returned early if it was)
      // So we only need to check if it's not already canceled
      if (piStatus !== 'canceled') {
        await stripe.paymentIntents.cancel(paymentIntent.id);
        console.log('✅ Cancelled original payment intent:', paymentIntent.id);
      }
    } catch (cancelError: any) {
      console.warn('⚠️ Could not cancel original payment intent:', cancelError.message);
      // Continue anyway - we'll create new payment intents
    }

    // Create TWO separate payment intents:
    // 1. Service fee payment intent (charged immediately)
    // 2. Service amount payment intent (charged immediately)

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

    // 2. Create and charge service amount payment intent immediately
    const serviceAmountPaymentIntent = await stripe.paymentIntents.create({
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

    console.log('✅ Service amount charged immediately:', serviceAmountPaymentIntent.id);
    const serviceAmountCharged = true;

    // Update booking with both payment intent IDs and status
    // Both are charged immediately, so mark everything as paid
    await supabase
      .from('bookings')
      .update({
        stripe_payment_intent_id: serviceFeePaymentIntent.id, // Store service fee payment intent ID
        stripe_service_amount_payment_intent_id: serviceAmountPaymentIntent.id,
        service_fee_charged: true,
        service_fee_charged_at: new Date().toISOString(),
        remaining_balance_charged: true,
        remaining_balance_charged_at: new Date().toISOString(),
        payment_status: 'paid',
      })
      .eq('id', bookingId);

    // Get business info for Stripe Connect
    const business = Array.isArray(booking.business_profiles) 
      ? booking.business_profiles[0] 
      : booking.business_profiles;
    const businessId = booking.business_id;
    const stripeConnectAccount = Array.isArray(business?.stripe_connect_accounts)
      ? business?.stripe_connect_accounts[0]
      : business?.stripe_connect_accounts;
    const stripeConnectAccountId = stripeConnectAccount?.account_id || null;
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
      description: 'Service amount - charged immediately',
      transaction_type: 'booking_payment',
      status: 'completed',
      processed_at: new Date().toISOString(),
      metadata: {
        payment_type: 'service_amount',
        charged_immediately: true,
      },
    });

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
        transaction_type: 'initial_booking', // Will be added after migration
      } as any); // Type assertion needed until migration adds column
    }

    console.log('✅ Payment processed successfully:', {
      bookingId,
      serviceFeePaymentIntentId: serviceFeePaymentIntent.id,
      serviceAmountPaymentIntentId: serviceAmountPaymentIntent.id,
      serviceFeeCharged: true,
      serviceAmountCharged: true,
    });

    return {
      success: true,
      serviceFeeCharged: true,
      serviceAmountCharged: true,
      serviceAmountAuthorized: false,
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
      .select('id, stripe_service_amount_payment_intent_id, booking_status')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return {
        success: false,
        error: `Booking not found: ${bookingError?.message || 'Unknown error'}`,
      };
    }

    // Fetch payment intent from business_payment_transactions
    const { data: businessPaymentTransaction } = await supabase
      .from('business_payment_transactions')
      .select('stripe_payment_intent_id')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const mainPaymentIntentId = businessPaymentTransaction?.stripe_payment_intent_id;

    // Check if booking is already declined
    if (booking.booking_status === 'declined') {
      console.log('⚠️ Booking already declined, checking payment intent status');
    }

    // Cancel both payment intents if they exist
    const paymentIntentIds = [
      { id: mainPaymentIntentId, type: 'service_fee' },
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

    // Fetch booking details including business info for transfer reversal
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
        payment_status,
        business_id,
        business_profiles!inner (
          id,
          stripe_connect_accounts (
            account_id,
            charges_enabled,
            payouts_enabled
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

    // Check if booking was confirmed
    const wasAccepted = booking.booking_status === 'confirmed' ||
                        booking.service_fee_charged === true;

    if (!wasAccepted) {
      // Booking was cancelled before acceptance - cancel payment intents
      console.log('📋 Booking cancelled before acceptance - cancelling payment intents');

      // Fetch payment intent from business_payment_transactions
      const { data: cancelledBookingTransaction } = await supabase
        .from('business_payment_transactions')
        .select('stripe_payment_intent_id')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const paymentIntentId = cancelledBookingTransaction?.stripe_payment_intent_id;

      if (paymentIntentId) {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

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

    // Cancel any scheduled payments for this booking
    if (booking.stripe_service_amount_payment_intent_id) {
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

    // Fetch payment intent from business_payment_transactions
    const { data: refundPaymentTransaction } = await supabase
      .from('business_payment_transactions')
      .select('stripe_payment_intent_id')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Use service amount payment intent if available, otherwise try main payment intent from business_payment_transactions
    const paymentIntentIdToRefund = booking.stripe_service_amount_payment_intent_id || refundPaymentTransaction?.stripe_payment_intent_id;

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

    // If payment intent is authorized but not captured, just cancel it (no refund needed)
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

    // Check if business received a Stripe Connect transfer that needs to be reversed
    const { data: businessPaymentTransaction, error: bptError } = await supabase
      .from('business_payment_transactions')
      .select('id, stripe_transfer_id, net_payment_amount, stripe_connect_account_id')
      .eq('booking_id', bookingId)
      .maybeSingle();

    let transferReversed = false;
    let transferReversalId: string | null = null;

    // If business received a transfer and service amount was charged, reverse it
    if (businessPaymentTransaction?.stripe_transfer_id && booking.remaining_balance_charged) {
      const business = Array.isArray(booking.business_profiles) 
        ? booking.business_profiles[0] 
        : booking.business_profiles;
      
      const stripeConnectAccount = Array.isArray(business?.stripe_connect_accounts)
        ? business?.stripe_connect_accounts[0]
        : business?.stripe_connect_accounts;
      const stripeConnectAccountId = businessPaymentTransaction.stripe_connect_account_id || stripeConnectAccount?.account_id;

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
        transfer_reversed: transferReversed.toString(),
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

