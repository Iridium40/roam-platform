import { Request, Response } from "express";

interface RejectionEmailRequest {
  businessName: string;
  contactEmail: string;
  rejectionReason: string;
  businessId: string;
  userId?: string;
}

export async function handleSendRejectionEmail(req: Request, res: Response) {
  console.log("=== SEND REJECTION EMAIL START ===");
  try {
    console.log("handleSendRejectionEmail called with body:", req.body);

    const { businessName, contactEmail, rejectionReason, businessId, userId } = req.body as RejectionEmailRequest;

    console.log("Extracted data:", { businessName, contactEmail, rejectionReason, businessId, userId });

    // Validate required fields
    if (!businessName || !contactEmail || !businessId || !rejectionReason) {
      console.error("Missing required fields:", {
        businessName: !!businessName,
        contactEmail: !!contactEmail,
        businessId: !!businessId,
        rejectionReason: !!rejectionReason
      });
      return res.status(400).json({
        error: "Missing required fields: businessName, contactEmail, businessId, and rejectionReason are required",
        received: {
          businessName: !!businessName,
          contactEmail: !!contactEmail,
          businessId: !!businessId,
          rejectionReason: !!rejectionReason
        }
      });
    }

    // Check environment variables
    console.log("=== ENVIRONMENT VARIABLES CHECK ===");
    const resendApiKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;

    console.log("Environment variables status:", {
      RESEND_API_KEY: !!process.env.RESEND_API_KEY,
      VITE_RESEND_API_KEY: !!process.env.VITE_RESEND_API_KEY,
      resendApiKeyAvailable: !!resendApiKey
    });

    if (!resendApiKey) {
      console.error("Resend API key not found in environment variables");
      return res.status(500).json({
        error: "Email service configuration error: RESEND_API_KEY not found"
      });
    }

    console.log("=== SENDING EMAIL VIA RESEND ===");
    console.log("Sending rejection email via Resend to:", contactEmail);

    const emailPayload = {
      from: "ROAM Provider Support <onboarding@resend.dev>",
      to: [contactEmail],
      subject: "Application Status Update - Action Required",
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Application Status Update - ROAM</title>
            <style>
              @media only screen and (max-width: 600px) {
                .container { padding: 10px !important; }
                .content { padding: 20px !important; }
                .logo { max-width: 150px !important; }
              }
            </style>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc;">
            <div class="container" style="max-width: 600px; margin: 0 auto; padding: 20px;">

              <!-- Header with Logo -->
              <div style="text-align: center; padding: 30px 0 20px;">
                <img src="${process.env.VITE_PUBLIC_SUPABASE_URL}/storage/v1/object/public/roam-file-storage/brand-assets/site_logo-1755737705142.png"
                     alt="ROAM - Your Best Life. Everywhere."
                     class="logo"
                     style="max-width: 200px; height: auto;">
                <p style="margin: 10px 0 0; color: #4F46E5; font-size: 14px; font-weight: 600;">Your Best Life. Everywhere.</p>
              </div>

              <!-- Main Content -->
              <div class="content" style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">

                <!-- Status Header -->
                <div style="text-align: center; margin-bottom: 30px;">
                  <div style="background: #ef4444; color: white; width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 24px;">!</div>
                  <h1 style="color: #1e293b; margin: 0; font-size: 24px; font-weight: 700;">Application Status Update</h1>
                </div>

                <!-- Personalized Greeting -->
                <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                  Dear ${businessName} team,
                </p>

                <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                  Thank you for your interest in joining the ROAM platform. After careful review of your application, we regret to inform you that we are unable to approve your business at this time.
                </p>

                <!-- Application ID -->
                <div style="background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 30px;">
                  <p style="margin: 0; color: #64748b; font-size: 14px;"><strong>Application ID:</strong> ${businessName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}-${new Date().getFullYear()}</p>
                </div>

                <!-- Rejection Reason -->
                <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
                  <h4 style="margin: 0 0 12px; color: #991b1b; font-size: 16px; font-weight: 600;">📋 Reason for Decision</h4>
                  <p style="margin: 0; color: #7f1d1d; line-height: 1.6; white-space: pre-wrap;">${rejectionReason}</p>
                </div>

                <!-- Next Steps -->
                <div style="background: #fefefe; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin-bottom: 30px;">
                  <h3 style="color: #4F46E5; margin: 0 0 20px; font-size: 18px; font-weight: 600;">📝 What You Can Do Next</h3>

                  <div style="margin-bottom: 16px;">
                    <strong style="color: #1e293b; display: block; margin-bottom: 8px;">1. Review the Feedback</strong>
                    <p style="margin: 0; color: #64748b; line-height: 1.5;">
                      Carefully read the reason provided above to understand the specific areas that need attention.
                    </p>
                  </div>

                  <div style="margin-bottom: 16px;">
                    <strong style="color: #1e293b; display: block; margin-bottom: 8px;">2. Make Necessary Updates</strong>
                    <p style="margin: 0; color: #64748b; line-height: 1.5;">
                      Address the concerns mentioned in the feedback. This may include updating documents, providing additional information, or making changes to your business profile.
                    </p>
                  </div>

                  <div style="margin-bottom: 0;">
                    <strong style="color: #1e293b; display: block; margin-bottom: 8px;">3. Reapply When Ready</strong>
                    <p style="margin: 0; color: #64748b; line-height: 1.5;">
                      Once you've addressed the feedback, you're welcome to submit a new application. We encourage you to take the time needed to meet our requirements.
                    </p>
                  </div>
                </div>

                <!-- Support Information -->
                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                  <h4 style="color: #15803d; margin: 0 0 12px; font-size: 16px; font-weight: 600;">💡 Need Clarification?</h4>
                  <p style="margin: 0 0 12px; color: #166534; line-height: 1.5;">
                    If you have questions about this decision or need guidance on how to address the feedback, our provider support team is here to help.
                  </p>
                  <p style="margin: 0; color: #15803d; font-weight: 600;">
                    📧 <a href="mailto:providersupport@roamyourbestlife.com" style="color: #15803d; text-decoration: none;">providersupport@roamyourbestlife.com</a>
                  </p>
                </div>

                <!-- Encouragement -->
                <div style="background: #f8fafc; border-radius: 8px; padding: 20px; text-align: center;">
                  <p style="margin: 0; color: #64748b; line-height: 1.6;">
                    We appreciate your interest in ROAM and encourage you to reapply once you've addressed the feedback. We look forward to potentially welcoming you to our platform in the future.
                  </p>
                </div>

              </div>

              <!-- Footer -->
              <div style="text-align: center; padding: 30px 20px; color: #64748b; font-size: 14px;">
                <p style="margin: 0 0 10px;">Thank you for your understanding</p>
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
      console.log("Rejection email sent successfully:", emailResult);

      return res.status(200).json({
        success: true,
        message: "Rejection email sent successfully",
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

      console.error("Failed to send rejection email. Status:", resendResponse.status);
      console.error("Error details:", errorDetails);

      return res.status(500).json({
        error: "Failed to send rejection email",
        details: errorDetails,
        statusCode: resendResponse.status
      });
    }

  } catch (error) {
    console.log("=== ERROR IN SEND REJECTION EMAIL ===");
    console.error("Error in handleSendRejectionEmail:", error);
    console.error("Error type:", typeof error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");

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

    console.log("=== SEND REJECTION EMAIL END (ERROR) ===");
    return res.status(500).json({
      error: "Internal server error while sending rejection email",
      details: errorMessage,
      type: typeof error,
      stack: error instanceof Error ? error.stack : "No stack trace"
    });
  }
  console.log("=== SEND REJECTION EMAIL END ===");
}

