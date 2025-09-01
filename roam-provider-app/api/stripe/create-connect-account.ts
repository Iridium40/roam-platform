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

interface ConnectAccountRequest {
  userId: string;
  businessId: string;
  businessName: string;
  businessType: "individual" | "company";
  email: string;
  country: string;
  // Individual account fields
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  ssnLast4?: string;
  // Company account fields
  companyName?: string;
  taxId?: string;
  phone?: string;
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
      userId,
      businessId,
      businessName,
      businessType,
      email,
      country,
      firstName,
      lastName,
      dateOfBirth,
      ssnLast4,
      companyName,
      taxId,
      phone,
    }: ConnectAccountRequest = req.body;

    // Validate required fields
    if (!userId || !businessId || !businessName || !businessType || !email || !country) {
      return res.status(400).json({ 
        error: "Missing required fields",
        required: ["userId", "businessId", "businessName", "businessType", "email", "country"]
      });
    }

    // Validate business type specific fields
    if (businessType === "individual") {
      if (!firstName || !lastName || !dateOfBirth) {
        return res.status(400).json({ 
          error: "Individual accounts require firstName, lastName, and dateOfBirth"
        });
      }
    } else if (businessType === "company") {
      if (!companyName || !taxId) {
        return res.status(400).json({ 
          error: "Company accounts require companyName and taxId"
        });
      }
    }

    // Verify business profile exists and is approved
    const { data: businessProfile, error: businessError } = await supabase
      .from("business_profiles")
      .select("*")
      .eq("id", businessId)
      .eq("owner_user_id", userId)
      .single();

    if (businessError || !businessProfile) {
      return res.status(404).json({ error: "Business profile not found" });
    }

    if (businessProfile.verification_status !== "approved") {
      return res.status(403).json({
        error: "Business must be approved before creating Stripe Connect account",
        currentStatus: businessProfile.verification_status,
      });
    }

    // Check if Stripe Connect account already exists
    const { data: existingAccount } = await supabase
      .from("stripe_connect_accounts")
      .select("*")
      .eq("user_id", userId)
      .eq("business_id", businessId)
      .single();

    if (existingAccount) {
      return res.status(409).json({
        error: "Stripe Connect account already exists for this business",
        accountId: existingAccount.stripe_account_id,
        status: existingAccount.status,
      });
    }

    // Prepare account creation parameters
    const accountParams: Stripe.AccountCreateParams = {
      country,
      email,
      business_type: businessType,
      business_profile: {
        name: businessName,
        url: businessProfile.website || undefined,
        mcc: businessProfile.mcc_code || undefined,
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      // Platform is responsible for pricing and fee collection
      controller: {
        fees: {
          payer: 'application' as const,
        },
        // Platform is responsible for losses / refunds / chargebacks
        losses: {
          payments: 'application' as const,
        },
        // Give them access to the express dashboard for management
        stripe_dashboard: {
          type: 'express' as const,
        },
      },
    };

    // Add individual-specific fields
    if (businessType === "individual") {
      accountParams.individual = {
        first_name: firstName!,
        last_name: lastName!,
        email,
        phone: phone || undefined,
        dob: {
          day: parseInt(dateOfBirth!.split('-')[2]),
          month: parseInt(dateOfBirth!.split('-')[1]),
          year: parseInt(dateOfBirth!.split('-')[0]),
        },
        ssn_last_4: ssnLast4 || undefined,
        address: {
          country,
          line1: businessProfile.business_address || undefined,
          city: businessProfile.business_city || undefined,
          state: businessProfile.business_state || undefined,
          postal_code: businessProfile.business_zip || undefined,
        },
      };
    }

    // Add company-specific fields
    if (businessType === "company") {
      accountParams.company = {
        name: companyName!,
        tax_id: taxId!,
        phone: phone || undefined,
        address: {
          country,
          line1: businessProfile.business_address || undefined,
          city: businessProfile.business_city || undefined,
          state: businessProfile.business_state || undefined,
          postal_code: businessProfile.business_zip || undefined,
        },
      };
    }

    console.log("Creating Stripe Connect account with params:", JSON.stringify(accountParams, null, 2));

    // Create Stripe Connect account
    const account = await stripe.accounts.create(accountParams);

    console.log("Stripe Connect account created:", account.id);

    // Store account information in database
    const { error: dbError } = await supabase
      .from("stripe_connect_accounts")
      .insert({
        user_id: userId,
        business_id: businessId,
        stripe_account_id: account.id,
        status: account.charges_enabled ? "active" : "pending",
        business_type: businessType,
        country,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        requirements: account.requirements,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (dbError) {
      console.error("Error storing connect account in database:", dbError);
      // Continue anyway - Stripe account was created successfully
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.VITE_APP_URL || 'http://localhost:5175'}/provider-onboarding/phase2/stripe-setup?refresh=true`,
      return_url: `${process.env.VITE_APP_URL || 'http://localhost:5175'}/provider-onboarding/phase2/stripe-setup?success=true`,
      type: "account_onboarding",
      collect: "eventually_due",
    });

    return res.status(200).json({
      success: true,
      account: {
        id: account.id,
        status: account.charges_enabled ? "active" : "pending",
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        requirements: account.requirements,
      },
      accountLink: {
        url: accountLink.url,
        expires_at: accountLink.expires_at,
      },
      message: "Stripe Connect account created successfully",
    });

  } catch (error) {
    console.error("Stripe Connect account creation error:", error);

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
