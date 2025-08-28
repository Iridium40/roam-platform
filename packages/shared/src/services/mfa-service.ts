import { createClient } from '@supabase/supabase-js';
import type { 
  MFAMethod, 
  MFAFactor, 
  MFASession, 
  MFASettings, 
  TOTPSetupData,
  MFASetupRequest,
  MFAVerificationRequest,
  MFABackupCodeRequest,
  AuthResult
} from '../types/auth';
import { SupabaseConfigHelper } from './auth';

// TOTP library for generating and validating time-based codes
import { authenticator } from 'otplib';

// QR code generation for TOTP setup
import QRCode from 'qrcode';

// Browser-compatible crypto for generating backup codes
const getRandomBytes = (length: number): Uint8Array => {
  if (typeof window !== 'undefined' && window.crypto) {
    // Browser environment - use Web Crypto API
    return window.crypto.getRandomValues(new Uint8Array(length));
  } else {
    // Node.js environment - use crypto module
    const crypto = require('crypto');
    return crypto.randomBytes(length);
  }
};

export interface MFAServiceInterface {
  // MFA Setup
  setupMFA(userId: string, request: MFASetupRequest): Promise<AuthResult>;
  verifyMFASetup(userId: string, factorId: string, code: string): Promise<AuthResult>;
  
  // MFA Verification
  createMFACallenge(userId: string, factorId: string, ipAddress?: string, userAgent?: string): Promise<AuthResult>;
  verifyMFA(userId: string, request: MFAVerificationRequest, _ipAddress?: string, _userAgent?: string): Promise<AuthResult>;
  verifyBackupCode(userId: string, request: MFABackupCodeRequest, _ipAddress?: string, _userAgent?: string): Promise<AuthResult>;
  
  // MFA Management
  getMFAStatus(userId: string): Promise<AuthResult>;
  getMFAMethods(userId: string): Promise<AuthResult>;
  disableMFA(userId: string, factorId: string): Promise<AuthResult>;
  regenerateBackupCodes(userId: string, factorId: string): Promise<AuthResult>;
  
  // Session Management
  checkMFASession(userId: string, sessionId: string): Promise<AuthResult>;
  createMFASession(userId: string, factorId: string, sessionId: string, ipAddress?: string, userAgent?: string): Promise<AuthResult>;
  invalidateMFASession(userId: string, sessionId: string): Promise<AuthResult>;
  
  // Settings Management
  getMFASettings(userId: string): Promise<AuthResult>;
  updateMFASettings(userId: string, settings: Partial<MFASettings>): Promise<AuthResult>;
}

export class MFAService implements MFAServiceInterface {
  private supabase: any;
  private config: any;

  constructor() {
    this.config = SupabaseConfigHelper.getEnvironmentConfig();
    this.supabase = createClient(this.config.url, this.config.serviceKey);
  }

  // MFA Setup Methods

  async setupMFA(userId: string, request: MFASetupRequest): Promise<AuthResult> {
    try {
      console.log(`Setting up MFA for user ${userId} with method ${request.method}`);

      // Check if user already has MFA enabled
      const existingStatus = await this.getMFAStatus(userId);
      if (existingStatus.success && existingStatus.data?.mfaEnabled) {
        return this.formatErrorResult('MFA is already enabled for this user', 'mfa_already_enabled');
      }

      let factorData: any = {};
      let setupData: TOTPSetupData | undefined;

      switch (request.method) {
        case 'totp':
          const totpResult = await this.setupTOTP(userId, request.friendlyName);
          if (!totpResult.success) return totpResult;
          factorData = totpResult.data.factor;
          setupData = totpResult.data.setupData;
          break;

        case 'sms':
          const smsResult = await this.setupSMS(userId, request.phoneNumber!, request.friendlyName);
          if (!smsResult.success) return smsResult;
          factorData = smsResult.data.factor;
          break;

        case 'email':
          const emailResult = await this.setupEmail(userId, request.email!, request.friendlyName);
          if (!emailResult.success) return emailResult;
          factorData = emailResult.data.factor;
          break;

        default:
          return this.formatErrorResult(`Unsupported MFA method: ${request.method}`, 'unsupported_mfa_method');
      }

      return {
        success: true,
        data: {
          factor: factorData,
          setupData,
          message: `MFA setup initiated for ${request.method} method`
        }
      };

    } catch (error) {
      console.error('Error setting up MFA:', error);
      return this.formatErrorResult('Failed to setup MFA', 'mfa_setup_error', [error]);
    }
  }

  private async setupTOTP(userId: string, friendlyName?: string): Promise<AuthResult> {
    try {
      // Generate TOTP secret
      const secret = authenticator.generateSecret();
      
      // Create Supabase MFA factor
      const { data: factorData, error: factorError } = await this.supabase.auth.admin.createMFAFactor({
        user_id: userId,
        friendly_name: friendlyName || 'Authenticator App',
        factor_type: 'totp'
      });

      if (factorError) {
        return this.formatErrorResult('Failed to create TOTP factor', 'totp_factor_creation_error', [factorError]);
      }

      // Store in our MFA factors table
      const { data: mfaFactor, error: mfaError } = await this.supabase
        .from('mfa_factors')
        .insert({
          user_id: userId,
          factor_id: factorData.id,
          method: 'totp',
          friendly_name: friendlyName || 'Authenticator App',
          secret: secret, // In production, this should be encrypted
          is_primary: true,
          is_verified: false
        })
        .select()
        .single();

      if (mfaError) {
        return this.formatErrorResult('Failed to store MFA factor', 'mfa_factor_storage_error', [mfaError]);
      }

      // Generate QR code
      const otpauth = authenticator.keyuri(userId, 'ROAM Platform', secret);
      const qrCode = await QRCode.toDataURL(otpauth);

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();

      return {
        success: true,
        data: {
          factor: this.mapDatabaseFactorToInterface(mfaFactor),
          setupData: {
            secret,
            qrCode,
            backupCodes
          }
        }
      };

    } catch (error) {
      console.error('Error setting up TOTP:', error);
      return this.formatErrorResult('Failed to setup TOTP', 'totp_setup_error', [error]);
    }
  }

  private async setupSMS(userId: string, phoneNumber: string, friendlyName?: string): Promise<AuthResult> {
    try {
      // Create Supabase MFA factor
      const { data: factorData, error: factorError } = await this.supabase.auth.admin.createMFAFactor({
        user_id: userId,
        friendly_name: friendlyName || 'SMS',
        factor_type: 'sms',
        phone: phoneNumber
      });

      if (factorError) {
        return this.formatErrorResult('Failed to create SMS factor', 'sms_factor_creation_error', [factorError]);
      }

      // Store in our MFA factors table
      const { data: mfaFactor, error: mfaError } = await this.supabase
        .from('mfa_factors')
        .insert({
          user_id: userId,
          factor_id: factorData.id,
          method: 'sms',
          friendly_name: friendlyName || 'SMS',
          is_primary: true,
          is_verified: false
        })
        .select()
        .single();

      if (mfaError) {
        return this.formatErrorResult('Failed to store MFA factor', 'mfa_factor_storage_error', [mfaError]);
      }

      return {
        success: true,
        data: {
          factor: this.mapDatabaseFactorToInterface(mfaFactor)
        }
      };

    } catch (error) {
      console.error('Error setting up SMS:', error);
      return this.formatErrorResult('Failed to setup SMS', 'sms_setup_error', [error]);
    }
  }

  private async setupEmail(userId: string, email: string, friendlyName?: string): Promise<AuthResult> {
    try {
      // Create Supabase MFA factor
      const { data: factorData, error: factorError } = await this.supabase.auth.admin.createMFAFactor({
        user_id: userId,
        friendly_name: friendlyName || 'Email',
        factor_type: 'email',
        email: email
      });

      if (factorError) {
        return this.formatErrorResult('Failed to create email factor', 'email_factor_creation_error', [factorError]);
      }

      // Store in our MFA factors table
      const { data: mfaFactor, error: mfaError } = await this.supabase
        .from('mfa_factors')
        .insert({
          user_id: userId,
          factor_id: factorData.id,
          method: 'email',
          friendly_name: friendlyName || 'Email',
          is_primary: true,
          is_verified: false
        })
        .select()
        .single();

      if (mfaError) {
        return this.formatErrorResult('Failed to store MFA factor', 'mfa_factor_storage_error', [mfaError]);
      }

      return {
        success: true,
        data: {
          factor: this.mapDatabaseFactorToInterface(mfaFactor)
        }
      };

    } catch (error) {
      console.error('Error setting up email:', error);
      return this.formatErrorResult('Failed to setup email', 'email_setup_error', [error]);
    }
  }

  async verifyMFASetup(userId: string, factorId: string, code: string): Promise<AuthResult> {
    try {
      console.log(`Verifying MFA setup for user ${userId}, factor ${factorId}`);

      // Get the MFA factor
      const { data: factor, error: factorError } = await this.supabase
        .from('mfa_factors')
        .select('*')
        .eq('user_id', userId)
        .eq('id', factorId)
        .single();

      if (factorError || !factor) {
        return this.formatErrorResult('MFA factor not found', 'mfa_factor_not_found');
      }

      // Verify the code based on method
      let isValid = false;
      switch (factor.method) {
        case 'totp':
          isValid = authenticator.verify({ token: code, secret: factor.secret });
          break;
        case 'sms':
        case 'email':
          // For SMS/email, we need to check against the challenge
          const { data: challenge } = await this.supabase
            .from('mfa_challenges')
            .select('*')
            .eq('factor_id', factorId)
            .eq('code', code)
            .eq('verified_at', null)
            .gt('expires_at', new Date().toISOString())
            .single();
          
          isValid = !!challenge;
          break;
        default:
          return this.formatErrorResult(`Unsupported MFA method: ${factor.method}`, 'unsupported_mfa_method');
      }

      if (!isValid) {
        // Increment verification attempts
        await this.supabase
          .from('mfa_factors')
          .update({ 
            verification_attempts: factor.verification_attempts + 1,
            locked_until: factor.verification_attempts + 1 >= factor.max_attempts ? 
              new Date(Date.now() + 15 * 60 * 1000).toISOString() : null // Lock for 15 minutes
          })
          .eq('id', factorId);

        return this.formatErrorResult('Invalid verification code', 'invalid_mfa_code');
      }

      // Mark factor as verified
      await this.supabase
        .from('mfa_factors')
        .update({ 
          is_verified: true,
          verification_attempts: 0,
          locked_until: null
        })
        .eq('id', factorId);

      // Enable MFA for user
      await this.supabase
        .from('mfa_settings')
        .upsert({
          user_id: userId,
          mfa_enabled: true,
          mfa_required: true
        });

      return {
        success: true,
        data: {
          message: 'MFA setup verified successfully'
        }
      };

    } catch (error) {
      console.error('Error verifying MFA setup:', error);
      return this.formatErrorResult('Failed to verify MFA setup', 'mfa_verification_error', [error]);
    }
  }

  // MFA Verification Methods

  async createMFACallenge(userId: string, factorId: string, ipAddress?: string, userAgent?: string): Promise<AuthResult> {
    try {
      console.log(`Creating MFA challenge for user ${userId}, factor ${factorId}`);

      // Get the MFA factor
      const { data: factor, error: factorError } = await this.supabase
        .from('mfa_factors')
        .select('*')
        .eq('user_id', userId)
        .eq('id', factorId)
        .single();

      if (factorError || !factor) {
        return this.formatErrorResult('MFA factor not found', 'mfa_factor_not_found');
      }

      // Check if factor is locked
      if (factor.locked_until && new Date(factor.locked_until) > new Date()) {
        return this.formatErrorResult('MFA factor is temporarily locked', 'mfa_factor_locked');
      }

      let challengeData: any = {};

      switch (factor.method) {
        case 'totp':
          // For TOTP, no challenge needed - user generates code from app
          break;

        case 'sms':
          // Send SMS code
          const smsCode = this.generateCode(6);
          challengeData = await this.createChallenge(userId, factorId, 'sms', smsCode, ipAddress, userAgent);
          // TODO: Integrate with SMS service to send the code
          break;

        case 'email':
          // Send email code
          const emailCode = this.generateCode(6);
          challengeData = await this.createChallenge(userId, factorId, 'email', emailCode, ipAddress, userAgent);
          // TODO: Integrate with email service to send the code
          break;

        default:
          return this.formatErrorResult(`Unsupported MFA method: ${factor.method}`, 'unsupported_mfa_method');
      }

      return {
        success: true,
        data: {
          method: factor.method,
          challenge: challengeData,
          message: `MFA challenge created for ${factor.method} method`
        }
      };

    } catch (error) {
      console.error('Error creating MFA challenge:', error);
      return this.formatErrorResult('Failed to create MFA challenge', 'mfa_challenge_creation_error', [error]);
    }
  }

  private async createChallenge(userId: string, factorId: string, method: MFAMethod, code: string, ipAddress?: string, userAgent?: string): Promise<any> {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const { data: challenge, error } = await this.supabase
      .from('mfa_challenges')
      .insert({
        user_id: userId,
        challenge_id: crypto.randomUUID(),
        factor_id: factorId,
        method,
        code,
        expires_at: expiresAt.toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return challenge;
  }

  async verifyMFA(userId: string, request: MFAVerificationRequest, _ipAddress?: string, _userAgent?: string): Promise<AuthResult> {
    try {
      console.log(`Verifying MFA for user ${userId}, factor ${request.factorId}`);

      // Get the MFA factor
      const { data: factor, error: factorError } = await this.supabase
        .from('mfa_factors')
        .select('*')
        .eq('user_id', userId)
        .eq('id', request.factorId)
        .single();

      if (factorError || !factor) {
        return this.formatErrorResult('MFA factor not found', 'mfa_factor_not_found');
      }

      // Check if factor is locked
      if (factor.locked_until && new Date(factor.locked_until) > new Date()) {
        return this.formatErrorResult('MFA factor is temporarily locked', 'mfa_factor_locked');
      }

      let isValid = false;

      switch (factor.method) {
        case 'totp':
          isValid = authenticator.verify({ token: request.code, secret: factor.secret });
          break;

        case 'sms':
        case 'email':
          // Check against challenge
          const { data: challenge } = await this.supabase
            .from('mfa_challenges')
            .select('*')
            .eq('factor_id', request.factorId)
            .eq('code', request.code)
            .eq('verified_at', null)
            .gt('expires_at', new Date().toISOString())
            .single();
          
          isValid = !!challenge;

          if (isValid && challenge) {
            // Mark challenge as verified
            await this.supabase
              .from('mfa_challenges')
              .update({ verified_at: new Date().toISOString() })
              .eq('id', challenge.id);
          }
          break;

        default:
          return this.formatErrorResult(`Unsupported MFA method: ${factor.method}`, 'unsupported_mfa_method');
      }

      if (!isValid) {
        // Increment verification attempts
        await this.supabase
          .from('mfa_factors')
          .update({ 
            verification_attempts: factor.verification_attempts + 1,
            locked_until: factor.verification_attempts + 1 >= factor.max_attempts ? 
              new Date(Date.now() + 15 * 60 * 1000).toISOString() : null
          })
          .eq('id', request.factorId);

        return this.formatErrorResult('Invalid verification code', 'invalid_mfa_code');
      }

      // Reset verification attempts on successful verification
      await this.supabase
        .from('mfa_factors')
        .update({ 
          verification_attempts: 0,
          locked_until: null,
          last_used_at: new Date().toISOString()
        })
        .eq('id', request.factorId);

      return {
        success: true,
        data: {
          message: 'MFA verification successful'
        }
      };

    } catch (error) {
      console.error('Error verifying MFA:', error);
      return this.formatErrorResult('Failed to verify MFA', 'mfa_verification_error', [error]);
    }
  }

  async verifyBackupCode(userId: string, request: MFABackupCodeRequest, _ipAddress?: string, _userAgent?: string): Promise<AuthResult> {
    try {
      console.log(`Verifying backup code for user ${userId}, factor ${request.factorId}`);

      // Get the MFA factor
      const { data: factor, error: factorError } = await this.supabase
        .from('mfa_factors')
        .select('*')
        .eq('user_id', userId)
        .eq('id', request.factorId)
        .single();

      if (factorError || !factor) {
        return this.formatErrorResult('MFA factor not found', 'mfa_factor_not_found');
      }

      // Check if backup codes are enabled
      if (!factor.backup_codes || factor.backup_codes.length === 0) {
        return this.formatErrorResult('Backup codes not available', 'backup_codes_not_available');
      }

      // Verify backup code
      const isValid = factor.backup_codes.includes(request.backupCode);

      if (!isValid) {
        return this.formatErrorResult('Invalid backup code', 'invalid_backup_code');
      }

      // Remove used backup code
      const updatedBackupCodes = factor.backup_codes.filter((code: string) => code !== request.backupCode);
      await this.supabase
        .from('mfa_factors')
        .update({ backup_codes: updatedBackupCodes })
        .eq('id', request.factorId);

      return {
        success: true,
        data: {
          message: 'Backup code verification successful'
        }
      };

    } catch (error) {
      console.error('Error verifying backup code:', error);
      return this.formatErrorResult('Failed to verify backup code', 'backup_code_verification_error', [error]);
    }
  }

  // MFA Management Methods

  async getMFAStatus(userId: string): Promise<AuthResult> {
    try {
      const { data, error } = await this.supabase.rpc('get_user_mfa_status', {
        check_user_id: userId
      });

      if (error) {
        return this.formatErrorResult('Failed to get MFA status', 'mfa_status_error', [error]);
      }

      return {
        success: true,
        data: data[0] || {
          mfa_enabled: false,
          mfa_required: true,
          backup_codes_enabled: true,
          backup_codes_count: 0
        }
      };

    } catch (error) {
      console.error('Error getting MFA status:', error);
      return this.formatErrorResult('Failed to get MFA status', 'mfa_status_error', [error]);
    }
  }

  async getMFAMethods(userId: string): Promise<AuthResult> {
    try {
      const { data: factors, error } = await this.supabase
        .from('mfa_factors')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        return this.formatErrorResult('Failed to get MFA methods', 'mfa_methods_error', [error]);
      }

      return {
        success: true,
        data: factors.map((factor: any) => this.mapDatabaseFactorToInterface(factor))
      };

    } catch (error) {
      console.error('Error getting MFA methods:', error);
      return this.formatErrorResult('Failed to get MFA methods', 'mfa_methods_error', [error]);
    }
  }

  async disableMFA(userId: string, factorId: string): Promise<AuthResult> {
    try {
      // Delete the factor from Supabase
      await this.supabase.auth.admin.deleteMFAFactor(factorId);

      // Delete from our MFA factors table
      const { error } = await this.supabase
        .from('mfa_factors')
        .delete()
        .eq('user_id', userId)
        .eq('id', factorId);

      if (error) {
        return this.formatErrorResult('Failed to disable MFA', 'mfa_disable_error', [error]);
      }

      // Check if user has any remaining factors
      const { data: remainingFactors } = await this.supabase
        .from('mfa_factors')
        .select('id')
        .eq('user_id', userId);

      // If no factors remain, disable MFA
      if (!remainingFactors || remainingFactors.length === 0) {
        await this.supabase
          .from('mfa_settings')
          .update({ mfa_enabled: false })
          .eq('user_id', userId);
      }

      return {
        success: true,
        data: {
          message: 'MFA disabled successfully'
        }
      };

    } catch (error) {
      console.error('Error disabling MFA:', error);
      return this.formatErrorResult('Failed to disable MFA', 'mfa_disable_error', [error]);
    }
  }

  async regenerateBackupCodes(userId: string, factorId: string): Promise<AuthResult> {
    try {
      const backupCodes = this.generateBackupCodes();

      const { error } = await this.supabase
        .from('mfa_factors')
        .update({ backup_codes: backupCodes })
        .eq('user_id', userId)
        .eq('id', factorId);

      if (error) {
        return this.formatErrorResult('Failed to regenerate backup codes', 'backup_codes_regeneration_error', [error]);
      }

      return {
        success: true,
        data: {
          backupCodes,
          message: 'Backup codes regenerated successfully'
        }
      };

    } catch (error) {
      console.error('Error regenerating backup codes:', error);
      return this.formatErrorResult('Failed to regenerate backup codes', 'backup_codes_regeneration_error', [error]);
    }
  }

  // Session Management Methods

  async checkMFASession(userId: string, sessionId: string): Promise<AuthResult> {
    try {
      const { data, error } = await this.supabase.rpc('has_mfa_completed_for_session', {
        check_user_id: userId,
        check_session_id: sessionId
      });

      if (error) {
        return this.formatErrorResult('Failed to check MFA session', 'mfa_session_check_error', [error]);
      }

      return {
        success: true,
        data: {
          mfaCompleted: data
        }
      };

    } catch (error) {
      console.error('Error checking MFA session:', error);
      return this.formatErrorResult('Failed to check MFA session', 'mfa_session_check_error', [error]);
    }
  }

  async createMFASession(userId: string, factorId: string, sessionId: string, ipAddress?: string, userAgent?: string): Promise<AuthResult> {
    try {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      const { data: session, error } = await this.supabase
        .from('mfa_sessions')
        .insert({
          user_id: userId,
          session_id: sessionId,
          factor_id: factorId,
          mfa_completed_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          ip_address: ipAddress,
          user_agent: userAgent
        })
        .select()
        .single();

      if (error) {
        return this.formatErrorResult('Failed to create MFA session', 'mfa_session_creation_error', [error]);
      }

      return {
        success: true,
        data: {
          session: this.mapDatabaseSessionToInterface(session)
        }
      };

    } catch (error) {
      console.error('Error creating MFA session:', error);
      return this.formatErrorResult('Failed to create MFA session', 'mfa_session_creation_error', [error]);
    }
  }

  async invalidateMFASession(userId: string, sessionId: string): Promise<AuthResult> {
    try {
      const { error } = await this.supabase
        .from('mfa_sessions')
        .delete()
        .eq('user_id', userId)
        .eq('session_id', sessionId);

      if (error) {
        return this.formatErrorResult('Failed to invalidate MFA session', 'mfa_session_invalidation_error', [error]);
      }

      return {
        success: true,
        data: {
          message: 'MFA session invalidated successfully'
        }
      };

    } catch (error) {
      console.error('Error invalidating MFA session:', error);
      return this.formatErrorResult('Failed to invalidate MFA session', 'mfa_session_invalidation_error', [error]);
    }
  }

  // Settings Management Methods

  async getMFASettings(userId: string): Promise<AuthResult> {
    try {
      const { data: settings, error } = await this.supabase
        .from('mfa_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        return this.formatErrorResult('Failed to get MFA settings', 'mfa_settings_error', [error]);
      }

      return {
        success: true,
        data: settings ? this.mapDatabaseSettingsToInterface(settings) : {
          userId,
          mfaEnabled: false,
          mfaRequired: true,
          rememberDeviceDays: 30,
          backupCodesEnabled: true,
          backupCodesCount: 10,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Error getting MFA settings:', error);
      return this.formatErrorResult('Failed to get MFA settings', 'mfa_settings_error', [error]);
    }
  }

  async updateMFASettings(userId: string, settings: Partial<MFASettings>): Promise<AuthResult> {
    try {
      const { data: updatedSettings, error } = await this.supabase
        .from('mfa_settings')
        .upsert({
          user_id: userId,
          ...this.mapInterfaceSettingsToDatabase(settings)
        })
        .select()
        .single();

      if (error) {
        return this.formatErrorResult('Failed to update MFA settings', 'mfa_settings_update_error', [error]);
      }

      return {
        success: true,
        data: {
          settings: this.mapDatabaseSettingsToInterface(updatedSettings),
          message: 'MFA settings updated successfully'
        }
      };

    } catch (error) {
      console.error('Error updating MFA settings:', error);
      return this.formatErrorResult('Failed to update MFA settings', 'mfa_settings_update_error', [error]);
    }
  }

  // Helper Methods

  private generateCode(length: number): string {
    return Math.random().toString().substring(2, 2 + length);
  }

  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const randomBytes = getRandomBytes(4);
      const hexString = Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
      codes.push(hexString);
    }
    return codes;
  }

  private mapDatabaseFactorToInterface(dbFactor: any): MFAFactor {
    return {
      id: dbFactor.id,
      userId: dbFactor.user_id,
      factorId: dbFactor.factor_id,
      method: dbFactor.method,
      friendlyName: dbFactor.friendly_name,
      isPrimary: dbFactor.is_primary,
      isVerified: dbFactor.is_verified,
      verificationAttempts: dbFactor.verification_attempts,
      maxAttempts: dbFactor.max_attempts,
      lockedUntil: dbFactor.locked_until,
      lastUsedAt: dbFactor.last_used_at,
      createdAt: dbFactor.created_at,
      updatedAt: dbFactor.updated_at
    };
  }

  private mapDatabaseSessionToInterface(dbSession: any): MFASession {
    return {
      id: dbSession.id,
      userId: dbSession.user_id,
      sessionId: dbSession.session_id,
      factorId: dbSession.factor_id,
      mfaCompletedAt: dbSession.mfa_completed_at,
      expiresAt: dbSession.expires_at,
      ipAddress: dbSession.ip_address,
      userAgent: dbSession.user_agent,
      createdAt: dbSession.created_at
    };
  }

  private mapDatabaseSettingsToInterface(dbSettings: any): MFASettings {
    return {
      id: dbSettings.id,
      userId: dbSettings.user_id,
      mfaEnabled: dbSettings.mfa_enabled,
      mfaRequired: dbSettings.mfa_required,
      rememberDeviceDays: dbSettings.remember_device_days,
      backupCodesEnabled: dbSettings.backup_codes_enabled,
      backupCodesCount: dbSettings.backup_codes_count,
      createdAt: dbSettings.created_at,
      updatedAt: dbSettings.updated_at
    };
  }

  private mapInterfaceSettingsToDatabase(settings: Partial<MFASettings>): any {
    const mapped: any = {};
    if (settings.mfaEnabled !== undefined) mapped.mfa_enabled = settings.mfaEnabled;
    if (settings.mfaRequired !== undefined) mapped.mfa_required = settings.mfaRequired;
    if (settings.rememberDeviceDays !== undefined) mapped.remember_device_days = settings.rememberDeviceDays;
    if (settings.backupCodesEnabled !== undefined) mapped.backup_codes_enabled = settings.backupCodesEnabled;
    if (settings.backupCodesCount !== undefined) mapped.backup_codes_count = settings.backupCodesCount;
    return mapped;
  }

  private formatErrorResult(message: string, code: string, details?: any[]): AuthResult {
    return {
      success: false,
      error: message,
      code,
      details
    };
  }
}
