// Supabase configuration
export interface SupabaseConfig {
  url: string;
  serviceKey: string;
  anonKey?: string;
}

// Authentication result types
export interface AuthResult {
  success: boolean;
  data?: any;
  error?: string;
  code?: string;
  message?: string;
  details?: any;
}

// MFA Types
export type MFAMethod = 'totp' | 'sms' | 'email' | 'backup';
export type MFAStatusType = 'pending' | 'active' | 'disabled' | 'locked';

export interface MFAFactor {
  id: string;
  userId: string;
  factorId: string;
  method: MFAMethod;
  friendlyName?: string;
  isPrimary: boolean;
  isVerified: boolean;
  verificationAttempts: number;
  maxAttempts: number;
  lockedUntil?: string;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MFAChallenge {
  id: string;
  userId: string;
  challengeId: string;
  factorId: string;
  method: MFAMethod;
  code: string;
  expiresAt: string;
  verifiedAt?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface MFASession {
  id: string;
  userId: string;
  sessionId: string;
  factorId: string;
  mfaCompletedAt: string;
  expiresAt: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface MFASettings {
  id: string;
  userId: string;
  mfaEnabled: boolean;
  mfaRequired: boolean;
  rememberDeviceDays: number;
  backupCodesEnabled: boolean;
  backupCodesCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MFAStatus {
  mfaEnabled: boolean;
  mfaRequired: boolean;
  primaryFactorId?: string;
  primaryMethod?: MFAMethod;
  backupCodesEnabled: boolean;
  backupCodesCount: number;
}

export interface TOTPSetupData {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface MFASetupRequest {
  method: MFAMethod;
  friendlyName?: string;
  phoneNumber?: string; // For SMS method
  email?: string; // For email method
}

export interface MFAVerificationRequest {
  factorId: string;
  code: string;
  rememberDevice?: boolean;
}

export interface MFABackupCodeRequest {
  factorId: string;
  backupCode: string;
}

// User profile types
export interface UserProfile {
  id?: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: string;
  avatar?: string;
  isActive: boolean;
  isVerified: boolean;
  userType: 'customer' | 'provider' | 'admin';
  onboardingStep: OnboardingStep;
  preferences?: UserPreferences;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// User preferences
export interface UserPreferences {
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'private' | 'friends';
    showEmail: boolean;
    showPhone: boolean;
  };
  communication: {
    preferredMethod: 'email' | 'sms' | 'push';
    quietHours: {
      enabled: boolean;
      start: string;
      end: string;
    };
  };
}

// Onboarding steps
export type OnboardingStep = 
  | 'email_verification'
  | 'profile_completion'
  | 'business_info'
  | 'service_setup'
  | 'payment_setup'
  | 'verification'
  | 'completed';

// User roles and permissions (extending the database UserRole)
export type AuthUserRole = 'customer' | 'provider' | 'admin' | 'moderator';

export interface UserRoleAssignment {
  userId: string;
  role: AuthUserRole;
  assignedBy: string;
  assignedAt: string;
  expiresAt?: string;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
}

export interface RolePermission {
  role: AuthUserRole;
  permissions: Permission[];
}

// Authentication providers
export type AuthProvider = 
  | 'google'
  | 'facebook'
  | 'apple'
  | 'github'
  | 'twitter';

// Session management
export interface SessionConfig {
  maxConcurrentSessions: number;
  sessionTimeoutMinutes: number;
  idleTimeoutMinutes: number;
  requireReauthForSensitive: boolean;
}

export interface SessionInfo {
  id: string;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  lastActivity: string;
  expiresAt: string;
  isActive: boolean;
}

// Validation types
export interface AuthValidationResult {
  isValid: boolean;
  errors: string[];
}

// API request types
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: string;
  userType: 'customer' | 'provider';
  agreedToTerms: boolean;
  agreedToBackground?: boolean; // For providers
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  newPassword: string;
}

export interface ProfileUpdateRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  preferences?: Partial<UserPreferences>;
}

export interface RoleAssignmentRequest {
  userId: string;
  role: AuthUserRole;
  businessId?: string;
  locationId?: string;
  expiresAt?: string;
}

// Response types
export interface LoginResponse {
  user: UserProfile;
  session: SessionInfo;
  mfaRequired: boolean;
  mfaStatus?: MFAStatus;
}

export interface MFASetupResponse {
  factor: MFAFactor;
  setupData?: TOTPSetupData; // For TOTP method
  message: string;
}

export interface MFAVerificationResponse {
  success: boolean;
  session?: SessionInfo;
  message: string;
}

// Error types
export interface AuthError {
  code: string;
  message: string;
  details?: any;
}

// Database types for MFA
export interface DatabaseMFATypes {
  mfa_factors: {
    Row: {
      id: string;
      user_id: string;
      factor_id: string;
      method: MFAMethod;
      friendly_name?: string;
      secret?: string;
      backup_codes?: string[];
      is_primary: boolean;
      is_verified: boolean;
      verification_attempts: number;
      max_attempts: number;
      locked_until?: string;
      last_used_at?: string;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      user_id: string;
      factor_id: string;
      method: MFAMethod;
      friendly_name?: string;
      secret?: string;
      backup_codes?: string[];
      is_primary?: boolean;
      is_verified?: boolean;
      verification_attempts?: number;
      max_attempts?: number;
      locked_until?: string;
      last_used_at?: string;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      user_id?: string;
      factor_id?: string;
      method?: MFAMethod;
      friendly_name?: string;
      secret?: string;
      backup_codes?: string[];
      is_primary?: boolean;
      is_verified?: boolean;
      verification_attempts?: number;
      max_attempts?: number;
      locked_until?: string;
      last_used_at?: string;
      created_at?: string;
      updated_at?: string;
    };
  };
  mfa_challenges: {
    Row: {
      id: string;
      user_id: string;
      challenge_id: string;
      factor_id: string;
      method: MFAMethod;
      code: string;
      expires_at: string;
      verified_at?: string;
      ip_address?: string;
      user_agent?: string;
      created_at: string;
    };
    Insert: {
      id?: string;
      user_id: string;
      challenge_id: string;
      factor_id: string;
      method: MFAMethod;
      code: string;
      expires_at: string;
      verified_at?: string;
      ip_address?: string;
      user_agent?: string;
      created_at?: string;
    };
    Update: {
      id?: string;
      user_id?: string;
      challenge_id?: string;
      factor_id?: string;
      method?: MFAMethod;
      code?: string;
      expires_at?: string;
      verified_at?: string;
      ip_address?: string;
      user_agent?: string;
      created_at?: string;
    };
  };
  mfa_sessions: {
    Row: {
      id: string;
      user_id: string;
      session_id: string;
      factor_id: string;
      mfa_completed_at: string;
      expires_at: string;
      ip_address?: string;
      user_agent?: string;
      created_at: string;
    };
    Insert: {
      id?: string;
      user_id: string;
      session_id: string;
      factor_id: string;
      mfa_completed_at: string;
      expires_at: string;
      ip_address?: string;
      user_agent?: string;
      created_at?: string;
    };
    Update: {
      id?: string;
      user_id?: string;
      session_id?: string;
      factor_id?: string;
      mfa_completed_at?: string;
      expires_at?: string;
      ip_address?: string;
      user_agent?: string;
      created_at?: string;
    };
  };
  mfa_settings: {
    Row: {
      id: string;
      user_id: string;
      mfa_enabled: boolean;
      mfa_required: boolean;
      remember_device_days: number;
      backup_codes_enabled: boolean;
      backup_codes_count: number;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      user_id: string;
      mfa_enabled?: boolean;
      mfa_required?: boolean;
      remember_device_days?: number;
      backup_codes_enabled?: boolean;
      backup_codes_count?: number;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      user_id?: string;
      mfa_enabled?: boolean;
      mfa_required?: boolean;
      remember_device_days?: number;
      backup_codes_enabled?: boolean;
      backup_codes_count?: number;
      created_at?: string;
      updated_at?: string;
    };
  };
}
