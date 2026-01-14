import { Request, Response } from 'express';
import { supabase } from '../lib/supabase.js';
import { TokenService } from '../services/tokenService.js';

interface ApprovalRequest {
  businessId: string;
  adminUserId: string;
  approvalNotes?: string;
  sendEmail?: boolean;
}

export async function handleApproveBusiness(req: Request, res: Response) {
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
      .select("user_id")
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
    let emailStatus: { sent: boolean; error?: string; warning?: string } = { sent: false };
    
    if (sendEmail) {
      console.log("Sending approval email with Phase 2 onboarding link...");
      console.log("Approval URL to include in email:", approvalUrl);
      try {
        // Get provider email (contact email from Phase 1 onboarding) - this is the primary email
        const { data: providerData } = await supabase
          .from("providers")
          .select("email, first_name")
          .eq("user_id", userId)
          .eq("business_id", businessId)
          .eq("provider_role", "owner")
          .maybeSingle();
        
        // Priority: providers.email (contact email from Phase 1) > businessProfile.contact_email > auth.users.email
        const { data: userData } = await supabase.auth.admin.getUserById(userId);
        const userEmail = providerData?.email || businessProfile.contact_email || userData.user?.email;
        console.log("Provider email from providers table:", providerData?.email);
        console.log("Business contact email:", businessProfile.contact_email);
        console.log("Auth user email:", userData.user?.email);
        console.log("Sending email to (final):", userEmail);

        if (userEmail) {
          const firstName =
            providerData?.first_name ||
            userData.user?.user_metadata?.first_name ||
            businessProfile.business_name ||
            "Provider";

          const resendApiKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
          if (!resendApiKey) {
            console.warn("Resend API key not found, skipping email");
            emailStatus = { sent: false, error: "Resend API key not configured" };
          } else {
            // Logo URL from Supabase storage
            const logoUrl = 'https://vssomyuyhicaxsgiaupo.supabase.co/storage/v1/object/public/email-brand-images/ROAM/roam-logo-email.png';
            
            const emailPayload = {
              from: "ROAM Provider Support <providersupport@roamyourbestlife.com>",
              to: [userEmail],
              subject: "🎉 Your Business Has Been Approved!",
              html: `
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <div style="background: #ffffff; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; border-bottom: 3px solid #667eea;">
                    <img src="${logoUrl}" alt="ROAM" style="max-width: 120px; height: auto; margin-bottom: 15px;" />
                    <h1 style="color: #1e293b; margin: 0; font-size: 28px;">🎉 Congratulations!</h1>
                    <p style="color: #64748b; margin: 10px 0 0 0; font-size: 16px;">Your Business Has Been Approved</p>
                  </div>
                  
                  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
                    <p style="font-size: 16px; margin: 0 0 20px 0;">Hi ${firstName},</p>
                    
                    <p style="font-size: 16px; margin: 0 0 20px 0;">
                      Great news! Your business application for <strong>${businessProfile.business_name}</strong> has been reviewed and approved.
                    </p>
                    
                    ${approvalNotes ? `
                    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
                      <p style="margin: 0; color: #78350f; line-height: 1.5;">${approvalNotes}</p>
                    </div>
                    ` : ''}
                    
                    <p style="font-size: 16px; margin: 20px 0;">
                      You can now continue with Phase 2 of your onboarding process. Click the button below to get started:
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${approvalUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                        Continue Phase 2 Onboarding
                      </a>
                    </div>
                    
                    <p style="font-size: 14px; color: #6b7280; margin: 20px 0 0 0;">
                      Or copy and paste this link into your browser:<br>
                      <a href="${approvalUrl}" style="color: #667eea; word-break: break-all;">${approvalUrl}</a>
                    </p>
                    
                    <p style="font-size: 14px; color: #6b7280; margin: 20px 0 0 0;">
                      <strong>Note:</strong> This link will expire in 7 days. If you need a new link, please contact support.
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                    
                    <p style="font-size: 14px; color: #6b7280; margin: 0;">
                      If you have any questions, please don't hesitate to reach out to our support team.
                    </p>
                    
                    <p style="font-size: 14px; color: #6b7280; margin: 20px 0 0 0;">
                      Best regards,<br>
                      The ROAM Platform Team
                    </p>
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
              const emailResult = await resendResponse.json();
              console.log("Approval email sent successfully to:", userEmail);
              emailStatus = { sent: true };
            } else {
              const errorText = await resendResponse.text();
              let errorData;
              try {
                errorData = JSON.parse(errorText);
              } catch {
                errorData = { message: errorText };
              }
              
              console.error("Error sending approval email:", errorData);
              
              // Check if it's a Resend test mode validation error
              if (errorData.name === "validation_error" && errorData.message?.includes("testing emails")) {
                const verifiedEmail = errorData.message.match(/\(([^)]+)\)/)?.[1] || "alan@roamyourbestlife.com";
                console.warn(`Resend is in test mode. Email can only be sent to: ${verifiedEmail}`);
                console.warn(`Attempted to send to: ${userEmail}`);
                console.warn("To send emails to other recipients, verify a domain at resend.com/domains");
                
                emailStatus = {
                  sent: false,
                  warning: `Resend is in test mode. Email can only be sent to ${verifiedEmail}. To send to other recipients, verify a domain at resend.com/domains`,
                  error: errorData.message
                };
              } else {
                emailStatus = {
                  sent: false,
                  error: errorData.message || "Failed to send approval email"
                };
              }
              // Continue anyway - don't block approval on email failure
            }
          }
        } else {
          console.warn("No email address found for user:", userId);
          emailStatus = { sent: false, error: "No email address found for user" };
        }
      } catch (emailError) {
        console.error("Error sending approval email:", emailError);
        emailStatus = {
          sent: false,
          error: emailError instanceof Error ? emailError.message : "Unknown error sending email"
        };
        // Continue anyway - don't block approval on email failure
      }
    }

    return res.status(200).json({
      success: true,
      message: "Application approved successfully",
      approvalToken,
      approvalUrl,
      approvedAt: new Date().toISOString(),
      approvedBy: adminUserId,
      emailStatus,
    });
  } catch (error) {
    console.error("Application approval error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
