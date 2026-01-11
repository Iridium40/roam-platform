import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia" as any,
});

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * Create a new Account Link for continuing Stripe Connect onboarding
 * Used when a user needs to resume their Stripe setup
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { businessId, accountId } = req.body;

    if (!businessId && !accountId) {
      return res.status(400).json({ 
        error: "Missing required field: businessId or accountId"
      });
    }

    let stripeAccountId = accountId;

    // If only businessId provided, look up the account
    if (!stripeAccountId && businessId) {
      const { data: account, error } = await supabase
        .from("stripe_connect_accounts")
        .select("account_id")
        .eq("business_id", businessId)
        .single();

      if (error || !account) {
        return res.status(404).json({ 
          error: "Stripe account not found",
          details: "No Stripe Connect account found for this business"
        });
      }

      stripeAccountId = account.account_id;
    }

    // Create new account link
    const baseUrl = process.env.VITE_PUBLIC_APP_URL || 'https://www.roamprovider.com';
    
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${baseUrl}/provider-onboarding/phase2/banking_payout?refresh=true`,
      return_url: `${baseUrl}/provider-onboarding/phase2/banking_payout?success=true`,
      type: "account_onboarding",
      collect: "eventually_due",
    });

    console.log("✅ Account link created for:", stripeAccountId);

    return res.status(200).json({
      success: true,
      url: accountLink.url,
      expires_at: accountLink.expires_at,
    });

  } catch (error) {
    console.error("Create account link error:", error);

    if (error instanceof Stripe.errors.StripeError) {
      return res.status(400).json({
        error: "Stripe error",
        details: error.message,
        code: error.code,
      });
    }

    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
