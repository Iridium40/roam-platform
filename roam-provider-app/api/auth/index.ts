import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createAuthAPI, SupabaseAuthService } from '@roam/shared';
// Correct path to server email service (was pointing to non-existent api/services path)
import { EmailService } from '../../server/services/emailService';

// Create email service adapter for the shared auth service
class ProviderEmailService {
  async sendWelcomeEmail(email: string, firstName: string): Promise<boolean> {
    try {
      return await EmailService.sendWelcomeEmail(email, firstName);
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return false;
    }
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
    // Implement password reset email logic
    console.log(`Password reset email would be sent to ${email} with token ${token}`);
    return true;
  }

  async sendEmailVerification(email: string, token: string): Promise<boolean> {
    // Implement email verification logic
    console.log(`Email verification would be sent to ${email} with token ${token}`);
    return true;
  }
}

// Create auth service with provider-specific email service
const emailService = new ProviderEmailService();
const authService = new SupabaseAuthService(emailService);
const api = createAuthAPI(authService);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return api.handleRequest(req, res);
}
