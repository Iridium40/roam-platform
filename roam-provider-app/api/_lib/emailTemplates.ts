// Shared email template utility for consistent ROAM branding across all emails

export const ROAM_EMAIL_CONFIG = {
  logoUrl: "/logo-email.png",
  brandColor: "#4F46E5", // roam-blue
  fromEmail: "providersupport@roamyourbestlife.com",
  fromName: "ROAM Provider Support",
  supportEmail: "providersupport@roamyourbestlife.com",
  resendAudienceId: "4c85891b-bc03-4e67-a744-30b92e43206f"
};

export function getROAMEmailTemplate(content: string): string {
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
        .button {
          display: inline-block;
          background-color: ${ROAM_EMAIL_CONFIG.brandColor};
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          margin: 20px 0;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          font-size: 14px;
          color: #6b7280;
          text-align: center;
        }
        .highlight {
          background-color: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          border-left: 4px solid ${ROAM_EMAIL_CONFIG.brandColor};
          margin: 20px 0;
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
          ${content}
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

// Pre-built email templates for common use cases
export const ROAM_EMAIL_TEMPLATES = {
  bookingConfirmed: (customerName: string, serviceName: string, providerName: string, bookingDate: string, bookingTime: string, location: string, totalAmount: string) => {
    const content = `
      <h1>🎉 Your Booking Has Been Confirmed!</h1>
      <p>Hi ${customerName},</p>
      <p>Great news! Your booking has been confirmed by ${providerName}. We're excited to serve you!</p>
      
      <div class="info-box">
        <h2 style="margin-top: 0;">Booking Details</h2>
        <p style="margin: 10px 0;"><strong>Service:</strong> ${serviceName}</p>
        <p style="margin: 10px 0;"><strong>Provider:</strong> ${providerName}</p>
        <p style="margin: 10px 0;"><strong>Date:</strong> ${bookingDate}</p>
        <p style="margin: 10px 0;"><strong>Time:</strong> ${bookingTime}</p>
        <p style="margin: 10px 0;"><strong>Location:</strong> ${location}</p>
        <p style="margin: 10px 0;"><strong>Total:</strong> $${totalAmount}</p>
      </div>
      
      <div class="highlight">
        <h3>What's Next?</h3>
        <ul style="margin: 10px 0;">
          <li>You'll receive a reminder email 24 hours before your appointment</li>
          <li>If you need to make changes, please contact ${providerName} directly</li>
          <li>Arrive 5-10 minutes early if visiting a business location</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://roamyourbestlife.com/my-bookings" class="button">View My Bookings</a>
      </div>
      
      <p>Looking forward to seeing you!<br><strong>The ROAM Team</strong></p>
      
      <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
        <em>If you have any questions or concerns about your booking, please reply to this email or contact us at support@roamyourbestlife.com</em>
      </p>
    `;
    return getROAMEmailTemplate(content);
  },

  bookingCompleted: (customerName: string, serviceName: string, providerName: string, bookingId: string) => {
    const content = `
      <h1>Service Completed! 🎉</h1>
      <p>Hi ${customerName},</p>
      <p>Your ${serviceName} service with ${providerName} has been completed. We hope you had a great experience!</p>
      
      <div class="highlight">
        <h3>📝 How Was Your Experience?</h3>
        <p>Your feedback helps other customers find great providers and supports the ones you love!</p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://roamyourbestlife.com/review/${bookingId}" class="button">Leave a Review & Tip</a>
      </div>
      
      <div class="info-box">
        <p style="margin: 5px 0;">⭐ Rate your experience (1-5 stars)</p>
        <p style="margin: 5px 0;">💬 Share what you loved</p>
        <p style="margin: 5px 0;">💵 Add a tip for exceptional service (optional)</p>
      </div>
      
      <p>Thank you for choosing ROAM!<br><strong>The ROAM Team</strong></p>
    `;
    return getROAMEmailTemplate(content);
  },

  businessVerificationNeeded: (businessName: string, businessId: string, submittedDate: string, applicantEmail: string) => {
    const content = `
      <h1>🔔 New Business Application Submitted</h1>
      <p>A new business has completed their application and requires verification.</p>
      
      <div class="info-box">
        <h2 style="margin-top: 0;">Application Details</h2>
        <p style="margin: 10px 0;"><strong>Business Name:</strong> ${businessName}</p>
        <p style="margin: 10px 0;"><strong>Application ID:</strong> ${businessId}</p>
        <p style="margin: 10px 0;"><strong>Applicant Email:</strong> ${applicantEmail}</p>
        <p style="margin: 10px 0;"><strong>Submitted:</strong> ${submittedDate}</p>
      </div>
      
      <div class="highlight">
        <h3>⏰ Action Required</h3>
        <p><strong>Review Tasks:</strong></p>
        <ul style="margin: 10px 0;">
          <li>Verify business documents</li>
          <li>Check credentials and certifications</li>
          <li>Review background check results</li>
          <li>Approve or reject application</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://admin.roamyourbestlife.com/applications/${businessId}" class="button">Review Application</a>
      </div>
      
      <p>Best regards,<br><strong>ROAM Admin System</strong></p>
    `;
    return getROAMEmailTemplate(content);
  }
};

