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
 * Simplified Stripe Connect account creation
 * Creates a minimal account and redirects to Stripe's hosted onboarding
 * Stripe will collect email, existing account lookup, and all required info
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
    // Validate Stripe configuration
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("Missing STRIPE_SECRET_KEY");
      return res.status(500).json({ 
        error: "Stripe configuration error",
        details: "STRIPE_SECRET_KEY is not configured"
      });
    }

    const { userId, businessId, businessName, businessType, email } = req.body;

    console.log('=== SIMPLE STRIPE CONNECT REQUEST ===');
    console.log({ userId, businessId, businessName, businessType, email: email ? 'provided' : 'not provided' });

    // Validate required fields
    if (!userId || !businessId) {
      return res.status(400).json({ 
        error: "Missing required fields",
        details: "userId and businessId are required"
      });
    }

    // Verify business exists
    const { data: business, error: businessError } = await supabase
      .from("business_profiles")
      .select("id, business_name, website_url")
      .eq("id", businessId)
      .single();

    if (businessError || !business) {
      console.error("Business not found:", businessError);
      return res.status(404).json({ 
        error: "Business not found",
        details: "Could not find business profile"
      });
    }

    // Check for existing Stripe account
    const { data: existingAccount } = await supabase
      .from("stripe_connect_accounts")
      .select("account_id, charges_enabled, payouts_enabled")
      .eq("business_id", businessId)
      .single();

    if (existingAccount) {
      // Account exists - create new onboarding link instead
      console.log("Existing account found, creating new account link:", existingAccount.account_id);
      
      const baseUrl = process.env.VITE_PUBLIC_APP_URL || 'https://www.roamprovider.com';
      
      const accountLink = await stripe.accountLinks.create({
        account: existingAccount.account_id,
        refresh_url: `${baseUrl}/provider-onboarding/phase2/banking_payout?refresh=true`,
        return_url: `${baseUrl}/provider-onboarding/phase2/banking_payout?success=true`,
        type: "account_onboarding",
        collect: "eventually_due",
      });

      return res.status(200).json({
        success: true,
        account_id: existingAccount.account_id,
        onboarding_url: accountLink.url,
        existing: true,
        message: "Redirecting to continue Stripe onboarding...",
      });
    }

    // Create new Stripe Connect account with minimal info
    // Stripe will collect everything else during hosted onboarding
    const accountParams: Stripe.AccountCreateParams = {
      type: 'express', // Express accounts = Stripe handles most onboarding
      country: 'US',
      email: email || undefined, // Optional - Stripe will ask if not provided
      business_type: businessType === 'individual' ? 'individual' : 'company',
      business_profile: {
        name: businessName || business.business_name || 'Business',
        url: business.website_url || undefined,
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      settings: {
        payouts: {
          schedule: {
            interval: 'weekly',
            weekly_anchor: 'friday',
          },
        },
      },
    };

    console.log("Creating Express Stripe account...");
    const account = await stripe.accounts.create(accountParams);
    console.log("✅ Stripe account created:", account.id);

    // Get owner's user_id for storage
    const { data: ownerProvider } = await supabase
      .from("providers")
      .select("user_id")
      .eq("business_id", businessId)
      .eq("provider_role", "owner")
      .single();

    const ownerUserId = ownerProvider?.user_id || userId;

    // Store in database
    const { error: insertError } = await supabase
      .from("stripe_connect_accounts")
      .insert({
        user_id: ownerUserId,
        business_id: businessId,
        account_id: account.id,
        account_type: 'express',
        business_type: businessType === 'individual' ? 'individual' : 'company',
        country: 'US',
        default_currency: 'usd',
        charges_enabled: false,
        payouts_enabled: false,
        details_submitted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error("Error storing account in DB:", insertError);
      // Continue anyway
    }

    // Update business_profiles with stripe_account_id
    await supabase
      .from("business_profiles")
      .update({ stripe_account_id: account.id })
      .eq("id", businessId);

    // Create account link for onboarding
    const baseUrl = process.env.VITE_PUBLIC_APP_URL || 'https://www.roamprovider.com';
    
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${baseUrl}/provider-onboarding/phase2/banking_payout?refresh=true`,
      return_url: `${baseUrl}/provider-onboarding/phase2/banking_payout?success=true`,
      type: "account_onboarding",
      collect: "eventually_due",
    });

    console.log("✅ Account link created, redirecting to Stripe");

    return res.status(200).json({
      success: true,
      account_id: account.id,
      onboarding_url: accountLink.url,
      message: "Redirecting to Stripe onboarding...",
    });

  } catch (error) {
    console.error("Stripe Connect error:", error);

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
