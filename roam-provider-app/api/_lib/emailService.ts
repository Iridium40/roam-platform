import { Resend } from "resend";
import { ROAM_EMAIL_TEMPLATES, ROAM_EMAIL_CONFIG } from "./emailTemplates";

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY);

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private static fromEmail = "providersupport@roamyourbestlife.com";
  private static fromName = "ROAM Provider Support";
  private static logoUrl =
    "https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F993952d908754e5dbe0cceda03eb2224?format=webp&width=800";
  private static brandColor = "#4F46E5"; // roam-blue
  private static supportEmail = "providersupport@roamyourbestlife.com";

  static async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // Check if Resend API key is configured
      if (!process.env.RESEND_API_KEY) {
        console.error('❌ RESEND_API_KEY environment variable is not set');
        return false;
      }

      if (!process.env.RESEND_API_KEY.startsWith('re_')) {
        console.error('❌ RESEND_API_KEY appears to be invalid (should start with "re_")');
        return false;
      }

      console.log('📧 Attempting to send email to:', options.to);
      console.log('📧 From:', `${this.fromName} <${this.fromEmail}>`);
      console.log('📧 Subject:', options.subject);

      const { data, error } = await resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      if (error) {
        console.error("❌ Resend API error:", error);
        console.error("❌ Error details:", JSON.stringify(error, null, 2));
        return false;
      }

      console.log("✅ Email sent successfully:", data?.id);
      return true;
    } catch (error) {
      console.error("❌ Email service exception:", error);
      console.error("❌ Exception details:", error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  private static getEmailTemplate(content: string): string {
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
          .logo {
            text-align: center;
            margin-bottom: 30px;
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
            background-color: ${this.brandColor};
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
            background-color: #fef3c7;
            padding: 15px;
            border-radius: 6px;
            border-left: 4px solid #f59e0b;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="logo">
            <img src="${this.logoUrl}" alt="ROAM - Your Best Life. Everywhere." />
          </div>
          <div class="content">
            ${content}
          </div>
          <div class="footer">
            <p>Need help? Contact us at <a href="mailto:${this.supportEmail}">${this.supportEmail}</a></p>
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

  static async sendStaffWelcomeEmail(
    to: string,
    firstName: string,
    lastName: string,
    businessName: string,
    role: string,
    temporaryPassword: string,
    loginUrl: string = 'https://www.roamprovider.com/provider-login'
  ): Promise<boolean> {
    const roleDisplayName = 
      role === 'owner' ? 'Business Owner' :
      role === 'dispatcher' ? 'Dispatcher' : 
      'Provider';

    const content = `
      <h1>Welcome to ${businessName}! 🎉</h1>
      
      <p>Hi ${firstName},</p>
      
      <p>Your account has been created as a <strong>${roleDisplayName}</strong> at <strong>${businessName}</strong> on the ROAM platform.</p>

      <div style="background-color: #f3f4f6; border-left: 4px solid ${this.brandColor}; padding: 16px; margin: 24px 0;">
        <h3 style="margin-top: 0;">Your Login Credentials</h3>
        <p style="margin-bottom: 8px;"><strong>Email:</strong> ${to}</p>
        <p style="margin-bottom: 8px;"><strong>Temporary Password:</strong> <code style="background-color: #fff; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 16px; color: #dc2626;">${temporaryPassword}</code></p>
        <p style="margin-top: 16px; font-size: 14px; color: #6b7280;">
          <strong>Important:</strong> Please change your password after your first login for security.
        </p>
      </div>

      <h3>How to Get Started</h3>
      <ol style="line-height: 1.8;">
        <li>Click the login button below or visit <a href="${loginUrl}" style="color: ${this.brandColor};">${loginUrl}</a></li>
        <li>Enter your email and the temporary password above</li>
        <li>You'll be prompted to change your password</li>
        <li>Complete your profile setup</li>
        <li>Start managing your bookings and schedule!</li>
      </ol>

      <a href="${loginUrl}" class="button">Login to ROAM Provider Portal →</a>

      <h3>What You Can Do as a ${roleDisplayName}</h3>
      <ul style="line-height: 1.8;">
        ${role === 'owner' ? `
        <li><strong>Full Business Control</strong> - Manage all aspects of your business</li>
        <li><strong>Team Management</strong> - Add and manage staff members</li>
        <li><strong>Financial Overview</strong> - Track revenue and payouts</li>
        <li><strong>Business Settings</strong> - Configure services, hours, and locations</li>
        ` : role === 'dispatcher' ? `
        <li><strong>Manage Bookings</strong> - Coordinate appointments for all providers</li>
        <li><strong>Assign Providers</strong> - Match customers with team members</li>
        <li><strong>Monitor Operations</strong> - Track business performance</li>
        <li><strong>Customer Support</strong> - Handle inquiries and communications</li>
        ` : `
        <li><strong>Manage Your Schedule</strong> - View and update your availability</li>
        <li><strong>Handle Bookings</strong> - Accept, complete, or reschedule appointments</li>
        <li><strong>Track Earnings</strong> - Monitor your income and payouts</li>
        <li><strong>Customer Communication</strong> - Chat with customers about bookings</li>
        `}
      </ul>

      <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 24px 0;">
        <h4 style="margin-top: 0; color: #1e40af;">Need Help?</h4>
        <p style="margin-bottom: 8px;">If you have any questions or need assistance:</p>
        <ul style="margin-bottom: 0; padding-left: 20px;">
          <li>Contact your business admin at ${businessName}</li>
          <li>Email our support team at <a href="mailto:${this.supportEmail}" style="color: #3b82f6;">${this.supportEmail}</a></li>
          <li>Visit our <a href="https://www.roamprovider.com/help" style="color: #3b82f6;">Help Center</a></li>
        </ul>
      </div>

      <p>We're excited to have you as part of the ROAM community!</p>

      <p>Best regards,<br>The ROAM Team</p>
    `;

    return this.sendEmail({
      to,
      subject: `Welcome to ${businessName} on ROAM! 🎉`,
      html: this.getEmailTemplate(content),
      text: `Welcome to ${businessName}! Your account has been created as a ${roleDisplayName}. Login at ${loginUrl} with email: ${to} and temporary password: ${temporaryPassword}. Please change your password after first login.`,
    });
  }
}

