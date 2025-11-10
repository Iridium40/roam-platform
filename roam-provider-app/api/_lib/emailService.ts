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
}

