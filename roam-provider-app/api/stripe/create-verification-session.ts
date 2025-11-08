import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia" as any,
});

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface VerificationSessionRequest {
  userId: string;
  businessId: string;
  type?: "document" | "id_number";
  options?: {
    document?: {
      allowed_types?: ("driving_license" | "passport" | "id_card")[];
      require_id_number?: boolean;
      require_live_capture?: boolean;
      require_matching_selfie?: boolean;
    };
  };
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
    console.log('=== STRIPE IDENTITY VERIFICATION SESSION REQUEST ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    const {
      userId,
      businessId,
      type = "document",
      options,
    }: VerificationSessionRequest = req.body;

    if (!userId || !businessId) {
      console.error('Missing required fields:', { userId: !!userId, businessId: !!businessId });
      return res.status(400).json({ error: "Missing userId or businessId" });
    }

    // Verify business profile exists
    // Note: We allow identity verification during Phase 1 onboarding, before business is approved
    const { data: businessProfile, error: businessError } = await supabase
      .from("business_profiles")
      .select("*")
      .eq("id", businessId)
      .single();

    console.log('Business profile lookup:', {
      found: !!businessProfile,
      error: businessError,
      businessId,
      userId
    });

    if (businessError || !businessProfile) {
      console.error('Business profile not found:', {
        error: businessError,
        businessId: businessId,
        userId: userId
      });
      return res.status(404).json({ 
        error: "Business profile not found",
        details: businessError?.message || "No business profile exists with the provided businessId"
      });
    }

    // Verify the user has a provider record for this business
    // The providers table links users to businesses (user_id + business_id)
    const { data: providerRecord, error: providerError } = await supabase
      .from("providers")
      .select("*")
      .eq("user_id", userId)
      .eq("business_id", businessId)
      .maybeSingle();

    console.log('Provider access check:', {
      found: !!providerRecord,
      error: providerError,
      providerRole: providerRecord?.provider_role
    });

    if (!providerRecord) {
      console.error('Access denied - no provider record:', {
        userId,
        businessId,
        error: providerError
      });
      return res.status(403).json({ 
        error: "Access denied",
        details: "User does not have provider access to this business"
      });
    }

    console.log('Business and provider access verified:', {
      businessName: businessProfile.business_name,
      verificationStatus: businessProfile.verification_status,
      providerRole: providerRecord.provider_role,
      providerId: providerRecord.id
    });

    // Check if there's already a recent verification session
    const { data: existingVerification } = await supabase
      .from("stripe_identity_verifications")
      .select("*")
      .eq("user_id", userId)
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // If there's a recent successful verification, return it
    if (existingVerification && existingVerification.status === "verified") {
      return res.status(200).json({
        verification_session: {
          id: existingVerification.session_id,
          client_secret: null, // Don't return client secret for completed sessions
          status: existingVerification.status,
          last_verification_report: existingVerification.verification_report,
        },
        message: "Identity already verified",
      });
    }

    // Create new Stripe Identity verification session
    const sessionOptions: Stripe.Identity.VerificationSessionCreateParams = {
      type,
      metadata: {
        user_id: userId,
        business_id: businessId,
        business_name: businessProfile.business_name,
      },
    };

    if (type === "document" && options?.document) {
      sessionOptions.options = {
        document: {
          allowed_types: options.document.allowed_types || [
            "driving_license",
            "passport",
            "id_card",
          ],
          require_id_number: options.document.require_id_number !== false,
          require_live_capture: options.document.require_live_capture !== false,
          require_matching_selfie:
            options.document.require_matching_selfie !== false,
        },
      };
    }

    const verificationSession =
      await stripe.identity.verificationSessions.create(sessionOptions);

    // Store verification session in database
    const { error: dbError } = await supabase
      .from("stripe_identity_verifications")
      .upsert(
        {
          user_id: userId,
          business_id: businessId,
          session_id: verificationSession.id,
          status: verificationSession.status,
          type: verificationSession.type,
          client_secret: verificationSession.client_secret,
          created_at: new Date(
            verificationSession.created * 1000,
          ).toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "session_id",
        },
      );

    if (dbError) {
      console.error("Error storing verification session:", dbError);
      // Continue anyway - Stripe session was created successfully
    }

    return res.status(200).json({
      verification_session: {
        id: verificationSession.id,
        client_secret: verificationSession.client_secret,
        status: verificationSession.status,
        type: verificationSession.type,
        created: verificationSession.created,
      },
    });
  } catch (error) {
    console.error(
      "Stripe Identity verification session creation error:",
      error,
    );

    if (error instanceof Stripe.errors.StripeError) {
      return res.status(400).json({
        error: "Stripe error",
        details: error.message,
        type: error.type,
      });
    }

    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
