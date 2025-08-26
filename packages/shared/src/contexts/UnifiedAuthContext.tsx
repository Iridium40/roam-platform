import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createAuthService, AuthService, AuthState } from '../services/auth-service';
import type { UserProfile } from '../types/auth';

interface UnifiedAuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ user: UserProfile; error?: string }>;
  signUp: (email: string, password: string, userData: Partial<UserProfile>) => Promise<{ user: UserProfile; error?: string }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ user: UserProfile; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  confirmPasswordReset: (token: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

const UnifiedAuthContext = createContext<UnifiedAuthContextType | undefined>(undefined);

export const useUnifiedAuth = () => {
  const context = useContext(UnifiedAuthContext);
  if (context === undefined) {
    throw new Error('useUnifiedAuth must be used within a UnifiedAuthProvider');
  }
  return context;
};

interface UnifiedAuthProviderProps {
  children: ReactNode;
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export const UnifiedAuthProvider: React.FC<UnifiedAuthProviderProps> = ({
  children,
  supabaseUrl,
  supabaseAnonKey,
}) => {
  const [authService] = useState<AuthService>(() => createAuthService(supabaseUrl, supabaseAnonKey));
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    isAuthenticated: false,
    userType: null,
  });

  const updateState = (updates: Partial<AuthState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const signIn = async (email: string, password: string) => {
    updateState({ loading: true });
    try {
      const result = await authService.signIn(email, password);
      if (result.user) {
        updateState({
          user: result.user,
          isAuthenticated: true,
          userType: result.user.user_type,
          loading: false,
        });
      } else {
        updateState({ loading: false });
      }
      return result;
    } catch (error) {
      updateState({ loading: false });
      return { user: null as any, error: error instanceof Error ? error.message : 'Sign in failed' };
    }
  };

  const signUp = async (email: string, password: string, userData: Partial<UserProfile>) => {
    updateState({ loading: true });
    try {
      const result = await authService.signUp(email, password, userData);
      if (result.user) {
        updateState({
          user: result.user,
          isAuthenticated: true,
          userType: result.user.user_type,
          loading: false,
        });
      } else {
        updateState({ loading: false });
      }
      return result;
    } catch (error) {
      updateState({ loading: false });
      return { user: null as any, error: error instanceof Error ? error.message : 'Sign up failed' };
    }
  };

  const signOut = async () => {
    updateState({ loading: true });
    try {
      await authService.signOut();
      updateState({
        user: null,
        isAuthenticated: false,
        userType: null,
        loading: false,
      });
    } catch (error) {
      updateState({ loading: false });
      console.error('Sign out error:', error);
    }
  };

  const refreshUser = async () => {
    updateState({ loading: true });
    try {
      const user = await authService.refreshUser();
      if (user) {
        updateState({
          user,
          isAuthenticated: true,
          userType: user.user_type,
          loading: false,
        });
      } else {
        updateState({
          user: null,
          isAuthenticated: false,
          userType: null,
          loading: false,
        });
      }
    } catch (error) {
      updateState({
        user: null,
        isAuthenticated: false,
        userType: null,
        loading: false,
      });
      console.error('Refresh user error:', error);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    try {
      const result = await authService.updateProfile(updates);
      if (result.user) {
        updateState({
          user: result.user,
          userType: result.user.user_type,
        });
      }
      return result;
    } catch (error) {
      return { user: null as any, error: error instanceof Error ? error.message : 'Update profile failed' };
    }
  };

  const resetPassword = async (email: string) => {
    return authService.resetPassword(email);
  };

  const confirmPasswordReset = async (token: string, newPassword: string) => {
    return authService.confirmPasswordReset(token, newPassword);
  };

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const user = await authService.getCurrentUser();
        if (user) {
          updateState({
            user,
            isAuthenticated: true,
            userType: user.user_type,
            loading: false,
          });
        } else {
          updateState({
            user: null,
            isAuthenticated: false,
            userType: null,
            loading: false,
          });
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        updateState({
          user: null,
          isAuthenticated: false,
          userType: null,
          loading: false,
        });
      }
    };

    initializeAuth();
  }, [authService]);

  const contextValue: UnifiedAuthContextType = {
    ...state,
    signIn,
    signUp,
    signOut,
    refreshUser,
    updateProfile,
    resetPassword,
    confirmPasswordReset,
  };

  return (
    <UnifiedAuthContext.Provider value={contextValue}>
      {children}
    </UnifiedAuthContext.Provider>
  );
};
