import { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

interface CreateTipCheckoutSessionRequest {
  tip_amount: number;
  booking_id: string;
  customer_id: string;
  provider_id: string;
  business_id: string;
  customer_message?: string;
  success_url?: string;
  cancel_url?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Validate required environment variables
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("Missing STRIPE_SECRET_KEY environment variable");
      return res.status(500).json({ 
        error: "Stripe configuration error",
        details: "STRIPE_SECRET_KEY is not configured"
      });
    }

    const {
      tip_amount,
      booking_id,
      customer_id,
      provider_id,
      business_id,
      customer_message,
      success_url,
      cancel_url,
    }: CreateTipCheckoutSessionRequest = req.body;

    // Validate required fields
    if (!tip_amount || !booking_id || !customer_id || !provider_id || !business_id) {
      return res.status(400).json({ 
        error: "Missing required fields",
        required: ["tip_amount", "booking_id", "customer_id", "provider_id", "business_id"]
      });
    }

    // Validate tip amount (minimum $1.00)
    if (tip_amount < 1) {
      return res.status(400).json({ 
        error: "Invalid tip amount",
        details: "Tip amount must be at least $1.00"
      });
    }

    // Calculate Stripe processing fees (2.9% + 30 cents)
    const stripeFeePercentage = 0.029; // 2.9%
    const stripeFeeFixed = 30; // 30 cents
    const stripeFeeAmount = Math.round(tip_amount * stripeFeePercentage * 100) + stripeFeeFixed;
    const providerNetAmount = Math.round(tip_amount * 100) - stripeFeeAmount; // Tip minus Stripe fees
    const tipAmountCents = Math.round(tip_amount * 100);

    // Determine domain for redirect URLs
    const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
    const DOMAIN = isProd
      ? 'https://roamservices.app'
      : (process.env.VITE_APP_URL || 'http://localhost:5174');

    // Create Checkout Session for tip payment
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Tip for Service',
              description: `Tip for your service provider${customer_message ? ` - ${customer_message}` : ''}`,
              metadata: {
                booking_id,
                business_id,
                provider_id,
              },
            },
            unit_amount: tipAmountCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      locale: 'en',  // Explicitly set locale to prevent './en' module loading error
      success_url: success_url || `${DOMAIN}/tip-success?session_id={CHECKOUT_SESSION_ID}&booking_id=${booking_id}`,
      cancel_url: cancel_url || `${DOMAIN}/tip-cancel?booking_id=${booking_id}`,
      metadata: {
        type: 'tip',
        booking_id,
        customer_id,
        provider_id,
        business_id,
        tip_amount: tip_amount.toString(),
        stripe_fee: (stripeFeeAmount / 100).toString(),
        provider_net: (providerNetAmount / 100).toString(),
        customer_message: customer_message || '',
      },
      // For tips, we'll use a simple payment without destination charges
      // The webhook will handle the tip record creation
    });

    console.log('✅ Created tip checkout session:', session.id);

    return res.status(200).json({
      session_id: session.id,
      checkout_url: session.url,
      success: true,
    });

  } catch (error: any) {
    console.error('❌ Error creating tip checkout session:', error);
    return res.status(500).json({
      error: "Failed to create checkout session",
      details: error.message,
    });
  }
}
