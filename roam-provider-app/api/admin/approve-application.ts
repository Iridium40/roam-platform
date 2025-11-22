import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";
// Temporarily disabled to debug FUNCTION_INVOCATION_FAILED
// import { EmailService } from "../_lib/emailService";

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface ApprovalRequest {
  businessId: string;
  adminUserId: string;
  approvalNotes?: string;
  sendEmail?: boolean;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log("=== APPROVE APPLICATION REQUEST ===");
  console.log("Method:", req.method);
  console.log("Body:", JSON.stringify(req.body, null, 2));

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      businessId,
      adminUserId,
      approvalNotes,
      sendEmail = true,
    }: ApprovalRequest = req.body;

    console.log("Parsed request:", { businessId, adminUserId, approvalNotes, sendEmail });

    if (!businessId || !adminUserId) {
      console.error("Missing required fields:", { businessId, adminUserId });
      return res
        .status(400)
        .json({ error: "Missing businessId or adminUserId" });
    }

    // Verify admin permissions (you may want to add role checking here)
    const { data: adminUser } =
      await supabase.auth.admin.getUserById(adminUserId);
    if (!adminUser.user) {
      return res.status(403).json({ error: "Invalid admin user" });
    }

    console.log("Fetching business profile for:", businessId);

    // Get business profile and application
    const { data: businessProfile, error: businessError } = await supabase
      .from("business_profiles")
      .select("*")
      .eq("id", businessId)
      .single();

    if (businessError || !businessProfile) {
      console.error("Business profile not found:", businessError);
      return res.status(404).json({ 
        error: "Business profile not found",
        details: businessError?.message
      });
    }

    console.log("Business profile found:", businessProfile.business_name);

    // Get the most recent application for this business
    const { data: applications, error: applicationError } = await supabase
      .from("provider_applications")
      .select("*")
      .eq("business_id", businessId)
      .order("submitted_at", { ascending: false });

    if (applicationError || !applications || applications.length === 0) {
      console.error("Application not found:", applicationError);
      return res.status(404).json({ 
        error: "Application not found",
        details: applicationError?.message || "No applications found for this business"
      });
    }

    const application = applications[0]; // Get the most recent
    console.log(`Found ${applications.length} application(s), using most recent`);


    console.log("Application found, status:", application.application_status);

    if (application.application_status !== "submitted") {
      console.warn("Application not in submitted status:", application.application_status);
      return res.status(400).json({
        error: "Application must be in submitted status to approve",
        currentStatus: application.application_status,
      });
    }

    console.log("Updating business profile...");
    // Update business profile to approved
    const { error: updateBusinessError } = await supabase
      .from("business_profiles")
      .update({
        verification_status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: adminUserId,
        approval_notes: approvalNotes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", businessId);

    if (updateBusinessError) {
      console.error("Error updating business profile:", updateBusinessError);
      return res.status(500).json({ 
        error: "Failed to update business profile",
        details: updateBusinessError.message
      });
    }
    console.log("Business profile updated successfully");

    console.log("Updating application status...");
    // Update application status
    const { error: updateApplicationError } = await supabase
      .from("provider_applications")
      .update({
        application_status: "approved",
        review_status: "approved",
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminUserId,
        approval_notes: approvalNotes,
        updated_at: new Date().toISOString(),
      })
      .eq("business_id", businessId);

    if (updateApplicationError) {
      console.error("Error updating application:", updateApplicationError);
      return res.status(500).json({ 
        error: "Failed to update application",
        details: updateApplicationError.message
      });
    }
    console.log("Application updated successfully");

    console.log("Updating provider status...");
    // Update provider status
    const { error: updateProviderError } = await supabase
      .from("providers")
      .update({
        verification_status: "approved",
        background_check_status: "approved", // Assuming background check is complete
        updated_at: new Date().toISOString(),
      })
      .eq("business_id", businessId);

    if (updateProviderError) {
      console.error("Error updating provider:", updateProviderError);
      // Continue anyway
    } else {
      console.log("Provider status updated successfully");
    }

    console.log("Generating Phase 2 token...");
    // Generate Phase 2 secure token with proper structure
    const userId = businessProfile.owner_user_id || application.user_id;
    if (!userId) {
      console.error("No user ID found for token generation");
      return res.status(500).json({
        error: "Missing user ID",
        details: "Cannot generate approval token without user ID"
      });
    }

    const phase2TokenPayload = {
      business_id: businessId,
      user_id: userId,
      application_id: application.id,
      issued_at: Date.now(),
      expires_at: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
      phase: "phase2"
    };

    const approvalToken = jwt.sign(
      phase2TokenPayload,
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );
    console.log("Phase 2 token generated successfully");

    console.log("Creating approval record...");
    // Create approval record
    const { error: approvalRecordError } = await supabase
      .from("application_approvals")
      .insert({
        business_id: businessId,
        application_id: application.id,
        approved_by: adminUserId,
        approval_token: approvalToken,
        token_expires_at: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(), // 7 days
        approval_notes: approvalNotes,
        created_at: new Date().toISOString(),
      });

    if (approvalRecordError) {
      console.error("Error creating approval record:", approvalRecordError);
      // Continue anyway - don't block approval on this
    } else {
      console.log("Approval record created successfully");
    }

    console.log("Updating setup progress...");
    // Update setup progress
    const { error: progressError } = await supabase
      .from("business_setup_progress")
      .update({
        phase_1_completed: true,
        phase_1_completed_at: new Date().toISOString(),
        current_step: 3, // Start of Phase 2
        updated_at: new Date().toISOString(),
      })
      .eq("business_id", businessId);

    if (progressError) {
      console.error("Error updating setup progress:", progressError);
      // Continue anyway
    } else {
      console.log("Setup progress updated successfully");
    }

    // Send approval email with secure link (if enabled)
    // TEMPORARILY DISABLED - debugging FUNCTION_INVOCATION_FAILED
    if (sendEmail) {
      console.log("Email sending temporarily disabled for debugging");
      console.log("Approval URL would be:", `${req.headers.origin || process.env.FRONTEND_URL}/provider-onboarding/phase2?token=${approvalToken}`);
      
      // TODO: Re-enable once function invocation is fixed
      /*
      // Get user ID - try owner_user_id first, then application.user_id
      const emailUserId = businessProfile.owner_user_id || application.user_id;
      
      if (emailUserId) {
        const { data: userData } = await supabase.auth.admin.getUserById(emailUserId);

        if (userData.user?.email) {
          const approvalUrl = `${req.headers.origin || process.env.FRONTEND_URL}/provider-onboarding/phase2?token=${approvalToken}`;
          const firstName = userData.user.user_metadata?.first_name || "Provider";

          // Send approval email here
          console.log("Would send approval email to:", userData.user.email);
          }
        }
      */
    }

    return res.status(200).json({
      success: true,
      message: "Application approved successfully",
      approvalToken,
      approvalUrl: `${req.headers.origin || process.env.FRONTEND_URL}/provider-onboarding/phase2?token=${approvalToken}`,
      approvedAt: new Date().toISOString(),
      approvedBy: adminUserId,
    });
  } catch (error) {
    console.error("Application approval error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
