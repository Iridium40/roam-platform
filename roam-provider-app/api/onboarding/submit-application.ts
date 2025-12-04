import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Email configuration
const ROAM_EMAIL_CONFIG = {
  logoUrl: "/logo-email.png",
  brandColor: "#4F46E5", // roam-blue
  fromEmail: "providersupport@roamyourbestlife.com",
  fromName: "ROAM Provider Support",
  supportEmail: "providersupport@roamyourbestlife.com",
  resendAudienceId: "4c85891b-bc03-4e67-a744-30b92e43206f"
};

// Email template for application submitted
function getApplicationSubmittedEmailTemplate(firstName: string, applicationId: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>ROAM - Your Best Life. Everywhere.</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f9fafb;
        }
        .email-container {
          background-color: white;
          border-radius: 8px;
          padding: 40px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          background-color: #f5f5f5;
          color: #333333;
          padding: 30px 20px;
          text-align: center;
          border-radius: 8px 8px 0 0;
          margin: -40px -40px 30px -40px;
        }
        .logo {
          margin-bottom: 20px;
        }
        .logo img {
          max-width: 200px;
          height: auto;
        }
        .content {
          margin-bottom: 30px;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          font-size: 14px;
          color: #6b7280;
          text-align: center;
        }
        .info-box {
          background-color: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin: 25px 0;
        }
        h1, h2, h3 {
          color: ${ROAM_EMAIL_CONFIG.brandColor};
        }
        a {
          color: ${ROAM_EMAIL_CONFIG.brandColor};
          text-decoration: none;
        }
        a:hover {
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <div class="logo">
            <img src="${ROAM_EMAIL_CONFIG.logoUrl}" alt="ROAM - Your Best Life. Everywhere." />
          </div>
        </div>
        <div class="content">
          <h1>Application Submitted Successfully!</h1>
          <p>Hi ${firstName},</p>
          <p>Thank you for submitting your ROAM provider application! We've received your application and it's now under review.</p>
          
          <h3>What happens next:</h3>
          <ul>
            <li><strong>Background Check & Document Verification</strong> (2-3 business days)</li>
            <li><strong>Admin Review</strong> (1-2 business days)</li>
            <li><strong>Email Notification</strong> with secure link for Phase 2 setup</li>
            <li><strong>Identity Verification & Financial Setup</strong> (Stripe Connect)</li>
          </ul>
          
          <div class="info-box">
            <p style="margin: 0; font-size: 16px; color: #333333;"><strong>Application ID:</strong> ${applicationId}</p>
            <p style="margin: 10px 0 0 0; font-size: 16px; color: #333333;"><strong>Expected Timeline:</strong> Most applications are processed within 3-5 business days.</p>
          </div>
          
          <p>You'll receive email updates at each stage of the review process.</p>
          
          <p>If you have any questions, please contact us at <a href="mailto:${ROAM_EMAIL_CONFIG.supportEmail}">${ROAM_EMAIL_CONFIG.supportEmail}</a></p>
          
          <p>Best regards,<br><strong>The ROAM Team</strong></p>
        </div>
        <div class="footer">
          <p>Need help? Contact us at <a href="mailto:${ROAM_EMAIL_CONFIG.supportEmail}">${ROAM_EMAIL_CONFIG.supportEmail}</a></p>
          <p>© 2024 ROAM. All rights reserved.</p>
          <p style="font-size: 12px; color: #9ca3af;">
            You received this email because you started the provider onboarding process with ROAM.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Type definition for user settings
interface UserSettings {
  user_id: string;
  email_notifications?: boolean;
  sms_notifications?: boolean;
  admin_business_verification_email?: boolean;
  admin_business_verification_sms?: boolean;
  notification_email?: string;
  notification_phone?: string;
}

/**
 * Notify admin users about new business application submission
 */
async function notifyAdminsOfNewApplication(businessProfile: any, application: any) {
  try {
    // Get all active admin users
    const { data: adminUsers, error: adminError } = await supabase
      .from('admin_users')
      .select('user_id, email, first_name, last_name, is_active')
      .eq('is_active', true);

    if (adminError || !adminUsers || adminUsers.length === 0) {
      console.log('No active admin users found or error:', adminError);
      return;
    }

    console.log(`Found ${adminUsers.length} active admin users to notify`);

    // Get user settings for each admin
    const { data: adminSettings, error: settingsError } = await supabase
      .from('user_settings')
      .select('user_id, email_notifications, sms_notifications, admin_business_verification_email, admin_business_verification_sms, notification_email, notification_phone')
      .in('user_id', adminUsers.map(a => a.user_id));

    if (settingsError) {
      console.error('Error fetching admin settings:', settingsError);
      // Continue with default settings
    }

    // Create a map of user settings
    const settingsMap = new Map<string, UserSettings>(
      (adminSettings || []).map(s => [s.user_id, s as UserSettings])
    );

    // Notify each admin based on their preferences
    for (const admin of adminUsers) {
      const settings: UserSettings = settingsMap.get(admin.user_id) || {} as UserSettings;
      const emailEnabled = settings.admin_business_verification_email ?? settings.email_notifications ?? true;
      const smsEnabled = settings.admin_business_verification_sms ?? settings.sms_notifications ?? false;

      // Send email notification if enabled
      if (emailEnabled && process.env.RESEND_API_KEY) {
        try {
          const adminEmail = settings.notification_email || admin.email;
          const adminViewUrl = `${process.env.FRONTEND_URL || 'https://www.roamadmin.app'}/verification`;

          const emailHtml = getAdminNotificationEmailTemplate(
            admin.first_name || 'Admin',
            businessProfile.business_name,
            businessProfile.business_type,
            application.id,
            adminViewUrl
          );

          await resend.emails.send({
            from: `${ROAM_EMAIL_CONFIG.fromName} <${ROAM_EMAIL_CONFIG.fromEmail}>`,
            to: [adminEmail],
            subject: `🔔 New Provider Application: ${businessProfile.business_name}`,
            html: emailHtml,
          });

          console.log(`✅ Admin notification email sent to: ${adminEmail}`);
        } catch (emailError) {
          console.error(`Failed to send email to admin ${admin.email}:`, emailError);
        }
      }

      // Send SMS notification if enabled
      if (smsEnabled && settings.notification_phone) {
        // TODO: Implement SMS notification via Twilio or similar service
        console.log(`📱 SMS notification would be sent to: ${settings.notification_phone}`);
        console.log(`Message: New provider application from ${businessProfile.business_name} requires review.`);
      }
    }
  } catch (error) {
    console.error('Error in notifyAdminsOfNewApplication:', error);
    throw error;
  }
}

/**
 * Email template for admin notification about new application
 */
function getAdminNotificationEmailTemplate(
  adminName: string,
  businessName: string,
  businessType: string,
  applicationId: string,
  adminViewUrl: string
): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>ROAM - New Provider Application</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f9fafb;
        }
        .email-container {
          background-color: white;
          border-radius: 8px;
          padding: 40px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          background-color: #f5f5f5;
          padding: 30px 20px;
          text-align: center;
          border-radius: 8px 8px 0 0;
          margin: -40px -40px 30px -40px;
        }
        .logo {
          max-width: 150px;
          height: auto;
        }
        .content {
          padding: 20px 0;
        }
        .highlight-box {
          background-color: #f0f9ff;
          border-left: 4px solid ${ROAM_EMAIL_CONFIG.brandColor};
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background-color: ${ROAM_EMAIL_CONFIG.brandColor};
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          padding-top: 20px;
          margin-top: 30px;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
          font-size: 14px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        .info-label {
          font-weight: 600;
          color: #4b5563;
        }
        .info-value {
          color: #111827;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <img src="${ROAM_EMAIL_CONFIG.logoUrl}" alt="ROAM Logo" class="logo" />
        </div>
        
        <div class="content">
          <h2 style="color: #111827; margin-bottom: 20px;">Hi ${adminName},</h2>
          
          <p>A new provider application has been submitted and is ready for review.</p>
          
          <div class="highlight-box">
            <div class="info-row">
              <span class="info-label">Business Name:</span>
              <span class="info-value">${businessName}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Business Type:</span>
              <span class="info-value">${businessType.replace('_', ' ').toUpperCase()}</span>
            </div>
            <div class="info-row" style="border-bottom: none;">
              <span class="info-label">Application ID:</span>
              <span class="info-value">${applicationId.substring(0, 8)}...</span>
            </div>
          </div>
          
          <p><strong>Next Steps:</strong></p>
          <ul>
            <li>Review business information and documents</li>
            <li>Verify identity verification status</li>
            <li>Approve or request additional information</li>
          </ul>
          
          <center>
            <a href="${adminViewUrl}" class="button">Review Application</a>
          </center>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
            This application requires admin review before the provider can proceed to Phase 2 onboarding.
          </p>
        </div>
        
        <div class="footer">
          <p>
            ROAM Admin Dashboard<br>
            <a href="${adminViewUrl}" style="color: ${ROAM_EMAIL_CONFIG.brandColor};">View All Pending Applications</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

interface ApplicationData {
  userId: string;
  businessId: string;
  finalConsents: {
    informationAccuracy: boolean;
    termsAccepted: boolean;
    backgroundCheckConsent: boolean;
  };
  submissionMetadata?: {
    userAgent?: string;
    ipAddress?: string;
    timestamp: string;
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log("=== APPLICATION SUBMISSION API CALLED ===");
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("Request body:", req.body);
    
    const {
      userId,
      businessId,
      finalConsents,
      submissionMetadata,
    }: ApplicationData = req.body;

    console.log("Extracted data:", { userId, businessId, finalConsents });

    if (!userId || !businessId || !finalConsents) {
      console.error("Missing required fields:", { userId, businessId, finalConsents });
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate all consents are given
    const { informationAccuracy, termsAccepted, backgroundCheckConsent } =
      finalConsents;
    if (!informationAccuracy || !termsAccepted || !backgroundCheckConsent) {
      return res
        .status(400)
        .json({ error: "All consents must be given to submit application" });
    }

    // Verify business profile exists and user is the owner
    // First check if user owns this business through providers table
    console.log(
      "Checking ownership for userId:",
      userId,
      "businessId:",
      businessId,
    );

    const { data: providerRecord, error: providerError } = await supabase
      .from("providers")
      .select("business_id, provider_role")
      .eq("user_id", userId)
      .eq("business_id", businessId)
      .eq("provider_role", "owner")
      .single();

    console.log("Provider lookup result:", { providerRecord, providerError });

    if (providerError || !providerRecord) {
      // Let's also check if there's ANY provider record for this user
      const { data: anyProviderRecord, error: anyProviderError } =
        await supabase.from("providers").select("*").eq("user_id", userId);

      console.log("Any provider records for user:", anyProviderRecord);

      return res.status(404).json({
        error: "Business profile not found or not owned by user",
        debug: {
          userId,
          businessId,
          providerError: providerError?.message,
          anyProviderRecords: anyProviderRecord?.length || 0,
        },
      });
    }

    // Get the business profile
    const { data: businessProfile, error: businessError } = await supabase
      .from("business_profiles")
      .select("*")
      .eq("id", businessId)
      .single();

    if (businessError || !businessProfile) {
      return res.status(404).json({ error: "Business profile not found" });
    }

    // Check identity verification status (Stripe Identity requirement)
    console.log("Checking identity verification for businessId:", businessId);
    console.log("Identity verification fields:", {
      identity_verified: businessProfile.identity_verified,
      identity_verified_at: businessProfile.identity_verified_at,
      identity_verification_status: businessProfile.identity_verification_status
    });

    // Check if verification was started (we check for Stripe Identity session)
    const { data: verificationSessionData, error: verificationError } = await supabase
      .from("stripe_identity_verifications")
      .select("session_id, status")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(1);

    // Normalize Supabase result - it always returns an array, so get first item or null
    const verificationSession = Array.isArray(verificationSessionData) && verificationSessionData.length > 0
      ? verificationSessionData[0]
      : null;
    
    const verificationStatus = verificationSession?.status || null;

    console.log("Stripe Identity verification session:", {
      found: !!verificationSession,
      status: verificationStatus,
      error: verificationError?.message
    });
    
    // Allow submission if:
    // 1. identity_verified is true (verification completed), OR
    // 2. There's a verification session with status "processing" or "verified" (in progress/pending)
    const hasVerificationStarted = verificationSession && verificationStatus && 
      (verificationStatus === 'processing' || verificationStatus === 'verified');
    
    const canSubmit = businessProfile.identity_verified || hasVerificationStarted;
    
    if (!canSubmit) {
      console.error("Identity verification not started or failed:", {
        identity_verified: businessProfile.identity_verified,
        verificationStatus: verificationStatus,
        hasSession: !!verificationSession,
        verificationError: verificationError?.message
      });
      
      return res.status(400).json({
        error: "Identity verification required",
        details: "Please complete Stripe Identity verification before submitting your application.",
        currentStatus: verificationStatus || 'not_started',
        nextStep: "Complete identity verification in the onboarding flow"
      });
    }

    console.log("Identity verification check passed:", {
      identity_verified: businessProfile.identity_verified,
      verificationStatus: verificationStatus,
      verifiedAt: businessProfile.identity_verified_at
    });

    // Note: All documents are optional in Phase 1 onboarding
    // Documents can be uploaded but are not required for submission
    console.log("Phase 1 documents are optional - no validation required");

    // Create application submission record
    const submissionData = {
      user_id: userId,
      business_id: businessId,
      application_status: "submitted",
      review_status: "pending",
      consents_given: finalConsents,
      submission_metadata: {
        user_agent: req.headers["user-agent"] || submissionMetadata?.userAgent,
        ip_address:
          req.headers["x-forwarded-for"] ||
          req.headers["x-real-ip"] ||
          submissionMetadata?.ipAddress,
        timestamp: new Date().toISOString(),
      },
      submitted_at: new Date().toISOString(),
    };

    console.log("Creating application submission with data:", JSON.stringify(submissionData, null, 2));

    // Test the insert operation step by step
    console.log("Testing provider_applications table access...");
    const { data: testQuery, error: testError } = await supabase
      .from("provider_applications")
      .select("id")
      .limit(1);
    
    if (testError) {
      console.error("Error accessing provider_applications table:", testError);
      return res.status(500).json({ 
        error: "Database access error",
        details: testError.message,
        debug: { testError }
      });
    }
    
    console.log("Provider_applications table access successful, proceeding with insert...");

    // Check if there's already an application for this business
    const { data: existingApplication, error: existingError } = await supabase
      .from("provider_applications")
      .select("id, application_status")
      .eq("business_id", businessId)
      .single();
    
    if (existingApplication) {
      console.log("Found existing application:", existingApplication);
      if (existingApplication.application_status === "submitted") {
        return res.status(400).json({ 
          error: "Application already submitted",
          applicationId: existingApplication.id,
          status: existingApplication.application_status
        });
      }
    }

    const { data: submission, error: submissionError } = await supabase
      .from("provider_applications")
      .insert(submissionData)
      .select()
      .single();

    if (submissionError) {
      console.error("Error creating application submission:", submissionError);
      console.error("Submission error details:", JSON.stringify(submissionError, null, 2));
      console.error("Submission data being inserted:", JSON.stringify(submissionData, null, 2));
      return res.status(500).json({ 
        error: "Failed to submit application",
        details: submissionError.message,
        debug: {
          userId,
          businessId,
          submissionData,
          errorCode: submissionError.code,
          errorHint: submissionError.hint,
          errorDetails: submissionError.details
        }
      });
    }

    console.log("Application submission created successfully:", submission);

    // Update business profile status
    // Note: verification_status is managed by ROAM Admin app, not provider app
    const { error: updateError } = await supabase
      .from("business_profiles")
      .update({
        setup_step: 2, // Phase 1 complete
        application_submitted_at: new Date().toISOString(),
      })
      .eq("id", businessId);

    if (updateError) {
      console.error("Error updating business profile:", updateError);
      // Continue anyway - submission was successful
    }

    // Update provider status
    // Note: verification_status is managed by ROAM Admin app, not provider app
    const { error: providerUpdateError } = await supabase
      .from("providers")
      .update({
        background_check_status: "pending",
      })
      .eq("business_id", businessId);

    if (providerUpdateError) {
      console.error("Error updating provider status:", providerUpdateError);
      // Continue anyway - submission was successful
    }

    // Create initial setup progress tracking (optional - table may not exist)
    try {
      const { error: progressError } = await supabase
        .from("business_setup_progress")
        .upsert(
          {
            business_id: businessId,
            current_step: 2,
            total_steps: 8,
            business_profile_completed: true,
            locations_completed: true,
            services_pricing_completed: false,
            staff_setup_completed: false,
            integrations_completed: false,
            stripe_connect_completed: false,
            subscription_completed: false,
            go_live_completed: false,
            phase_1_completed: true,
            phase_1_completed_at: new Date().toISOString(),
          },
          {
            onConflict: "business_id",
          },
        );

      if (progressError) {
        console.log(
          "Setup progress tracking table not available:",
          progressError.message,
        );
        // Continue anyway - this is optional functionality
      }
    } catch (setupProgressError) {
      console.log(
        "Setup progress tracking not available - table may not exist",
      );
      // Continue anyway - this is optional functionality
    }

    // Get user info for email
    const user = await supabase.auth.admin.getUserById(userId);
    const firstName = user.data.user?.user_metadata?.first_name || "Provider";
    
    // Use business contact email (from Step 2) instead of auth email
    const userEmail = businessProfile.contact_email || user.data.user?.email || "";

    // Send confirmation email to provider
    if (userEmail && process.env.RESEND_API_KEY) {
      try {
        console.log("Sending application submitted email to:", userEmail);
        
        // Create contact in Resend audience first
        try {
          await resend.contacts.create({
            email: userEmail,
            firstName: firstName,
            lastName: businessProfile.business_name || "Provider",
            unsubscribed: false,
            audienceId: ROAM_EMAIL_CONFIG.resendAudienceId,
          });
          console.log("✅ Contact created in Resend audience");
        } catch (contactError) {
          console.log("Contact creation failed (may already exist):", contactError);
          // Continue anyway - contact might already exist
        }

        // Send application submitted email using inline template
        const emailHtml = getApplicationSubmittedEmailTemplate(firstName, submission.id);

        const { data: emailData, error: emailError } = await resend.emails.send({
          from: "ROAM Provider Support <providersupport@roamyourbestlife.com>",
          to: [userEmail],
          subject: "Application Submitted Successfully - ROAM Provider",
          html: emailHtml,
        });

        if (emailError) {
          console.error("❌ Email send failed:", emailError);
        } else {
          console.log("✅ Application submitted email sent successfully:", emailData);
        }

    } catch (emailError) {
      console.error("Error sending application submitted email:", emailError);
      // Continue - don't fail the submission if email fails
    }
    } else {
      console.log("Skipping email - no email address or RESEND_API_KEY not configured");
    }

    // Notify admin users about new application submission
    try {
      console.log("Notifying admins about new application submission...");
      await notifyAdminsOfNewApplication(businessProfile, submission);
    } catch (notifyError) {
      console.error("Error notifying admins:", notifyError);
      // Don't fail the submission if admin notification fails
    }

    // TODO: Queue background check initiation

    return res.status(200).json({
      success: true,
      applicationId: submission.id,
      submissionDate: submission.submitted_at,
      message:
        "Application submitted successfully! You will receive an email within 3-5 business days with next steps.",
      nextSteps: {
        backgroundCheck: "We will initiate a background check within 24 hours",
        documentReview: "Our team will review your uploaded documents",
        adminReview: "Admin review typically takes 2-3 business days",
        approvalNotification:
          "You will receive an email with a secure link to complete Phase 2 setup",
      },
    });
  } catch (error) {
    console.error("Application submission error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
