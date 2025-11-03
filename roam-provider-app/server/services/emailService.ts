import { Resend } from "resend";
import { ROAM_EMAIL_TEMPLATES, ROAM_EMAIL_CONFIG } from "../../shared/emailTemplates";

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY || "re_Dpiy6s8h_BbVinwM12HVgicrsr7o6uxAV");

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
  private static resendAudienceId = "4c85891b-bc03-4e67-a744-30b92e43206f"; // Provider audience ID

  static async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // Check if Resend API key is configured
      if (!process.env.RESEND_API_KEY) {
        console.error('❌ RESEND_API_KEY environment variable is not set');
        return false;
      }

      if (!process.env.RESEND_API_KEY.startsWith('re_')) {
        console.error('❌ RESEND_API_KEY appears to be invalid (should start with "re_")');
        console.error('Current key starts with:', process.env.RESEND_API_KEY?.substring(0, 10));
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

  /**
   * Add a contact to the Resend provider audience
   * This should be called whenever sending emails to new providers
   */
  static async addToProviderAudience(
    email: string,
    firstName?: string,
    lastName?: string
  ): Promise<boolean> {
    try {
      if (!process.env.RESEND_API_KEY) {
        console.error('❌ RESEND_API_KEY environment variable is not set');
        return false;
      }

      console.log('📋 Adding contact to Resend audience:', email);

      const { data, error } = await resend.contacts.create({
        email: email,
        firstName: firstName,
        lastName: lastName,
        unsubscribed: false,
        audienceId: this.resendAudienceId,
      });

      if (error) {
        // Check if contact already exists
        if (error.message?.includes('already exists') || error.message?.includes('Contact already in audience')) {
          console.log('ℹ️ Contact already exists in audience:', email);
          return true; // Not an error, just already exists
        }
        
        console.error("❌ Resend audience API error:", error);
        console.error("❌ Error details:", JSON.stringify(error, null, 2));
        return false;
      }

      console.log("✅ Contact added to audience successfully:", data?.id);
      return true;
    } catch (error) {
      console.error("❌ Audience service exception:", error);
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

  static async sendWelcomeEmail(
    to: string,
    firstName: string,
  ): Promise<boolean> {
    // Add to Resend audience before sending email
    await this.addToProviderAudience(to, firstName);

    const content = `
      <h1 style="color: ${this.brandColor};">Welcome to ROAM, ${firstName}!</h1>
      <p>Thank you for taking the first step to become a ROAM provider. We're excited to have you join our community of wellness professionals.</p>
      
      <p>Your account has been successfully created. Here's what happens next:</p>
      
      <div class="highlight">
        <h3>Next Steps:</h3>
        <ol>
          <li><strong>Complete your business information</strong> - Tell us about your services and experience</li>
          <li><strong>Upload required documents</strong> - Professional licenses, insurance, and photos</li>
          <li><strong>Review and submit</strong> - Double-check everything before submission</li>
        </ol>
      </div>
      
      <p>Our team will review your application within 3-5 business days. Once approved, you'll receive an invitation to complete your financial setup and start offering services on ROAM.</p>
      
      <p>If you have any questions during the process, don't hesitate to reach out to our support team.</p>
      
      <p>Best regards,<br>The ROAM Team</p>
    `;

    return this.sendEmail({
      to,
      subject: "Welcome to ROAM - Let's get you started!",
      html: this.getEmailTemplate(content),
      text: `Welcome to ROAM, ${firstName}! Your account has been created successfully. Please complete your business information, upload required documents, and submit your application for review.`,
    });
  }

  static async sendApplicationSubmittedEmail(
    to: string,
    firstName: string,
    applicationId: string,
  ): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: "Application Submitted Successfully - ROAM Provider",
      html: ROAM_EMAIL_TEMPLATES.applicationSubmitted(firstName, applicationId),
      text: `Hi ${firstName}, your ROAM provider application (ID: ${applicationId}) has been submitted successfully and is now under review. We'll contact you within 3-5 business days with updates.`,
    });
  }

  static async sendApplicationApprovedEmail(
    to: string,
    firstName: string,
    phase2Link: string,
  ): Promise<boolean> {
    // Add to Resend audience before sending email
    await this.addToProviderAudience(to, firstName);

    return this.sendEmail({
      to,
      subject: "🎉 Application Approved - Complete Your Setup",
      html: ROAM_EMAIL_TEMPLATES.applicationApproved(firstName, phase2Link),
      text: `Congratulations ${firstName}! Your ROAM provider application has been approved. Complete your setup at: ${phase2Link}`,
    });
  }

  static async sendApplicationRejectedEmail(
    to: string,
    firstName: string,
    reason: string,
    nextSteps: string,
  ): Promise<boolean> {
    const content = `
      <h1 style="color: #dc2626;">Application Update Required</h1>
      <p>Hi ${firstName},</p>
      
      <p>Thank you for your interest in becoming a ROAM provider. After reviewing your application, we need some additional information before we can proceed.</p>
      
      <div class="highlight">
        <h3>What We Need:</h3>
        <p>${reason}</p>
      </div>
      
      <h3>Next Steps:</h3>
      <p>${nextSteps}</p>
      
      <p>Don't worry - this is a common part of the process, and we're here to help you through it. Many successful providers needed to make similar updates.</p>
      
      <p>Once you've addressed the items above, you can resubmit your application. If you have any questions or need assistance, please don't hesitate to reach out to our support team.</p>
      
      <p>We appreciate your patience and look forward to welcoming you to the ROAM community soon!</p>
      
      <p>Best regards,<br>The ROAM Onboarding Team</p>
    `;

    return this.sendEmail({
      to,
      subject: "ROAM Application - Additional Information Needed",
      html: this.getEmailTemplate(content),
      text: `Hi ${firstName}, we need some additional information for your ROAM provider application. ${reason} ${nextSteps}`,
    });
  }

  static async sendOnboardingCompleteEmail(
    to: string,
    firstName: string,
    dashboardLink: string,
  ): Promise<boolean> {
    // Add to Resend audience before sending email
    await this.addToProviderAudience(to, firstName);

    const content = `
      <h1 style="color: ${this.brandColor};">🚀 You're All Set! Welcome to ROAM</h1>
      <p>Hi ${firstName},</p>
      
      <p>Congratulations! You've successfully completed the ROAM provider onboarding process. You're now ready to start offering your services and building your business with ROAM.</p>
      
      <div class="highlight">
        <h3>Your ROAM Journey Starts Now!</h3>
        <p>Access your provider dashboard to get started.</p>
      </div>
      
      <a href="${dashboardLink}" class="button">Access Your Dashboard →</a>
      
      <h3>What You Can Do Now:</h3>
      <ul>
        <li><strong>Set Your Availability</strong> - Configure your schedule and working hours</li>
        <li><strong>Manage Services</strong> - Update pricing and service descriptions</li>
        <li><strong>View Bookings</strong> - See incoming requests and manage your calendar</li>
        <li><strong>Track Earnings</strong> - Monitor your income and payment history</li>
        <li><strong>Update Profile</strong> - Keep your information current</li>
      </ul>
      
      <h3>Getting Your First Booking:</h3>
      <ol>
        <li>Complete your service listings with detailed descriptions</li>
        <li>Add high-quality photos to your profile</li>
        <li>Set competitive pricing for your area</li>
        <li>Ensure your availability is up to date</li>
      </ol>
      
      <p>Our support team is always here to help you succeed. Don't hesitate to reach out if you have any questions as you get started.</p>
      
      <p>Here's to your success with ROAM!</p>
      
      <p>Best regards,<br>The ROAM Team</p>
    `;

    return this.sendEmail({
      to,
      subject: "🚀 Welcome to ROAM - You're Ready to Go!",
      html: this.getEmailTemplate(content),
      text: `Congratulations ${firstName}! You've completed ROAM onboarding. Access your dashboard: ${dashboardLink}`,
    });
  }

  static async sendStaffInvitationEmail(
    to: string,
    businessName: string,
    role: string,
    invitedBy: string,
    onboardingLink: string,
  ): Promise<boolean> {
    // Add to Resend audience before sending email
    await this.addToProviderAudience(to);

    const roleDisplayName = role === 'provider' ? 'Service Provider' :
                           role === 'dispatcher' ? 'Dispatcher' : 'Team Member';

    const content = `
      <h1 style="color: ${this.brandColor};">🎉 You're Invited to Join ${businessName} on ROAM!</h1>
      <p>Hello!</p>

      <p>${invitedBy} has invited you to join <strong>${businessName}</strong> as a <strong>${roleDisplayName}</strong> on the ROAM platform.</p>

      <div class="highlight">
        <h3>What is ROAM?</h3>
        <p>ROAM is a platform that connects service providers with customers, making it easy to manage bookings, payments, and customer relationships.</p>
      </div>

      <h3>Your Role: ${roleDisplayName}</h3>
      <p>As a ${roleDisplayName}, you'll be able to:</p>
      <ul>
        ${role === 'provider' ? `
        <li><strong>Manage Your Schedule</strong> - Set your availability and working hours</li>
        <li><strong>Accept Bookings</strong> - Receive and manage customer appointments</li>
        <li><strong>Track Earnings</strong> - Monitor your income and payment history</li>
        <li><strong>Communicate with Customers</strong> - Chat directly through the platform</li>
        ` : role === 'dispatcher' ? `
        <li><strong>Manage Team Bookings</strong> - Coordinate appointments for all providers</li>
        <li><strong>Assign Providers</strong> - Match customers with the right team members</li>
        <li><strong>Monitor Operations</strong> - Keep track of business performance</li>
        <li><strong>Handle Customer Communications</strong> - Manage customer inquiries</li>
        ` : `
        <li><strong>Access Team Dashboard</strong> - View business operations</li>
        <li><strong>Collaborate with Team</strong> - Work together efficiently</li>
        <li><strong>Manage Assignments</strong> - Handle your specific responsibilities</li>
        `}
      </ul>

      <p>To get started, simply click the link below to create your account and complete the onboarding process:</p>
      <a href="${onboardingLink}" class="button">Accept Invitation & Get Started →</a>

      <p style="font-size: 14px; color: #6b7280;">
        <strong>Security Note:</strong> This invitation link is unique to you and expires in 7 days.
      </p>

      <p>If you have any questions about this invitation or need help getting started, please don't hesitate to contact our support team.</p>

      <p>We're excited to welcome you to the ROAM community!</p>

      <p>Best regards,<br>The ROAM Team</p>
    `;

    return this.sendEmail({
      to,
      subject: `🎉 You're Invited to Join ${businessName} on ROAM`,
      html: this.getEmailTemplate(content),
      text: `You've been invited by ${invitedBy} to join ${businessName} as a ${roleDisplayName} on ROAM. Complete your onboarding: ${onboardingLink}`,
    });
  }
}
