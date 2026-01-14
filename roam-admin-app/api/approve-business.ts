import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { TokenService } from "../server/services/tokenService.js";

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
  console.log("=== APPROVE-BUSINESS REQUEST ===");
  console.log("Method:", req.method);
  console.log("URL:", req.url);
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
      return res.status(400).json({
        error: "Missing required fields",
        required: ["businessId", "adminUserId"],
      });
    }

    // Verify admin permissions
    const { data: adminUser } = await supabase.auth.admin.getUserById(adminUserId);
    if (!adminUser.user) {
      return res.status(403).json({ error: "Invalid admin user" });
    }

    console.log("Fetching business profile for:", businessId);

    // Get business profile
    const { data: businessProfiles, error: businessError } = await supabase
      .from("business_profiles")
      .select("*")
      .eq("id", businessId)
      .limit(1);

    if (businessError) {
      console.error("Error fetching business profile:", businessError);
      return res.status(500).json({
        error: "Database error",
        details: businessError.message,
      });
    }

    if (!businessProfiles || businessProfiles.length === 0) {
      console.error("Business profile not found for ID:", businessId);
      return res.status(404).json({
        error: "Business profile not found",
        details: `No business profile found with ID: ${businessId}`,
      });
    }

    const businessProfile = businessProfiles[0];

    if (businessProfiles.length > 1) {
      console.warn(`Multiple business profiles found for ID ${businessId}, using first one`);
    }

    console.log("Business profile found:", businessProfile.business_name);

    // Check if there's a provider_application for this business (for backward compatibility)
    const { data: applicationData } = await supabase
      .from("provider_applications")
      .select("id")
      .eq("business_id", businessId)
      .maybeSingle();
    
    const application = applicationData;
    const applicationId = application?.id || businessId;
    console.log("Application record:", application ? `Found (${application.id})` : "None found");

    console.log("Approving + activating business via RPC...");
    const { data: activationResult, error: activationError } = await supabase
      .rpc("approve_and_activate_business", {
        p_business_id: businessId,
        p_admin_user_id: adminUserId,
        p_approval_notes: approvalNotes ?? null,
      });

    if (activationError) {
      console.error("Error approving/activating business (RPC):", activationError);
      const status = activationError.message === "Business profile not found" ? 404 : 400;
      return res.status(status).json({
        error: activationError.message || "Failed to approve and activate business",
        details: activationError.details || activationError.hint || undefined,
      });
    }
    console.log("Business approved/activated successfully (RPC):", activationResult);

    console.log("Updating application status...");
    // Update application status (if application exists)
    // Note: updated_at is automatically managed by Supabase triggers
    if (application) {
      const { error: updateApplicationError } = await supabase
        .from("provider_applications")
        .update({
          application_status: "approved",
          review_status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: adminUserId,
          approval_notes: approvalNotes,
        })
        .eq("id", application.id);

      if (updateApplicationError) {
        console.error("Error updating application:", updateApplicationError);
        // Continue anyway - don't block business approval
      } else {
        console.log("Application updated successfully");
      }
    } else {
      console.log("No application record to update - skipping");
    }

    // Owner provider approval/activation is handled by approve_and_activate_business RPC.

    console.log("Generating Phase 2 token...");
    // Get owner user_id from providers table: business_profiles.id -> providers.business_id -> providers.user_id
    const { data: ownerProvider, error: ownerError } = await supabase
      .from("providers")
      .select("user_id, email, first_name")
      .eq("business_id", businessId)
      .eq("provider_role", "owner")
      .maybeSingle();
    
    if (ownerError || !ownerProvider?.user_id) {
      console.error("No owner provider found for business:", businessId);
      console.error("Owner lookup error:", ownerError);
      return res.status(500).json({
        error: "Missing owner provider",
        details: "Cannot generate approval token. Business must have a provider with provider_role = 'owner'.",
      });
    }
    
    const userId = ownerProvider.user_id;
    console.log("Found owner provider user_id:", userId);

    // Use applicationId that was already determined above
    
    const approvalToken = TokenService.generatePhase2Token(
      businessId,
      userId,
      applicationId
    );
    const approvalUrl = TokenService.generatePhase2URL(
            businessId,
      userId,
      applicationId
    );
    console.log("Phase 2 token generated successfully");
    console.log("Phase 2 onboarding URL:", approvalUrl);

    console.log("Creating approval record...");
    // Create approval record (if application exists)
    // Note: created_at and updated_at are automatically managed by Supabase triggers
    if (application) {
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
        });

      if (approvalRecordError) {
        console.error("Error creating approval record:", approvalRecordError);
        // Continue anyway - don't block approval on this
      } else {
        console.log("Approval record created successfully");
      }
    } else {
      console.log("No application record - skipping approval record creation");
    }

    console.log("Updating setup progress...");
    // Update setup progress
    // Note: updated_at is automatically managed by Supabase triggers
    const { error: progressError } = await supabase
      .from("business_setup_progress")
      .update({
        phase_1_completed: true,
        phase_1_completed_at: new Date().toISOString(),
        current_step: 3, // Start of Phase 2
      })
      .eq("business_id", businessId);

    if (progressError) {
      console.error("Error updating setup progress:", progressError);
      // Continue anyway
    } else {
      console.log("Setup progress updated successfully");
      }

    // Send approval email with Phase 2 onboarding link (if enabled)
    const emailStatus: { sent: boolean; error?: string; warning?: string } = { sent: false };
    if (sendEmail) {
      console.log("Sending approval email with Phase 2 onboarding link...");
      console.log("Approval URL to include in email:", approvalUrl);
      try {
        // Get provider email (contact email from Phase 1 onboarding) - this is the primary email
        // Priority: providers.email (contact email from Phase 1) > businessProfile.contact_email > auth.users.email
        const { data: userData } = await supabase.auth.admin.getUserById(userId);
        const userEmail = ownerProvider?.email || businessProfile.contact_email || userData.user?.email;
        console.log("Provider email from providers table:", ownerProvider?.email);
        console.log("Business contact email:", businessProfile.contact_email);
        console.log("Auth user email:", userData.user?.email);
        console.log("Sending email to (final):", userEmail);

        if (userEmail) {
          const firstName =
            ownerProvider?.first_name ||
            userData.user?.user_metadata?.first_name ||
            businessProfile.business_name ||
            "Provider";

          const resendApiKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
          if (!resendApiKey) {
            console.warn("Resend API key not found, skipping email");
            emailStatus.sent = false;
            emailStatus.warning = "Resend API key not configured; approval email was not sent.";
          } else {
            const emailPayload = {
              from: "ROAM Provider Support <providersupport@roamyourbestlife.com>",
              to: [userEmail],
              subject: "🎉 Your Business Application Has Been Approved - Complete Setup to Access Your Account",
              html: `
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
                  <!-- Logo Header -->
                  <div style="background-color: #f5f5f5; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0;">
                    <img src="https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F993952d908754e5dbe0cceda03eb2224?format=webp&width=200" alt="ROAM - Your Best Life. Everywhere." style="max-width: 200px; height: auto;" />
                  </div>
                  
                  <!-- Success Banner -->
                  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Congratulations!</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Your Business Application Has Been Approved</p>
                  </div>
                  
                  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
                    <p style="font-size: 16px; margin: 0 0 20px 0;">Hi ${firstName},</p>
                    
                    <p style="font-size: 16px; margin: 0 0 20px 0;">
                      Great news! Your business application for <strong>${businessProfile.business_name}</strong> has been reviewed and <strong style="color: #059669;">approved</strong>.
                    </p>
                    
                    <!-- Important Notice -->
                    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
                      <p style="margin: 0; color: #92400e; font-weight: 600;">⚠️ Important: Complete Phase 2 Setup Required</p>
                      <p style="margin: 10px 0 0 0; color: #78350f; line-height: 1.5;">
                        To access your provider account and start receiving bookings, you <strong>must complete Phase 2 onboarding</strong> using the link below. Your account will be activated once this step is finished.
                      </p>
                    </div>
                    
                    ${approvalNotes ? `
                    <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0; border-radius: 4px;">
                      <p style="margin: 0; color: #166534; font-weight: 600;">Admin Notes:</p>
                      <p style="margin: 5px 0 0 0; color: #15803d; line-height: 1.5;">${approvalNotes}</p>
                    </div>
                    ` : ''}
                    
                    <p style="font-size: 16px; margin: 20px 0;">
                      Click the button below to complete your business setup:
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${approvalUrl}" style="display: inline-block; background: #4F46E5; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                        Complete Phase 2 Setup
                      </a>
                    </div>
                    
                    <!-- What's Included -->
                    <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
                      <p style="margin: 0 0 15px 0; font-weight: 600; color: #1e293b;">📋 Phase 2 Setup Includes:</p>
                      <ul style="margin: 0; padding-left: 20px; color: #475569;">
                        <li style="margin-bottom: 8px;">Business profile & branding</li>
                        <li style="margin-bottom: 8px;">Business hours & availability</li>
                        <li style="margin-bottom: 8px;">Banking & payment setup (Stripe)</li>
                        <li style="margin-bottom: 8px;">Service pricing configuration</li>
                      </ul>
                    </div>
                    
                    <p style="font-size: 14px; color: #6b7280; margin: 20px 0 0 0;">
                      Or copy and paste this link into your browser:<br>
                      <a href="${approvalUrl}" style="color: #4F46E5; word-break: break-all;">${approvalUrl}</a>
                    </p>
                    
                    <p style="font-size: 14px; color: #6b7280; margin: 20px 0 0 0;">
                      <strong>Note:</strong> This secure link will expire in 7 days. If you need a new link, please contact support.
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                    
                    <p style="font-size: 14px; color: #6b7280; margin: 0;">
                      Questions? Contact us at <a href="mailto:providersupport@roamyourbestlife.com" style="color: #4F46E5;">providersupport@roamyourbestlife.com</a>
                    </p>
                    
                    <p style="font-size: 14px; color: #6b7280; margin: 20px 0 0 0;">
                      Best regards,<br>
                      <strong>The ROAM Provider Support Team</strong>
                    </p>
                  </div>
                  
                  <!-- Footer -->
                  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
                    <p style="margin: 0;">© ${new Date().getFullYear()} ROAM. All rights reserved.</p>
                  </div>
                </body>
                </html>
              `,
            };

            const resendResponse = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${resendApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(emailPayload),
      });

            if (resendResponse.ok) {
              await resendResponse.json().catch(() => null);
              console.log("Approval email sent successfully to:", userEmail);
              emailStatus.sent = true;
            } else {
              const errorText = await resendResponse.text();
              console.error("Error sending approval email:", errorText);
              emailStatus.sent = false;
              emailStatus.error = errorText || "Unknown Resend error";
              // Continue anyway - don't block approval on email failure
            }
          }
        } else {
          console.warn("No email address found for user:", userId);
          emailStatus.sent = false;
          emailStatus.warning = "No email address found for the owner user; approval email was not sent.";
        }
      } catch (emailError) {
        console.error("Error sending approval email:", emailError);
        emailStatus.sent = false;
        emailStatus.error = emailError instanceof Error ? emailError.message : "Unknown error sending email";
        // Continue anyway - don't block approval on email failure
      }
    }

    return res.status(200).json({
      success: true,
      message: "Application approved successfully",
      approvalToken,
      approvalUrl,
      activation: activationResult,
      emailStatus,
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
