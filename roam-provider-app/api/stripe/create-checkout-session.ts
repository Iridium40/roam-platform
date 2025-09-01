import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Initialize Stripe with latest API version
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface CreateCheckoutSessionRequest {
  productId: string;
  quantity: number;
  customerEmail?: string;
  customerName?: string;
  successUrl?: string;
  cancelUrl?: string;
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
      productId,
      quantity = 1,
      customerEmail,
      customerName,
      successUrl,
      cancelUrl,
    }: CreateCheckoutSessionRequest = req.body;

    // Validate required fields
    if (!productId) {
      return res.status(400).json({ 
        error: "Missing required fields",
        required: ["productId"]
      });
    }

    // Validate quantity
    if (quantity < 1) {
      return res.status(400).json({ 
        error: "Invalid quantity",
        details: "Quantity must be at least 1"
      });
    }

    // Get product information from Stripe
    const product = await stripe.products.retrieve(productId, {
      expand: ['default_price'],
    });

    if (!product.active) {
      return res.status(400).json({ 
        error: "Product not available",
        details: "Product is not currently active"
      });
    }

    if (!product.default_price) {
      return res.status(400).json({ 
        error: "Product has no price",
        details: "Product must have a default price to create checkout session"
      });
    }

    const price = product.default_price as Stripe.Price;
    if (!price.unit_amount) {
      return res.status(400).json({ 
        error: "Invalid price",
        details: "Product price is not properly configured"
      });
    }

    // Get business and connected account information from database
    const { data: productData, error: dbError } = await supabase
      .from("stripe_products")
      .select(`
        business_id,
        business_profiles!inner (
          business_name,
          business_address,
          business_city,
          business_state,
          business_zip
        ),
        stripe_connect_accounts!inner (
          stripe_account_id,
          charges_enabled,
          payouts_enabled
        )
      `)
      .eq("stripe_product_id", productId)
      .eq("status", "active")
      .single();

    if (dbError || !productData) {
      return res.status(404).json({ 
        error: "Product not found in database",
        details: "Product mapping information is missing"
      });
    }

    // Verify connected account is ready
    if (!productData.stripe_connect_accounts.charges_enabled) {
      return res.status(400).json({ 
        error: "Connected account not ready",
        details: "Business account is not ready to accept payments"
      });
    }

    // Calculate total amount and application fee
    const unitAmount = price.unit_amount;
    const totalAmount = unitAmount * quantity;
    
    // Platform fee: 2.9% + 30 cents
    const platformFeePercentage = 0.029;
    const platformFee = Math.round(totalAmount * platformFeePercentage);
    const processingFee = 30; // Stripe processing fee in cents
    const applicationFeeAmount = platformFee + processingFee;

    console.log("Creating checkout session:", {
      productId,
      quantity,
      unitAmount,
      totalAmount,
      applicationFeeAmount,
      connectedAccountId: productData.stripe_connect_accounts.stripe_account_id,
    });

    // Create Stripe Checkout Session with destination charge
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: price.currency,
            product_data: {
              name: product.name,
              description: product.description || undefined,
              metadata: {
                business_id: productData.business_id,
                connected_account_id: productData.stripe_connect_accounts.stripe_account_id,
              },
            },
            unit_amount: unitAmount,
          },
          quantity,
        },
      ],
      mode: 'payment',
      success_url: successUrl || `${process.env.VITE_APP_URL || 'http://localhost:5175'}/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.VITE_APP_URL || 'http://localhost:5175'}/checkout-cancel`,
      customer_email: customerEmail,
      customer_creation: customerEmail ? 'always' : 'if_required',
      metadata: {
        product_id: productId,
        business_id: productData.business_id,
        connected_account_id: productData.stripe_connect_accounts.stripe_account_id,
        business_name: productData.business_profiles.business_name,
        quantity: quantity.toString(),
        platform_fee: (applicationFeeAmount / 100).toString(),
      },
      // Destination charge with application fee
      payment_intent_data: {
        application_fee_amount: applicationFeeAmount,
        transfer_data: {
          destination: productData.stripe_connect_accounts.stripe_account_id,
        },
        metadata: {
          product_id: productId,
          business_id: productData.business_id,
          connected_account_id: productData.stripe_connect_accounts.stripe_account_id,
          platform_fee: (applicationFeeAmount / 100).toString(),
        },
      },
      // Customize appearance
      custom_fields: [
        {
          key: 'business_name',
          label: {
            type: 'custom',
            custom: 'Business'
          },
          type: 'text',
          optional: false,
          default: productData.business_profiles.business_name,
        },
        {
          key: 'quantity',
          label: {
            type: 'custom',
            custom: 'Quantity'
          },
          type: 'text',
          optional: false,
          default: quantity.toString(),
        },
      ],
      // Apply branding
      billing_address_collection: 'required',
      customer_update: {
        address: 'auto',
        name: 'auto',
      },
      // Enable automatic tax calculation
      automatic_tax: {
        enabled: true,
      },
    });

    console.log("Checkout session created:", session.id);

    // Store checkout session information in database
    const { error: sessionDbError } = await supabase
      .from("stripe_checkout_sessions")
      .insert({
        session_id: session.id,
        product_id: productId,
        business_id: productData.business_id,
        connected_account_id: productData.stripe_connect_accounts.stripe_account_id,
        customer_email: customerEmail,
        customer_name: customerName,
        quantity,
        unit_amount: unitAmount,
        total_amount: totalAmount,
        application_fee_amount: applicationFeeAmount,
        currency: price.currency,
        status: session.status,
        success_url: session.success_url,
        cancel_url: session.cancel_url,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (sessionDbError) {
      console.error("Error storing checkout session in database:", sessionDbError);
      // Continue anyway - Stripe session was created successfully
    }

    return res.status(200).json({
      success: true,
      session: {
        id: session.id,
        url: session.url,
        status: session.status,
        amount_total: session.amount_total,
        currency: session.currency,
        customer_email: session.customer_email,
      },
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        price: {
          amount: unitAmount,
          currency: price.currency,
          formatted: `$${(unitAmount / 100).toFixed(2)}`,
        },
      },
      business: {
        name: productData.business_profiles.business_name,
        address: productData.business_profiles.business_address,
        city: productData.business_profiles.business_city,
        state: productData.business_profiles.business_state,
        zip: productData.business_profiles.business_zip,
      },
      fees: {
        platformFee: (platformFee / 100).toFixed(2),
        processingFee: (processingFee / 100).toFixed(2),
        totalFee: (applicationFeeAmount / 100).toFixed(2),
      },
      message: "Checkout session created successfully",
    });

  } catch (error) {
    console.error("Stripe checkout session creation error:", error);

    if (error instanceof Stripe.errors.StripeError) {
      return res.status(400).json({
        error: "Stripe error",
        details: error.message,
        type: error.type,
        code: error.code,
      });
    }

    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
