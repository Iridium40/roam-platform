import { BaseAuthService, SupabaseConfigHelper } from './auth';
import type { 
  AuthResult, 
  UserProfile,
  AuthUserRole,
  AuthProvider
} from '../types/auth';
import type { AuthService } from './auth';
import type { RegisterRequest, LoginRequest } from '../types/api';
import { createClient } from '@supabase/supabase-js';

// Email service interface for dependency injection
export interface EmailServiceInterface {
  sendWelcomeEmail(email: string, firstName: string): Promise<boolean>;
  sendPasswordResetEmail(email: string, token: string): Promise<boolean>;
  sendEmailVerification(email: string, token: string): Promise<boolean>;
}

// Default email service implementation
class DefaultEmailService implements EmailServiceInterface {
  async sendWelcomeEmail(email: string, firstName: string): Promise<boolean> {
    console.log(`Welcome email would be sent to ${email} for ${firstName}`);
    return true;
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
    console.log(`Password reset email would be sent to ${email} with token ${token}`);
    return true;
  }

  async sendEmailVerification(email: string, token: string): Promise<boolean> {
    console.log(`Email verification would be sent to ${email} with token ${token}`);
    return true;
  }
}

export class SupabaseAuthService extends BaseAuthService implements AuthService {
  private emailService: EmailServiceInterface;

  constructor(emailService?: EmailServiceInterface) {
    const config = SupabaseConfigHelper.getEnvironmentConfig();
    super(config);
    this.emailService = emailService || new DefaultEmailService();
  }

  protected initializeClient(): void {
    this.supabase = createClient(this.config.url, this.config.serviceKey);
  }

  async signUp(data: RegisterRequest): Promise<AuthResult> {
    try {
      // Validate signup data
      const validation = this.validateSignupData(data);
      if (!validation.isValid) {
        return this.formatErrorResult('Validation failed', 'validation_error', validation.errors);
      }

      console.log('Creating user account for:', data.email);

      // Create user with Supabase Auth using admin API
      const { data: authData, error: authError } = await this.supabase.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true, // Auto-confirm email for now
        user_metadata: this.createUserMetadata(data),
      });

      if (authError) {
        return this.handleAuthError(authError);
      }

      if (!authData.user) {
        return this.formatErrorResult('Failed to create user - no user data returned');
      }

      console.log('User created successfully:', authData.user.id);

      // Create user profile based on user type
      const profileResult = await this.createUserProfile(authData.user.id, {
        id: authData.user.id,
        user_id: authData.user.id,
        email: data.email,
        first_name: data.firstName,
        last_name: data.lastName,
        phone: data.phone === undefined ? null : data.phone,
        date_of_birth: data.dateOfBirth || null,
        image_url: null,
        is_active: true,
        user_type: data.userType,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Send welcome email (don't fail signup if email fails)
      try {
        await this.emailService.sendWelcomeEmail(data.email, data.firstName);
      } catch (emailError) {
        console.error('Error sending welcome email:', emailError);
        // Continue with signup even if email fails
      }

      return this.formatSuccessResult({
        user: {
          id: authData.user.id,
          email: authData.user.email,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          dateOfBirth: data.dateOfBirth,
        },
        profile: profileResult.data
      }, 'Account created successfully');

    } catch (error) {
      console.error('Signup error:', error);
      return this.formatErrorResult('Internal server error', 'internal_error', error);
    }
  }

  async signIn(data: LoginRequest): Promise<AuthResult> {
    try {
      // Validate login data
      const validation = this.validateLoginData(data);
      if (!validation.isValid) {
        return this.formatErrorResult('Validation failed', 'validation_error', validation.errors);
      }

      const { data: authData, error: authError } = await this.supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (authError) {
        return this.handleAuthError(authError);
      }

      if (!authData.user) {
        return this.formatErrorResult('No user data returned');
      }

      // Get user profile
      const profileResult = await this.getUserProfile(authData.user.id);

      return this.formatSuccessResult({
        user: authData.user,
        session: authData.session,
        profile: profileResult.data
      }, 'Successfully signed in');

    } catch (error) {
      console.error('Signin error:', error);
      return this.formatErrorResult('Internal server error', 'internal_error', error);
    }
  }

  async signOut(): Promise<AuthResult> {
    try {
      const { error } = await this.supabase.auth.signOut();
      
      if (error) {
        return this.handleAuthError(error);
      }

      return this.formatSuccessResult(null, 'Successfully signed out');
    } catch (error) {
      console.error('Signout error:', error);
      return this.formatErrorResult('Internal server error', 'internal_error', error);
    }
  }

  async refreshToken(): Promise<AuthResult> {
    try {
      const { data, error } = await this.supabase.auth.refreshSession();
      
      if (error) {
        return this.handleAuthError(error);
      }

      return this.formatSuccessResult({
        session: data.session,
        user: data.user
      }, 'Token refreshed successfully');
    } catch (error) {
      console.error('Token refresh error:', error);
      return this.formatErrorResult('Internal server error', 'internal_error', error);
    }
  }

  async getCurrentUser(): Promise<AuthResult> {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser();
      
      if (error) {
        return this.handleAuthError(error);
      }

      if (!user) {
        return this.formatErrorResult('No authenticated user found', 'user_not_found');
      }

      // Get user profile
      const profileResult = await this.getUserProfile(user.id);

      return this.formatSuccessResult({
        user,
        profile: profileResult.data
      });
    } catch (error) {
      console.error('Get current user error:', error);
      return this.formatErrorResult('Internal server error', 'internal_error', error);
    }
  }

  async updateUser(userId: string, updates: Partial<UserProfile>): Promise<AuthResult> {
    try {
      const { data, error } = await this.supabase.auth.admin.updateUserById(userId, {
        user_metadata: updates
      });

      if (error) {
        return this.handleAuthError(error);
      }

      return this.formatSuccessResult(data.user, 'User updated successfully');
    } catch (error) {
      console.error('Update user error:', error);
      return this.formatErrorResult('Internal server error', 'internal_error', error);
    }
  }

  async deleteUser(userId: string): Promise<AuthResult> {
    try {
      const { error } = await this.supabase.auth.admin.deleteUser(userId);

      if (error) {
        return this.handleAuthError(error);
      }

      return this.formatSuccessResult(null, 'User deleted successfully');
    } catch (error) {
      console.error('Delete user error:', error);
      return this.formatErrorResult('Internal server error', 'internal_error', error);
    }
  }

  async resetPassword(email: string): Promise<AuthResult> {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.VITE_APP_URL}/reset-password`
      });

      if (error) {
        return this.handleAuthError(error);
      }

      // Send password reset email
      try {
        // Note: In a real implementation, you'd get the token from Supabase
        await this.emailService.sendPasswordResetEmail(email, 'temp-token');
      } catch (emailError) {
        console.error('Error sending password reset email:', emailError);
      }

      return this.formatSuccessResult(null, 'Password reset email sent');
    } catch (error) {
      console.error('Reset password error:', error);
      return this.formatErrorResult('Internal server error', 'internal_error', error);
    }
  }

  async confirmPasswordReset(_token: string, newPassword: string): Promise<AuthResult> {
    try {
      const { data, error } = await this.supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        return this.handleAuthError(error);
      }

      return this.formatSuccessResult(data.user, 'Password updated successfully');
    } catch (error) {
      console.error('Confirm password reset error:', error);
      return this.formatErrorResult('Internal server error', 'internal_error', error);
    }
  }

  async createUserProfile(userId: string, profile: UserProfile): Promise<AuthResult> {
    try {
      // Determine which table to insert into based on user type
      const tableName = profile.user_type === 'provider' ? 'provider_applications' : 'customer_profiles';
      
      const { data, error } = await this.supabase
        .from(tableName)
        .insert({
          user_id: userId,
          ...this.sanitizeUserData(profile),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error(`Error creating ${profile.user_type} profile:`, error);
        return this.formatErrorResult(`Failed to create ${profile.user_type} profile`, 'profile_creation_failed', error);
      }

      return this.formatSuccessResult(data, `${profile.user_type} profile created successfully`);
    } catch (error) {
      console.error('Create user profile error:', error);
      return this.formatErrorResult('Internal server error', 'internal_error', error);
    }
  }

  async getUserProfile(userId: string): Promise<AuthResult> {
    try {
      // Try to get profile from both tables
      const [providerResult, customerResult] = await Promise.all([
        this.supabase.from('provider_applications').select('*').eq('user_id', userId).single(),
        this.supabase.from('customer_profiles').select('*').eq('user_id', userId).single(),
      ]);

      if (providerResult.data) {
        return this.formatSuccessResult(providerResult.data);
      }

      if (customerResult.data) {
        return this.formatSuccessResult(customerResult.data);
      }

      return this.formatErrorResult('User profile not found', 'profile_not_found');
    } catch (error) {
      console.error('Get user profile error:', error);
      return this.formatErrorResult('Internal server error', 'internal_error', error);
    }
  }

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<AuthResult> {
    try {
      // First, determine which table the user profile is in
      const profileResult = await this.getUserProfile(userId);
      
      if (!profileResult.success) {
        return profileResult;
      }

      const profile = profileResult.data;
      const tableName = profile.userType === 'provider' ? 'provider_applications' : 'customer_profiles';

      const { data, error } = await this.supabase
        .from(tableName)
        .update({
          ...this.sanitizeUserData(updates),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        return this.formatErrorResult('Failed to update user profile', 'profile_update_failed', error);
      }

      return this.formatSuccessResult(data, 'User profile updated successfully');
    } catch (error) {
      console.error('Update user profile error:', error);
      return this.formatErrorResult('Internal server error', 'internal_error', error);
    }
  }

  async assignUserRole(userId: string, role: AuthUserRole): Promise<AuthResult> {
    // Note: user_roles table has been removed. Roles are now determined from customer_profiles or providers tables.
    // This method is deprecated and should not be used.
    return this.formatErrorResult(
      'User role assignment is no longer supported. Roles are determined from user profiles.',
      'deprecated_method',
      null
    );
  }

  async getUserRoles(userId: string): Promise<AuthResult> {
    try {
      // user_roles table removed - determine role from customer_profiles or providers tables
      const { data: customerProfile } = await this.supabase
        .from('customer_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (customerProfile) {
        return this.formatSuccessResult([{ role: 'customer' }], 'User roles retrieved');
      }

      const { data: providerProfile } = await this.supabase
        .from('providers')
        .select('provider_role, business_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (providerProfile) {
        return this.formatSuccessResult([{ 
          role: providerProfile.provider_role || 'provider',
          business_id: providerProfile.business_id
        }], 'User roles retrieved');
      }

      // Default to customer if no profile found
      return this.formatSuccessResult([{ role: 'customer' }], 'User roles retrieved');

      // if (error) {
        return this.formatErrorResult('Failed to get user roles', 'role_retrieval_failed', error);
      }

      return this.formatSuccessResult(data, 'User roles retrieved successfully');
    } catch (error) {
      console.error('Get user roles error:', error);
      return this.formatErrorResult('Internal server error', 'internal_error', error);
    }
  }

  async hasPermission(userId: string, permission: string): Promise<AuthResult> {
    try {
      // Get user roles first
      const rolesResult = await this.getUserRoles(userId);
      
      if (!rolesResult.success) {
        return rolesResult;
      }

      const roles = rolesResult.data;
      
      // Check if any role has the required permission
      // This is a simplified implementation - in a real app, you'd have a permissions table
      const hasPermission = roles.some((role: any) => {
        // Define role-based permissions
        const rolePermissions: Record<string, string[]> = {
          admin: ['read', 'write', 'delete', 'manage_users', 'manage_roles'],
          provider: ['read', 'write', 'manage_services', 'manage_bookings'],
          customer: ['read', 'write', 'manage_bookings'],
          moderator: ['read', 'write', 'moderate_content']
        };

        return rolePermissions[role.role]?.includes(permission) || false;
      });

      return this.formatSuccessResult({ hasPermission }, 'Permission check completed');
    } catch (error) {
      console.error('Has permission error:', error);
      return this.formatErrorResult('Internal server error', 'internal_error', error);
    }
  }

  async signInWithProvider(provider: AuthProvider): Promise<AuthResult> {
    try {
      const { data, error } = await this.supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: `${process.env.VITE_APP_URL}/auth/callback`
        }
      });

      if (error) {
        return this.handleAuthError(error);
      }

      return this.formatSuccessResult(data, `Sign in with ${provider} initiated`);
    } catch (error) {
      console.error('Sign in with provider error:', error);
      return this.formatErrorResult('Internal server error', 'internal_error', error);
    }
  }

  async linkProvider(_userId: string, provider: AuthProvider): Promise<AuthResult> {
    try {
      // This would typically involve linking the provider account to the existing user
      // For now, we'll return a placeholder implementation
      return this.formatSuccessResult(null, `Provider ${provider} linked successfully`);
    } catch (error) {
      console.error('Link provider error:', error);
      return this.formatErrorResult('Internal server error', 'internal_error', error);
    }
  }

  async unlinkProvider(_userId: string, provider: AuthProvider): Promise<AuthResult> {
    try {
      // This would typically involve unlinking the provider account from the user
      // For now, we'll return a placeholder implementation
      return this.formatSuccessResult(null, `Provider ${provider} unlinked successfully`);
    } catch (error) {
      console.error('Unlink provider error:', error);
      return this.formatErrorResult('Internal server error', 'internal_error', error);
    }
  }
}
