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
      const stripe = stripeService.getStripe();
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

    // Create checkout session
    const stripe = stripeService.getStripe();
    
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Service Booking',
              description: `Booking for ${guestName} on ${bookingDate} at ${startTime}`,
              metadata: {
                service_id: serviceId,
                business_id: businessId,
                provider_id: providerId
              }
            },
            unit_amount: Math.round(servicePrice * 100), // Convert to cents
          },
          quantity: 1,
        },
        ...(serviceFee > 0 ? [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Service Fee (${platformFeePercentage}%)`,
              description: 'Platform processing & support fee'
            },
            unit_amount: Math.round(serviceFee * 100),
          },
          quantity: 1,
        }] : []),
        ...(discountApplied > 0 ? [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Promotion Discount',
              description: 'Applied promotion discount'
            },
            unit_amount: -Math.round(discountApplied * 100), // Negative for discount
          },
          quantity: 1,
        }] : [])
      ],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL || req.headers.origin}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || req.headers.origin}/book-service/${serviceId}`,
      metadata: {
        service_id: serviceId,
        business_id: businessId,
        provider_id: providerId,
        customer_id: customerId,
        booking_date: bookingDate,
        start_time: startTime,
        delivery_type: deliveryType,
        special_instructions: specialInstructions || '',
        promotion_id: promotionId || '',
        guest_phone: guestPhone || '',
        total_amount: totalAmount.toString(),
        service_price: servicePrice.toString(),
        service_fee: serviceFee.toString(),
        discount_applied: discountApplied.toString()
      },
      // Enable saving payment methods for future use
      payment_intent_data: {
        setup_future_usage: 'on_session',
        metadata: {
          customer_id: customerId,
          booking_type: 'service',
          service_id: serviceId
        }
      }
    });

    console.log('✅ Stripe checkout session created:', {
      sessionId: session.id,
      customerId: stripeCustomerId,
      amount: totalAmount
    });

    return res.status(200).json({
      success: true,
      url: session.url,
      sessionId: session.id,
      customerId: stripeCustomerId
    });

  } catch (error) {
    console.error('❌ Error creating Stripe checkout session:', error);
    return res.status(500).json({
      error: 'Failed to create checkout session',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
