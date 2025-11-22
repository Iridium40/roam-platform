import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";
import { EmailService } from "../../server/services/emailService";

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

    if (!businessId || !adminUserId) {
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

    const { data: application, error: applicationError } = await supabase
      .from("provider_applications")
      .select("*")
      .eq("business_id", businessId)
      .single();

    if (applicationError || !application) {
      console.error("Application not found:", applicationError);
      return res.status(404).json({ 
        error: "Application not found",
        details: applicationError?.message
      });
    }

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
    if (sendEmail) {
      // Don't block the response on email sending - do it asynchronously
      const sendEmailAsync = async () => {
        try {
          // Get user ID - try owner_user_id first, then application.user_id
          const userId = businessProfile.owner_user_id || application.user_id;
          
          if (!userId) {
            console.error("No user ID found for email sending");
            return;
          }

          // Get user email with timeout
          const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);

          if (userError || !userData.user?.email) {
            console.error("Failed to get user data for email:", userError);
            return;
          }

          const approvalUrl = `${req.headers.origin || process.env.FRONTEND_URL}/provider-onboarding/phase2?token=${approvalToken}`;
          const firstName = userData.user.user_metadata?.first_name || "Provider";

          console.log("Sending approval email to:", userData.user.email);

          // Send approval email using Resend with timeout
          const emailPromise = EmailService.sendApplicationApprovedEmail(
            userData.user.email,
            firstName,
            approvalUrl,
          );
          
          // Set a timeout for email sending
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Email timeout")), 15000)
          );
          
          const emailSent = await Promise.race([emailPromise, timeoutPromise]);

          if (!emailSent) {
            console.error("Failed to send approval email to:", userData.user.email);
          } else {
            console.log("Approval email sent successfully to:", userData.user.email);
          }
        } catch (emailError) {
          console.error("Error sending approval email:", emailError);
          // Don't fail the approval if email fails
        }
      };

      // Start email sending but don't wait for it
      sendEmailAsync().catch(err => console.error("Async email error:", err));
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
