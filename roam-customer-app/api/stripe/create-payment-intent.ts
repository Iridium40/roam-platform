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
      promotionId
    } = req.body;

    // Validate required fields
    if (!serviceId || !businessId || !customerId) {
      return res.status(400).json({ 
        error: 'Missing required fields: serviceId, businessId, customerId' 
      });
    }

    // Pull authoritative pricing from Supabase
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

    const service = businessService.services as any;
    const serviceAmount = businessService.business_price;
    
    // Validate service pricing
    if (serviceAmount < service.min_price) {
      return res.status(400).json({ 
        error: `Invalid pricing configuration for ${service.name}` 
      });
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
    const platformFee = Math.round(serviceAmount * (platformFeePercentage / 100) * 100); // in cents
    const processingFee = 30; // Stripe processing fee in cents
    
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

    // Calculate final total in cents
    const serviceAmountCents = Math.round(serviceAmount * 100);
    const totalAmount = serviceAmountCents + platformFee + processingFee - discountAmount;

    if (totalAmount <= 0) {
      return res.status(400).json({ error: 'Invalid total amount' });
    }

    // Get customer details from Supabase
    const { data: customer, error: customerError } = await supabase
      .from('customer_profiles')
      .select('*')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Get or create Stripe customer
    let stripeCustomerId: string | undefined;
    
    // Check if customer already has a Stripe profile
    const { data: existingProfile } = await supabase
      .from('customer_stripe_profiles')
      .select('stripe_customer_id')
      .eq('user_id', customerId)
      .single();

    if (existingProfile) {
      stripeCustomerId = existingProfile.stripe_customer_id;
    } else {
      // Create new Stripe customer
      const stripeCustomer = await stripe.customers.create({
        email: guestEmail,
        name: guestName,
        phone: guestPhone,
        metadata: {
          user_id: customerId,
          source: 'roam_booking'
        }
      });

      stripeCustomerId = stripeCustomer.id;

      // Save to database
      await supabase
        .from('customer_stripe_profiles')
        .insert({
          user_id: customerId,
          stripe_customer_id: stripeCustomerId,
          stripe_email: guestEmail
        });
    }

    // Create Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: 'usd',
      customer: stripeCustomerId,
      metadata: {
        bookingId: bookingId || '',
        customerId,
        serviceId,
        businessId,
        serviceAmount: serviceAmount.toString(),
        platformFee: (platformFee / 100).toString(),
        discountAmount: (discountAmount / 100).toString(),
        bookingDate: bookingDate || '',
        startTime: startTime || '',
        deliveryType: deliveryType || '',
        specialInstructions: specialInstructions || '',
        promotionId: promotionId || '',
        guestPhone: guestPhone || ''
      },
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never', // Disable redirect-based payment methods like Cash App
      },
      // Note: Cannot use payment_method_types when automatic_payment_methods is enabled
      // automatic_payment_methods handles card, Apple Pay, Google Pay automatically
      
      // Enable automatic tax calculation
      // Note: Payment Intents only support 'enabled' - liability is for Checkout Sessions only
      automatic_tax: {
        enabled: true
      }
    });

    // If bookingId provided, update booking with payment intent
    if (bookingId) {
      await supabase
        .from('bookings')
        .update({
          stripe_payment_intent_id: paymentIntent.id,
          total_amount: totalAmount / 100,
          service_fee: platformFee / 100,
          payment_status: 'pending'
        })
        .eq('id', bookingId);
    }

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      amount: totalAmount / 100,
      breakdown: {
        serviceAmount: serviceAmount,
        platformFee: platformFee / 100,
        processingFee: processingFee / 100,
        discountAmount: discountAmount / 100,
        total: totalAmount / 100
      }
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
