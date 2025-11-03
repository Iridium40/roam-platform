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
      if (!firstName || !lastName) {
        return res.status(400).json({ 
          error: "Individual accounts require firstName and lastName"
        });
      }
      // dateOfBirth is optional - Stripe will collect during onboarding if needed
    } else if (businessType === "company") {
      if (!companyName) {
        return res.status(400).json({ 
          error: "Company accounts require companyName"
        });
      }
      // taxId is optional - Stripe will collect during onboarding if needed
    }

    // Verify business profile exists
    const { data: businessProfile, error: businessError } = await supabase
      .from("business_profiles")
      .select("*")
      .eq("id", businessId)
      .single();

    if (businessError || !businessProfile) {
      return res.status(404).json({ error: "Business profile not found" });
    }

    // Verify user has access to this business (is owner provider for this business)
    // For Phase 2 onboarding, check for owner role specifically
    const { data: providerAccess, error: providerError } = await supabase
      .from("providers")
      .select("id, provider_role, user_id")
      .eq("business_id", businessId)
      .eq("provider_role", "owner")
      .single();

    if (providerError || !providerAccess) {
      console.error("Provider access check failed:", { providerError, providerAccess, businessId });
      return res.status(403).json({ 
        error: "Access denied",
        details: "You don't have permission to create a Stripe account for this business. Only the business owner can create a Stripe Connect account."
      });
    }

    // Additional check: verify the provider's user_id matches the request userId
    // This ensures the authenticated user is the owner
    if (providerAccess.user_id && providerAccess.user_id !== userId) {
      return res.status(403).json({ 
        error: "Access denied",
        details: "User ID does not match the business owner"
      });
    }

    // Note: In Phase 2 onboarding, business may not be approved yet
    // Allow Stripe Connect setup during onboarding (verification happens later)
    // Commenting out this check for Phase 2 onboarding flow
    // if (businessProfile.verification_status !== "approved") {
    //   return res.status(403).json({
    //     error: "Business must be approved before creating Stripe Connect account",
    //     currentStatus: businessProfile.verification_status,
    //   });
    // }

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
        // DOB is optional - Stripe will collect during onboarding if not provided
        dob: dateOfBirth ? {
          day: parseInt(dateOfBirth.split('-')[2]),
          month: parseInt(dateOfBirth.split('-')[1]),
          year: parseInt(dateOfBirth.split('-')[0]),
        } : undefined,
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
        tax_id: taxId || undefined, // Optional - Stripe will collect during onboarding
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

    // Store account information in stripe_connect_accounts table
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

    // CRITICAL: Also update business_profiles with stripe_account_id for balance queries
    const { error: businessUpdateError } = await supabase
      .from("business_profiles")
      .update({
        stripe_account_id: account.id,
      })
      .eq("id", businessId);

    if (businessUpdateError) {
      console.error("Error updating business_profiles with stripe_account_id:", businessUpdateError);
      // Continue anyway - the account was created
    } else {
      console.log("✅ Updated business_profiles.stripe_account_id:", account.id);
    }

    // Determine the base URL for return/refresh URLs
    const host = req.headers.host || 'localhost:5175';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = process.env.VITE_APP_URL || `${protocol}://${host}`;
    
    console.log('🔗 Creating account link with baseUrl:', baseUrl);

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${baseUrl}/owner/financials?stripe_refresh=true`,
      return_url: `${baseUrl}/owner/financials?stripe_success=true`,
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
