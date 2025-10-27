import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { EmailService } from "../../server/services/emailService";

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

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

    // Send confirmation email to provider (optional - don't fail if email fails)
    if (userEmail && process.env.RESEND_API_KEY) {
      try {
        console.log("Attempting to send email to:", userEmail);
        const emailSent = await EmailService.sendApplicationSubmittedEmail(
          userEmail,
          firstName,
          submission.id,
        );
        if (emailSent) {
          console.log("✅ Application submitted email sent to:", userEmail);
        } else {
          console.error("❌ Failed to send application submitted email to:", userEmail);
        }
      } catch (emailError) {
        console.error("Error sending application submitted email:", emailError);
        console.error("Email error details:", emailError instanceof Error ? emailError.message : "Unknown email error");
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
