import { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Helper function to dynamically import notification function
// Uses dynamic import to handle module resolution issues in Vercel's serverless environment
async function getNotifyProvidersNewBooking() {
  try {
    // Try multiple import paths to handle different Vercel build configurations
    const importPaths = [
      '../../lib/notifications/notify-providers-new-booking.js',
      '../../lib/notifications/notify-providers-new-booking',
      './lib/notifications/notify-providers-new-booking.js',
      './lib/notifications/notify-providers-new-booking',
    ];

    for (const importPath of importPaths) {
      try {
        const module = await import(importPath);
        const fn = module.notifyProvidersNewBooking || module.default;
        if (fn && typeof fn === 'function') {
          console.log(`✅ Successfully loaded notify-providers-new-booking from: ${importPath}`);
          return fn;
        }
      } catch (err) {
        // Continue to next import path
        continue;
      }
    }

    console.warn('⚠️ Could not load notify-providers-new-booking module from any path');
    return null;
  } catch (err) {
    console.warn('⚠️ Error loading notify-providers-new-booking module:', err);
    return null;
  }
}

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
  // Declare at function scope to be accessible in catch block
  let event: Stripe.Event | undefined;
  let webhookEventId: string | null = null;

  try {
    console.log('🔔 Webhook received:', req.method);
    
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const sig = req.headers['stripe-signature'] as string;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!endpointSecret) {
      console.error('❌ STRIPE_WEBHOOK_SECRET is not configured');
      return res.status(500).json({ 
        error: {
          code: '500',
          message: 'Webhook secret not configured'
        }
      });
    }

    console.log('🔐 Verifying webhook signature...');

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

    // At this point event is guaranteed to be defined
    if (!event) {
      return res.status(400).json({ error: 'Event verification failed' });
    }

  // Record webhook event in database for audit trail
  // Check if event already exists to handle duplicates gracefully
  try {
    const { data: existingEvent } = await supabase
      .from('stripe_tax_webhook_events')
      .select('id')
      .eq('stripe_event_id', event.id)
      .maybeSingle();

    if (existingEvent) {
      // Event already exists, use existing ID
      webhookEventId = existingEvent.id;
      console.log('ℹ️ Webhook event already recorded:', event.id);
    } else {
      // Insert new event
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
        // If it's a duplicate key error, try to fetch the existing event
        if (webhookError.code === '23505') {
          console.log('ℹ️ Duplicate webhook event detected, fetching existing record');
          const { data: existing } = await supabase
            .from('stripe_tax_webhook_events')
            .select('id')
            .eq('stripe_event_id', event.id)
            .maybeSingle();
          webhookEventId = existing?.id || null;
        } else {
          console.error('⚠️ Failed to record webhook event:', webhookError);
        }
        // Continue processing anyway - don't fail webhook due to logging
      } else {
        webhookEventId = webhookEvent?.id || null;
        console.log('✅ Webhook event recorded:', event.id);
      }
    }
  } catch (err) {
    console.error('⚠️ Error recording webhook event:', err);
    // Continue processing anyway
  }

    console.log('📋 Processing event type:', event.type);
    console.log('📋 Event ID:', event.id);
    
    let processed = false;
    
    switch (event.type) {
      case 'checkout.session.completed':
        try {
          await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
          processed = true;
        } catch (err: any) {
          console.error(`❌ Error handling checkout.session.completed:`, err);
          throw err; // Re-throw to be caught by outer catch
        }
        break;
      
      case 'payment_intent.succeeded':
        try {
          console.log('🎯 Processing payment_intent.succeeded event');
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          console.log('💳 Payment Intent ID:', paymentIntent.id);
          console.log('💳 Payment Intent metadata:', JSON.stringify(paymentIntent.metadata, null, 2));
          console.log('💳 Payment Intent amount:', paymentIntent.amount);
          console.log('💳 Payment Intent status:', paymentIntent.status);
          
          await handlePaymentIntentSucceeded(paymentIntent);
          processed = true;
          console.log('✅ payment_intent.succeeded processed successfully');
        } catch (err: any) {
          console.error(`❌ Error handling payment_intent.succeeded:`, err);
          console.error('Error stack:', err.stack);
          throw err; // Re-throw to be caught by outer catch
        }
        break;

      case 'charge.updated':
      case 'charge.succeeded':
        // These events don't require processing for our use case
        // However, if payment_intent.succeeded wasn't received, we can try to process from charge
        console.log(`ℹ️ Event ${event.type} received`);
        
        // Try to extract payment intent ID from charge and process if needed
        const charge = event.data.object as Stripe.Charge;
        if (charge.payment_intent && typeof charge.payment_intent === 'string') {
          console.log(`🔍 Charge has payment_intent: ${charge.payment_intent}`);
          
          // Check if we've already processed this payment intent
          const { data: existingTransaction } = await supabase
            .from('financial_transactions')
            .select('id')
            .eq('stripe_transaction_id', charge.payment_intent)
            .limit(1)
            .single();
          
          if (!existingTransaction && charge.status === 'succeeded') {
            console.log(`⚠️ No financial transaction found for payment_intent ${charge.payment_intent} - attempting to process from charge event`);
            
            // Try to retrieve and process the payment intent
            try {
              const paymentIntent = await stripe.paymentIntents.retrieve(charge.payment_intent);
              if (paymentIntent.status === 'succeeded') {
                console.log(`🔄 Processing payment_intent.succeeded from charge event fallback`);
                await handlePaymentIntentSucceeded(paymentIntent);
                console.log(`✅ Successfully processed payment intent from charge event`);
              }
            } catch (fallbackError: any) {
              console.error(`❌ Error processing payment intent from charge event:`, fallbackError);
              // Don't throw - charge.updated is not critical for transaction recording
            }
          } else if (existingTransaction) {
            console.log(`✅ Financial transaction already exists for payment_intent ${charge.payment_intent}`);
          }
        }
        
        processed = true;
        break;
      
      case 'charge.failed':
        console.log(`ℹ️ Event ${event.type} received - charge failed, no processing needed`);
        processed = true;
        break;

      default:
        console.log(`⚠️ Unhandled event type: ${event.type} - acknowledging but not processing`);
        processed = true; // Acknowledge unhandled events to prevent retries
    }

    // Mark webhook event as processed
    if (webhookEventId) {
      try {
        await supabase
          .from('stripe_tax_webhook_events')
          .update({
            processed: processed,
            processed_at: new Date().toISOString(),
          })
          .eq('id', webhookEventId);
      } catch (updateError) {
        console.error('⚠️ Error updating webhook event status (non-fatal):', updateError);
      }
    }

    console.log('✅ Webhook processed successfully');
    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('❌ Webhook handler error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      eventType: event?.type || 'unknown',
      eventId: event?.id || 'unknown'
    });

    // Mark webhook event as failed with error
    if (webhookEventId) {
      try {
        await supabase
          .from('stripe_tax_webhook_events')
          .update({
            processed: false,
            processing_error: error.message || 'Unknown error',
            processed_at: new Date().toISOString(),
          })
          .eq('id', webhookEventId);
      } catch (updateError) {
        console.error('⚠️ Error updating webhook event status (non-fatal):', updateError);
      }
    }

    // Return proper error response
    return res.status(500).json({ 
      error: {
        code: '500',
        message: error.message || 'A server error has occurred',
        type: error.type || 'server_error'
      }
    });
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
        platform_fee_amount: parseFloat(stripe_fee || '0'), // Stripe processing fees (will be updated with actual fees in webhook)
        provider_net_amount: parseFloat(provider_net || tip_amount || '0'), // Tip minus Stripe fees (will be updated with actual amount in webhook)
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
  console.log('📅 Processing booking payment from checkout session:', session.id);
  
  // Extract payment intent from session
  const paymentIntentId = typeof session.payment_intent === 'string' 
    ? session.payment_intent 
    : session.payment_intent?.id;

  if (!paymentIntentId) {
    console.error('❌ No payment intent found in checkout session');
    throw new Error('Payment intent not found in checkout session');
  }

  console.log('💳 Payment Intent ID from session:', paymentIntentId);

  // Retrieve the payment intent to get full details
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2023-10-16',
  });

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ['customer']
  });

  console.log('✅ Payment Intent retrieved:', paymentIntent.id);
  console.log('💳 Payment Intent metadata:', paymentIntent.metadata);

  // Check if booking was created from checkout session metadata
  // Checkout sessions store booking data in metadata, but we need to find the booking
  // by looking for a booking with matching customer_id and service_id
  const customerId = session.metadata?.customer_id;
  const serviceId = session.metadata?.service_id;

  if (!customerId || !serviceId) {
    console.error('❌ Missing customer_id or service_id in checkout session metadata');
    console.error('Available metadata:', JSON.stringify(session.metadata, null, 2));
    throw new Error('Missing required metadata in checkout session');
  }

  // Find the booking that matches this checkout session
  // The booking should have been created with pending_payment status
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select(`
      id,
      customer_id,
      business_id,
      provider_id,
      total_amount,
      booking_date,
      start_time,
      booking_reference,
      booking_status,
      payment_status,
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
        business_name
      ),
      business_locations (
        id,
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        is_primary
      )
    `)
    .eq('customer_id', customerId)
    .eq('service_id', serviceId)
    .eq('booking_status', 'pending_payment')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (bookingError || !booking) {
    console.error('❌ Error finding booking:', bookingError);
    console.error('Searched for customer_id:', customerId, 'service_id:', serviceId);
    throw bookingError || new Error('Booking not found');
  }

  console.log('📦 Found booking:', {
    id: booking.id,
    booking_reference: booking.booking_reference,
    customer_id: booking.customer_id,
    total_amount: booking.total_amount
  });

  // Process the payment using the same logic as handlePaymentIntentSucceeded
  // Update booking status to confirmed (without stripe_payment_intent_id - that column doesn't exist)
  // Check if booking is already confirmed to avoid race conditions
  if (booking.booking_status === 'confirmed' && booking.payment_status === 'paid') {
    console.log(`ℹ️ Booking ${booking.id} is already confirmed and paid - skipping update`);
  } else {
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        booking_status: 'confirmed',
        payment_status: 'paid',
      })
      .eq('id', booking.id);

    if (updateError) {
      // Handle race condition errors gracefully
      if (updateError.code === '42P10' || updateError.message?.includes('ON CONFLICT')) {
        console.warn('⚠️ Booking update conflict - likely already updated by another webhook');
        // Verify the booking was actually updated
        const { data: verifyBooking } = await supabase
          .from('bookings')
          .select('booking_status, payment_status')
          .eq('id', booking.id)
          .single();
        if (verifyBooking && verifyBooking.booking_status === 'confirmed' && verifyBooking.payment_status === 'paid') {
          console.log('✅ Verified: Booking is confirmed and paid');
        } else {
          console.error('❌ Booking update failed and booking is not in expected state');
          throw updateError;
        }
      } else {
        console.error('❌ Error updating booking:', updateError);
        throw updateError;
      }
    } else {
      console.log(`✅ Booking ${booking.id} status updated to confirmed`);
    }
  }

  // Notify providers about the new booking (non-blocking)
  try {
    const notifyFn = await getNotifyProvidersNewBooking();
    if (notifyFn) {
      const service = Array.isArray(booking.services) ? booking.services[0] : booking.services;
      const customer = Array.isArray(booking.customer_profiles) ? booking.customer_profiles[0] : booking.customer_profiles;
        const business = Array.isArray(booking.business_profiles) ? booking.business_profiles[0] : booking.business_profiles;
        const businessLocation = Array.isArray(booking.business_locations) 
          ? booking.business_locations.find((loc: any) => loc.is_primary) || booking.business_locations[0]
          : booking.business_locations;

      if (service && customer && business) {
        // Format business address from location
        const businessAddress = businessLocation 
          ? `${businessLocation.address_line1 || ''}${businessLocation.address_line2 ? ` ${businessLocation.address_line2}` : ''}, ${businessLocation.city || ''}, ${businessLocation.state || ''} ${businessLocation.postal_code || ''}`.trim()
          : '';

        await notifyFn({
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
            name: business.business_name,
            business_address: businessAddress,
          },
        });
        console.log('✅ Provider notifications sent successfully');
      }
    }
  } catch (notificationError) {
    console.error('⚠️ Error sending provider notifications (non-fatal):', notificationError);
  }

  // Record in financial_transactions (matching tip payment pattern - no customer_id field)
  const totalAmount = paymentIntent.amount / 100;
  console.log(`💵 Recording financial transaction: $${totalAmount} for booking ${booking.id}`);
  
  const { data: financialTransaction, error: financialError } = await supabase
    .from('financial_transactions')
    .insert({
      booking_id: booking.id,
      amount: totalAmount,
      currency: paymentIntent.currency.toUpperCase(),
      stripe_transaction_id: paymentIntent.id,
      payment_method: 'card',
      description: 'Service booking payment received',
      transaction_type: 'booking_payment',
      status: 'completed',
      processed_at: new Date().toISOString(),
      metadata: {
        charge_id: paymentIntent.latest_charge,
        customer_id: paymentIntent.customer,
        payment_method_types: paymentIntent.payment_method_types,
        booking_reference: booking.booking_reference || null,
        booking_customer_id: booking.customer_id || null
      }
    })
    .select()
    .single();

  if (financialError) {
    console.error('❌ Error recording financial transaction:', financialError);
    if (financialError.code !== '23505') { // Ignore duplicates
      throw financialError;
    }
  } else {
    console.log('✅ Financial transaction recorded:', financialTransaction?.id);
  }

  // Calculate platform fee for business_payment_transactions
  // Platform fee is 20% of the SERVICE AMOUNT (not total amount)
  // The 20% service fee covers Stripe fees, so business receives full service amount
  // If business charges $100, platform fee = $20, customer pays $120 total
  const platformFeePercentage = parseFloat(paymentIntent.metadata?.platformFee || '0.2'); // Default 20% if not in metadata
  
  // Get service amount from metadata if available, otherwise calculate from total
  // totalAmount = serviceAmount + platformFee = serviceAmount + (serviceAmount * 0.2) = serviceAmount * 1.2
  // Therefore: serviceAmount = totalAmount / 1.2
  const serviceAmountFromMetadata = paymentIntent.metadata?.serviceAmount 
    ? parseFloat(paymentIntent.metadata.serviceAmount) 
    : null;
  
  const serviceAmount = serviceAmountFromMetadata || (totalAmount / (1 + platformFeePercentage));
  const platformFee = serviceAmount * platformFeePercentage;
  const netPaymentAmount = serviceAmount; // Business receives full service amount

  console.log(`💰 Payment splits calculated: Service Amount $${serviceAmount.toFixed(2)}, Platform Fee $${platformFee.toFixed(2)}, Customer Paid $${totalAmount.toFixed(2)}, Business Receives $${netPaymentAmount.toFixed(2)}`);

  console.log(`✅ Financial transaction recorded for booking ${booking.id}`);
  
  // Extract tax year from booking date or use current year
  const bookingDate = booking.booking_date ? new Date(booking.booking_date) : new Date();
  const taxYear = bookingDate.getFullYear();
  const paymentDate = bookingDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD

  // Get Stripe Connect account ID from business profile if available
  const { data: businessProfile } = await supabase
    .from('business_profiles')
    .select('stripe_connect_account_id')
    .eq('id', booking.business_id)
    .single();

  // Check if business_payment_transactions record already exists (to determine transaction type)
  const { data: existingBusinessTransaction } = await supabase
    .from('business_payment_transactions')
    .select('id')
    .eq('booking_id', booking.id)
    .limit(1)
    .maybeSingle();

  // Determine transaction type: 'initial_booking' for first payment, 'additional_service' for add more service
  const transactionType = existingBusinessTransaction ? 'additional_service' : 'initial_booking';

  // Check if record already exists for this payment intent (avoid duplicates)
  const { data: existingByPaymentIntent } = await supabase
    .from('business_payment_transactions')
    .select('id')
    .eq('stripe_payment_intent_id', paymentIntent.id)
    .limit(1)
    .maybeSingle();

  if (existingByPaymentIntent) {
    console.log('ℹ️ Business payment transaction already exists for this payment intent:', existingByPaymentIntent.id);
  } else {
    const businessPaymentTransactionData: any = {
      booking_id: booking.id,
      business_id: booking.business_id,
      payment_date: paymentDate,
      gross_payment_amount: totalAmount, // Total amount customer paid
      platform_fee: platformFee, // 20% of service amount
      net_payment_amount: netPaymentAmount, // Full service amount (what business receives)
      tax_year: taxYear,
      stripe_payment_intent_id: paymentIntent.id,
      stripe_connect_account_id: businessProfile?.stripe_connect_account_id || null,
      transaction_description: transactionType === 'additional_service' 
        ? 'Additional service payment' 
        : 'Platform service payment',
      booking_reference: booking.booking_reference || null,
    };

    // Try inserting with transaction_type first (if migration has been run)
    // If it fails due to missing column, retry without it
    businessPaymentTransactionData.transaction_type = transactionType;

    let businessPaymentTransaction: any = null;
    let businessPaymentError: any = null;

    const { data: insertResult, error: insertError } = await supabase
      .from('business_payment_transactions')
      .insert(businessPaymentTransactionData)
      .select()
      .single();

    businessPaymentTransaction = insertResult;
    businessPaymentError = insertError;

    // If error is due to missing transaction_type column, retry without it
    if (businessPaymentError && (
      businessPaymentError.message?.includes('transaction_type') || 
      businessPaymentError.message?.includes('column') ||
      businessPaymentError.message?.includes('does not exist')
    )) {
      console.warn('⚠️ transaction_type column may not exist yet - retrying without it');
      delete businessPaymentTransactionData.transaction_type;
      
      const { data: retryResult, error: retryError } = await supabase
        .from('business_payment_transactions')
        .insert(businessPaymentTransactionData)
        .select()
        .single();
      
      businessPaymentTransaction = retryResult;
      businessPaymentError = retryError;
    }

    if (businessPaymentError) {
      // If error is due to unique constraint or ON CONFLICT, log warning but don't fail
      // This can happen due to race conditions when both webhooks fire simultaneously
      if (businessPaymentError.code === '23505' || 
          businessPaymentError.message?.includes('unique') ||
          businessPaymentError.message?.includes('ON CONFLICT') ||
          businessPaymentError.message?.includes('constraint matching')) {
        console.warn('⚠️ Duplicate record detected - likely due to race condition between webhooks');
        console.warn('⚠️ Record may have been created by another webhook handler');
        console.warn('⚠️ If migration has not been run, see migrations/remove_booking_id_unique_add_transaction_type.sql');
        // Verify the record actually exists
        const { data: verifyRecord } = await supabase
          .from('business_payment_transactions')
          .select('id')
          .eq('stripe_payment_intent_id', paymentIntent.id)
          .maybeSingle();
        if (verifyRecord) {
          console.log('✅ Verified: Record exists in database:', verifyRecord.id);
        }
      } else {
        console.error('❌ Error creating business_payment_transactions record:', businessPaymentError);
        console.error('❌ Error code:', businessPaymentError.code);
        console.error('❌ Error message:', businessPaymentError.message);
      }
      console.warn('⚠️ Business payment transaction creation failed, but booking was confirmed');
    } else {
      console.log('✅ Business payment transaction created:', businessPaymentTransaction?.id);
    }
  }
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

    // Check if this payment intent was already processed by handleBookingPayment
    // (checkout.session.completed also processes payment_intent.succeeded events)
    // This prevents duplicate processing for new bookings
    const { data: existingBusinessTransaction } = await supabase
      .from('business_payment_transactions')
      .select('id, booking_id')
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .limit(1)
      .maybeSingle();

    if (existingBusinessTransaction) {
      console.log('ℹ️ Payment intent already processed by checkout.session.completed webhook');
      console.log('ℹ️ Skipping duplicate processing - business_payment_transactions record exists:', existingBusinessTransaction.id);
      return;
    }

    let bookingId = paymentIntent.metadata.bookingId;
    
    // If bookingId is missing, try to find booking by customer_id and service_id
    if (!bookingId) {
      console.warn('⚠️ No booking ID in payment intent metadata - attempting to find booking by customer_id and service_id');
      const customerId = paymentIntent.metadata.customerId;
      const serviceId = paymentIntent.metadata.serviceId;
      
      if (customerId && serviceId) {
        console.log(`🔍 Searching for booking with customer_id: ${customerId}, service_id: ${serviceId}`);
        const { data: booking, error: bookingSearchError } = await supabase
          .from('bookings')
          .select('id, booking_status, payment_status')
          .eq('customer_id', customerId)
          .eq('service_id', serviceId)
          .in('booking_status', ['pending', 'pending_payment', 'confirmed'])
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (booking && !bookingSearchError) {
          bookingId = booking.id;
          console.log(`✅ Found booking by customer_id and service_id: ${bookingId}`);
        } else {
          console.error('❌ Could not find booking by customer_id and service_id:', bookingSearchError);
        }
      }
    }
    
    if (!bookingId) {
      console.error('❌ No booking ID found in payment intent metadata or database');
      console.error('Available metadata:', JSON.stringify(paymentIntent.metadata, null, 2));
      console.error('Payment Intent ID:', paymentIntent.id);
      console.error('Payment Intent Amount:', paymentIntent.amount);
      console.error('Payment Intent Status:', paymentIntent.status);
      throw new Error(`Cannot process payment: No booking ID found for payment intent ${paymentIntent.id}`);
    }

    console.log(`📋 Confirming booking: ${bookingId}`);
    console.log(`💳 Payment Intent ID: ${paymentIntent.id}`);
    console.log(`💰 Payment Amount: $${(paymentIntent.amount / 100).toFixed(2)}`);

    // Get booking details for transaction recording and notifications
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        customer_id,
        business_id,
        provider_id,
        total_amount,
        booking_date,
        start_time,
        booking_reference,
        booking_status,
        payment_status,
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
          business_name
        ),
        business_locations (
          id,
          address_line1,
          address_line2,
          city,
          state,
          postal_code,
          is_primary
        )
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError) {
      console.error('❌ Error fetching booking:', bookingError);
      console.error('❌ Booking ID searched:', bookingId);
      throw bookingError;
    }

    if (!booking) {
      console.error('❌ Booking not found:', bookingId);
      throw new Error(`Booking ${bookingId} not found`);
    }

    console.log('📦 Booking data:', {
      id: booking.id,
      booking_reference: booking.booking_reference,
      customer_id: booking.customer_id,
      business_id: booking.business_id,
      total_amount: booking.total_amount,
      booking_status: booking.booking_status,
      payment_status: booking.payment_status
    });

    // Update booking status to confirmed (without stripe_payment_intent_id - that column doesn't exist)
    // Check if booking is already confirmed to avoid race conditions
    if (booking.booking_status === 'confirmed' && booking.payment_status === 'paid') {
      console.log(`ℹ️ Booking ${bookingId} is already confirmed and paid - skipping update`);
    } else {
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          booking_status: 'confirmed',
          payment_status: 'paid',
        })
        .eq('id', bookingId);

      if (updateError) {
        // Handle race condition errors gracefully
        if (updateError.code === '42P10' || updateError.message?.includes('ON CONFLICT')) {
          console.warn('⚠️ Booking update conflict - likely already updated by checkout.session.completed webhook');
          // Verify the booking was actually updated
          const { data: verifyBooking } = await supabase
            .from('bookings')
            .select('booking_status, payment_status')
            .eq('id', bookingId)
            .single();
          if (verifyBooking && verifyBooking.booking_status === 'confirmed' && verifyBooking.payment_status === 'paid') {
            console.log('✅ Verified: Booking is confirmed and paid');
          } else {
            console.error('❌ Booking update failed and booking is not in expected state');
            throw updateError;
          }
        } else {
          console.error('❌ Error updating booking:', updateError);
          throw updateError;
        }
      } else {
        console.log(`✅ Booking ${bookingId} status updated to confirmed`);
      }
    }

    // Notify providers about the new booking (non-blocking)
    try {
      const notifyFn = await getNotifyProvidersNewBooking();
      if (notifyFn) {
        const service = Array.isArray(booking.services) ? booking.services[0] : booking.services;
        const customer = Array.isArray(booking.customer_profiles) ? booking.customer_profiles[0] : booking.customer_profiles;
        const business = Array.isArray(booking.business_profiles) ? booking.business_profiles[0] : booking.business_profiles;
        const businessLocation = Array.isArray(booking.business_locations) 
          ? booking.business_locations.find((loc: any) => loc.is_primary) || booking.business_locations[0]
          : booking.business_locations;

        if (service && customer && business) {
          // Format business address from location
          const businessAddress = businessLocation 
            ? `${businessLocation.address_line1 || ''}${businessLocation.address_line2 ? ` ${businessLocation.address_line2}` : ''}, ${businessLocation.city || ''}, ${businessLocation.state || ''} ${businessLocation.postal_code || ''}`.trim()
            : '';

          await notifyFn({
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
              name: business.business_name,
              business_address: businessAddress,
            },
          });
          console.log('✅ Provider notifications sent successfully');
        } else {
          console.warn('⚠️ Missing booking data for notifications:', { service: !!service, customer: !!customer, business: !!business });
        }
      } else {
        console.warn('⚠️ notifyProvidersNewBooking function not available - skipping provider notifications');
      }
    } catch (notificationError) {
      console.error('⚠️ Error sending provider notifications (non-fatal):', notificationError);
      // Continue - don't fail the webhook if notifications fail
    }

    // Record in financial_transactions (overall payment ledger)
    const totalAmount = paymentIntent.amount / 100;
    console.log(`💵 Recording financial transaction: $${totalAmount} for booking ${bookingId}`);
    console.log(`📋 Booking reference: ${booking.booking_reference || 'N/A'}`);
    console.log(`👤 Customer ID: ${booking.customer_id || 'N/A'}`);
    
    // Record in financial_transactions (matching tip payment pattern - no customer_id field)
    console.log('📝 Recording financial transaction data');
    
    const { data: financialTransaction, error: financialError } = await supabase
      .from('financial_transactions')
      .insert({
        booking_id: bookingId,
        amount: totalAmount,
        currency: paymentIntent.currency.toUpperCase(),
        stripe_transaction_id: paymentIntent.id,
        payment_method: 'card',
        description: 'Service booking payment received',
        transaction_type: 'booking_payment',
        status: 'completed',
        processed_at: new Date().toISOString(),
        metadata: {
          charge_id: paymentIntent.latest_charge,
          customer_id: paymentIntent.customer,
          payment_method_types: paymentIntent.payment_method_types,
          booking_reference: booking.booking_reference || null,
          booking_customer_id: booking.customer_id || null
        }
      })
      .select()
      .single();

    if (financialError) {
      console.error('❌ Error recording financial transaction:', financialError);
      console.error('❌ Error code:', financialError.code);
      console.error('❌ Error message:', financialError.message);
      console.error('❌ Error details:', JSON.stringify(financialError, null, 2));
      
      // Check for specific error types
      if (financialError.code === '23505') {
        console.error('⚠️ Duplicate transaction detected - transaction may already exist');
        // Don't throw - this is not a critical error
      } else if (financialError.code === '23503') {
        console.error('⚠️ Foreign key constraint violation - booking may not exist');
        throw new Error(`Booking ${bookingId} not found or invalid`);
      } else {
        throw financialError;
      }
    } else {
      console.log('✅ Financial transaction recorded:', financialTransaction?.id);
    }

    // Calculate platform fee for business_payment_transactions
    // Platform fee is 20% of the SERVICE AMOUNT (not total amount)
    // The 20% service fee covers Stripe fees, so business receives full service amount
    // If business charges $100, platform fee = $20, customer pays $120 total
    const platformFeePercentage = parseFloat(paymentIntent.metadata?.platformFee || '0.2'); // Default 20% if not in metadata
    
    // Get service amount from metadata if available, otherwise calculate from total
    // totalAmount = serviceAmount + platformFee = serviceAmount + (serviceAmount * 0.2) = serviceAmount * 1.2
    // Therefore: serviceAmount = totalAmount / 1.2
    const serviceAmountFromMetadata = paymentIntent.metadata?.serviceAmount 
      ? parseFloat(paymentIntent.metadata.serviceAmount) 
      : null;
    
    const serviceAmount = serviceAmountFromMetadata || (totalAmount / (1 + platformFeePercentage));
    const platformFee = serviceAmount * platformFeePercentage;
    const netPaymentAmount = serviceAmount; // Business receives full service amount

    console.log(`💰 Payment splits calculated: Service Amount $${serviceAmount.toFixed(2)}, Platform Fee $${platformFee.toFixed(2)}, Customer Paid $${totalAmount.toFixed(2)}, Business Receives $${netPaymentAmount.toFixed(2)}`);
    
    // Extract tax year from booking date or use current year
    const bookingDate = booking.booking_date ? new Date(booking.booking_date) : new Date();
    const taxYear = bookingDate.getFullYear();
    const paymentDate = bookingDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD

    // Get Stripe Connect account ID from business profile if available
    const { data: businessProfile } = await supabase
      .from('business_profiles')
      .select('stripe_connect_account_id')
      .eq('id', booking.business_id)
      .single();

    // Check if business_payment_transactions record already exists for this booking (to determine transaction type)
    const { data: existingBookingTransaction } = await supabase
      .from('business_payment_transactions')
      .select('id')
      .eq('booking_id', bookingId)
      .limit(1)
      .maybeSingle();

    // Determine transaction type: 'initial_booking' for first payment, 'additional_service' for add more service
    const transactionType = existingBookingTransaction ? 'additional_service' : 'initial_booking';
    
    console.log(`📝 Creating business_payment_transactions record with type: ${transactionType}`);

    // Check if record already exists for this payment intent (avoid duplicates)
    const { data: existingByPaymentIntent } = await supabase
      .from('business_payment_transactions')
      .select('id')
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .limit(1)
      .maybeSingle();

    if (existingByPaymentIntent) {
      console.log('ℹ️ Business payment transaction already exists for this payment intent:', existingByPaymentIntent.id);
      console.log('ℹ️ Skipping duplicate insert - payment was already recorded');
    } else {
      // Always create a new record (maintains audit trail for multiple payments)
      // Note: After migration removes unique constraint and adds transaction_type column,
      // this will work correctly. Until then, it may fail on unique constraint for "add more service"
      const businessPaymentTransactionData: any = {
        booking_id: bookingId,
        business_id: booking.business_id,
        payment_date: paymentDate,
        gross_payment_amount: totalAmount, // Total amount customer paid
        platform_fee: platformFee, // 20% of service amount
        net_payment_amount: netPaymentAmount, // Full service amount (what business receives)
        tax_year: taxYear,
        stripe_payment_intent_id: paymentIntent.id,
        stripe_connect_account_id: businessProfile?.stripe_connect_account_id || null,
        transaction_description: transactionType === 'additional_service' 
          ? 'Additional service payment' 
          : 'Platform service payment',
        booking_reference: booking.booking_reference || null,
        transaction_type: transactionType, // Will be added after migration
      };

      let businessPaymentTransaction: any = null;
      let businessPaymentError: any = null;

      const { data: insertResult, error: insertError } = await supabase
        .from('business_payment_transactions')
        .insert(businessPaymentTransactionData)
        .select()
        .single();

      businessPaymentTransaction = insertResult;
      businessPaymentError = insertError;

      // If error is due to missing transaction_type column, retry without it
      if (businessPaymentError && (
        businessPaymentError.message?.includes('transaction_type') || 
        businessPaymentError.message?.includes('column') ||
        businessPaymentError.message?.includes('does not exist')
      )) {
        console.warn('⚠️ transaction_type column may not exist yet - retrying without it');
        delete businessPaymentTransactionData.transaction_type;
        
        const { data: retryResult, error: retryError } = await supabase
          .from('business_payment_transactions')
          .insert(businessPaymentTransactionData)
          .select()
          .single();
        
        businessPaymentTransaction = retryResult;
        businessPaymentError = retryError;
      }

      if (businessPaymentError) {
        // If error is due to unique constraint or ON CONFLICT, log warning but don't fail
        // This can happen due to race conditions when both webhooks fire simultaneously
        if (businessPaymentError.code === '23505' || 
            businessPaymentError.message?.includes('unique') ||
            businessPaymentError.message?.includes('ON CONFLICT') ||
            businessPaymentError.message?.includes('constraint matching')) {
          console.warn('⚠️ Duplicate record detected - likely due to race condition between webhooks');
          console.warn('⚠️ Record may have been created by checkout.session.completed webhook');
          console.warn('⚠️ If migration has not been run, see migrations/remove_booking_id_unique_add_transaction_type.sql');
          // Verify the record actually exists
          const { data: verifyRecord } = await supabase
            .from('business_payment_transactions')
            .select('id')
            .eq('stripe_payment_intent_id', paymentIntent.id)
            .maybeSingle();
          if (verifyRecord) {
            console.log('✅ Verified: Record exists in database:', verifyRecord.id);
          }
        } else {
          console.error('❌ Error creating business_payment_transactions record:', businessPaymentError);
          console.error('❌ Error code:', businessPaymentError.code);
          console.error('❌ Error message:', businessPaymentError.message);
          console.error('❌ Error details:', JSON.stringify(businessPaymentError, null, 2));
        }
        console.warn('⚠️ Business payment transaction creation failed, but booking was confirmed');
      } else {
        console.log(`✅ Business payment transaction created (${transactionType}):`, businessPaymentTransaction?.id);
      }
    }

    // Save payment method to database if it's attached to a customer
    // This ensures payment methods are saved even if frontend saving fails
    if (paymentIntent.payment_method && paymentIntent.customer && booking.customer_id) {
      try {
        const paymentMethodId = typeof paymentIntent.payment_method === 'string' 
          ? paymentIntent.payment_method 
          : paymentIntent.payment_method.id;

        // Retrieve payment method to check if it's attached
        const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
        
        // Only save if payment method is attached to the customer
        if (paymentMethod.customer === paymentIntent.customer) {
          console.log('💳 Saving payment method to database:', paymentMethodId);

          // Get Stripe customer profile
          const { data: stripeProfile } = await supabase
            .from('customer_stripe_profiles')
            .select('stripe_customer_id, payment_methods, default_payment_method_id')
            .eq('user_id', booking.customer_id)
            .single();

          if (stripeProfile && stripeProfile.stripe_customer_id === paymentIntent.customer) {
            // Prepare payment method data
            const paymentMethodData = {
              id: paymentMethodId,
              type: paymentMethod.type,
              card: paymentMethod.card ? {
                brand: paymentMethod.card.brand,
                last4: paymentMethod.card.last4,
                exp_month: paymentMethod.card.exp_month,
                exp_year: paymentMethod.card.exp_year,
              } : null,
              created: paymentMethod.created,
              is_default: false, // Don't change default in webhook
              is_attached: true,
              can_reuse: true, // Since it's attached, it can be reused
            };

            // Get existing payment methods
            const existingMethods = stripeProfile.payment_methods 
              ? (typeof stripeProfile.payment_methods === 'string' 
                  ? JSON.parse(stripeProfile.payment_methods) 
                  : stripeProfile.payment_methods)
              : [];

            // Check if payment method already exists
            const existingIndex = existingMethods.findIndex((pm: any) => pm.id === paymentMethodId);
            
            if (existingIndex >= 0) {
              // Update existing payment method
              existingMethods[existingIndex] = paymentMethodData;
            } else {
              // Add new payment method
              existingMethods.push(paymentMethodData);
            }

            // Update database
            const { error: updateError } = await supabase
              .from('customer_stripe_profiles')
              .update({
                payment_methods: existingMethods,
              })
              .eq('user_id', booking.customer_id);

            if (updateError) {
              console.error('❌ Error saving payment method in webhook:', updateError);
              // Don't throw - this is not critical
            } else {
              console.log('✅ Payment method saved to database in webhook:', paymentMethodId);
            }
          } else {
            console.log('ℹ️ Payment method not attached to customer or customer profile not found - skipping save');
          }
        } else {
          console.log('ℹ️ Payment method not attached to customer - skipping save');
        }
      } catch (pmError: any) {
        console.error('⚠️ Error saving payment method in webhook (non-fatal):', pmError);
        // Don't throw - this is not critical for the booking confirmation
      }
    }

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

    // Retrieve actual Stripe fees from the charge's balance transaction
    // Tips don't have a service fee, but Stripe processing fees are deducted
    let actualStripeFee = 0;
    let actualProviderNet = parseFloat(tip_amount || '0');
    
    if (paymentIntent.latest_charge) {
      try {
        const chargeId = typeof paymentIntent.latest_charge === 'string' 
          ? paymentIntent.latest_charge 
          : paymentIntent.latest_charge.id;
        
        const charge = await stripe.charges.retrieve(chargeId, {
          expand: ['balance_transaction']
        });
        
        if (charge.balance_transaction) {
          const balanceTransaction = typeof charge.balance_transaction === 'string'
            ? await stripe.balanceTransactions.retrieve(charge.balance_transaction)
            : charge.balance_transaction;
          
          // Stripe fee is the difference between amount and net (after Stripe fees)
          actualStripeFee = (balanceTransaction.fee || 0) / 100; // Convert from cents to dollars
          actualProviderNet = (balanceTransaction.net || 0) / 100; // Convert from cents to dollars
          
          console.log(`💰 Actual Stripe fees from balance transaction: $${actualStripeFee.toFixed(2)}, Provider net: $${actualProviderNet.toFixed(2)}`);
        }
      } catch (feeError: any) {
        console.warn('⚠️ Could not retrieve actual Stripe fees from balance transaction, using metadata:', feeError.message);
        // Fallback to metadata values if balance transaction retrieval fails
        actualStripeFee = parseFloat(stripe_fee || '0');
        actualProviderNet = parseFloat(provider_net || tip_amount || '0');
      }
    } else {
      // Fallback to metadata values if no charge available
      actualStripeFee = parseFloat(stripe_fee || '0');
      actualProviderNet = parseFloat(provider_net || tip_amount || '0');
      console.log('⚠️ No charge available, using estimated fees from metadata');
    }

    // Check if tip record already exists (created when payment intent was created)
    const { data: existingTip } = await supabase
      .from('tips')
      .select('id')
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .maybeSingle();

    let tipRecordId: string;

    if (existingTip) {
      // Update existing tip record
      console.log('🔄 Updating existing tip record:', existingTip.id);
      const { data: updatedTip, error: updateError } = await supabase
        .from('tips')
        .update({
          payment_status: 'completed',
          payment_processed_at: new Date().toISOString(),
          platform_fee_amount: actualStripeFee, // Actual Stripe fees from balance transaction
          provider_net_amount: actualProviderNet, // Actual net amount after Stripe fees
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingTip.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Error updating tip record:', updateError);
        throw updateError;
      }

      tipRecordId = updatedTip.id;
      console.log('✅ Tip record updated successfully:', tipRecordId);
    } else {
      // Create new tip record if it doesn't exist (fallback)
      console.log('📝 Creating new tip record (fallback)');
      const { data: newTip, error: insertError } = await supabase
        .from('tips')
        .insert({
          booking_id,
          customer_id,
          provider_id,
          business_id,
          tip_amount: parseFloat(tip_amount),
          tip_percentage: null,
          payment_status: 'completed',
          stripe_payment_intent_id: paymentIntent.id,
          platform_fee_amount: actualStripeFee, // Actual Stripe fees from balance transaction
          provider_net_amount: actualProviderNet, // Actual net amount after Stripe fees
          customer_message: customer_message || null,
          payment_processed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Error creating tip record:', insertError);
        throw insertError;
      }

      tipRecordId = newTip.id;
      console.log('✅ Tip record created successfully:', tipRecordId);
    }

    // Update booking with tip information
    await supabase
      .from('bookings')
      .update({
        tip_amount: parseFloat(tip_amount),
        tip_status: 'completed',
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
      transaction_type: 'tip', // Fixed: use enum value 'tip' instead of 'tip_payment'
      status: 'completed',
      processed_at: new Date().toISOString(),
      metadata: {
        charge_id: paymentIntent.latest_charge,
        customer_id: paymentIntent.customer,
        provider_id,
        business_id,
        tip_amount: parseFloat(tip_amount),
        stripe_fee: actualStripeFee, // Actual Stripe fees from balance transaction
        provider_net: actualProviderNet, // Actual net amount after Stripe fees
        customer_message: customer_message || ''
      }
    });

    console.log('✅ Tip payment processed successfully');

  } catch (error) {
    console.error('❌ Error processing tip payment intent:', error);
    throw error;
  }
}


