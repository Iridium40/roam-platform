import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-11-20' });
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

    // Pull authoritative pricing from Supabase - never trust client data
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

    // Validate service pricing
    const service = businessService.services as any;
    const servicePrice = businessService.business_price;

    if (servicePrice < service.min_price) {
      return res.status(400).json({
        error: `Invalid pricing configuration for ${service.name}`
      });
    }

    // Calculate platform fee (server-side calculation)
    const platformFeePercentage = 0.029; // 2.9% platform fee
    const serviceFee = servicePrice * platformFeePercentage;

    // Apply any promotions (server-side validation)
    let discountApplied = 0;
    if (promotionId) {
      const { data: promotion } = await supabase
        .from('promotions')
        .select('discount_value, discount_type, is_active, max_uses, current_uses')
        .eq('id', promotionId)
        .eq('is_active', true)
        .single();

      if (promotion && promotion.current_uses < promotion.max_uses) {
        if (promotion.discount_type === 'percentage') {
          discountApplied = servicePrice * (promotion.discount_value / 100);
        } else {
          discountApplied = promotion.discount_value;
        }
      }
    }

    // Calculate final total (server-side)
    const totalAmount = servicePrice + serviceFee - discountApplied;

    if (totalAmount <= 0) {
      return res.status(400).json({ error: 'Invalid total amount' });
    }

    // Get or create Stripe customer
    let stripeCustomerId: string;

    // Check if customer already has a Stripe profile
    const { data: existingProfile } = await supabase
      .from('customer_stripe_profiles')
      .select('stripe_customer_id, default_payment_method_id')
      .eq('user_id', customerId)
      .single();

    if (existingProfile) {
      stripeCustomerId = existingProfile.stripe_customer_id;
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: guestEmail,
        name: guestName,
        phone: guestPhone,
        metadata: {
          user_id: customerId,
          source: 'roam_booking'
        }
      });

      stripeCustomerId = customer.id;

      // Save to database
      await supabase
        .from('customer_stripe_profiles')
        .insert({
          user_id: customerId,
          stripe_customer_id: stripeCustomerId,
          stripe_email: guestEmail
        });
    }

    // Create checkout session using approved pattern
    const params: Stripe.Checkout.SessionCreateParams = {
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: Math.round(servicePrice * 100), // Convert to cents
            product_data: {
              name: service.name,
              description: `${service.description || ''} - ${bookingDate} at ${startTime}`
            },
          },
          quantity: 1,
        },
        ...(serviceFee > 0 ? [{
          price_data: {
            currency: 'usd',
            unit_amount: Math.round(serviceFee * 100),
            product_data: {
              name: 'Platform Fee',
              description: 'Processing & support fee'
            },
          },
          quantity: 1,
        }] : []),
        ...(discountApplied > 0 ? [{
          price_data: {
            currency: 'usd',
            unit_amount: -Math.round(discountApplied * 100), // Negative for discount
            product_data: {
              name: 'Promotion Discount',
              description: 'Applied discount'
            },
          },
          quantity: 1,
        }] : [])
      ],
      success_url: `${req.headers.origin}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/book-service/${serviceId}`,
      metadata: {
        service_id: serviceId,
        business_id: businessId,
        customer_id: customerId,
        booking_date: bookingDate,
        start_time: startTime,
        delivery_type: deliveryType || '',
        special_instructions: specialInstructions || '',
        promotion_id: promotionId || '',
        guest_phone: guestPhone || '',
        total_amount: totalAmount.toString(),
        service_price: servicePrice.toString(),
        service_fee: serviceFee.toString(),
        discount_applied: discountApplied.toString()
      },
      payment_intent_data: {
        setup_future_usage: 'on_session',
        metadata: {
          customer_id: customerId,
          booking_type: 'service',
          service_id: serviceId
        }
      }
    };

    const session = await stripe.checkout.sessions.create(params);

    return res.status(200).json({ sessionId: session.id });

  } catch (error) {
    console.error('❌ Error creating Stripe checkout session:', error);
    return res.status(500).json({
      error: 'Failed to create checkout session',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
