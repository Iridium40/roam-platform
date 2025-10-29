import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Email configuration
const ROAM_EMAIL_CONFIG = {
  logoUrl: "https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F993952d908754e5dbe0cceda03eb2224?format=webp&width=200",
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
          background-color: ${ROAM_EMAIL_CONFIG.brandColor};
          color: white;
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
            <li><strong>Identity Verification & Financial Setup</strong> (Stripe & Plaid)</li>
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

    // Check if required documents are uploaded (simplified validation)
    console.log("Checking documents for businessId:", businessId);
    
    const { data: documents, error: documentsError } = await supabase
      .from("business_documents")
      .select("document_type")
      .eq("business_id", businessId);

    if (documentsError) {
      console.error("Error querying documents:", documentsError);
      // Continue anyway - don't fail submission for document query issues
    }

    const uploadedTypes = documents?.map((doc) => doc.document_type) || [];
    console.log("Uploaded document types:", uploadedTypes);

    // For now, skip strict document validation to avoid blocking submissions
    // TODO: Re-enable document validation once upload issues are resolved
    console.log("Skipping document validation for now");

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
    const { error: updateError } = await supabase
      .from("business_profiles")
      .update({
        verification_status: "under_review",
        setup_step: 2, // Phase 1 complete
        application_submitted_at: new Date().toISOString(),
      })
      .eq("id", businessId);

    if (updateError) {
      console.error("Error updating business profile:", updateError);
      // Continue anyway - submission was successful
    }

    // Update provider status
    const { error: providerUpdateError } = await supabase
      .from("providers")
      .update({
        verification_status: "under_review",
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

    // TODO: Send email notification to admins about new application
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
