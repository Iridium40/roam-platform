import { Request, Response } from "express";
import { TokenService } from "../services/tokenService.js";
import { supabase } from "../lib/supabase.js";

interface ApprovalEmailRequest {
  businessName: string;
  contactEmail: string;
  approvalNotes?: string;
  businessId: string;
  userId?: string;
}

export async function handleSendApprovalEmail(req: Request, res: Response) {
  console.log("=== SEND APPROVAL EMAIL START ===");
  try {
    console.log("handleSendApprovalEmail called with body:", req.body);

    const { businessName, contactEmail, approvalNotes, businessId, userId } = req.body as ApprovalEmailRequest;

    console.log("Extracted data:", { businessName, contactEmail, approvalNotes, businessId, userId });

    // Validate required fields
    if (!businessName || !contactEmail || !businessId) {
      console.error("Missing required fields:", {
        businessName: !!businessName,
        contactEmail: !!contactEmail,
        businessId: !!businessId
      });
      return res.status(400).json({
        error: "Missing required fields: businessName, contactEmail, and businessId are required",
        received: {
          businessName: !!businessName,
          contactEmail: !!contactEmail,
          businessId: !!businessId
        }
      });
    }

    // Check environment variables first
    console.log("=== ENVIRONMENT VARIABLES CHECK ===");
    const jwtSecret = process.env.JWT_SECRET || process.env.VITE_JWT_SECRET;
    const resendApiKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;

    console.log("Environment variables status:", {
      JWT_SECRET: !!process.env.JWT_SECRET,
      VITE_JWT_SECRET: !!process.env.VITE_JWT_SECRET,
      RESEND_API_KEY: !!process.env.RESEND_API_KEY,
      VITE_RESEND_API_KEY: !!process.env.VITE_RESEND_API_KEY,
      jwtSecretAvailable: !!jwtSecret,
      resendApiKeyAvailable: !!resendApiKey
    });

    if (!jwtSecret) {
      console.error("JWT secret not found in environment variables");
      return res.status(500).json({
        error: "JWT secret configuration error: JWT_SECRET not found"
      });
    }

    if (!resendApiKey) {
      console.error("Resend API key not found in environment variables");
      return res.status(500).json({
        error: "Email service configuration error: RESEND_API_KEY not found"
      });
    }

    // Get business owner's user_id from providers table
    console.log("=== FETCHING BUSINESS OWNER USER ID ===");
    let ownerUserId: string = businessId; // Fallback to businessId if owner not found
    
    try {
      const { data: ownerProvider, error: ownerError } = await supabase
        .from("providers")
        .select("user_id")
        .eq("business_id", businessId)
        .eq("provider_role", "owner")
        .single();

      if (!ownerError && ownerProvider?.user_id) {
        ownerUserId = ownerProvider.user_id;
        console.log("Found business owner user_id:", ownerUserId);
      } else {
        console.warn("Business owner not found in providers table, using businessId as fallback:", ownerError);
        // If no owner found, we'll use businessId as the userId (this is acceptable for token generation)
      }
    } catch (error) {
      console.error("Error fetching business owner:", error);
      // Continue with businessId fallback
    }

    // Generate Phase 2 secure onboarding link
    console.log("=== GENERATING PHASE 2 TOKEN ===");
    let phase2Link: string;
    let expirationDate: string;
    try {
      // Use owner's user_id for token generation, not admin's userId
      phase2Link = TokenService.generatePhase2URL(businessId, ownerUserId);
      expirationDate = TokenService.getTokenExpirationDate();
      console.log("Generated Phase 2 link:", phase2Link);
      console.log("Token expiration date:", expirationDate);
      console.log("Token generated with businessId:", businessId, "and userId:", ownerUserId);
    } catch (error) {
      console.error("Failed to generate Phase 2 token:", error);
      console.error("Token generation error stack:", error instanceof Error ? error.stack : "No stack");
      return res.status(500).json({
        error: "Failed to generate secure onboarding link",
        details: error instanceof Error ? error.message : "Unknown token generation error"
      });
    }

    console.log("=== SENDING EMAIL VIA RESEND ===");
    console.log("Sending approval email via Resend to:", contactEmail);

    // Logo URL from Supabase storage
    const logoUrl = 'https://vssomyuyhicaxsgiaupo.supabase.co/storage/v1/object/public/email-brand-images/ROAM/roam-logo-email.png';

    const emailPayload = {
      from: "ROAM Provider Support <providersupport@roamyourbestlife.com>",
      to: [contactEmail],
      subject: "Application Approved",
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Application Approved - ROAM</title>
            <style>
              @media only screen and (max-width: 600px) {
                .container { padding: 10px !important; }
                .content { padding: 20px !important; }
                .logo { max-width: 150px !important; }
                .timeline-item { margin-bottom: 15px !important; }
              }
            </style>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc;">
            <div class="container" style="max-width: 600px; margin: 0 auto; padding: 20px;">

              <!-- Header with Logo -->
              <div style="text-align: center; padding: 30px 0 20px; background-color: #ffffff; border-radius: 12px 12px 0 0; margin: -20px -20px 20px -20px; padding: 30px 20px; border-bottom: 2px solid #e2e8f0;">
                <img src="${logoUrl}"
                     alt="ROAM - Your Best Life. Everywhere."
                     class="logo"
                     style="max-width: 200px; height: auto;">
                <p style="margin: 10px 0 0; color: #4F46E5; font-size: 14px; font-weight: 600;">Your Best Life. Everywhere.</p>
              </div>

              <!-- Main Content -->
              <div class="content" style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">

                <!-- Success Header -->
                <div style="text-align: center; margin-bottom: 30px;">
                  <div style="background: #4F46E5; color: white; width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 24px;">✓</div>
                  <h1 style="color: #1e293b; margin: 0; font-size: 24px; font-weight: 700;">Application Approved!</h1>
                </div>

                <!-- Personalized Greeting -->
                <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                  Dear ${businessName} team,
                </p>

                <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                  Congratulations! Your business application has been <strong style="color: #4F46E5;">approved</strong> and you're now officially part of the ROAM platform!
                </p>

                <!-- Application ID -->
                <div style="background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 30px;">
                  <p style="margin: 0; color: #64748b; font-size: 14px;"><strong>Application ID:</strong> ${businessName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}-${new Date().getFullYear()}</p>
                </div>

                <!-- Important Next Step -->
                <div style="background: #4F46E5; color: white; border-radius: 12px; padding: 24px; margin-bottom: 30px; text-align: center;">
                  <h3 style="color: white; margin: 0 0 16px; font-size: 20px; font-weight: 700;">🚀 Ready for Phase 2?</h3>
                  <p style="color: rgba(255,255,255,0.9); margin: 0 0 20px; font-size: 16px;">
                    Complete your business setup to start receiving bookings
                  </p>
                  <a href="${phase2Link}"
                     style="background: white; color: #4F46E5; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    Complete Business Setup →
                  </a>
                  <p style="color: rgba(255,255,255,0.8); margin: 20px 0 0; font-size: 14px;">
                    🔒 Secure link expires on ${expirationDate}
                  </p>
                </div>

                <!-- Phase 2 Setup Overview -->
                <div style="background: #fefefe; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin-bottom: 30px;">
                  <h3 style="color: #4F46E5; margin: 0 0 20px; font-size: 18px; font-weight: 600;">📋 What's Included in Your Setup</h3>

                  <div class="timeline-item" style="display: flex; margin-bottom: 12px; align-items: flex-start;">
                    <div style="background: #4F46E5; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; margin-right: 12px; flex-shrink: 0;">1</div>
                    <div>
                      <strong style="color: #1e293b;">Business Profile & Branding</strong><br>
                      <span style="color: #64748b; font-size: 14px;">Logo, description, photos</span>
                    </div>
                  </div>

                  <div class="timeline-item" style="display: flex; margin-bottom: 12px; align-items: flex-start;">
                    <div style="background: #4F46E5; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; margin-right: 12px; flex-shrink: 0;">2</div>
                    <div>
                      <strong style="color: #1e293b;">Personal Profile Setup</strong><br>
                      <span style="color: #64748b; font-size: 14px;">Your provider credentials</span>
                    </div>
                  </div>

                  <div class="timeline-item" style="display: flex; margin-bottom: 12px; align-items: flex-start;">
                    <div style="background: #4F46E5; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; margin-right: 12px; flex-shrink: 0;">3</div>
                    <div>
                      <strong style="color: #1e293b;">Business Hours & Availability</strong><br>
                      <span style="color: #64748b; font-size: 14px;">When you're available for bookings</span>
                    </div>
                  </div>

                  <div class="timeline-item" style="display: flex; margin-bottom: 12px; align-items: flex-start;">
                    <div style="background: #4F46E5; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; margin-right: 12px; flex-shrink: 0;">4</div>
                    <div>
                      <strong style="color: #1e293b;">Banking & Payouts</strong><br>
                      <span style="color: #64748b; font-size: 14px;">Set up payment processing</span>
                    </div>
                  </div>

                  <div class="timeline-item" style="display: flex; margin-bottom: 0; align-items: flex-start;">
                    <div style="background: #4F46E5; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; margin-right: 12px; flex-shrink: 0;">5</div>
                    <div>
                      <strong style="color: #1e293b;">Service Pricing</strong><br>
                      <span style="color: #64748b; font-size: 14px;">Set your rates and packages</span>
                    </div>
                  </div>
                </div>

                ${approvalNotes ? `
                  <!-- Admin Notes -->
                  <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin-bottom: 30px;">
                    <h4 style="margin: 0 0 8px; color: #92400e; font-size: 16px; font-weight: 600;">📝 Admin Notes</h4>
                    <p style="margin: 0; color: #78350f; line-height: 1.5;">${approvalNotes}</p>
                  </div>
                ` : ''}

                <!-- Progress Tracking Info -->
                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                  <h4 style="color: #15803d; margin: 0 0 12px; font-size: 16px; font-weight: 600;">💡 Pro Tip</h4>
                  <p style="margin: 0; color: #166534; line-height: 1.5;">
                    Your progress is automatically saved as you go. You can start setup now and return anytime using the same link within 7 days.
                  </p>
                </div>

                <!-- Support Information -->
                <div style="background: #f8fafc; border-radius: 8px; padding: 20px; text-align: center;">
                  <h4 style="color: #4F46E5; margin: 0 0 12px; font-size: 16px; font-weight: 600;">Need Help Getting Started?</h4>
                  <p style="margin: 0 0 16px; color: #64748b;">Our provider support team is here to guide you through the setup process.</p>
                  <div style="margin-bottom: 12px;">
                    <p style="margin: 0; color: #4F46E5; font-weight: 600;">
                      📧 <a href="mailto:providersupport@roamyourbestlife.com" style="color: #4F46E5; text-decoration: none;">providersupport@roamyourbestlife.com</a>
                    </p>
                  </div>
                  <p style="margin: 0; color: #64748b; font-size: 14px; font-style: italic;">
                    Include your business name and this email for faster assistance
                  </p>
                </div>

              </div>

              <!-- Footer -->
              <div style="text-align: center; padding: 30px 20px; color: #64748b; font-size: 14px;">
                <p style="margin: 0 0 10px;">Welcome to the ROAM family!</p>
                <p style="margin: 0; font-weight: 600;">ROAM Provider Support Team</p>
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                  <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                    © ${new Date().getFullYear()} ROAM. All rights reserved.<br>
                    <a href="https://roamyourbestlife.com/privacy" style="color: #4F46E5; text-decoration: none;">Privacy Policy</a> |
                    <a href="https://roamyourbestlife.com/terms" style="color: #4F46E5; text-decoration: none;">Terms of Service</a>
                  </p>
                </div>
              </div>

            </div>
          </body>
          </html>
        `,
    };

    console.log("Email payload prepared:", {
      from: emailPayload.from,
      to: emailPayload.to,
      subject: emailPayload.subject,
      htmlLength: emailPayload.html.length
    });

    // Send email via Resend API
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    console.log("Resend API response status:", resendResponse.status);
    console.log("Resend API response headers:", Object.fromEntries(resendResponse.headers.entries()));

    if (resendResponse.ok) {
      const emailResult = await resendResponse.json();
      console.log("Approval email sent successfully:", emailResult);

      return res.status(200).json({
        success: true,
        message: "Approval email sent successfully",
        emailId: emailResult.id
      });
    } else {
      let errorDetails;
      try {
        errorDetails = await resendResponse.json();
        console.error("Resend API error response (JSON):", errorDetails);
      } catch (e) {
        errorDetails = await resendResponse.text();
        console.error("Resend API error response (text):", errorDetails);
      }

      console.error("Failed to send approval email. Status:", resendResponse.status);
      console.error("Error details:", errorDetails);

      return res.status(500).json({
        error: "Failed to send approval email",
        details: errorDetails,
        statusCode: resendResponse.status
      });
    }

  } catch (error) {
    console.log("=== ERROR IN SEND APPROVAL EMAIL ===");
    console.error("Error in handleSendApprovalEmail:", error);
    console.error("Error type:", typeof error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    console.error("Error message:", error instanceof Error ? error.message : "No message");
    console.error("Error name:", error instanceof Error ? error.name : "No name");

    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === "string") {
      errorMessage = error;
    } else {
      try {
        errorMessage = JSON.stringify(error);
      } catch (e) {
        errorMessage = "Could not serialize error";
      }
    }

    console.log("=== SEND APPROVAL EMAIL END (ERROR) ===");
    return res.status(500).json({
      error: "Internal server error while sending approval email",
      details: errorMessage,
      type: typeof error,
      stack: error instanceof Error ? error.stack : "No stack trace"
    });
  }
  console.log("=== SEND APPROVAL EMAIL END ===");
}
