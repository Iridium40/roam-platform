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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'] as string;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!endpointSecret) {
      console.error('STRIPE_WEBHOOK_SECRET is not configured');
      return res.status(500).json({ 
        error: {
          code: '500',
          message: 'Webhook secret not configured'
        }
      });
    }

  try {
    // Get raw body as buffer for signature verification
    const buf = await buffer(req);
    const rawBody = buf.toString('utf8');
    
    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
  } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
  }

    // At this point event is guaranteed to be defined
    if (!event) {
      return res.status(400).json({ error: 'Event verification failed' });
  }

  // Log the event type for debugging
  console.log(`🔔 Webhook received: ${event.type} (ID: ${event.id})`);
  if (event.data?.object && 'status' in event.data.object) {
    console.log(`📋 Payment Intent Status: ${(event.data.object as any).status}`);
  }
  if (event.data?.object && 'metadata' in event.data.object) {
    const metadata = (event.data.object as any).metadata;
    if (metadata?.bookingId) {
      console.log(`📋 Booking ID from metadata: ${metadata.bookingId}`);
    }
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
          const { data: existing } = await supabase
            .from('stripe_tax_webhook_events')
            .select('id')
            .eq('stripe_event_id', event.id)
            .maybeSingle();
          webhookEventId = existing?.id || null;
        }
      // Continue processing anyway - don't fail webhook due to logging
    } else {
      webhookEventId = webhookEvent?.id || null;
      }
    }
  } catch (err) {
    // Continue processing anyway
  }

    let processed = false;
    
    switch (event.type) {
      case 'checkout.session.completed':
        try {
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
          processed = true;
        } catch (err: any) {
          console.error('Error handling checkout.session.completed:', err);
          throw err;
        }
        break;
      
      case 'payment_intent.succeeded':
        try {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          await handlePaymentIntentSucceeded(paymentIntent);
          processed = true;
        } catch (err: any) {
          console.error('Error handling payment_intent.succeeded:', err);
          throw err;
        }
        break;

      case 'payment_intent.created':
        try {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          console.log('💳 Payment intent created:', paymentIntent.id, 'Status:', paymentIntent.status);
          // If payment intent is created with requires_capture status, handle it
          if (paymentIntent.status === 'requires_capture') {
            console.log('🔐 Payment intent created with requires_capture status, processing...');
            await handlePaymentIntentRequiresCapture(paymentIntent);
          } else {
            console.log(`⚠️ Payment intent created with status ${paymentIntent.status}, not processing yet`);
          }
          processed = true;
        } catch (err: any) {
          console.error('Error handling payment_intent.created:', err);
          throw err;
        }
        break;

      case 'payment_intent.amount_capturable_updated':
        try {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          console.log('💳 Payment intent amount capturable updated:', paymentIntent.id, 'Status:', paymentIntent.status);
          // When payment is authorized, Stripe sends amount_capturable_updated with requires_capture status
          if (paymentIntent.status === 'requires_capture') {
            console.log('🔐 Payment intent is now requires_capture, processing...');
            await handlePaymentIntentRequiresCapture(paymentIntent);
          } else {
            console.log(`⚠️ Payment intent amount_capturable_updated with status ${paymentIntent.status}, not processing`);
          }
          processed = true;
        } catch (err: any) {
          console.error('Error handling payment_intent.amount_capturable_updated:', err);
          throw err;
        }
        break;

      // Note: 'payment_intent.requires_capture' is NOT a valid Stripe event type
      // The requires_capture status is handled via payment_intent.created and
      // payment_intent.amount_capturable_updated events above

      case 'charge.updated':
      case 'charge.succeeded':
        // Fallback: if payment_intent.succeeded wasn't received, process from charge
        const charge = event.data.object as Stripe.Charge;
        if (charge.payment_intent && typeof charge.payment_intent === 'string') {
          const { data: existingTransaction } = await supabase
            .from('financial_transactions')
            .select('id')
            .eq('stripe_transaction_id', charge.payment_intent)
            .limit(1)
            .single();
          
          if (!existingTransaction && charge.status === 'succeeded') {
            try {
              const paymentIntent = await stripe.paymentIntents.retrieve(charge.payment_intent);
              if (paymentIntent.status === 'succeeded') {
                await handlePaymentIntentSucceeded(paymentIntent);
              }
            } catch (fallbackError: any) {
              // Don't throw - charge.updated is not critical
            }
          }
        }
        processed = true;
        break;
      
      case 'charge.failed':
        processed = true;
        break;

      // Stripe Connect Transfer Events
      case 'transfer.created':
        try {
          const transfer = event.data.object as Stripe.Transfer;
          console.log('💸 Transfer created:', transfer.id, 'Amount:', transfer.amount / 100);
          await handleTransferCreated(transfer);
          processed = true;
        } catch (err: any) {
          console.error('Error handling transfer.created:', err);
          // Don't throw - transfer recording is not critical for booking flow
          processed = true;
        }
        break;

      case 'transfer.reversed':
        try {
          const transfer = event.data.object as Stripe.Transfer;
          console.log('🔄 Transfer reversed:', transfer.id);
          await handleTransferReversed(transfer);
          processed = true;
        } catch (err: any) {
          console.error('Error handling transfer.reversed:', err);
          processed = true;
        }
        break;

      case 'transfer.updated':
        // Log but don't process - we handle creation and reversal separately
        console.log('ℹ️ Transfer updated:', (event.data.object as Stripe.Transfer).id);
        processed = true;
        break;

      // Stripe Connect Account Events
      case 'account.updated':
        try {
          const account = event.data.object as Stripe.Account;
          console.log('🏦 Account updated:', account.id, 'Charges enabled:', account.charges_enabled);
          await handleAccountUpdated(account);
          processed = true;
        } catch (err: any) {
          console.error('Error handling account.updated:', err);
          // Don't throw - account updates are not critical
          processed = true;
        }
        break;

      case 'account.application.authorized':
      case 'account.application.deauthorized':
        // Log but don't process - informational only
        console.log(`ℹ️ Account application event: ${event.type}`);
        processed = true;
        break;

      default:
        // Log unhandled events for debugging
        console.log(`⚠️ Unhandled webhook event type: ${event.type}`);
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
        // Non-fatal
      }
    }

    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('Webhook handler error:', error.message);

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
        // Non-fatal
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
    // Create tip record in database
    const { data, error } = await supabase
      .from('tips')
      .insert({
        booking_id,
        customer_id,
        provider_id,
        business_id,
        tip_amount: parseFloat(tip_amount),
        tip_percentage: 0,
        payment_status: 'completed',
        stripe_payment_intent_id: session.payment_intent as string,
        stripe_session_id: session.id,
        platform_fee_amount: parseFloat(stripe_fee || '0'),
        provider_net_amount: parseFloat(provider_net || tip_amount || '0'),
        customer_message: customer_message || '',
      })
      .select()
        .single();

        if (error) {
      console.error('Error creating tip record:', error);
      throw error;
    }

    // Update booking with tip information
    await supabase
      .from('bookings')
      .update({
        has_tip: true,
        tip_amount: parseFloat(tip_amount),
      })
      .eq('id', booking_id);

  } catch (error) {
    console.error('Error processing tip payment:', error);
    throw error;
  }
}

async function handleBookingPayment(session: Stripe.Checkout.Session) {
  // Extract payment intent from session
  const paymentIntentId = typeof session.payment_intent === 'string' 
    ? session.payment_intent 
    : session.payment_intent?.id;

  if (!paymentIntentId) {
    throw new Error('Payment intent not found in checkout session');
  }

  // Retrieve the payment intent to get full details
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2023-10-16',
  });

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ['customer']
  });

  // Check if booking was created from checkout session metadata
  const customerId = session.metadata?.customer_id;
  const serviceId = session.metadata?.service_id;

  if (!customerId || !serviceId) {
    throw new Error('Missing required metadata in checkout session');
  }

  // Find the booking that matches this checkout session
  // The booking should have been created with pending or pending_payment status
  // Note: BookService.tsx creates bookings with 'pending' status, but some flows may use 'pending_payment'
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select(`
      id,
      customer_id,
      business_id,
      provider_id,
      total_amount,
      service_fee,
      remaining_balance,
      booking_date,
      start_time,
      booking_reference,
      booking_status,
      payment_status,
      special_instructions,
      stripe_payment_intent_id,
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
    .in('booking_status', ['pending', 'pending_payment'])  // Support both statuses
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (bookingError || !booking) {
    throw bookingError || new Error('Booking not found');
  }

  // Check payment intent status - if manual capture, it will be 'requires_capture', not 'succeeded'
  const isAuthorized = paymentIntent.status === 'requires_capture';
  const isCharged = paymentIntent.status === 'succeeded';

  // Calculate service fee if not already set (20% of service amount)
  // Service amount = total_amount - service_fee, or total_amount / 1.2 if service_fee not set
  let serviceFee = booking.service_fee || 0;
  let remainingBalance = booking.remaining_balance || 0;
  
  if (!serviceFee || serviceFee === 0) {
    // Calculate service fee from metadata or calculate from total
    const platformFeePercentage = parseFloat(paymentIntent.metadata?.platformFee || '0.2'); // Default 20%
    const serviceAmountFromMetadata = parseFloat(paymentIntent.metadata?.serviceAmount || '0');
    
    if (serviceAmountFromMetadata > 0) {
      const serviceAmount = serviceAmountFromMetadata;
      serviceFee = serviceAmount * platformFeePercentage;
      remainingBalance = serviceAmount;
    } else {
      const totalAmount = booking.total_amount || 0;
      const serviceAmount = totalAmount / (1 + platformFeePercentage);
      serviceFee = serviceAmount * platformFeePercentage;
      remainingBalance = serviceAmount;
    }
  }

  // Process the payment using the same logic as handlePaymentIntentSucceeded
  // Update booking status based on payment status
  // If payment is authorized but not captured, set status to 'pending' (waiting for acceptance)
  // If payment is already charged, set status to 'confirmed' and 'paid'
  // Check if booking is already confirmed to avoid race conditions
  if (booking.booking_status === 'confirmed' && booking.payment_status === 'paid') {
    // Already processed
    console.log('✅ Booking already confirmed and paid, skipping update');
  } else {
    const updateData: any = {
      booking_status: isCharged ? 'confirmed' : 'pending', // Only confirm if already charged
      payment_status: isCharged ? 'paid' : 'pending', // Only mark as paid if already charged
    };
    
    // Update service_fee and remaining_balance if they weren't set
    if (!booking.service_fee || booking.service_fee === 0) {
      updateData.service_fee = serviceFee;
      updateData.remaining_balance = remainingBalance;
    }
    
    // Note: stripe_payment_intent_id is NOT stored on bookings table
    // It is stored in business_payment_transactions table (created below)
    console.log('💳 Payment intent ID will be stored in business_payment_transactions:', paymentIntentId);
    
    console.log('📋 Updating booking with data:', {
      bookingId: booking.id,
      updateData,
      isAuthorized,
      isCharged,
      paymentIntentId,
    });
    
    const { error: updateError } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', booking.id);

    if (updateError) {
      console.error('❌ Error updating booking:', updateError);
      // Handle race condition errors gracefully
      if (updateError.code === '42P10' || updateError.message?.includes('ON CONFLICT')) {
        const { data: verifyBooking } = await supabase
          .from('bookings')
          .select('booking_status, payment_status')
          .eq('id', booking.id)
          .single();
        if (!(verifyBooking && verifyBooking.booking_status === 'confirmed' && verifyBooking.payment_status === 'paid')) {
          throw updateError;
        }
        console.log('✅ Booking was already updated by another process');
      } else {
        throw updateError;
      }
    } else {
      console.log('✅ Booking updated successfully with payment intent ID');
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
      }
    }
  } catch (notificationError) {
    // Non-fatal
  }

  // Record in financial_transactions
  const totalAmount = paymentIntent.amount / 100;
  // Ensure currency is exactly 3 characters (schema: varchar(3))
  const currency = (paymentIntent.currency.toUpperCase() || 'USD').substring(0, 3);
  
  const { data: financialTransaction, error: financialError } = await supabase
    .from('financial_transactions')
    .insert({
      booking_id: booking.id,
      amount: totalAmount, // numeric(10, 2)
      currency: currency, // varchar(3)
      stripe_transaction_id: paymentIntent.id, // varchar(255)
      payment_method: 'card', // varchar(50)
      description: 'Service booking payment received', // text
      transaction_type: 'booking_payment', // transaction_type enum
      status: 'completed', // status enum
      processed_at: new Date().toISOString(), // timestamp
      metadata: { // jsonb
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
    if (financialError.code !== '23505') { // Ignore duplicates
      console.error('Error recording financial transaction:', financialError);
      throw financialError;
    }
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
  const netPaymentAmount = serviceAmount;
  
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

  if (!existingByPaymentIntent) {
    const businessPaymentTransactionData: any = {
      booking_id: booking.id, // uuid NOT NULL
      business_id: booking.business_id, // uuid NOT NULL
      payment_date: paymentDate, // date NOT NULL (YYYY-MM-DD format)
      gross_payment_amount: totalAmount, // numeric(10, 2) NOT NULL - Total amount customer paid
      platform_fee: platformFee, // numeric(10, 2) NOT NULL default 0 - 20% of service amount
      net_payment_amount: netPaymentAmount, // numeric(10, 2) NOT NULL - Full service amount (what business receives)
      tax_year: taxYear, // integer NOT NULL
      stripe_payment_intent_id: paymentIntent.id, // text
      stripe_connect_account_id: businessProfile?.stripe_connect_account_id || null, // text
      transaction_description: transactionType === 'additional_service' 
        ? 'Additional service payment' 
        : 'Platform service payment', // text default 'Platform service payment'
      booking_reference: booking.booking_reference || null, // text
      transaction_type: transactionType, // business_payment_transaction_type NOT NULL default 'initial_booking'
    };

    // transaction_type is already set above (required field with default)

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
      // If error is due to unique constraint or ON CONFLICT, don't fail
      if (!(businessPaymentError.code === '23505' || 
          businessPaymentError.message?.includes('unique') ||
          businessPaymentError.message?.includes('ON CONFLICT') ||
          businessPaymentError.message?.includes('constraint matching'))) {
        console.error('Error creating business_payment_transactions record:', businessPaymentError);
      }
    }
  }
}

async function handlePaymentIntentRequiresCapture(paymentIntent: Stripe.PaymentIntent) {
  console.log('🔐 Payment intent requires capture:', paymentIntent.id);
  console.log('💳 Payment metadata:', paymentIntent.metadata);
  
  try {
    // Check if this is a tip payment
    if (paymentIntent.metadata?.type === 'tip') {
      console.log('💰 Processing as tip payment');
      await handleTipPaymentIntent(paymentIntent);
      return;
    }

    // Check if this payment intent was already processed
    const { data: existingBusinessTransaction } = await supabase
      .from('business_payment_transactions')
      .select('id, booking_id')
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .limit(1)
      .maybeSingle();

    const { data: existingFinancialTransaction } = await supabase
      .from('financial_transactions')
      .select('id')
      .eq('stripe_transaction_id', paymentIntent.id)
      .limit(1)
      .maybeSingle();

    // If both transactions exist, payment was already processed
    if (existingBusinessTransaction && existingFinancialTransaction) {
      console.log('✅ Payment intent already processed');
      return;
    }

    // Payment is authorized but not yet captured - create records with 'pending' status
    let bookingId = paymentIntent.metadata.bookingId;
    
    if (!bookingId) {
      console.error('❌ Missing bookingId in payment intent metadata');
      return;
    }

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        customer_id,
        business_id,
        provider_id,
        total_amount,
        service_fee,
        remaining_balance,
        booking_reference,
        booking_status,
        payment_status
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('❌ Booking not found:', bookingId, bookingError);
      throw bookingError || new Error(`Booking ${bookingId} not found`);
    }

    // Record in financial_transactions with 'pending' status (payment authorized but not captured)
    const totalAmount = paymentIntent.amount / 100;
    const currency = (paymentIntent.currency.toUpperCase() || 'USD').substring(0, 3);
    
    if (!existingFinancialTransaction) {
      const { data: financialTransaction, error: financialError } = await supabase
        .from('financial_transactions')
        .insert({
          booking_id: bookingId,
          amount: totalAmount,
          currency: currency,
          stripe_transaction_id: paymentIntent.id,
          payment_method: 'card',
          description: 'Service booking payment authorized (pending capture)',
          transaction_type: 'booking_payment',
          status: 'pending', // Pending because payment is authorized but not captured
          processed_at: new Date().toISOString(),
          metadata: {
            charge_id: paymentIntent.latest_charge,
            customer_id: paymentIntent.customer,
            payment_method_types: paymentIntent.payment_method_types,
            booking_reference: booking.booking_reference || null,
            booking_customer_id: booking.customer_id || null,
            captured_by: 'webhook',
            capture_status: 'requires_capture',
          }
        })
        .select()
        .single();

      if (financialError) {
        if (financialError.code === '23503') {
          throw new Error(`Booking ${bookingId} not found or invalid`);
        } else if (financialError.code !== '23505') {
          console.error('❌ Error recording financial transaction:', financialError);
          throw financialError;
        }
      } else {
        console.log('✅ Financial transaction created (pending capture):', financialTransaction?.id);
      }
    }

    // Calculate platform fee for business_payment_transactions
    const platformFeePercentage = parseFloat(paymentIntent.metadata?.platformFee || '0.2');
    const serviceAmountFromMetadata = paymentIntent.metadata?.serviceAmount 
      ? parseFloat(paymentIntent.metadata.serviceAmount) 
      : null;
    
    const serviceAmount = serviceAmountFromMetadata || (totalAmount / (1 + platformFeePercentage));
    const platformFee = serviceAmount * platformFeePercentage;
    const netPaymentAmount = serviceAmount;

    // Get stripe_connect_account_id from stripe_connect_accounts table
    const { data: stripeConnectAccount } = await supabase
      .from('stripe_connect_accounts')
      .select('account_id')
      .eq('business_id', booking.business_id)
      .maybeSingle();
    
    const stripeConnectAccountId = stripeConnectAccount?.account_id || null;

    // Create business_payment_transaction with 'pending' status
    if (!existingBusinessTransaction) {
      const paymentDate = new Date().toISOString().split('T')[0];
      const taxYear = new Date().getFullYear();
      const transactionType = paymentIntent.metadata?.paymentType === 'additional_service' 
        ? 'additional_service' 
        : 'initial_booking';

      const { data: businessTransaction, error: businessError } = await supabase
        .from('business_payment_transactions')
        .insert({
          booking_id: bookingId,
          business_id: booking.business_id,
          payment_date: paymentDate,
          gross_payment_amount: totalAmount,
          platform_fee: platformFee,
          net_payment_amount: netPaymentAmount,
          tax_year: taxYear,
          stripe_payment_intent_id: paymentIntent.id,
          stripe_connect_account_id: stripeConnectAccountId,
          transaction_description: transactionType === 'additional_service' 
            ? 'Additional service payment (pending capture)' 
            : 'Platform service payment (pending capture)',
          booking_reference: booking.booking_reference || null,
          transaction_type: transactionType,
        } as any)
        .select()
        .single();

      if (businessError) {
        if (businessError.code === '23503') {
          throw new Error(`Booking ${bookingId} not found or invalid`);
        } else if (businessError.code !== '23505') {
          console.error('❌ Error recording business payment transaction:', businessError);
          throw businessError;
        }
      } else {
        console.log('✅ Business payment transaction created (pending capture):', businessTransaction?.id);
      }
    }

    console.log('✅ Payment intent requires_capture processed successfully');
  } catch (error: any) {
    console.error('❌ Error handling payment_intent.requires_capture:', error);
    throw error;
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

    // Check if this payment intent was already processed
    // This could be from checkout.session.completed webhook OR from payment processor capture
    const { data: existingBusinessTransaction } = await supabase
      .from('business_payment_transactions')
      .select('id, booking_id')
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .limit(1)
      .maybeSingle();

    const { data: existingFinancialTransaction } = await supabase
      .from('financial_transactions')
      .select('id')
      .eq('stripe_transaction_id', paymentIntent.id)
      .limit(1)
      .maybeSingle();

    // If both transactions exist, payment was already processed
    if (existingBusinessTransaction && existingFinancialTransaction) {
      return;
    }

    // Check payment intent status - must be succeeded to create transactions
    if (paymentIntent.status !== 'succeeded') {
      return;
    }

    let bookingId = paymentIntent.metadata.bookingId;
    
    // If bookingId is missing, try to find booking by customer_id and service_id
    if (!bookingId) {
      const customerId = paymentIntent.metadata.customerId;
      const serviceId = paymentIntent.metadata.serviceId;
      
      if (customerId && serviceId) {
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
        }
      }
    }
    
    if (!bookingId) {
      throw new Error(`Cannot process payment: No booking ID found for payment intent ${paymentIntent.id}`);
    }

    // This function is only called for payment_intent.succeeded events
    // So we know the payment has been charged (status is 'succeeded')
    // isAuthorized would only be true for 'requires_capture' status, which is handled
    // by handlePaymentIntentRequiresCapture function, not this one
    const isCharged = true; // Always true in handlePaymentIntentSucceeded

    // Get booking details for transaction recording and notifications
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        customer_id,
        business_id,
        provider_id,
        total_amount,
        service_fee,
        remaining_balance,
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
      throw bookingError;
    }

    if (!booking) {
      throw new Error(`Booking ${bookingId} not found`);
    }

    // Calculate service fee if not already set (20% of service amount)
    let serviceFee = booking.service_fee || 0;
    let remainingBalance = booking.remaining_balance || 0;
    
    if (!serviceFee || serviceFee === 0) {
      // Calculate service fee from metadata or calculate from total
      const platformFeePercentage = parseFloat(paymentIntent.metadata?.platformFee || '0.2'); // Default 20%
      const serviceAmountFromMetadata = parseFloat(paymentIntent.metadata?.serviceAmount || '0');
      
      if (serviceAmountFromMetadata > 0) {
        // Use service amount from metadata
        const serviceAmount = serviceAmountFromMetadata;
        serviceFee = serviceAmount * platformFeePercentage;
        remainingBalance = serviceAmount;
      } else {
        // Calculate from total_amount: total = serviceAmount + (serviceAmount * 0.2) = serviceAmount * 1.2
        const totalAmount = booking.total_amount || 0;
        const serviceAmount = totalAmount / (1 + platformFeePercentage);
        serviceFee = serviceAmount * platformFeePercentage;
        remainingBalance = serviceAmount;
      }
    }

    // Update booking status based on payment status
    // Check if booking is already confirmed to avoid race conditions
    if (booking.booking_status === 'confirmed' && booking.payment_status === 'paid') {
      // Already processed
      console.log('✅ Booking already confirmed and paid in handlePaymentIntentSucceeded');
    } else {
      const updateData: any = {
        booking_status: isCharged ? 'confirmed' : 'pending', // Only confirm if already charged
        payment_status: isCharged ? 'paid' : 'pending', // Only mark as paid if already charged
      };
      
      // Update service_fee and remaining_balance if they weren't set
      if (!booking.service_fee || booking.service_fee === 0) {
        updateData.service_fee = serviceFee;
        updateData.remaining_balance = remainingBalance;
      }
      
      // Note: stripe_payment_intent_id is NOT stored on bookings table
      // It is stored in business_payment_transactions table (created below)
      console.log('💳 Payment intent ID will be stored in business_payment_transactions:', paymentIntent.id);
      
      console.log('📋 Updating booking in handlePaymentIntentSucceeded:', {
        bookingId,
        updateData,
        isCharged,
        paymentIntentId: paymentIntent.id,
      });
      
    const { error: updateError } = await supabase
      .from('bookings')
        .update(updateData)
      .eq('id', bookingId);

    if (updateError) {
        console.error('❌ Error updating booking in handlePaymentIntentSucceeded:', updateError);
        // Handle race condition errors gracefully
        if (updateError.code === '42P10' || updateError.message?.includes('ON CONFLICT')) {
          const { data: verifyBooking } = await supabase
            .from('bookings')
            .select('booking_status, payment_status')
            .eq('id', bookingId)
            .single();
          if (!(verifyBooking && verifyBooking.booking_status === 'confirmed' && verifyBooking.payment_status === 'paid')) {
      throw updateError;
          }
          console.log('✅ Booking was already updated by another process');
        } else {
          throw updateError;
        }
      } else {
        console.log('✅ Booking updated successfully in handlePaymentIntentSucceeded');
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
        }
      }
    } catch (notificationError) {
      // Non-fatal
    }

    // Only record financial transactions if payment is actually charged (succeeded)
    if (!isCharged) {
      return;
    }

    // Record in financial_transactions
    const totalAmount = paymentIntent.amount / 100;
    // Ensure currency is exactly 3 characters (schema: varchar(3))
    const currency = (paymentIntent.currency.toUpperCase() || 'USD').substring(0, 3);
    
    // Only create if it doesn't already exist (idempotent)
    if (!existingFinancialTransaction) {
      
      const { data: financialTransaction, error: financialError } = await supabase
        .from('financial_transactions')
        .insert({
      booking_id: bookingId, // uuid NOT NULL
      amount: totalAmount, // numeric(10, 2) NOT NULL
      currency: currency, // varchar(3) default 'USD'
      stripe_transaction_id: paymentIntent.id, // varchar(255)
      payment_method: 'card', // varchar(50)
      description: 'Service booking payment received', // text
          transaction_type: 'booking_payment', // transaction_type enum
      status: 'completed', // status enum
      processed_at: new Date().toISOString(), // timestamp
      metadata: { // jsonb default '{}'
        charge_id: paymentIntent.latest_charge,
        customer_id: paymentIntent.customer,
            payment_method_types: paymentIntent.payment_method_types,
            booking_reference: booking.booking_reference || null,
            booking_customer_id: booking.customer_id || null,
            captured_by: paymentIntent.metadata?.captured_by || 'webhook', // Track if captured by payment processor or webhook
      }
        })
        .select()
        .single();

    if (financialError) {
        if (financialError.code === '23503') {
          throw new Error(`Booking ${bookingId} not found or invalid`);
        } else if (financialError.code !== '23505') {
          // Don't throw for duplicates
          console.error('Error recording financial transaction:', financialError);
      throw financialError;
        }
      }
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

    // Only create business_payment_transactions if payment is actually charged (succeeded)
    // If payment is only authorized (requires_capture), skip transaction recording
    // Transactions will be recorded when payment is captured on booking acceptance
    if (!isCharged) {
      console.log('ℹ️ Payment is authorized but not charged - skipping business_payment_transactions recording');
      console.log('ℹ️ Business payment transactions will be recorded when payment is captured on booking acceptance');
      return; // Exit early - don't create transactions for authorized-only payments
    }

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
      const businessPaymentTransactionData: any = {
      booking_id: bookingId, // uuid NOT NULL
        business_id: booking.business_id, // uuid NOT NULL
        payment_date: paymentDate, // date NOT NULL (YYYY-MM-DD format)
        gross_payment_amount: totalAmount, // numeric(10, 2) NOT NULL - Total amount customer paid
        platform_fee: platformFee, // numeric(10, 2) NOT NULL default 0 - 20% of service amount
        net_payment_amount: netPaymentAmount, // numeric(10, 2) NOT NULL - Full service amount (what business receives)
        tax_year: taxYear, // integer NOT NULL
      stripe_payment_intent_id: paymentIntent.id, // text
        stripe_connect_account_id: businessProfile?.stripe_connect_account_id || null, // text
        transaction_description: transactionType === 'additional_service' 
          ? 'Additional service payment' 
          : 'Platform service payment', // text default 'Platform service payment'
        booking_reference: booking.booking_reference || null, // text
        transaction_type: transactionType, // business_payment_transaction_type NOT NULL default 'initial_booking'
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

      // Create Stripe Transfer to connected account for service amount
      // This ensures business receives their portion of the payment
      const connectedAccountId = paymentIntent.metadata?.connectedAccountId;
      const transferAmountCents = paymentIntent.metadata?.transferAmount 
        ? parseInt(paymentIntent.metadata.transferAmount)
        : Math.round(serviceAmount * 100); // Fallback to calculated service amount

      if (connectedAccountId && paymentIntent.latest_charge && transferAmountCents > 0) {
        try {
          const chargeId = typeof paymentIntent.latest_charge === 'string'
            ? paymentIntent.latest_charge
            : paymentIntent.latest_charge.id;

          console.log('💸 Creating Stripe Transfer to connected account (webhook):', {
            amount: transferAmountCents / 100,
            amountCents: transferAmountCents,
            destination: connectedAccountId,
            sourceTransaction: chargeId,
            transactionType: transactionType,
          });

          const transfer = await stripe.transfers.create({
            amount: transferAmountCents,
            currency: 'usd',
            destination: connectedAccountId,
            source_transaction: chargeId,
            metadata: {
              booking_id: bookingId,
              payment_intent_id: paymentIntent.id,
              transfer_type: transactionType === 'additional_service' ? 'additional_service_payment' : 'booking_service_payment',
              service_amount: serviceAmount.toString(),
              platform_fee: platformFee.toString(),
            },
            description: transactionType === 'additional_service'
              ? `Additional service payment for booking ${booking.booking_reference || bookingId}`
              : `Service payment for booking ${booking.booking_reference || bookingId}`,
          });

          console.log('✅ Stripe Transfer created successfully (webhook):', {
            transferId: transfer.id,
            amount: transferAmountCents / 100,
            destination: connectedAccountId,
          });

          // Update business_payment_transactions with transfer ID
          if (businessPaymentTransaction?.id) {
            await supabase
              .from('business_payment_transactions')
              .update({ stripe_transfer_id: transfer.id })
              .eq('id', businessPaymentTransaction.id);
            console.log('✅ Updated business_payment_transactions with transfer ID');
          }

        } catch (transferError: any) {
          console.error('❌ Error creating Stripe Transfer (webhook):', transferError);
          console.error('❌ Transfer error details:', {
            message: transferError.message,
            code: transferError.code,
            type: transferError.type,
          });
          // Don't fail the webhook - payment was successful, transfer can be retried
          console.warn('⚠️ Transfer creation failed but payment was recorded successfully');
        }
      } else {
        console.warn('⚠️ Missing data for transfer creation:', {
          hasConnectedAccountId: !!connectedAccountId,
          hasLatestCharge: !!paymentIntent.latest_charge,
          transferAmountCents,
        });
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
    platform_fee, // 5% platform fee
    provider_net, // 95% to provider
    transfer_amount_cents, // Amount to transfer in cents
    customer_message,
    connectedAccountId, // Connected account to transfer to
  } = paymentIntent.metadata;

  try {
    console.log('💳 Processing tip payment intent:', {
      paymentIntentId: paymentIntent.id,
      bookingId: booking_id,
      tipAmount: tip_amount,
      platformFee: platform_fee,
      providerNet: provider_net,
      connectedAccountId,
    });

    // Use the 5% platform fee structure from metadata
    const platformFeeAmount = parseFloat(platform_fee || '0');
    const providerNetAmount = parseFloat(provider_net || tip_amount || '0');
    
    console.log('💰 Tip fee breakdown:', {
      tipAmount: parseFloat(tip_amount),
      platformFee: platformFeeAmount,
      providerNet: providerNetAmount,
    });

    // Create Stripe Transfer to connected account for 95% of tip
    let stripeTransferId: string | null = null;
    
    if (connectedAccountId && paymentIntent.latest_charge) {
      try {
        const chargeId = typeof paymentIntent.latest_charge === 'string'
          ? paymentIntent.latest_charge
          : paymentIntent.latest_charge.id;
        
        // Use transfer_amount_cents from metadata, or calculate 95% of tip
        const transferAmountCents = transfer_amount_cents 
          ? parseInt(transfer_amount_cents) 
          : Math.round(parseFloat(tip_amount) * 0.95 * 100);
        
        console.log('💸 Creating Stripe Transfer for tip to connected account:', {
          amount: transferAmountCents / 100,
          amountCents: transferAmountCents,
          destination: connectedAccountId,
          sourceTransaction: chargeId,
        });
        
        const transfer = await stripe.transfers.create({
          amount: transferAmountCents,
          currency: 'usd',
          destination: connectedAccountId,
          source_transaction: chargeId,
          metadata: {
            booking_id: booking_id,
            payment_intent_id: paymentIntent.id,
            transfer_type: 'tip',
            tip_amount: tip_amount,
            platform_fee: platformFeeAmount.toString(),
            provider_id: provider_id,
          },
          description: `Tip for booking ${booking_id}`,
        });
        
        stripeTransferId = transfer.id;
        console.log('✅ Tip transfer created successfully:', {
          transferId: transfer.id,
          amount: transferAmountCents / 100,
          destination: connectedAccountId,
        });
        
      } catch (transferError: any) {
        console.error('❌ Error creating tip transfer:', transferError);
        console.warn('⚠️ Tip payment recorded but transfer failed - may need manual resolution');
        // Don't fail the tip processing - record it and handle transfer manually if needed
      }
    } else {
      console.warn('⚠️ No connected account ID or charge ID - skipping tip transfer');
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
          platform_fee_amount: platformFeeAmount, // 5% platform fee
          provider_net_amount: providerNetAmount, // 95% to provider
          stripe_transfer_id: stripeTransferId, // Transfer ID if created
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
          platform_fee_amount: platformFeeAmount, // 5% platform fee
          provider_net_amount: providerNetAmount, // 95% to provider
          stripe_transfer_id: stripeTransferId, // Transfer ID if created
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
    // Ensure currency is exactly 3 characters (schema: varchar(3))
    const currency = (paymentIntent.currency.toUpperCase() || 'USD').substring(0, 3);
    
    await supabase.from('financial_transactions').insert({
      booking_id, // uuid NOT NULL
      amount: parseFloat(tip_amount), // numeric(10, 2) NOT NULL
      currency: currency, // varchar(3) default 'USD'
      stripe_transaction_id: paymentIntent.id, // varchar(255)
      payment_method: 'card', // varchar(50)
      description: 'Tip payment received', // text
      transaction_type: 'tip', // transaction_type enum
      status: 'completed', // status enum
      processed_at: new Date().toISOString(), // timestamp
      metadata: { // jsonb default '{}'
        charge_id: paymentIntent.latest_charge,
        customer_id: paymentIntent.customer,
        provider_id,
        business_id,
        tip_amount: parseFloat(tip_amount),
        platform_fee: platformFeeAmount, // 5% platform fee
        provider_net: providerNetAmount, // 95% to provider
        stripe_transfer_id: stripeTransferId,
        customer_message: customer_message || ''
      }
    });

    console.log('✅ Tip payment processed successfully with transfer');

  } catch (error) {
    console.error('❌ Error processing tip payment intent:', error);
    throw error;
  }
}

/**
 * Handle transfer.created webhook event
 * Records the transfer ID in business_payment_transactions
 */
async function handleTransferCreated(transfer: Stripe.Transfer) {
  console.log('💸 Processing transfer.created:', {
    transferId: transfer.id,
    amount: transfer.amount / 100,
    destination: transfer.destination,
    metadata: transfer.metadata,
  });

  try {
    const bookingId = transfer.metadata?.booking_id;
    const paymentIntentId = transfer.metadata?.payment_intent_id;
    const transferType = transfer.metadata?.transfer_type;

    if (!bookingId) {
      console.log('ℹ️ Transfer has no booking_id in metadata - may be a non-booking transfer');
      return;
    }

    // Update business_payment_transactions with transfer ID
    const { data: existingTransaction, error: fetchError } = await supabase
      .from('business_payment_transactions')
      .select('id, stripe_transfer_id')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error('❌ Error fetching business_payment_transaction:', fetchError);
      return;
    }

    if (existingTransaction) {
      // Only update if transfer_id is not already set
      if (!existingTransaction.stripe_transfer_id) {
        const { error: updateError } = await supabase
          .from('business_payment_transactions')
          .update({
            stripe_transfer_id: transfer.id,
          })
          .eq('id', existingTransaction.id);

        if (updateError) {
          console.error('❌ Error updating business_payment_transaction with transfer ID:', updateError);
        } else {
          console.log('✅ Updated business_payment_transaction with transfer ID:', transfer.id);
        }
      } else {
        console.log('ℹ️ business_payment_transaction already has transfer_id:', existingTransaction.stripe_transfer_id);
      }
    } else {
      console.log('⚠️ No business_payment_transaction found for booking:', bookingId);
    }

    // Record transfer in financial_transactions for audit trail
    const { error: financialError } = await supabase
      .from('financial_transactions')
      .insert({
        booking_id: bookingId,
        amount: transfer.amount / 100,
        currency: transfer.currency.toUpperCase().substring(0, 3),
        stripe_transaction_id: transfer.id,
        payment_method: 'transfer',
        description: `Stripe Connect transfer to business - ${transferType || 'booking_service_payment'}`,
        transaction_type: 'transfer',
        status: 'completed',
        processed_at: new Date().toISOString(),
        metadata: {
          transfer_type: transferType,
          destination_account: transfer.destination,
          source_transaction: transfer.source_transaction,
          payment_intent_id: paymentIntentId,
        },
      });

    if (financialError) {
      // Ignore duplicate errors
      if (financialError.code !== '23505') {
        console.error('❌ Error recording transfer in financial_transactions:', financialError);
      }
    } else {
      console.log('✅ Transfer recorded in financial_transactions');
    }

  } catch (error: any) {
    console.error('❌ Error handling transfer.created:', error);
    // Don't throw - transfer recording is not critical
  }
}

/**
 * Handle transfer.reversed webhook event
 * Updates business_payment_transactions to mark transfer as reversed
 */
async function handleTransferReversed(transfer: Stripe.Transfer) {
  console.log('🔄 Processing transfer.reversed:', {
    transferId: transfer.id,
    reversed: transfer.reversed,
    amount: transfer.amount / 100,
    amountReversed: transfer.amount_reversed / 100,
    metadata: transfer.metadata,
  });

  try {
    const bookingId = transfer.metadata?.booking_id;

    // Update business_payment_transactions to mark transfer as reversed
    if (transfer.id) {
      const { error: updateError } = await supabase
        .from('business_payment_transactions')
        .update({
          stripe_tax_reported: false, // Mark as needing update
          stripe_tax_report_error: `Transfer reversed. Amount reversed: $${(transfer.amount_reversed / 100).toFixed(2)}`,
        })
        .eq('stripe_transfer_id', transfer.id);

      if (updateError) {
        console.error('❌ Error updating business_payment_transaction for reversal:', updateError);
      } else {
        console.log('✅ Marked business_payment_transaction as reversed');
      }
    }

    // Record reversal in financial_transactions for audit trail
    if (bookingId) {
      const { error: financialError } = await supabase
        .from('financial_transactions')
        .insert({
          booking_id: bookingId,
          amount: transfer.amount_reversed / 100,
          currency: transfer.currency.toUpperCase().substring(0, 3),
          stripe_transaction_id: `${transfer.id}_reversal`,
          payment_method: 'transfer_reversal',
          description: 'Stripe Connect transfer reversal',
          transaction_type: 'refund',
          status: 'completed',
          processed_at: new Date().toISOString(),
          metadata: {
            original_transfer_id: transfer.id,
            destination_account: transfer.destination,
            reversal_reason: 'webhook_transfer_reversed',
          },
        });

      if (financialError) {
        if (financialError.code !== '23505') {
          console.error('❌ Error recording transfer reversal in financial_transactions:', financialError);
        }
      } else {
        console.log('✅ Transfer reversal recorded in financial_transactions');
      }
    }

  } catch (error: any) {
    console.error('❌ Error handling transfer.reversed:', error);
    // Don't throw - reversal recording is not critical
  }
}

/**
 * Handle account.updated webhook event
 * Updates the stripe_connect_accounts table with latest account status
 * This is triggered when:
 * - User completes Stripe onboarding
 * - Account requirements change
 * - Account capabilities are updated
 */
async function handleAccountUpdated(account: Stripe.Account) {
  console.log('🏦 Processing account.updated:', {
    accountId: account.id,
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    detailsSubmitted: account.details_submitted,
    businessType: account.business_type,
  });

  try {
    // Find the connect account record by account_id
    const { data: existingAccount, error: fetchError } = await supabase
      .from('stripe_connect_accounts')
      .select('id, business_id, user_id')
      .eq('account_id', account.id)
      .maybeSingle();

    if (fetchError) {
      console.error('❌ Error fetching stripe_connect_accounts:', fetchError);
      return;
    }

    if (!existingAccount) {
      console.log('ℹ️ No existing stripe_connect_accounts record for account:', account.id);
      console.log('ℹ️ This may be a newly created account - will be updated on next status check');
      return;
    }

    // Update the account record with latest status from Stripe
    const { error: updateError } = await supabase
      .from('stripe_connect_accounts')
      .update({
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        business_type: account.business_type,
        country: account.country,
        default_currency: account.default_currency,
        capabilities: account.capabilities || null,
        requirements: account.requirements || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingAccount.id);

    if (updateError) {
      console.error('❌ Error updating stripe_connect_accounts:', updateError);
    } else {
      console.log('✅ Updated stripe_connect_accounts record:', existingAccount.id);
    }

    // Also ensure business_profiles has the stripe_account_id and bank_connected status
    if (existingAccount.business_id) {
      // Determine if bank is connected (can accept payments and receive payouts)
      const isBankConnected = account.charges_enabled && account.payouts_enabled;
      
      const businessUpdate: Record<string, any> = {
        stripe_account_id: account.id,
      };
      
      // If account is fully onboarded, mark bank as connected
      if (isBankConnected) {
        businessUpdate.bank_connected = true;
        businessUpdate.bank_connected_at = new Date().toISOString();
        // Also mark setup_completed if not already set
        businessUpdate.setup_completed = true;
        console.log('💳 Setting bank_connected = true for business:', existingAccount.business_id);
      }
      
      const { error: businessUpdateError } = await supabase
        .from('business_profiles')
        .update(businessUpdate)
        .eq('id', existingAccount.business_id);

      if (businessUpdateError) {
        console.error('❌ Error updating business_profiles:', businessUpdateError);
      } else if (isBankConnected) {
        console.log('✅ Updated business_profiles with bank_connected = true');
      }
    }

    // Log onboarding completion
    if (account.charges_enabled && account.payouts_enabled) {
      console.log('🎉 Stripe Connect onboarding completed for account:', account.id);
      console.log('✅ Account is now ready to accept payments and receive payouts');
    } else if (account.details_submitted) {
      console.log('⏳ Stripe Connect details submitted, pending review for account:', account.id);
    } else if (account.requirements?.currently_due?.length) {
      console.log('⚠️ Account has requirements still due:', account.requirements.currently_due);
    }

  } catch (error: any) {
    console.error('❌ Error handling account.updated:', error);
    // Don't throw - account updates are not critical for booking flow
  }
}
