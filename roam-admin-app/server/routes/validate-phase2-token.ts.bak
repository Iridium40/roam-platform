import { Request, Response } from "express";
import { TokenService, Phase2ApprovalToken } from "../services/tokenService.js";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client (using same config as other routes)
const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase configuration for token validation");
}

const supabase = createClient(supabaseUrl!, supabaseKey!);

interface TokenValidationRequest {
  token: string;
}

export async function handleValidatePhase2Token(req: Request, res: Response) {
  try {
    console.log("handleValidatePhase2Token called");

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { token } = req.body as TokenValidationRequest;

    if (!token) {
      console.error("No token provided in request");
      return res.status(400).json({ error: 'Token required' });
    }

    console.log("Validating Phase 2 token...");

    // Verify and decode token
    let decoded: Phase2ApprovalToken;
    try {
      decoded = TokenService.verifyPhase2Token(token);
      console.log("Token decoded successfully:", { 
        business_id: decoded.business_id, 
        user_id: decoded.user_id,
        phase: decoded.phase 
      });
    } catch (tokenError) {
      console.error("Token verification failed:", tokenError);
      return res.status(400).json({ 
        error: 'Invalid or expired token',
        details: tokenError instanceof Error ? tokenError.message : 'Unknown token error'
      });
    }

    // Verify business exists and is approved
    console.log("Checking business status in database...");
    const { data: business, error: businessError } = await supabase
      .from('business_profiles')
      .select('id, verification_status, business_name, contact_email')
      .eq('id', decoded.business_id)
      .single();

    if (businessError) {
      console.error("Database error fetching business:", businessError);
      return res.status(500).json({ 
        error: 'Database error', 
        details: businessError.message 
      });
    }

    if (!business) {
      console.error("Business not found:", decoded.business_id);
      return res.status(400).json({ error: 'Business not found' });
    }

    if (business.verification_status !== 'approved') {
      console.error("Business not approved:", { 
        business_id: decoded.business_id, 
        status: business.verification_status 
      });
      return res.status(400).json({ error: 'Business not approved for onboarding' });
    }

    // Optional: Check for existing Phase 2 setup progress
    console.log("Checking existing setup progress...");
    const { data: progress, error: progressError } = await supabase
      .from('business_setup_progress')
      .select('*')
      .eq('business_id', decoded.business_id)
      .single();

    // Note: progressError is expected if no progress exists yet
    if (progressError && progressError.code !== 'PGRST116') {
      console.warn("Progress fetch error (non-critical):", progressError);
    }

    console.log("Token validation successful");

    return res.status(200).json({
      success: true,
      valid: true,
      business_id: decoded.business_id,
      user_id: decoded.user_id,
      application_id: decoded.application_id,
      business: {
        id: business.id,
        name: business.business_name,
        email: business.contact_email,
        verification_status: business.verification_status
      },
      progress: progress || null,
      can_access_phase2: true,
      token_expires_at: decoded.expires_at
    });

  } catch (error) {
    console.error('Unexpected error in handleValidatePhase2Token:', error);
    
    return res.status(500).json({
      error: 'Internal server error during token validation',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
