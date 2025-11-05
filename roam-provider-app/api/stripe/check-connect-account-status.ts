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

    const { userId, businessId } = req.query;

    if (!userId || !businessId) {
      return res.status(400).json({ 
        error: "Missing required query parameters",
        required: ["userId", "businessId"]
      });
    }

    // Get Stripe Connect account from database
    const { data: connectAccount, error: dbError } = await supabase
      .from("stripe_connect_accounts")
      .select("*")
      .eq("user_id", userId)
      .eq("business_id", businessId)
      .single();

    if (dbError || !connectAccount) {
      return res.status(404).json({ 
        error: "Stripe Connect account not found",
        details: "No account found for this user and business"
      });
    }

    // Get real-time status from Stripe API
    // Use account_id (not stripe_account_id) per schema
    const stripeAccount = await stripe.accounts.retrieve(connectAccount.account_id);

    // Update database with latest status
    // Note: No status column in schema, just update the boolean fields
    const { error: updateError } = await supabase
      .from("stripe_connect_accounts")
      .update({
        charges_enabled: stripeAccount.charges_enabled,
        payouts_enabled: stripeAccount.payouts_enabled,
        details_submitted: stripeAccount.details_submitted,
        requirements: stripeAccount.requirements,
        capabilities: stripeAccount.capabilities,
        updated_at: new Date().toISOString(),
      })
      .eq("id", connectAccount.id);

    if (updateError) {
      console.error("Error updating connect account status:", updateError);
      // Continue anyway - we still return the Stripe data
    }

    // Also ensure business_profiles has the stripe_connect_account_id
    const { error: businessUpdateError } = await supabase
      .from("business_profiles")
      .update({
        stripe_connect_account_id: connectAccount.account_id, // Correct column name per schema
      })
      .eq("id", businessId);

    if (businessUpdateError) {
      console.error("Error updating business_profiles.stripe_account_id:", businessUpdateError);
      // Continue anyway
    }

    // Determine onboarding status
    let onboardingStatus = "pending";
    let onboardingMessage = "Account setup in progress";

    if (stripeAccount.charges_enabled && stripeAccount.payouts_enabled) {
      onboardingStatus = "complete";
      onboardingMessage = "Account fully onboarded and ready to accept payments";
    } else if (stripeAccount.details_submitted) {
      onboardingStatus = "review";
      onboardingMessage = "Account details submitted, pending Stripe review";
    } else if (stripeAccount.requirements?.currently_due?.length > 0) {
      onboardingStatus = "incomplete";
      onboardingMessage = `Account setup incomplete: ${stripeAccount.requirements.currently_due.length} items required`;
    }

    // Check if account needs additional verification
    const needsVerification = stripeAccount.requirements?.eventually_due?.length > 0;

    return res.status(200).json({
      success: true,
      account: {
        id: stripeAccount.id,
        status: onboardingStatus,
        charges_enabled: stripeAccount.charges_enabled,
        payouts_enabled: stripeAccount.payouts_enabled,
        details_submitted: stripeAccount.details_submitted,
        country: stripeAccount.country,
        default_currency: stripeAccount.default_currency,
        business_type: stripeAccount.business_type,
        capabilities: stripeAccount.capabilities,
        requirements: {
          currently_due: stripeAccount.requirements?.currently_due || [],
          eventually_due: stripeAccount.requirements?.eventually_due || [],
          past_due: stripeAccount.requirements?.past_due || [],
          disabled_reason: stripeAccount.requirements?.disabled_reason,
        },
        needs_verification: needsVerification,
        verification_progress: {
          total_requirements: (stripeAccount.requirements?.currently_due?.length || 0) + 
                             (stripeAccount.requirements?.eventually_due?.length || 0),
          completed_requirements: stripeAccount.details_submitted ? 
            ((stripeAccount.requirements?.currently_due?.length || 0) + 
             (stripeAccount.requirements?.eventually_due?.length || 0)) : 0,
        },
      },
      message: onboardingMessage,
      can_accept_payments: stripeAccount.charges_enabled,
      can_receive_payouts: stripeAccount.payouts_enabled,
    });

  } catch (error) {
    console.error("Stripe Connect account status check error:", error);

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
