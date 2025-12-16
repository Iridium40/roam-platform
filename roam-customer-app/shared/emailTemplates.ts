// Shared email template utility for consistent ROAM branding across all emails

export const ROAM_EMAIL_CONFIG = {
  // Use CDN URL for reliable email logo display (emails require absolute URLs)
  logoUrl: "https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F993952d908754e5dbe0cceda03eb2224?format=webp&width=200",
  brandColor: "#4F46E5", // roam-blue
  fromEmail: "support@roamyourbestlife.com",
  fromName: "ROAM Support",
  supportEmail: "support@roamyourbestlife.com",
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
            You received this email because you're a valued ROAM customer.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Pre-built email templates for common use cases
export const ROAM_EMAIL_TEMPLATES = {
  customerWelcome: (firstName: string) => {
    const content = `
      <h1>Welcome to ROAM, ${firstName}! 🎉</h1>
      <p>We're thrilled to have you join our community of wellness enthusiasts!</p>
      
      <div class="info-box">
        <h3>What You Can Do on ROAM:</h3>
        <ul style="margin: 10px 0;">
          <li>🔍 Browse wellness services in your area</li>
          <li>📅 Book appointments with verified providers</li>
          <li>💬 Message providers directly</li>
          <li>⭐ Leave reviews and earn rewards</li>
          <li>🎁 Get exclusive deals and promotions</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://roamyourbestlife.com/explore" class="button">Start Exploring Services</a>
      </div>
      
      <div class="highlight">
        <h3>New to ROAM?</h3>
        <p>Check out our <a href="https://roamyourbestlife.com/help">help center</a> for tips on finding the perfect service provider.</p>
      </div>
      
      <p>Welcome aboard!<br><strong>The ROAM Team</strong></p>
    `;
    return getROAMEmailTemplate(content);
  },

  providerNewBooking: (providerName: string, customerName: string, serviceName: string, bookingDate: string, bookingTime: string) => {
    const content = `
      <h1>🔔 New Booking Request!</h1>
      <p>Hi ${providerName},</p>
      <p>Great news! You have a new booking request from <strong>${customerName}</strong>.</p>
      
      <div class="info-box">
        <h2 style="margin-top: 0;">Booking Details</h2>
        <p style="margin: 10px 0;"><strong>Customer:</strong> ${customerName}</p>
        <p style="margin: 10px 0;"><strong>Service:</strong> ${serviceName}</p>
        <p style="margin: 10px 0;"><strong>Date:</strong> ${bookingDate}</p>
        <p style="margin: 10px 0;"><strong>Time:</strong> ${bookingTime}</p>
      </div>
      
      <div class="highlight">
        <p><strong>⏰ Action Required:</strong> Please review and accept or decline this booking within 24 hours.</p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://www.roamprovider.com/bookings" class="button">Review Booking Now</a>
      </div>
      
      <p>Best regards,<br><strong>The ROAM Team</strong></p>
    `;
    return getROAMEmailTemplate(content);
  },

  bookingReminder: (customerName: string, serviceName: string, providerName: string, bookingDate: string, bookingTime: string, location: string) => {
    const content = `
      <h1>⏰ Reminder: Your Appointment is Tomorrow!</h1>
      <p>Hi ${customerName},</p>
      <p>This is a friendly reminder about your upcoming appointment.</p>
      
      <div class="info-box">
        <h2 style="margin-top: 0;">Tomorrow's Appointment</h2>
        <p style="margin: 10px 0;"><strong>Service:</strong> ${serviceName}</p>
        <p style="margin: 10px 0;"><strong>Provider:</strong> ${providerName}</p>
        <p style="margin: 10px 0;"><strong>Date:</strong> ${bookingDate}</p>
        <p style="margin: 10px 0;"><strong>Time:</strong> ${bookingTime}</p>
        <p style="margin: 10px 0;"><strong>Location:</strong> ${location}</p>
      </div>
      
      <div class="highlight">
        <h3>Before Your Appointment:</h3>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>Arrive 5-10 minutes early</li>
          <li>Bring any required items</li>
          <li>Contact provider if you need to reschedule</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://roamyourbestlife.com/my-bookings" class="button">View Booking Details</a>
      </div>
      
      <p>See you soon!<br><strong>The ROAM Team</strong></p>
    `;
    return getROAMEmailTemplate(content);
  }
};

