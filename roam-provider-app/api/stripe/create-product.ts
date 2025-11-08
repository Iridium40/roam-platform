import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Initialize Stripe with latest API version
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia" as any,
});

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface CreateProductRequest {
  name: string;
  description?: string;
  price: number; // Price in dollars (e.g., 29.99)
  currency?: string;
  connectedAccountId: string; // Stripe Connect account ID
  businessId: string;
  userId: string;
  category?: string;
  metadata?: Record<string, string>;
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
      name,
      description,
      price,
      currency = "usd",
      connectedAccountId,
      businessId,
      userId,
      category,
      metadata = {},
    }: CreateProductRequest = req.body;

    // Validate required fields
    if (!name || !price || !connectedAccountId || !businessId || !userId) {
      return res.status(400).json({ 
        error: "Missing required fields",
        required: ["name", "price", "connectedAccountId", "businessId", "userId"]
      });
    }

    // Validate price
    if (price <= 0) {
      return res.status(400).json({ 
        error: "Invalid price",
        details: "Price must be greater than 0"
      });
    }

    // Verify business profile exists and user owns it
    const { data: businessProfile, error: businessError } = await supabase
      .from("business_profiles")
      .select("*")
      .eq("id", businessId)
      .eq("owner_user_id", userId)
      .single();

    if (businessError || !businessProfile) {
      return res.status(404).json({ error: "Business profile not found" });
    }

    // Verify Stripe Connect account exists and belongs to this business
    const { data: connectAccount, error: connectError } = await supabase
      .from("stripe_connect_accounts")
      .select("*")
      .eq("stripe_account_id", connectedAccountId)
      .eq("business_id", businessId)
      .single();

    if (connectError || !connectAccount) {
      return res.status(404).json({ 
        error: "Stripe Connect account not found",
        details: "Account does not exist or does not belong to this business"
      });
    }

    // Verify the Connect account is active
    if (!connectAccount.charges_enabled) {
      return res.status(403).json({ 
        error: "Stripe Connect account not ready",
        details: "Account must be fully onboarded to create products"
      });
    }

    // Convert price to cents for Stripe
    const priceInCents = Math.round(price * 100);

    // Prepare product metadata
    const productMetadata = {
      business_id: businessId,
      user_id: userId,
      connected_account_id: connectedAccountId,
      business_name: businessProfile.business_name,
      category: category || "general",
      ...metadata,
    };

    console.log("Creating Stripe product:", {
      name,
      description,
      priceInCents,
      currency,
      metadata: productMetadata,
    });

    // Create product at platform level (not on connected account)
    const product = await stripe.products.create({
      name,
      description,
      default_price_data: {
        unit_amount: priceInCents,
        currency: currency.toLowerCase(),
        metadata: {
          business_id: businessId,
          connected_account_id: connectedAccountId,
        },
      },
      metadata: productMetadata,
    });

    console.log("Stripe product created:", product.id);

    // Store product information in database
    const { error: dbError } = await supabase
      .from("stripe_products")
      .insert({
        stripe_product_id: product.id,
        stripe_price_id: product.default_price as string,
        business_id: businessId,
        user_id: userId,
        connected_account_id: connectedAccountId,
        name,
        description: description || null,
        price: price,
        price_cents: priceInCents,
        currency: currency.toLowerCase(),
        category: category || "general",
        metadata: productMetadata,
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (dbError) {
      console.error("Error storing product in database:", dbError);
      // Continue anyway - Stripe product was created successfully
    }

    return res.status(200).json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        price: {
          id: product.default_price,
          amount: priceInCents,
          currency: currency.toLowerCase(),
          formatted: `$${price.toFixed(2)}`,
        },
        metadata: product.metadata,
        created: product.created,
      },
      message: "Product created successfully",
    });

  } catch (error) {
    console.error("Stripe product creation error:", error);

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
