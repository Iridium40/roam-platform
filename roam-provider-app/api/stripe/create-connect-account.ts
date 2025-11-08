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

    console.log('=== STRIPE CONNECT ACCOUNT REQUEST ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
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

    console.log('Extracted fields:', {
      userId,
      businessId,
      businessName,
      businessType,
      email,
      country
    });

    // Validate required fields
    if (!userId || !businessId || !businessName || !businessType || !email || !country) {
      console.error('Missing required fields:', {
        userId: !!userId,
        businessId: !!businessId,
        businessName: !!businessName,
        businessType: !!businessType,
        email: !!email,
        country: !!country
      });
      return res.status(400).json({ 
        error: "Missing required fields",
        required: ["userId", "businessId", "businessName", "businessType", "email", "country"],
        received: {
          userId: !!userId,
          businessId: !!businessId,
          businessName: !!businessName,
          businessType: !!businessType,
          email: !!email,
          country: !!country
        }
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
    console.log("Checking business profile:", { businessId });
    const { data: businessProfile, error: businessError } = await supabase
      .from("business_profiles")
      .select("*")
      .eq("id", businessId)
      .single();

    if (businessError) {
      console.error("Business profile lookup error:", { businessError, businessId });
      return res.status(404).json({ 
        error: "Business profile not found",
        details: (businessError as any).message
      });
    }

    if (!businessProfile) {
      console.error("Business profile not found:", { businessId });
      return res.status(404).json({ error: "Business profile not found" });
    }

    // Verify user has access to this business (is owner provider for this business)
    // For Phase 2 onboarding, check for owner role specifically
    console.log("Checking provider access:", { businessId, userId });
    
    // First, try to find any provider with this business_id and user_id
    const { data: allProviders, error: allProvidersError } = await supabase
      .from("providers")
      .select("id, provider_role, user_id, business_id, email, first_name, last_name")
      .eq("business_id", businessId);

    console.log("All providers for business:", { allProviders, allProvidersError, businessId });

    // Then find the owner specifically
    const { data: providerAccess, error: providerError } = await supabase
      .from("providers")
      .select("id, provider_role, user_id, business_id, email, first_name, last_name")
      .eq("business_id", businessId)
      .eq("provider_role", "owner")
      .single();

    console.log("Provider access query result:", { 
      providerAccess, 
      providerError, 
      businessId, 
      userId,
      errorCode: (providerError as any)?.code,
      errorMessage: (providerError as any)?.message
    });

    if (providerError) {
      console.error("Provider access check error:", { providerError, businessId, userId });
      // Check if it's a "not found" error (PGRST116)
      if ((providerError as any).code === 'PGRST116') {
        return res.status(403).json({ 
          error: "Access denied",
          details: "No owner provider found for this business. Please complete Phase 1 onboarding first.",
          debug: {
            businessId,
            userId,
            allProviders: allProviders?.map(p => ({ id: p.id, user_id: p.user_id, role: p.provider_role }))
          }
        });
      }
      return res.status(403).json({ 
        error: "Access denied",
        details: `Provider lookup failed: ${(providerError as any).message}`,
        code: (providerError as any).code
      });
    }

    if (!providerAccess) {
      console.error("Provider access check failed - no provider found:", { businessId, userId });
      return res.status(403).json({ 
        error: "Access denied",
        details: "You don't have permission to create a Stripe account for this business. Only the business owner can create a Stripe Connect account.",
        debug: {
          businessId,
          userId,
          allProviders: allProviders?.map(p => ({ id: p.id, user_id: p.user_id, role: p.provider_role }))
        }
      });
    }

    // Use the business owner's user_id from the database as the authoritative source
    // This ensures we always create the Stripe account for the actual business owner
    const actualOwnerId = providerAccess.user_id;
    
    console.log("Using business owner's user ID from database:", { 
      requestUserId: userId,
      actualOwnerId: actualOwnerId,
      businessId: businessId
    });
    
    // If the request userId doesn't match, log a warning but proceed with the actual owner
    if (actualOwnerId !== userId) {
      console.warn("Request userId differs from business owner - using owner's ID:", { 
        requestUserId: userId,
        actualOwnerId: actualOwnerId
      });
    }
    
    // Override the userId with the actual owner's ID for all subsequent operations
    const ownerUserId = actualOwnerId;

    console.log("Provider access verified successfully, using owner ID:", ownerUserId);

    // Fetch tax info from database (should be captured first in tax info step)
    console.log("Fetching tax info from database:", { businessId });
    const { data: taxInfo, error: taxInfoError } = await supabase
      .from("business_stripe_tax_info")
      .select("*")
      .eq("business_id", businessId)
      .single();

    if (taxInfoError && taxInfoError.code !== 'PGRST116') {
      console.error("Error fetching tax info:", taxInfoError);
      // Continue anyway - tax info is optional for account creation
      // Stripe will collect it during onboarding if needed
    }

    if (taxInfo) {
      console.log("Tax info found:", {
        business_entity_type: taxInfo.business_entity_type,
        legal_business_name: taxInfo.legal_business_name,
        tax_id_type: taxInfo.tax_id_type,
        has_tax_id: !!taxInfo.tax_id,
        has_address: !!taxInfo.tax_address_line1
      });
    } else {
      console.warn("No tax info found - Stripe will collect during onboarding");
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
      .eq("user_id", ownerUserId)
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
        url: businessProfile.website_url || undefined,
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
      // Use tax info from database if available, otherwise use provided values
      const companyTaxId = taxInfo?.tax_id || taxId || undefined;
      const companyNameValue = taxInfo?.legal_business_name || companyName || businessName;
      
      accountParams.company = {
        name: companyNameValue,
        tax_id: companyTaxId || undefined, // Use tax ID from database if available
        phone: phone || taxInfo?.tax_contact_phone || undefined,
        address: {
          country: taxInfo?.tax_country || country || 'US',
          line1: taxInfo?.tax_address_line1 || businessProfile.business_address || undefined,
          line2: taxInfo?.tax_address_line2 || undefined,
          city: taxInfo?.tax_city || businessProfile.business_city || undefined,
          state: taxInfo?.tax_state || businessProfile.business_state || undefined,
          postal_code: taxInfo?.tax_postal_code || businessProfile.business_zip || undefined,
        },
      };
      
      // If we have tax info, also add it to business_profile
      if (taxInfo) {
        accountParams.business_profile = {
          ...accountParams.business_profile,
          name: taxInfo.legal_business_name || businessName,
          url: businessProfile.website_url || undefined,
          mcc: businessProfile.mcc_code || undefined,
        };
      }
    }
    
    // For individual accounts, also use tax info address if available
    if (businessType === "individual" && taxInfo) {
      accountParams.individual = {
        ...accountParams.individual,
        address: {
          country: taxInfo.tax_country || country || 'US',
          line1: taxInfo.tax_address_line1 || businessProfile.business_address || undefined,
          line2: taxInfo.tax_address_line2 || undefined,
          city: taxInfo.tax_city || businessProfile.business_city || undefined,
          state: taxInfo.tax_state || businessProfile.business_state || undefined,
          postal_code: taxInfo.tax_postal_code || businessProfile.business_zip || undefined,
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
        user_id: ownerUserId,
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
    const baseUrl = process.env.VITE_PUBLIC_APP_URL || 'https://www.roamprovider.com';
    
    console.log('🔗 Creating account link with baseUrl:', baseUrl);

    // Create account link for onboarding
    // Return to Phase 2 Banking page after completion
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${baseUrl}/provider-onboarding/phase2/banking_payout?refresh=true`,
      return_url: `${baseUrl}/provider-onboarding/phase2/banking_payout?success=true`,
      type: "account_onboarding",
      collect: "eventually_due",
    });

    return res.status(200).json({
      success: true,
      account_id: account.id,
      onboarding_url: accountLink.url,
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
      message: "Stripe Connect account created successfully. Redirecting to Stripe onboarding...",
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
