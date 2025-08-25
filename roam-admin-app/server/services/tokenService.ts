import jwt from 'jsonwebtoken';

export interface Phase2ApprovalToken {
  business_id: string;
  user_id: string;
  application_id: string;
  issued_at: number;
  expires_at: number;
  phase: "phase2";
  step?: string; // Optional: resume at specific step
}

export class TokenService {
  private static getJWTSecret(): string {
    const secret = process.env.JWT_SECRET || process.env.VITE_JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    return secret;
  }

  private static getFrontendURL(): string {
    return process.env.FRONTEND_URL || process.env.VITE_FRONTEND_URL || 'https://roamyourbestlife.com';
  }

  /**
   * Generate Phase 2 approval token for business onboarding
   */
  static generatePhase2Token(
    businessId: string, 
    userId: string, 
    applicationId?: string
  ): string {
    const payload: Phase2ApprovalToken = {
      business_id: businessId,
      user_id: userId,
      application_id: applicationId || `APP-${businessId.substring(0, 8).toUpperCase()}`,
      issued_at: Date.now(),
      expires_at: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
      phase: "phase2"
    };

    try {
      return jwt.sign(payload, this.getJWTSecret(), { 
        expiresIn: '7d',
        issuer: 'roam-admin',
        audience: 'roam-provider-app'
      });
    } catch (error) {
      console.error('Error generating Phase 2 token:', error);
      throw new Error('Failed to generate secure onboarding link');
    }
  }

  /**
   * Generate the complete Phase 2 onboarding URL
   */
  static generatePhase2URL(
    businessId: string,
    userId: string,
    applicationId?: string
  ): string {
    const token = this.generatePhase2Token(businessId, userId, applicationId);
    const frontendURL = this.getFrontendURL();
    
    return `${frontendURL}/provider-onboarding/phase2?token=${token}`;
  }

  /**
   * Verify and decode Phase 2 token (for validation API)
   */
  static verifyPhase2Token(token: string): Phase2ApprovalToken {
    try {
      const decoded = jwt.verify(token, this.getJWTSecret(), {
        issuer: 'roam-admin',
        audience: 'roam-provider-app'
      }) as Phase2ApprovalToken;

      // Additional validation
      if (decoded.phase !== 'phase2') {
        throw new Error('Invalid token type');
      }

      if (decoded.expires_at < Date.now()) {
        throw new Error('Token expired');
      }

      return decoded;
    } catch (error) {
      console.error('Token verification error:', error);
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Get token expiration date for display in emails
   */
  static getTokenExpirationDate(): string {
    const expirationDate = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000));
    return expirationDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}
