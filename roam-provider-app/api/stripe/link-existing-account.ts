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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
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

    const { accountId, businessId, userId } = req.body;

    if (!accountId || !businessId || !userId) {
      return res.status(400).json({ 
        error: "Missing required fields",
        required: ["accountId", "businessId", "userId"]
      });
    }

    console.log("Linking existing Stripe account:", { accountId, businessId, userId });

    // Verify user owns this business
    const { data: providerAccess, error: providerError } = await supabase
      .from("providers")
      .select("id, user_id, business_id, provider_role")
      .eq("business_id", businessId)
      .eq("provider_role", "owner")
      .single();

    if (providerError || !providerAccess) {
      return res.status(403).json({ 
        error: "Access denied",
        details: "Only business owners can link Stripe accounts"
      });
    }

    // Use the actual owner's user_id from database
    const actualOwnerId = providerAccess.user_id;

    // Verify the Stripe account exists and get its details
    const stripeAccount = await stripe.accounts.retrieve(accountId);

    if (!stripeAccount) {
      return res.status(404).json({
        error: "Stripe account not found",
        details: "The specified Stripe account does not exist"
      });
    }

    console.log("Stripe account found:", {
      id: stripeAccount.id,
      email: stripeAccount.email,
      charges_enabled: stripeAccount.charges_enabled,
      payouts_enabled: stripeAccount.payouts_enabled
    });

    // Check if account is already linked to a different business
    const { data: existingLink, error: linkCheckError } = await supabase
      .from("stripe_connect_accounts")
      .select("business_id, user_id")
      .eq("stripe_account_id", accountId)
      .single();

    if (existingLink && existingLink.business_id !== businessId) {
      return res.status(409).json({
        error: "Account already linked",
        details: "This Stripe account is already linked to a different business"
      });
    }

    if (existingLink && existingLink.business_id === businessId) {
      return res.status(200).json({
        success: true,
        message: "Account already linked to this business",
        account: {
          id: stripeAccount.id,
          email: stripeAccount.email,
          charges_enabled: stripeAccount.charges_enabled,
          payouts_enabled: stripeAccount.payouts_enabled,
          details_submitted: stripeAccount.details_submitted,
        },
        alreadyLinked: true
      });
    }

    // Link the account by creating/updating the stripe_connect_accounts record
    const { data: linkedAccount, error: linkError } = await supabase
      .from("stripe_connect_accounts")
      .upsert({
        user_id: actualOwnerId,
        business_id: businessId,
        stripe_account_id: accountId,
        status: stripeAccount.charges_enabled ? "active" : "pending",
        business_type: stripeAccount.business_type || "company",
        country: stripeAccount.country || "US",
        charges_enabled: stripeAccount.charges_enabled || false,
        payouts_enabled: stripeAccount.payouts_enabled || false,
        details_submitted: stripeAccount.details_submitted || false,
        requirements: stripeAccount.requirements || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "business_id",
      })
      .select()
      .single();

    if (linkError) {
      console.error("Error linking account:", linkError);
      return res.status(500).json({
        error: "Failed to link account",
        details: linkError.message
      });
    }

    // Also update business_profiles with stripe_account_id
    const { error: businessUpdateError } = await supabase
      .from("business_profiles")
      .update({
        stripe_account_id: accountId,
      })
      .eq("id", businessId);

    if (businessUpdateError) {
      console.error("Error updating business profile:", businessUpdateError);
      // Continue anyway - main linking was successful
    }

    console.log("Successfully linked Stripe account to business");

    // If account needs onboarding, create account link
    let onboardingUrl = null;
    if (!stripeAccount.details_submitted || stripeAccount.requirements?.currently_due?.length > 0) {
      console.log("Account needs onboarding, creating account link...");
      
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${process.env.VITE_PUBLIC_APP_URL || 'https://www.roamprovider.com'}/provider-onboarding/phase2/banking_payout?refresh=true`,
        return_url: `${process.env.VITE_PUBLIC_APP_URL || 'https://www.roamprovider.com'}/provider-onboarding/phase2/banking_payout?success=true`,
        type: 'account_onboarding',
      });

      onboardingUrl = accountLink.url;
      console.log("Onboarding URL created");
    }

    return res.status(200).json({
      success: true,
      message: "Stripe account successfully linked",
      account: {
        id: stripeAccount.id,
        email: stripeAccount.email,
        charges_enabled: stripeAccount.charges_enabled,
        payouts_enabled: stripeAccount.payouts_enabled,
        details_submitted: stripeAccount.details_submitted,
        business_type: stripeAccount.business_type,
        country: stripeAccount.country,
        default_currency: stripeAccount.default_currency,
        capabilities: stripeAccount.capabilities,
        requirements: {
          currently_due: stripeAccount.requirements?.currently_due || [],
          eventually_due: stripeAccount.requirements?.eventually_due || [],
          past_due: stripeAccount.requirements?.past_due || [],
        },
      },
      onboarding_url: onboardingUrl,
      needs_onboarding: !stripeAccount.details_submitted || (stripeAccount.requirements?.currently_due?.length || 0) > 0,
    });

  } catch (error) {
    console.error("Link existing account error:", error);

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

