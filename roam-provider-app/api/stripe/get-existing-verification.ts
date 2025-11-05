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
    const { userId, businessId } = req.query;

    console.log('=== GET EXISTING VERIFICATION REQUEST ===');
    console.log('User ID:', userId);
    console.log('Business ID:', businessId);

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: "Missing or invalid userId" });
    }

    if (!businessId || typeof businessId !== 'string') {
      return res.status(400).json({ error: "Missing or invalid businessId" });
    }

    // Check if there's an existing verification session in the database
    const { data: existingVerification, error: dbError } = await supabase
      .from("stripe_identity_verifications")
      .select("*")
      .eq("user_id", userId)
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (dbError) {
      console.error("Database error:", dbError);
      return res.status(500).json({ 
        error: "Database error",
        details: dbError.message 
      });
    }

    if (!existingVerification) {
      console.log('No existing verification found');
      return res.status(200).json({ 
        verification_session: null,
        message: "No existing verification session found" 
      });
    }

    console.log('Found existing verification:', {
      sessionId: existingVerification.session_id,
      status: existingVerification.status,
      createdAt: existingVerification.created_at
    });

    // If we have a session, fetch the latest status from Stripe
    try {
      const verificationSession = await stripe.identity.verificationSessions.retrieve(
        existingVerification.session_id
      );

      console.log('Stripe verification session status:', verificationSession.status);

      // Update database if status has changed
      if (verificationSession.status !== existingVerification.status) {
        console.log('Status changed, updating database');
        
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

        await supabase
          .from("stripe_identity_verifications")
          .update(updateData)
          .eq("session_id", existingVerification.session_id);
      }

      return res.status(200).json({
        verification_session: {
          id: verificationSession.id,
          client_secret: verificationSession.client_secret,
          status: verificationSession.status,
          type: verificationSession.type,
          last_error: verificationSession.last_error,
          last_verification_report: verificationSession.last_verification_report,
          created: verificationSession.created,
          verified_outputs: verificationSession.verified_outputs,
        },
      });
    } catch (stripeError) {
      console.error("Stripe error fetching session:", stripeError);
      
      // If Stripe session doesn't exist anymore, return the database record
      return res.status(200).json({
        verification_session: {
          id: existingVerification.session_id,
          status: existingVerification.status,
          type: existingVerification.type,
          created: new Date(existingVerification.created_at).getTime() / 1000,
        },
      });
    }
  } catch (error) {
    console.error("Error getting existing verification:", error);

    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

