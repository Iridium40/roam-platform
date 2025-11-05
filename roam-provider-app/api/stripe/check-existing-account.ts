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
    // Validate required environment variables
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("Missing STRIPE_SECRET_KEY environment variable");
      return res.status(500).json({ 
        error: "Stripe configuration error",
        details: "STRIPE_SECRET_KEY is not configured"
      });
    }

    const { email, businessId } = req.query;

    if (!email || !businessId) {
      return res.status(400).json({ 
        error: "Missing required query parameters",
        required: ["email", "businessId"]
      });
    }

    console.log("Checking for existing Stripe accounts:", { email, businessId });

    // Step 1: Check our database for existing Stripe Connect account
    const { data: existingAccount, error: dbError } = await supabase
      .from("stripe_connect_accounts")
      .select("*")
      .eq("business_id", businessId)
      .single();

    if (existingAccount && !dbError) {
      console.log("Found existing account in database:", existingAccount.stripe_account_id);
      
      // Verify the account still exists in Stripe
      try {
        const stripeAccount = await stripe.accounts.retrieve(existingAccount.stripe_account_id);
        
        return res.status(200).json({
          found: true,
          source: "database",
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
          },
          linked: true,
          message: "Stripe account already linked to this business"
        });
      } catch (stripeError) {
        console.error("Account in database but not found in Stripe:", stripeError);
        // Account was deleted from Stripe, continue to search
      }
    }

    // Step 2: Search Stripe for accounts with matching email
    console.log("Searching Stripe for accounts with email:", email);
    
    try {
      // Note: Stripe doesn't provide a direct email search for Connect accounts
      // We can only list recent accounts and check if any match
      // This is a limitation of the Stripe API
      const accounts = await stripe.accounts.list({
        limit: 100, // Check last 100 accounts
      });

      const matchingAccounts = accounts.data.filter(
        account => account.email?.toLowerCase() === (email as string).toLowerCase()
      );

      if (matchingAccounts.length > 0) {
        console.log(`Found ${matchingAccounts.length} matching account(s) in Stripe`);
        
        // Return the most recent account
        const account = matchingAccounts[0];
        
        return res.status(200).json({
          found: true,
          source: "stripe",
          account: {
            id: account.id,
            email: account.email,
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
            details_submitted: account.details_submitted,
            business_type: account.business_type,
            country: account.country,
            default_currency: account.default_currency,
            capabilities: account.capabilities,
            created: account.created,
          },
          linked: false,
          multiple: matchingAccounts.length > 1,
          count: matchingAccounts.length,
          message: matchingAccounts.length > 1 
            ? `Found ${matchingAccounts.length} accounts with this email. Showing the most recent.`
            : "Found existing Stripe account with this email"
        });
      }

      // No accounts found
      console.log("No existing Stripe accounts found for this email");
      return res.status(200).json({
        found: false,
        source: null,
        account: null,
        linked: false,
        message: "No existing Stripe account found. A new account will be created."
      });

    } catch (stripeListError) {
      console.error("Error searching Stripe accounts:", stripeListError);
      
      // If we can't search, just return not found
      return res.status(200).json({
        found: false,
        source: null,
        account: null,
        linked: false,
        message: "Unable to search for existing accounts. Will create new account.",
        searchError: true
      });
    }

  } catch (error) {
    console.error("Check existing account error:", error);

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

