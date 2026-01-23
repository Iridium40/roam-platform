import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Use the latest stable API version instead of beta
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { 
  apiVersion: '2024-11-20.acacia' as any
});

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
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
    const {
      service_id,
      business_id,
      customer_id,
      provider_id,
      booking_date,
      start_time,
      guest_name,
      guest_email,
      guest_phone,
      delivery_type,
      business_location_id,
      customer_location_id,
      special_instructions,
      promotionId,
      promotionCode,
      discountApplied,
      originalAmount,
      total_amount,
      serviceName,
      businessName
    } = req.body;

    // Validate required fields
    if (!service_id || !business_id || !customer_id || !total_amount) {
      return res.status(400).json({ 
        error: 'Missing required fields: service_id, business_id, customer_id, total_amount' 
      });
    }

    // Get service details to check pricing_type
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('id, name, min_price, pricing_type')
      .eq('id', service_id)
      .single();

    if (serviceError) {
      console.warn('Could not fetch service details:', serviceError);
    }

    // Determine if this is a deposit-type service
    const isDepositService = service?.pricing_type === 'deposit';
    const depositAmount = service?.min_price || 0;
    
    // Calculate service_fee and remaining_balance based on pricing_type
    let serviceFee: number;
    let remainingBalance: number;
    
    if (isDepositService && depositAmount > 0 && depositAmount < total_amount) {
      // Deposit service: charge deposit now, remaining balance later
      serviceFee = depositAmount;
      remainingBalance = total_amount - depositAmount;
      console.log('💰 Deposit service detected:', { 
        depositAmount, 
        totalAmount: total_amount, 
        remainingBalance 
      });
    } else {
      // Fixed price service: charge full amount now
      serviceFee = total_amount;
      remainingBalance = 0;
    }

    // Get customer details from Supabase
    const { data: customer, error: customerError} = await supabase
      .from('customer_profiles')
      .select('id, user_id, email, first_name, last_name, phone')
      .eq('id', customer_id)
      .single();

    if (customerError || !customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Get or create Stripe customer
    let stripeCustomerId: string | undefined;
    
    // Check if customer already has a Stripe profile (using user_id)
    const { data: existingProfile, error: profileError } = await supabase
      .from('customer_stripe_profiles')
      .select('stripe_customer_id')
      .eq('user_id', customer.user_id)
      .single();

    if (existingProfile && existingProfile.stripe_customer_id) {
      stripeCustomerId = existingProfile.stripe_customer_id;
      
      // Verify the Stripe customer exists
      try {
        await stripe.customers.retrieve(stripeCustomerId);
        console.log('✅ Using existing Stripe customer:', stripeCustomerId);
      } catch (error) {
        console.warn('⚠️ Stripe customer not found, creating new one. Old ID:', stripeCustomerId);
        stripeCustomerId = undefined; // Will create new customer below
        
        // Delete invalid profile
        await supabase
          .from('customer_stripe_profiles')
          .delete()
          .eq('user_id', customer.user_id);
      }
    }
    
    // Create new Stripe customer if needed
    if (!stripeCustomerId) {
      console.log('Creating new Stripe customer for user:', customer.user_id);
      
      // IMPORTANT: Stripe customer represents the *logged-in payer*, not the guest/attendee.
      const stripeCustomer = await stripe.customers.create({
        email: customer.email,
        name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.email,
        phone: customer.phone || undefined,
        metadata: {
          user_id: customer.user_id,
          customer_profile_id: customer_id,
          source: 'roam_booking'
        }
      });

      stripeCustomerId = stripeCustomer.id;
      console.log('✅ Created Stripe customer:', stripeCustomerId);

      // Save to database (using user_id)
      await supabase
        .from('customer_stripe_profiles')
        .upsert({
          user_id: customer.user_id,
          stripe_customer_id: stripeCustomerId,
          stripe_email: customer.email
        }, {
          onConflict: 'user_id'
        });
    }

    // Calculate platform fee (2.9% + 30 cents) - based on amount charged now (serviceFee)
    const platformFeePercentage = 0.029;
    const platformFee = Math.round(serviceFee * platformFeePercentage * 100); // in cents
    const processingFee = 30; // Stripe processing fee in cents
    const serviceFeeAmountCents = Math.round(serviceFee * 100);

    // Determine domain for redirect URLs
    const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
    const DOMAIN = isProd
      ? 'https://roamservices.app'
      : (process.env.VITE_APP_URL || 'http://localhost:5174');

    // Build product description based on pricing type
    const productDescription = isDepositService
      ? `Deposit for ${businessName || 'Business'} - ${delivery_type || 'Service'} (Balance: $${remainingBalance.toFixed(2)} due at service)`
      : `Booking for ${businessName || 'Business'} - ${delivery_type || 'Service'}`;

    // Create Checkout Session with all booking data in metadata
    // Payment is AUTHORIZED at checkout but NOT CHARGED until booking is accepted
    // The webhook will create the booking after payment authorization
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: isDepositService ? `${serviceName || 'Service'} - Deposit` : (serviceName || 'Service Booking'),
              description: productDescription,
              metadata: {
                service_id,
                business_id,
                delivery_type: delivery_type || '',
                pricing_type: isDepositService ? 'deposit' : 'fixed'
              }
            },
            unit_amount: serviceFeeAmountCents, // Charge serviceFee (deposit or full amount)
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      locale: 'en',  // Explicitly set locale to prevent './en' module loading error
      // Use manual capture - authorize payment but don't charge until booking is accepted
      payment_intent_data: {
        capture_method: 'manual', // Authorize only, capture later when booking is accepted
      },
      success_url: `${DOMAIN}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${DOMAIN}/book-service?serviceId=${service_id}&businessId=${business_id}`,
      // All booking data in metadata - webhook will use this to create booking
      metadata: {
        customer_id,
        service_id,
        business_id,
        provider_id: provider_id || '',
        total_amount: total_amount.toString(),
        service_fee: serviceFee.toString(), // Amount charged at checkout
        remaining_balance: remainingBalance.toString(), // Amount due at service
        pricing_type: isDepositService ? 'deposit' : 'fixed',
        platform_fee: (platformFee / 100).toString(),
        booking_date: booking_date || '',
        start_time: start_time || '',
        delivery_type: delivery_type || '',
        business_location_id: business_location_id || '',
        customer_location_id: customer_location_id || '',
        special_instructions: special_instructions || '',
        guest_name: guest_name || '',
        guest_email: guest_email || '',
        guest_phone: guest_phone || '',
        // Promotion data
        promotion_id: promotionId || '',
        promotion_code: promotionCode || '',
        discount_applied: discountApplied?.toString() || '0',
        original_amount: originalAmount?.toString() || total_amount.toString()
      },
      // Apply branding
      billing_address_collection: 'required',
      customer_update: {
        address: 'auto',
        name: 'auto'
      },
      // Enable automatic tax calculation
      // ROAM Platform is responsible for tax collection and remittance
      automatic_tax: {
        enabled: true,
        liability: {
          type: 'self' // Platform assumes tax liability
        }
      }
    });

    console.log('✅ Checkout session created:', session.id);
    console.log('📋 Booking data stored in metadata - webhook will create booking after payment');
    if (isDepositService) {
      console.log('💰 Deposit service - charging deposit:', serviceFee, 'remaining balance:', remainingBalance);
    }

    // Return checkout session details to frontend
    return res.status(200).json({
      sessionId: session.id,
      url: session.url,
      amount: serviceFee, // Amount being charged now
      totalAmount: total_amount, // Full service price
      isDeposit: isDepositService,
      breakdown: {
        depositAmount: isDepositService ? serviceFee : null,
        remainingBalance: remainingBalance,
        serviceAmount: total_amount,
        platformFee: platformFee / 100,
        processingFee: processingFee / 100,
        chargedNow: serviceFee
      }
    });

  } catch (error: any) {
    console.error('Checkout session creation failed:', error);
    return res.status(500).json({
      error: 'Checkout setup failed',
      details: error.message
    });
  }
}
