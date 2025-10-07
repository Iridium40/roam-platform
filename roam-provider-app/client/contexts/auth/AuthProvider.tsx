import React, { createContext, useContext, useEffect, useState } from "react";
import { CustomerAuthProvider, useCustomerAuth } from "./CustomerAuthContext";
import { ProviderAuthProvider, useProviderAuth } from "./ProviderAuthContext";
import { supabase } from "@/lib/supabase";

export type UserType = "customer" | "provider" | null;

interface UnifiedAuthContextType {
  userType: UserType;
  customer: ReturnType<typeof useCustomerAuth> | null;
  provider: ReturnType<typeof useProviderAuth> | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const UnifiedAuthContext = createContext<UnifiedAuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(UnifiedAuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

const AuthProviderInner: React.FC<AuthProviderProps> = ({ children }) => {
  const customerAuth = useCustomerAuth();
  const providerAuth = useProviderAuth();
  const [userType, setUserType] = useState<UserType>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    // Determine user type based on authentication state
    if (customerAuth.isAuthenticated) {
      setUserType("customer");
    } else if (providerAuth.isAuthenticated) {
      setUserType("provider");
    } else {
      setUserType(null);
    }
  }, [customerAuth.isAuthenticated, providerAuth.isAuthenticated]);

  const signOut = async () => {
    console.log("🚪 Unified signOut starting...");
    setSigningOut(true);
    try {
      if (customerAuth.isAuthenticated) {
        console.log("🚪 Signing out customer...");
        await customerAuth.signOut();
      } else if (providerAuth.isAuthenticated) {
        console.log("🚪 Signing out provider...");
        await providerAuth.signOut();
      }
      console.log("🚪 Sign out complete");
    } catch (error) {
      console.error("🚪 Sign out error:", error);
    } finally {
      setSigningOut(false);
      console.log("🚪 Unified signOut finished, signingOut=false");
    }
  };

  const isAuthenticated = customerAuth.isAuthenticated || providerAuth.isAuthenticated;
  // Don't show loading if we're in the middle of signing out and user is no longer authenticated
  const loading = signingOut ? false : (customerAuth.loading || providerAuth.loading);

  console.log("🔍 Auth State:", {
    signingOut,
    customerLoading: customerAuth.loading,
    providerLoading: providerAuth.loading,
    finalLoading: loading,
    isAuthenticated,
    customerAuth: customerAuth.isAuthenticated,
    providerAuth: providerAuth.isAuthenticated
  });

  return (
    <UnifiedAuthContext.Provider
      value={{
        userType,
        customer: customerAuth.isAuthenticated ? customerAuth : null,
        provider: providerAuth.isAuthenticated ? providerAuth : null,
        loading,
        signOut,
        isAuthenticated,
      }}
    >
      {children}
    </UnifiedAuthContext.Provider>
  );
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  return (
    <CustomerAuthProvider>
      <ProviderAuthProvider>
        <AuthProviderInner>{children}</AuthProviderInner>
      </ProviderAuthProvider>
    </CustomerAuthProvider>
  );
};
