import { createClient } from '@supabase/supabase-js';
import type { UserProfile } from '../types/auth';

export interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  userType: 'customer' | 'provider' | 'admin' | null;
}

export interface AuthService {
  signIn(email: string, password: string): Promise<{ user: UserProfile; error?: string }>;
  signUp(email: string, password: string, userData: Partial<UserProfile>): Promise<{ user: UserProfile; error?: string }>;
  signOut(): Promise<void>;
  getCurrentUser(): Promise<UserProfile | null>;
  refreshUser(): Promise<UserProfile | null>;
  updateProfile(updates: Partial<UserProfile>): Promise<{ user: UserProfile; error?: string }>;
  resetPassword(email: string): Promise<{ success: boolean; error?: string }>;
  confirmPasswordReset(token: string, newPassword: string): Promise<{ success: boolean; error?: string }>;
}

export class UnifiedAuthService implements AuthService {
  private supabase: any;
  private currentUser: UserProfile | null = null;

  constructor(supabaseUrl: string, supabaseAnonKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseAnonKey);
  }

  async signIn(email: string, password: string): Promise<{ user: UserProfile; error?: string }> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { user: null as any, error: error.message };
      }

      if (data.user) {
        const userProfile = await this.getUserProfile(data.user.id);
        if (userProfile) {
          this.currentUser = userProfile;
          return { user: userProfile };
        }
      }

      return { user: null as any, error: 'Failed to get user profile' };
    } catch (error) {
      return { user: null as any, error: error instanceof Error ? error.message : 'Sign in failed' };
    }
  }

  async signUp(email: string, password: string, userData: Partial<UserProfile>): Promise<{ user: UserProfile; error?: string }> {
    try {
      // First, create the auth user in auth.users (Supabase Auth schema)
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: userData.first_name,
            last_name: userData.last_name,
            user_type: userData.user_type,
          },
        },
      });

      if (error) {
        return { user: null as any, error: error.message };
      }

      if (data.user) {
        // Create user profile in the appropriate public schema table
        const profileData = {
          user_id: data.user.id,
          email: data.user.email,
          first_name: userData.first_name,
          last_name: userData.last_name,
          phone: userData.phone,
          date_of_birth: userData.date_of_birth,
          user_type: userData.user_type,
          role: userData.role || userData.user_type,
          is_active: true,
        };

        let profileError;
        if (userData.user_type === 'customer') {
          const { error } = await this.supabase
            .from('customer_profiles')
            .insert(profileData);
          profileError = error;
        } else if (userData.user_type === 'provider') {
          const { error } = await this.supabase
            .from('providers')
            .insert(profileData);
          profileError = error;
        } else if (userData.user_type === 'admin') {
          const { error } = await this.supabase
            .from('admin_users')
            .insert(profileData);
          profileError = error;
        }

        if (profileError) {
          // If profile creation fails, we should clean up the auth user
          // Note: In a production app, you might want to handle this more gracefully
          console.error('Profile creation failed:', profileError);
          return { user: null as any, error: profileError.message };
        }

        const userProfile = await this.getUserProfile(data.user.id);
        if (userProfile) {
          this.currentUser = userProfile;
          return { user: userProfile };
        }
      }

      return { user: null as any, error: 'Failed to create user profile' };
    } catch (error) {
      return { user: null as any, error: error instanceof Error ? error.message : 'Sign up failed' };
    }
  }

  async signOut(): Promise<void> {
    try {
      await this.supabase.auth.signOut();
      this.currentUser = null;
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }

  async getCurrentUser(): Promise<UserProfile | null> {
    if (this.currentUser) {
      return this.currentUser;
    }

    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (user) {
        const userProfile = await this.getUserProfile(user.id);
        this.currentUser = userProfile;
        return userProfile;
      }
    } catch (error) {
      console.error('Get current user error:', error);
    }

    return null;
  }

  async refreshUser(): Promise<UserProfile | null> {
    this.currentUser = null;
    return this.getCurrentUser();
  }

  async updateProfile(updates: Partial<UserProfile>): Promise<{ user: UserProfile; error?: string }> {
    try {
      const currentUser = await this.getCurrentUser();
      if (!currentUser) {
        return { user: null as any, error: 'No authenticated user' };
      }

      let updateError;
      if (currentUser.user_type === 'customer') {
        const { error } = await this.supabase
          .from('customer_profiles')
          .update(updates)
          .eq('user_id', currentUser.user_id);
        updateError = error;
      } else if (currentUser.user_type === 'provider') {
        const { error } = await this.supabase
          .from('providers')
          .update(updates)
          .eq('user_id', currentUser.user_id);
        updateError = error;
      } else if (currentUser.user_type === 'admin') {
        const { error } = await this.supabase
          .from('admin_users')
          .update(updates)
          .eq('user_id', currentUser.user_id);
        updateError = error;
      }

      if (updateError) {
        return { user: null as any, error: updateError.message };
      }

      const updatedUser = await this.getUserProfile(currentUser.user_id);
      if (updatedUser) {
        this.currentUser = updatedUser;
        return { user: updatedUser };
      }

      return { user: null as any, error: 'Failed to get updated user profile' };
    } catch (error) {
      return { user: null as any, error: error instanceof Error ? error.message : 'Update profile failed' };
    }
  }

  async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email);
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Password reset failed' };
    }
  }

  async confirmPasswordReset(_token: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Note: Supabase handles token validation internally
      const { error } = await this.supabase.auth.updateUser({ password: newPassword });
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Password reset confirmation failed' };
    }
  }

  private async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      // First, get the auth user from auth.users (Supabase Auth schema)
      const { data: authUser, error: authError } = await this.supabase.auth.getUser();
      
      if (authError || !authUser.user) {
        console.error('Auth user error:', authError);
        return null;
      }

      // Then try to get user profile from public schema tables
      const [customerResult, providerResult, adminResult] = await Promise.all([
        this.supabase.from('customer_profiles').select('*').eq('user_id', userId).single(),
        this.supabase.from('providers').select('*').eq('user_id', userId).single(),
        this.supabase.from('admin_users').select('*').eq('user_id', userId).single(),
      ]);

      // Combine auth user data with profile data
      const baseUserData = {
        id: authUser.user.id,
        user_id: authUser.user.id,
        email: authUser.user.email || '',
        created_at: authUser.user.created_at,
        updated_at: authUser.user.updated_at || authUser.user.created_at,
      };

      if (customerResult.data) {
        return {
          ...baseUserData,
          ...customerResult.data,
          user_type: 'customer' as const,
          role: 'customer' as const,
        };
      }

      if (providerResult.data) {
        return {
          ...baseUserData,
          ...providerResult.data,
          user_type: 'provider' as const,
          role: providerResult.data.role || 'provider',
        };
      }

      if (adminResult.data) {
        return {
          ...baseUserData,
          ...adminResult.data,
          user_type: 'admin' as const,
          role: 'admin' as const,
        };
      }

      // If no profile found, return basic auth user data
      return {
        ...baseUserData,
        first_name: null,
        last_name: null,
        phone: null,
        date_of_birth: null,
        image_url: null,
        is_active: true,
        user_type: 'customer' as const, // Default fallback
        role: 'customer' as const,
      };
    } catch (error) {
      console.error('Get user profile error:', error);
      return null;
    }
  }
}

// Factory function to create auth service
export function createAuthService(supabaseUrl: string, supabaseAnonKey: string): AuthService {
  return new UnifiedAuthService(supabaseUrl, supabaseAnonKey);
}
