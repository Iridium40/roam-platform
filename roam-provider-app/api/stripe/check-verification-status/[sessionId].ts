import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

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
    const { sessionId } = req.query;
    const { businessId } = req.query;

    console.log('=== CHECK VERIFICATION STATUS REQUEST ===');
    console.log('Session ID:', sessionId);
    console.log('Business ID:', businessId);

    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ error: "Missing or invalid sessionId" });
    }

    if (!businessId || typeof businessId !== 'string') {
      return res.status(400).json({ error: "Missing or invalid businessId" });
    }

    // Retrieve verification session from Stripe
    const verificationSession = await stripe.identity.verificationSessions.retrieve(
      sessionId
    );

    console.log('Stripe verification session:', {
      id: verificationSession.id,
      status: verificationSession.status,
      type: verificationSession.type,
      lastError: verificationSession.last_error
    });

    // Update database with latest status
    const updateData: any = {
      status: verificationSession.status,
      updated_at: new Date().toISOString(),
    };

    if (verificationSession.last_verification_report) {
      updateData.verification_report = verificationSession.last_verification_report;
    }

    if (verificationSession.last_error) {
      updateData.last_error = verificationSession.last_error;
    }

    const { error: dbError } = await supabase
      .from("stripe_identity_verifications")
      .update(updateData)
      .eq("session_id", sessionId)
      .eq("business_id", businessId);

    if (dbError) {
      console.error("Error updating verification status in database:", dbError);
      // Continue anyway - we can still return the Stripe data
    }

    // If verification is complete, update the business profile
    if (verificationSession.status === "verified") {
      const { error: profileError } = await supabase
        .from("business_profiles")
          .update({
            identity_verified: true,
            identity_verified_at: new Date().toISOString(),
          })
        .eq("id", businessId);

      if (profileError) {
        console.error("Error updating business profile:", profileError);
      }
    }

    return res.status(200).json({
      verification_session: {
        id: verificationSession.id,
        status: verificationSession.status,
        type: verificationSession.type,
        last_error: verificationSession.last_error,
        last_verification_report: verificationSession.last_verification_report,
        created: verificationSession.created,
        verified_outputs: verificationSession.verified_outputs,
      },
    });
  } catch (error) {
    console.error("Error checking verification status:", error);

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
