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
    // Extract sessionId - try multiple methods (Vercel dynamic routing)
    let sessionId: string | undefined;
    
    // Method 1: Direct from req.query (standard Vercel file-based routing)
    if (req.query.sessionId && typeof req.query.sessionId === 'string') {
      sessionId = req.query.sessionId;
      console.log('✓ Found sessionId in req.query.sessionId:', sessionId);
    }
    
    // Method 2: Extract from URL path if not found
    if (!sessionId && req.url) {
      const urlMatch = req.url.match(/\/api\/stripe\/check-verification-status\/([^/?]+)/);
      if (urlMatch && urlMatch[1]) {
        sessionId = urlMatch[1];
        console.log('✓ Extracted sessionId from URL path:', sessionId);
      }
    }
    
    // Method 3: Check all query keys for Stripe session ID pattern
    if (!sessionId) {
      for (const [key, value] of Object.entries(req.query)) {
        const strValue = Array.isArray(value) ? value[0] : String(value);
        if (strValue && (strValue.startsWith('vs_') || /^[a-zA-Z0-9_-]+$/.test(strValue))) {
          sessionId = strValue;
          console.log(`✓ Found sessionId in req.query.${key}:`, sessionId);
          break;
        }
      }
    }

    const { businessId } = req.query;

    console.log('=== CHECK VERIFICATION STATUS REQUEST ===');
    console.log('req.url:', req.url);
    console.log('req.query:', JSON.stringify(req.query, null, 2));
    console.log('Session ID:', sessionId);
    console.log('Business ID:', businessId);

    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ 
        error: "Missing or invalid sessionId",
        debug: {
          url: req.url,
          query: req.query,
          extracted: sessionId
        }
      });
    }

    if (!businessId || typeof businessId !== 'string') {
      return res.status(400).json({ 
        error: "Missing or invalid businessId",
        debug: {
          url: req.url,
          query: req.query
        }
      });
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
    console.error("Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      type: error instanceof Stripe.errors.StripeError ? error.type : undefined,
      code: error instanceof Stripe.errors.StripeError ? error.code : undefined,
    });

    if (error instanceof Stripe.errors.StripeError) {
      // Handle specific Stripe error types
      if (error.type === 'StripeInvalidRequestError') {
        return res.status(400).json({
          error: "Invalid verification session",
          details: error.message,
          type: error.type,
          code: error.code,
        });
      }
      
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
