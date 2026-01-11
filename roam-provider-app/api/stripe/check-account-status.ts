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
 * Simple endpoint to check if a business has a Stripe Connect account
 * and its current status. Used during onboarding to detect return from Stripe.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { businessId } = req.query;

    if (!businessId) {
      return res.status(400).json({ 
        error: "Missing required query parameter: businessId"
      });
    }

    // Check for Stripe account in database
    const { data: connectAccount, error: dbError } = await supabase
      .from("stripe_connect_accounts")
      .select("account_id, charges_enabled, payouts_enabled, details_submitted")
      .eq("business_id", businessId)
      .single();

    // No account found
    if (dbError || !connectAccount) {
      return res.status(200).json({ 
        hasAccount: false,
        accountId: null,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
      });
    }

    // Account exists - fetch real-time status from Stripe
    try {
      const stripeAccount = await stripe.accounts.retrieve(connectAccount.account_id);
      
      // Update database with latest status
      await supabase
        .from("stripe_connect_accounts")
        .update({
          charges_enabled: stripeAccount.charges_enabled,
          payouts_enabled: stripeAccount.payouts_enabled,
          details_submitted: stripeAccount.details_submitted,
          requirements: stripeAccount.requirements,
          capabilities: stripeAccount.capabilities,
          updated_at: new Date().toISOString(),
        })
        .eq("account_id", connectAccount.account_id);

      return res.status(200).json({
        hasAccount: true,
        accountId: stripeAccount.id,
        chargesEnabled: stripeAccount.charges_enabled,
        payoutsEnabled: stripeAccount.payouts_enabled,
        detailsSubmitted: stripeAccount.details_submitted,
        requirements: stripeAccount.requirements?.currently_due || [],
      });
    } catch (stripeError) {
      // Stripe account may have been deleted - return what we have in DB
      console.error("Error fetching Stripe account:", stripeError);
      return res.status(200).json({
        hasAccount: true,
        accountId: connectAccount.account_id,
        chargesEnabled: connectAccount.charges_enabled || false,
        payoutsEnabled: connectAccount.payouts_enabled || false,
        detailsSubmitted: connectAccount.details_submitted || false,
        error: "Could not verify with Stripe",
      });
    }

  } catch (error) {
    console.error("Check account status error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
