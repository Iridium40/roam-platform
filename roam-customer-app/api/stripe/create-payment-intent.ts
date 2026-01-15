import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Initialize Stripe directly (not from server lib for Vercel compatibility)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia' as any,
  typescript: true,
});

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    console.log('📝 Payment Intent request received');
    console.log('Environment check:', {
      hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
      hasSupabaseUrl: !!process.env.VITE_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    });
    console.log('📦 Request body serviceAmount:', req.body.serviceAmount);
    
    const {
      bookingId,
      serviceId,
      businessId,
      customerId,
      bookingDate,
      startTime,
      guestName,
      guestEmail,
      guestPhone,
      deliveryType,
      specialInstructions,
      promotionId,
      customerAddress,
      serviceAmount: customServiceAmount, // For "Add More Service" - amount in cents
      addon_ids, // Selected addon IDs
      addons_total // Total addon amount in dollars
    } = req.body;
    
    console.log('🔍 Extracted customServiceAmount:', customServiceAmount);

    // Validate required fields
    if (!serviceId || !businessId || !customerId) {
      return res.status(400).json({ 
        error: 'Missing required fields: serviceId, businessId, customerId' 
      });
    }

    // Validate business has an active Stripe Connect account for payment splitting
    const { data: connectedAccount, error: connectError } = await supabase
      .from('stripe_connect_accounts')
      .select('account_id, charges_enabled, payouts_enabled')
      .eq('business_id', businessId)
      .single();

    if (connectError || !connectedAccount?.account_id) {
      console.error('❌ Business does not have a Stripe Connect account:', { businessId, connectError });
      return res.status(400).json({ 
        error: 'Business not ready for payments',
        details: 'This business has not completed payment setup. Please contact support.',
        code: 'BUSINESS_PAYMENT_NOT_CONFIGURED'
      });
    }

    if (!connectedAccount.charges_enabled) {
      console.error('❌ Business Stripe Connect account cannot accept charges:', { businessId, accountId: connectedAccount.account_id });
      return res.status(400).json({ 
        error: 'Business payment account restricted',
        details: 'This business cannot currently accept payments. Please contact support.',
        code: 'BUSINESS_CHARGES_DISABLED'
      });
    }

    if (!connectedAccount.payouts_enabled) {
      console.warn('⚠️ Business Stripe Connect account has payouts disabled:', { businessId, accountId: connectedAccount.account_id });
      // Allow booking but log warning - payouts can be enabled later
    }

    console.log('✅ Business Stripe Connect account validated:', {
      businessId,
      accountId: connectedAccount.account_id,
      chargesEnabled: connectedAccount.charges_enabled,
      payoutsEnabled: connectedAccount.payouts_enabled
    });

    let serviceAmount: number;
    let service: any;

    // Check if customServiceAmount is provided (for "Add More Service" ad-hoc charges)
    // This is sent in cents from the frontend (e.g., 500 for $5.00)
    const hasCustomAmount = customServiceAmount !== undefined && 
                           customServiceAmount !== null && 
                           typeof customServiceAmount === 'number' && 
                           customServiceAmount > 0;
    
    if (hasCustomAmount) {
      // Convert from cents to dollars for calculations
      serviceAmount = customServiceAmount / 100;
      console.log('✅ Using ad-hoc/custom service amount from "Add More Service":', {
        customServiceAmountCents: customServiceAmount,
        serviceAmountDollars: serviceAmount,
        originalBookingServiceId: serviceId
      });
      
      // Still fetch service info for metadata, but don't validate pricing
      const { data: businessService } = await supabase
        .from('business_services')
        .select(`
          services:service_id (
            id,
            name,
            description,
            min_price,
            duration_minutes
          )
        `)
        .eq('business_id', businessId)
        .eq('service_id', serviceId)
        .single();
      
      service = businessService?.services as any;
    } else {
      // Pull authoritative pricing from Supabase for normal bookings
      const { data: businessService, error: businessServiceError } = await supabase
        .from('business_services')
        .select(`
          business_price,
          delivery_type,
          is_active,
          services:service_id (
            id,
            name,
            description,
            min_price,
            duration_minutes
          )
        `)
        .eq('business_id', businessId)
        .eq('service_id', serviceId)
        .eq('is_active', true)
        .single();

      if (businessServiceError || !businessService) {
        return res.status(404).json({ 
          error: 'Service not available from this business' 
        });
      }

      service = businessService.services as any;
      serviceAmount = businessService.business_price;
      
      // Validate service pricing only for normal bookings
      if (serviceAmount < service.min_price) {
        return res.status(400).json({ 
          error: `Invalid pricing configuration for ${service.name}` 
        });
      }
      
      // Add addons total to service amount if any addons were selected
      if (addons_total && typeof addons_total === 'number' && addons_total > 0) {
        console.log('✅ Adding addons to service amount:', {
          baseServiceAmount: serviceAmount,
          addonsTotal: addons_total,
          addonIds: addon_ids || [],
        });
        serviceAmount += addons_total;
      }
    }

    // Fetch platform fee from system configuration
    let platformFeePercentage = 20; // Default to 20%
    try {
      const { data: feeConfig, error: feeError } = await supabase
        .from('system_config')
        .select('config_value')
        .eq('config_key', 'platform_fee_percentage')
        .single();
      
      if (!feeError && feeConfig) {
        platformFeePercentage = parseFloat(feeConfig.config_value) || 20;
        console.log(`✅ Platform fee loaded from config: ${platformFeePercentage}%`);
      } else {
        console.warn('⚠️ Could not load platform fee from config, using default 20%');
      }
    } catch (error) {
      console.error('Error fetching platform fee configuration:', error);
    }
    
    // Calculate platform fee (percentage of service amount)
    // Note: Platform fee covers operational costs including Stripe processing fees
    const platformFee = Math.round(serviceAmount * (platformFeePercentage / 100) * 100); // in cents
    
    // Apply any promotions (server-side validation)
    let discountAmount = 0;
    if (promotionId) {
      const { data: promotion } = await supabase
        .from('promotions')
        .select('discount_value, discount_type, is_active, max_uses, current_uses')
        .eq('id', promotionId)
        .eq('is_active', true)
        .single();
      
      if (promotion && promotion.current_uses < promotion.max_uses) {
        if (promotion.discount_type === 'percentage') {
          discountAmount = Math.round(serviceAmount * (promotion.discount_value / 100) * 100); // in cents
        } else {
          discountAmount = Math.round(promotion.discount_value * 100); // in cents
        }
      }
    }

    // Calculate subtotal before tax
    const serviceAmountCents = Math.round(serviceAmount * 100);
    const subtotalAmount = serviceAmountCents + platformFee - discountAmount;

    // Calculate tax using Stripe Tax Calculation API
    let taxAmount = 0;
    let taxCalculation = null;
    
    // Get customer address for tax calculation (default to business address if not provided)
    let taxAddress = customerAddress;
    
    if (!taxAddress || !taxAddress.postal_code) {
      // Fallback to customer's saved address or business location
      const { data: customerProfile } = await supabase
        .from('customer_profiles')
        .select('address, city, state, postal_code')
        .eq('id', customerId)
        .single();
      
      if (customerProfile && customerProfile.postal_code) {
        taxAddress = {
          line1: customerProfile.address,
          city: customerProfile.city,
          state: customerProfile.state,
          postal_code: customerProfile.postal_code,
          country: 'US'
        };
      }
    }

    // Calculate tax if we have a valid address
    if (taxAddress && taxAddress.postal_code && taxAddress.state) {
      try {
        console.log('🧮 Calculating tax for address:', { 
          city: taxAddress.city, 
          state: taxAddress.state, 
          postal_code: taxAddress.postal_code 
        });

        taxCalculation = await stripe.tax.calculations.create({
          currency: 'usd',
          line_items: [
            {
              amount: subtotalAmount,
              reference: `service-${serviceId}`,
            },
          ],
          customer_details: {
            address: {
              line1: taxAddress.line1 || '',
              city: taxAddress.city || '',
              state: taxAddress.state,
              postal_code: taxAddress.postal_code,
              country: taxAddress.country || 'US',
            },
            address_source: 'shipping',
          },
        });

        taxAmount = taxCalculation.tax_amount_exclusive;
        console.log('✅ Tax calculated:', {
          taxAmount: taxAmount / 100,
          taxRate: taxCalculation.tax_breakdown?.[0]?.tax_rate_details?.percentage_decimal
        });
      } catch (taxError) {
        console.error('⚠️ Tax calculation failed:', taxError);
        // Continue without tax if calculation fails
        taxAmount = 0;
      }
    } else {
      console.log('⚠️ No valid address for tax calculation - proceeding without tax');
    }

    // Calculate final total including tax
    const totalAmount = subtotalAmount + taxAmount;

    if (totalAmount <= 0) {
      return res.status(400).json({ error: 'Invalid total amount' });
    }

    // Get customer details from Supabase
    const { data: customer, error: customerError } = await supabase
      .from('customer_profiles')
      .select('id, user_id, email, first_name, last_name, phone')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Get or create Stripe customer
    // IMPORTANT: Use customer.user_id (not customerId) to lookup Stripe profile
    let stripeCustomerId: string | undefined;
    
    // Check if customer already has a Stripe profile
    const { data: existingProfile } = await supabase
      .from('customer_stripe_profiles')
      .select('stripe_customer_id')
      .eq('user_id', customer.user_id) // Use customer.user_id, not customerId
      .single();

    if (existingProfile) {
      stripeCustomerId = existingProfile.stripe_customer_id;
    } else {
      // Create new Stripe customer
      // IMPORTANT: Stripe customer represents the *logged-in payer*, not the guest/attendee.
      const stripeCustomer = await stripe.customers.create({
        email: customer.email,
        name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.email,
        phone: customer.phone || undefined,
        metadata: {
          user_id: customer.user_id, // Use customer.user_id, not customerId
          source: 'roam_booking'
        }
      });

      stripeCustomerId = stripeCustomer.id;

      // Save to database
      await supabase
        .from('customer_stripe_profiles')
        .insert({
          user_id: customer.user_id, // Use customer.user_id, not customerId
          stripe_customer_id: stripeCustomerId,
          stripe_email: customer.email
        });
    }

    // Determine capture method based on payment type
    // - New bookings: manual capture (authorize now, charge on acceptance)
    // - Add more services: automatic capture (charge immediately)
    const isAddMoreService = hasCustomAmount && bookingId; // Add more service if bookingId exists and custom amount provided
    const captureMethod = isAddMoreService ? 'automatic' : 'manual';
    
    // Fetch booking reference number for the Stripe description
    let bookingReference = '';
    if (bookingId) {
      const { data: booking } = await supabase
        .from('bookings')
        .select('booking_reference')
        .eq('id', bookingId)
        .single();
      
      bookingReference = booking?.booking_reference || '';
    }
    
    // Create Payment Intent
    // For new bookings: Payment is AUTHORIZED at checkout but NOT CHARGED until booking is accepted
    // For add more services: Payment is CHARGED immediately when customer submits
    // Note: confirm must be false for manual capture - payment will be confirmed on frontend
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: 'usd',
      customer: stripeCustomerId,
      description: bookingReference 
        ? `${bookingReference}: ${service?.name || 'Service'}` 
        : `ROAM Booking: ${service?.name || 'Service'}`,
      capture_method: captureMethod, // Manual for new bookings, automatic for add more services
      confirm: false, // Explicitly set to false - will be confirmed on frontend
      // IMPORTANT: setup_future_usage enables saving payment methods for future use
      // This allows the customer's card to be saved and reused for future bookings
      setup_future_usage: 'off_session',
      metadata: {
        bookingId: bookingId || '',
        customerId,
        serviceId,
        businessId,
        serviceAmount: serviceAmount.toString(),
        serviceAmountCents: serviceAmountCents.toString(), // For transfer calculation
        platformFee: (platformFee / 100).toString(),
        discountAmount: (discountAmount / 100).toString(),
        bookingDate: bookingDate || '',
        startTime: startTime || '',
        deliveryType: deliveryType || '',
        specialInstructions: specialInstructions || '',
        promotionId: promotionId || '',
        guestPhone: guestPhone || '',
        paymentType: isAddMoreService ? 'additional_service' : 'initial_booking',
        // Addon information
        addon_ids: addon_ids ? JSON.stringify(addon_ids) : '',
        addons_total: addons_total?.toString() || '0',
        // Stripe Connect: Store connected account for transfer on capture
        connectedAccountId: connectedAccount.account_id,
        transferAmount: serviceAmountCents.toString(), // Amount to transfer to business (service amount in cents)
      },
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never', // Disable redirect-based payment methods like Cash App
      },
      // Note: Cannot use payment_method_types when automatic_payment_methods is enabled
      // automatic_payment_methods handles card, Apple Pay, Google Pay automatically
      
      // Note: automatic_tax is NOT supported for Payment Intents - only for Checkout Sessions
      // Tax calculation for Payment Intents must be done manually on the backend
    });

    // If bookingId provided, update booking with payment details
    // Note: stripe_payment_intent_id is NOT stored on bookings table
    // It is stored in business_payment_transactions and financial_transactions
    if (bookingId) {
      await supabase
        .from('bookings')
        .update({
          total_amount: totalAmount / 100,
          service_fee: platformFee / 100,
          payment_status: 'pending'
        })
        .eq('id', bookingId);

      // CRITICAL: Save payment intent ID immediately to business_payment_transactions
      // Don't rely solely on webhook - this ensures the payment intent can be found later
      // when the provider accepts the booking and payment needs to be captured
      const bookingDate = new Date();
      const paymentDate = bookingDate.toISOString().split('T')[0];
      const taxYear = bookingDate.getFullYear();

      console.log('💾 Saving payment intent to business_payment_transactions:', {
        bookingId,
        paymentIntentId: paymentIntent.id,
        grossAmount: totalAmount / 100,
        platformFee: platformFee / 100,
        netAmount: serviceAmount,
      });

      const { error: bptError } = await supabase
        .from('business_payment_transactions')
        .upsert({
          booking_id: bookingId,
          business_id: businessId,
          payment_date: paymentDate,
          gross_payment_amount: totalAmount / 100,
          platform_fee: platformFee / 100,
          net_payment_amount: serviceAmount,
          tax_year: taxYear,
          stripe_payment_intent_id: paymentIntent.id,
          stripe_connect_account_id: connectedAccount.account_id,
          transaction_description: 'Platform service payment (pending capture)',
          transaction_type: isAddMoreService ? 'additional_service' : 'initial_booking',
        }, {
          onConflict: 'booking_id,stripe_payment_intent_id',
          ignoreDuplicates: true,
        });

      if (bptError) {
        // Log but don't fail - try insert if upsert fails
        console.warn('⚠️ Upsert to business_payment_transactions failed, trying insert:', bptError);
        const { error: insertError } = await supabase
          .from('business_payment_transactions')
          .insert({
            booking_id: bookingId,
            business_id: businessId,
            payment_date: paymentDate,
            gross_payment_amount: totalAmount / 100,
            platform_fee: platformFee / 100,
            net_payment_amount: serviceAmount,
            tax_year: taxYear,
            stripe_payment_intent_id: paymentIntent.id,
            stripe_connect_account_id: connectedAccount.account_id,
            transaction_description: 'Platform service payment (pending capture)',
            transaction_type: isAddMoreService ? 'additional_service' : 'initial_booking',
          });

        if (insertError && insertError.code !== '23505') { // Ignore duplicate errors
          console.error('⚠️ Failed to save payment intent to business_payment_transactions:', insertError);
          // Continue anyway - webhook may still save it
        } else {
          console.log('✅ Payment intent saved to business_payment_transactions via insert');
        }
      } else {
        console.log('✅ Payment intent saved to business_payment_transactions');
      }

      // Also save to financial_transactions for audit trail
      const { error: ftError } = await supabase
        .from('financial_transactions')
        .insert({
          booking_id: bookingId,
          amount: totalAmount / 100,
          currency: 'USD',
          stripe_transaction_id: paymentIntent.id,
          payment_method: 'card',
          description: 'Service booking payment authorized (pending capture)',
          transaction_type: 'booking_payment',
          status: 'pending', // Pending because payment is authorized but not captured
          processed_at: new Date().toISOString(),
          metadata: {
            customer_id: customerId,
            service_id: serviceId,
            business_id: businessId,
            capture_status: 'requires_capture',
            payment_type: isAddMoreService ? 'additional_service' : 'initial_booking',
          },
        });

      if (ftError && ftError.code !== '23505') { // Ignore duplicates
        console.warn('⚠️ Failed to save to financial_transactions:', ftError);
        // Continue anyway - not critical
      } else if (!ftError) {
        console.log('✅ Payment intent saved to financial_transactions');
      }
    }

    // Calculate base service amount (without addons) for breakdown display
    const addonsAmount = (addons_total && typeof addons_total === 'number') ? addons_total : 0;
    const baseServiceAmount = serviceAmount - addonsAmount;
    
    const breakdown = {
      serviceAmount: baseServiceAmount,
      addonsAmount: addonsAmount,
      addonsCount: addon_ids?.length || 0,
      platformFee: platformFee / 100,
      discountAmount: discountAmount / 100,
      taxAmount: taxAmount / 100,
      taxRate: taxCalculation?.tax_breakdown?.[0]?.tax_rate_details?.percentage_decimal || null,
      subtotal: subtotalAmount / 100,
      total: totalAmount / 100
    };

    console.log('💰 Payment breakdown:', {
      customServiceAmountCents: customServiceAmount,
      serviceAmountDollars: serviceAmount,
      platformFeeCents: platformFee,
      platformFeeDollars: platformFee / 100,
      totalAmountCents: totalAmount,
      totalAmountDollars: totalAmount / 100,
      breakdown,
      addons: {
        addonIds: addon_ids || [],
        addonsTotal: addons_total || 0,
      },
      stripeConnect: {
        connectedAccountId: connectedAccount.account_id,
        transferAmountCents: serviceAmountCents,
        transferAmountDollars: serviceAmount,
      }
    });

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      amount: totalAmount / 100,
      breakdown
    });

  } catch (error: any) {
    console.error('❌ Payment intent creation failed:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      type: error.type,
      code: error.code
    });
    
    return res.status(500).json({
      error: 'Payment setup failed',
      details: error.message,
      code: error.code || 'PAYMENT_INTENT_ERROR'
    });
  }
}
