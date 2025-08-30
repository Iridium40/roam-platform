import type { VercelRequest, VercelResponse } from "@vercel/node";
import { stripe } from '../../server/lib/stripe-server';
import { createClient } from '@supabase/supabase-js';

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

    // Calculate platform fee (2.9% platform fee)
    const platformFeePercentage = 0.029;
    const platformFee = Math.round(serviceAmount * platformFeePercentage * 100); // in cents
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
      },
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
    console.error('Payment intent creation failed:', error);
    return res.status(500).json({
      error: 'Payment setup failed',
      details: error.message
    });
  }
}
