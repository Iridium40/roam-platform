import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Initialize Stripe with latest API version
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
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

    const { limit = "100", starting_after, businessId, category } = req.query;

    // Parse limit parameter
    const limitNum = parseInt(limit as string);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({ 
        error: "Invalid limit parameter",
        details: "Limit must be between 1 and 100"
      });
    }

    // Build query parameters for Stripe
    const listParams: Stripe.ProductListParams = {
      limit: limitNum,
      active: true,
      expand: ['data.default_price'],
    };

    if (starting_after) {
      listParams.starting_after = starting_after as string;
    }

    // Get products from Stripe
    const products = await stripe.products.list(listParams);

    // Get additional business information from database
    const productIds = products.data.map(p => p.id);
    
    let businessData: any[] = [];
    if (productIds.length > 0) {
      const { data: dbProducts, error: dbError } = await supabase
        .from("stripe_products")
        .select(`
          stripe_product_id,
          business_id,
          business_profiles!inner (
            id,
            business_name,
            business_address,
            business_city,
            business_state,
            business_zip,
            business_phone,
            business_email,
            business_description
          ),
          stripe_connect_accounts!inner (
            stripe_account_id,
            status,
            charges_enabled,
            payouts_enabled
          )
        `)
        .in("stripe_product_id", productIds)
        .eq("status", "active");

      if (!dbError && dbProducts) {
        businessData = dbProducts;
      }
    }

    // Filter by business ID if specified
    let filteredProducts = products.data;
    if (businessId) {
      filteredProducts = filteredProducts.filter(product => 
        businessData.some(bd => 
          bd.stripe_product_id === product.id && 
          bd.business_id === businessId
        )
      );
    }

    // Filter by category if specified
    if (category) {
      filteredProducts = filteredProducts.filter(product => 
        product.metadata?.category === category
      );
    }

    // Combine Stripe data with business information
    const enrichedProducts = filteredProducts.map(product => {
      const businessInfo = businessData.find(bd => bd.stripe_product_id === product.id);
      
      return {
        id: product.id,
        name: product.name,
        description: product.description,
        images: product.images,
        metadata: product.metadata,
        created: product.created,
        updated: product.updated,
        price: product.default_price ? {
          id: (product.default_price as Stripe.Price).id,
          amount: (product.default_price as Stripe.Price).unit_amount,
          currency: (product.default_price as Stripe.Price).currency,
          formatted: `$${((product.default_price as Stripe.Price).unit_amount || 0) / 100}`,
        } : null,
        business: businessInfo ? {
          id: businessInfo.business_id,
          name: businessInfo.business_profiles.business_name,
          address: businessInfo.business_profiles.business_address,
          city: businessInfo.business_profiles.business_city,
          state: businessInfo.business_profiles.business_state,
          zip: businessInfo.business_profiles.business_zip,
          phone: businessInfo.business_profiles.business_phone,
          email: businessInfo.business_profiles.business_email,
          description: businessInfo.business_profiles.business_description,
        } : null,
        connectAccount: businessInfo ? {
          id: businessInfo.stripe_connect_accounts.stripe_account_id,
          status: businessInfo.stripe_connect_accounts.status,
          chargesEnabled: businessInfo.stripe_connect_accounts.charges_enabled,
          payoutsEnabled: businessInfo.stripe_connect_accounts.payouts_enabled,
        } : null,
      };
    });

    // Get unique categories for filtering
    const categories = [...new Set(
      enrichedProducts
        .map(p => p.metadata?.category)
        .filter(Boolean)
    )];

    // Get unique business IDs for filtering
    const businessIds = [...new Set(
      enrichedProducts
        .map(p => p.business?.id)
        .filter(Boolean)
    )];

    return res.status(200).json({
      success: true,
      products: enrichedProducts,
      pagination: {
        has_more: products.has_more,
        total_count: products.data.length,
        limit: limitNum,
        starting_after: starting_after || null,
      },
      filters: {
        categories,
        businessIds,
        totalBusinesses: businessIds.length,
        totalProducts: enrichedProducts.length,
      },
      message: `Retrieved ${enrichedProducts.length} products`,
    });

  } catch (error) {
    console.error("Stripe product listing error:", error);

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
