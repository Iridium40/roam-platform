import type { 
  LoginRequest, 
  RegisterRequest 
} from '../types/api';
import type { 
  SupabaseConfig, 
  AuthResult, 
  UserProfile, 
  AuthValidationResult,
  AuthUserRole,
  AuthProvider
} from '../types/auth';

// Re-export types for consumers
export type { AuthResult, UserProfile, AuthValidationResult, AuthUserRole, AuthProvider } from '../types/auth';

// Authentication service interface
export interface AuthService {
  // Core authentication methods
  signUp(data: RegisterRequest): Promise<AuthResult>;
  signIn(data: LoginRequest): Promise<AuthResult>;
  signOut(): Promise<AuthResult>;
  refreshToken(): Promise<AuthResult>;
  
  // User management
  getCurrentUser(): Promise<AuthResult>;
  updateUser(userId: string, updates: Partial<UserProfile>): Promise<AuthResult>;
  deleteUser(userId: string): Promise<AuthResult>;
  resetPassword(email: string): Promise<AuthResult>;
  confirmPasswordReset(token: string, newPassword: string): Promise<AuthResult>;
  
  // Profile management
  createUserProfile(userId: string, profile: UserProfile): Promise<AuthResult>;
  getUserProfile(userId: string): Promise<AuthResult>;
  updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<AuthResult>;
  
  // Role-based operations
  assignUserRole(userId: string, role: AuthUserRole): Promise<AuthResult>;
  getUserRoles(userId: string): Promise<AuthResult>;
  hasPermission(userId: string, permission: string): Promise<AuthResult>;
  
  // Validation
  validateSignupData(data: RegisterRequest): AuthValidationResult;
  validateLoginData(data: LoginRequest): AuthValidationResult;
  validatePassword(password: string): AuthValidationResult;
  validateEmail(email: string): AuthValidationResult;
  
  // Social auth
  signInWithProvider(provider: AuthProvider): Promise<AuthResult>;
  linkProvider(userId: string, provider: AuthProvider): Promise<AuthResult>;
  unlinkProvider(userId: string, provider: AuthProvider): Promise<AuthResult>;
}

// Base authentication service implementation
export abstract class BaseAuthService implements AuthService {
  protected config: SupabaseConfig;
  protected supabase: any; // Supabase client instance

  constructor(config: SupabaseConfig) {
    this.config = config;
    this.initializeClient();
  }

  protected abstract initializeClient(): void;

  // Core authentication implementations
  abstract signUp(data: RegisterRequest): Promise<AuthResult>;
  abstract signIn(data: LoginRequest): Promise<AuthResult>;
  abstract signOut(): Promise<AuthResult>;
  abstract refreshToken(): Promise<AuthResult>;
  
  // User management implementations
  abstract getCurrentUser(): Promise<AuthResult>;
  abstract updateUser(userId: string, updates: Partial<UserProfile>): Promise<AuthResult>;
  abstract deleteUser(userId: string): Promise<AuthResult>;
  abstract resetPassword(email: string): Promise<AuthResult>;
  abstract confirmPasswordReset(token: string, newPassword: string): Promise<AuthResult>;
  
  // Profile management implementations
  abstract createUserProfile(userId: string, profile: UserProfile): Promise<AuthResult>;
  abstract getUserProfile(userId: string): Promise<AuthResult>;
  abstract updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<AuthResult>;
  
  // Role-based implementations
  abstract assignUserRole(userId: string, role: AuthUserRole): Promise<AuthResult>;
  abstract getUserRoles(userId: string): Promise<AuthResult>;
  abstract hasPermission(userId: string, permission: string): Promise<AuthResult>;
  
  // Social auth implementations
  abstract signInWithProvider(provider: AuthProvider): Promise<AuthResult>;
  abstract linkProvider(userId: string, provider: AuthProvider): Promise<AuthResult>;
  abstract unlinkProvider(userId: string, provider: AuthProvider): Promise<AuthResult>;

  // Validation implementations (can be shared)
  validateSignupData(data: RegisterRequest): AuthValidationResult {
    const errors: string[] = [];

    // Required fields validation
    if (!data.email) errors.push('Email is required');
    if (!data.password) errors.push('Password is required');
    if (!data.firstName) errors.push('First name is required');
    if (!data.lastName) errors.push('Last name is required');

    // Email validation
    const emailValidation = this.validateEmail(data.email);
    if (!emailValidation.isValid) {
      errors.push(...emailValidation.errors);
    }

    // Password validation
    const passwordValidation = this.validatePassword(data.password);
    if (!passwordValidation.isValid) {
      errors.push(...passwordValidation.errors);
    }

    // Age validation (if dateOfBirth provided)
    if (data.dateOfBirth) {
      const age = this.calculateAge(data.dateOfBirth);
      if (age < 18) {
        errors.push('You must be at least 18 years old to register');
      }
    }

    // Terms agreement validation
    if (!data.agreedToTerms) {
      errors.push('You must agree to the Terms of Service');
    }

    // Provider-specific validations
    if (data.userType === 'provider') {
      if (!data.agreedToBackground) {
        errors.push('You must consent to background check');
      }
      if (!data.phone) {
        errors.push('Phone number is required for providers');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  validateLoginData(data: LoginRequest): AuthValidationResult {
    const errors: string[] = [];

    if (!data.email) errors.push('Email is required');
    if (!data.password) errors.push('Password is required');

    const emailValidation = this.validateEmail(data.email);
    if (!emailValidation.isValid) {
      errors.push(...emailValidation.errors);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  validatePassword(password: string): AuthValidationResult {
    const errors: string[] = [];

    if (!password) {
      errors.push('Password is required');
      return { isValid: false, errors };
    }

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/(?=.*\d)/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/(?=.*[@$!%*?&])/.test(password)) {
      errors.push('Password must contain at least one special character (@$!%*?&)');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  validateEmail(email: string): AuthValidationResult {
    const errors: string[] = [];

    if (!email) {
      errors.push('Email is required');
      return { isValid: false, errors };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Invalid email format');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Helper methods
  protected formatSuccessResult(data?: any, message?: string): AuthResult {
    return {
      success: true,
      data,
      message: message || 'Operation completed successfully'
    };
  }

  protected formatErrorResult(error: string, code?: string, details?: any): AuthResult {
    return {
      success: false,
      error,
      code,
      details
    };
  }

  protected handleAuthError(error: any): AuthResult {
    console.error('Auth error:', error);

    // Handle specific Supabase auth errors
    if (error.code) {
      switch (error.code) {
        case 'email_exists':
        case 'user_already_registered':
          return this.formatErrorResult(
            'An account with this email already exists',
            'email_exists'
          );
        
        case 'invalid_credentials':
          return this.formatErrorResult(
            'Invalid email or password',
            'invalid_credentials'
          );
        
        case 'email_not_confirmed':
          return this.formatErrorResult(
            'Please confirm your email address before signing in',
            'email_not_confirmed'
          );
        
        case 'weak_password':
          return this.formatErrorResult(
            'Password is too weak. Please choose a stronger password',
            'weak_password'
          );
        
        case 'invalid_email':
          return this.formatErrorResult(
            'Invalid email address',
            'invalid_email'
          );
        
        default:
          return this.formatErrorResult(
            error.message || 'Authentication failed',
            error.code || 'unknown_error',
            error
          );
      }
    }

    return this.formatErrorResult(
      error.message || 'Authentication failed',
      'unknown_error',
      error
    );
  }

  protected calculateAge(dateOfBirth: string): number {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  protected createUserMetadata(userData: RegisterRequest): Record<string, any> {
    return {
      first_name: userData.firstName,
      last_name: userData.lastName,
      phone: userData.phone,
      date_of_birth: userData.dateOfBirth,
      agreed_to_terms: userData.agreedToTerms,
      agreed_to_background: userData.agreedToBackground,
      user_type: userData.userType,
      onboarding_step: 'profile_completion',
      created_at: new Date().toISOString(),
    };
  }

  protected sanitizeUserData(userData: any): Partial<UserProfile> {
    const { password, agreedToTerms, agreedToBackground, ...sanitizedData } = userData;
    return sanitizedData;
  }

  protected generateUsername(_email: string, firstName: string, lastName: string): string {
    const baseUsername = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
    const timestamp = Date.now().toString().slice(-4);
    return `${baseUsername}.${timestamp}`;
  }

  protected validateUserType(userType: string): boolean {
    return ['customer', 'provider', 'admin'].includes(userType);
  }

  protected getDefaultUserRole(userType: string): AuthUserRole {
    switch (userType) {
      case 'admin':
        return 'admin';
      case 'provider':
        return 'provider';
      case 'customer':
      default:
        return 'customer';
    }
  }
}

// Supabase configuration helper
import { env } from '../config/environment';

export class SupabaseConfigHelper {
  static validateConfig(config: SupabaseConfig): boolean {
    return !!(config.url && config.serviceKey);
  }

  static fromEnvironment(): SupabaseConfig {
    const url = env.supabase.url;
    const serviceKey = env.supabase.serviceRoleKey;
    const anonKey = env.supabase.anonKey;

    if (!url || !serviceKey) {
      throw new Error('Missing required Supabase environment variables');
    }

    return {
      url,
      serviceKey,
      anonKey
    };
  }

  static getEnvironmentConfig(): SupabaseConfig {
    try {
      return this.fromEnvironment();
    } catch (error) {
      console.error('Failed to load Supabase configuration:', error);
      throw error;
    }
  }
}

// Auth action handler for API endpoints
export class AuthActionHandler {
  private service: AuthService;

  constructor(service: AuthService) {
    this.service = service;
  }

  async handleAction(action: string, data: any): Promise<AuthResult> {
    try {
      switch (action) {
        case 'signup':
          return await this.service.signUp(data);

        case 'signin':
        case 'login':
          return await this.service.signIn(data);

        case 'signout':
        case 'logout':
          return await this.service.signOut();

        case 'refresh_token':
          return await this.service.refreshToken();

        case 'get_current_user':
          return await this.service.getCurrentUser();

        case 'update_user':
          return await this.service.updateUser(data.userId, data.updates);

        case 'delete_user':
          return await this.service.deleteUser(data.userId);

        case 'reset_password':
          return await this.service.resetPassword(data.email);

        case 'confirm_password_reset':
          return await this.service.confirmPasswordReset(data.token, data.newPassword);

        case 'create_user_profile':
          return await this.service.createUserProfile(data.userId, data.profile);

        case 'get_user_profile':
          return await this.service.getUserProfile(data.userId);

        case 'update_user_profile':
          return await this.service.updateUserProfile(data.userId, data.updates);

        case 'assign_user_role':
          return await this.service.assignUserRole(data.userId, data.role);

        case 'get_user_roles':
          return await this.service.getUserRoles(data.userId);

        case 'has_permission':
          return await this.service.hasPermission(data.userId, data.permission);

        case 'signin_with_provider':
          return await this.service.signInWithProvider(data.provider);

        case 'link_provider':
          return await this.service.linkProvider(data.userId, data.provider);

        case 'unlink_provider':
          return await this.service.unlinkProvider(data.userId, data.provider);

        case 'validate_signup':
          return {
            success: true,
            data: this.service.validateSignupData(data)
          };

        case 'validate_login':
          return {
            success: true,
            data: this.service.validateLoginData(data)
          };

        default:
          return {
            success: false,
            error: `Unknown action: ${action}`
          };
      }
    } catch (error) {
      console.error(`Error handling auth action ${action}:`, error);
      return {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
