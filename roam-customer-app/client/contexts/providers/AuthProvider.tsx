import React, { createContext, useContext, useMemo } from "react";
import { useAuth } from "../hooks/useAuth";
import { useProfile } from "../hooks/useProfile";
import { useOAuth } from "../hooks/useOAuth";
import type { Customer, SignUpData, ProfileUpdateData, OAuthResult, AuthResult } from "@/types/index";

interface AuthContextType {
  // Auth state
  customer: Customer | null;
  loading: boolean;
  error: string | null;
  
  // Auth actions
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, userData: SignUpData) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<{ success: boolean; error?: string }>;
  fetchCustomerProfile: (userId: string) => Promise<void>;
  
  // Profile actions
  updatingProfile: boolean;
  updateProfile: (customerId: string, updates: ProfileUpdateData) => Promise<{ success: boolean; error?: string }>;
  updateUserMetadata: (updates: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;
  changePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  deleteAccount: (customerId: string) => Promise<{ success: boolean; error?: string }>;
  
  // OAuth actions
  oauthLoading: boolean;
  signInWithGoogle: () => Promise<OAuthResult>;
  signInWithFacebook: () => Promise<OAuthResult>;
  signInWithApple: () => Promise<OAuthResult>;
  handleOAuthCallback: () => Promise<AuthResult>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const auth = useAuth();
  const profile = useProfile();
  const oauth = useOAuth();

  const value = useMemo(() => ({
    // Auth state
    customer: auth.customer,
    loading: auth.loading,
    error: auth.error,
    
    // Auth actions
    signIn: auth.signIn,
    signUp: auth.signUp,
    signOut: auth.signOut,
    fetchCustomerProfile: auth.fetchCustomerProfile,
    
    // Profile actions
    updatingProfile: profile.updatingProfile,
    updateProfile: profile.updateProfile,
    updateUserMetadata: profile.updateUserMetadata,
    changePassword: profile.changePassword,
    deleteAccount: profile.deleteAccount,
    
    // OAuth actions
    oauthLoading: oauth.oauthLoading,
    signInWithGoogle: oauth.signInWithGoogle,
    signInWithFacebook: oauth.signInWithFacebook,
    signInWithApple: oauth.signInWithApple,
    handleOAuthCallback: oauth.handleOAuthCallback,
  }), [
    auth.customer,
    auth.loading,
    auth.error,
    auth.signIn,
    auth.signUp,
    auth.signOut,
    auth.fetchCustomerProfile,
    profile.updatingProfile,
    profile.updateProfile,
    profile.updateUserMetadata,
    profile.changePassword,
    profile.deleteAccount,
    oauth.oauthLoading,
    oauth.signInWithGoogle,
    oauth.signInWithFacebook,
    oauth.signInWithApple,
    oauth.handleOAuthCallback,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
