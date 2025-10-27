// Shared email template utility for consistent ROAM branding across all emails

export const ROAM_EMAIL_CONFIG = {
  logoUrl: "https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F993952d908754e5dbe0cceda03eb2224?format=webp&width=200",
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
  applicationSubmitted: (firstName: string, applicationId: string) => {
    const content = `
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
    `;
    return getROAMEmailTemplate(content);
  },

  applicationApproved: (firstName: string, phase2Link: string) => {
    const content = `
      <h1>Congratulations! Your Application Has Been Approved!</h1>
      <p>Hi ${firstName},</p>
      <p>Great news! Your ROAM provider application has been approved. You're now ready to complete the final setup steps.</p>
      
      <div class="highlight">
        <h3>🎉 What's Next?</h3>
        <p>Click the button below to complete your Phase 2 setup, including:</p>
        <ul>
          <li>Identity verification with Stripe</li>
          <li>Bank account connection via Plaid</li>
          <li>Payment setup and configuration</li>
          <li>Service pricing and availability</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${phase2Link}" class="button">Complete Phase 2 Setup</a>
      </div>
      
      <p><strong>Important:</strong> This link is secure and will expire in 7 days. Please complete your setup as soon as possible.</p>
      
      <p>If you have any questions or need assistance, please contact us at <a href="mailto:${ROAM_EMAIL_CONFIG.supportEmail}">${ROAM_EMAIL_CONFIG.supportEmail}</a></p>
      
      <p>Welcome to the ROAM family!<br><strong>The ROAM Team</strong></p>
    `;
    return getROAMEmailTemplate(content);
  },

  applicationRejected: (firstName: string, reason: string, nextSteps: string) => {
    const content = `
      <h1>Application Update</h1>
      <p>Hi ${firstName},</p>
      <p>Thank you for your interest in becoming a ROAM provider. After careful review, we're unable to approve your application at this time.</p>
      
      <div class="highlight">
        <h3>Reason for Rejection:</h3>
        <p>${reason}</p>
      </div>
      
      <div class="info-box">
        <h3>Next Steps:</h3>
        <p>${nextSteps}</p>
      </div>
      
      <p>We encourage you to reapply once you've addressed the issues mentioned above. We're here to help you succeed!</p>
      
      <p>If you have any questions, please contact us at <a href="mailto:${ROAM_EMAIL_CONFIG.supportEmail}">${ROAM_EMAIL_CONFIG.supportEmail}</a></p>
      
      <p>Best regards,<br><strong>The ROAM Team</strong></p>
    `;
    return getROAMEmailTemplate(content);
  }
};
