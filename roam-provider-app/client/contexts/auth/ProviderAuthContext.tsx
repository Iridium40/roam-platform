import React, { createContext, useContext, useState, useEffect } from "react";
import { AuthAPI } from "@/lib/supabase/auth";
import { apiClient } from "@/lib/api/client";
import { toast } from "@/hooks/use-toast";
import type { AuthProvider } from "@roam/shared";

interface ProviderAuthContextType {
  provider: AuthProvider | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
  isOwner: boolean;
  isDispatcher: boolean;
  isProvider: boolean;
}

const ProviderAuthContext = createContext<ProviderAuthContextType | undefined>(undefined);

export const useProviderAuth = () => {
  const context = useContext(ProviderAuthContext);
  if (context === undefined) {
    throw new Error("useProviderAuth must be used within a ProviderAuthProvider");
  }
  return context;
};

interface ProviderAuthProviderProps {
  children: React.ReactNode;
}

export const ProviderAuthProvider: React.FC<ProviderAuthProviderProps> = ({ children }) => {
  const [provider, setProvider] = useState<AuthProvider | null>(null);
  const [loading, setLoading] = useState(true);

  const clearStoredData = () => {
    localStorage.removeItem("roam_provider");
    localStorage.removeItem("roam_access_token");
    localStorage.removeItem("roam_user_type");
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Try to restore session from localStorage first
        const storedProvider = localStorage.getItem("roam_provider");
        const storedToken = localStorage.getItem("roam_access_token");

        if (storedProvider && storedToken) {
          const providerData = JSON.parse(storedProvider);
          
          // Set auth token for API client
          apiClient.setAuthToken(storedToken);
          
          if (providerData.user_id) {
            setProvider(providerData);
            setLoading(false);
            return;
          } else {
            clearStoredData();
          }
        }

        // Try to get current session from Supabase
        const { data: { session } } = await import("@/lib/supabase").then(m => m.supabase.auth.getSession());
        
        if (session?.user) {
          const providerData = await AuthAPI.getProviderByUserId(session.user.id);
          
          if (providerData) {
            setProvider(providerData);
            localStorage.setItem("roam_provider", JSON.stringify(providerData));
            localStorage.setItem("roam_access_token", session.access_token);
            localStorage.setItem("roam_user_type", "provider");
            apiClient.setAuthToken(session.access_token);
          } else {
            clearStoredData();
          }
        } else {
          clearStoredData();
        }
      } catch (error) {
        console.error("Error during provider auth initialization:", error);
        clearStoredData();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const signOut = async () => {
    setLoading(true);
    try {
      setProvider(null);
      clearStoredData();
      apiClient.clearAuthToken();
      await AuthAPI.signOut();
    } catch (error) {
      console.error("Provider sign out error:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    if (!provider) return;

    try {
      const providerData = await AuthAPI.getProviderByUserId(provider.user_id);
      
      if (providerData) {
        setProvider(providerData);
        localStorage.setItem("roam_provider", JSON.stringify(providerData));
      } else {
        // Provider no longer exists, sign out
        await signOut();
      }
    } catch (error) {
      console.error("Error refreshing provider:", error);
    }
  };

  const isAuthenticated = !!provider;
  const isOwner = provider?.provider_role === "owner";
  const isDispatcher = provider?.provider_role === "dispatcher" || isOwner;
  const isProvider = provider?.provider_role === "provider" || isDispatcher;

  return (
    <ProviderAuthContext.Provider
      value={{
        provider,
        loading,
        signOut,
        refreshUser,
        isAuthenticated,
        isOwner,
        isDispatcher,
        isProvider,
      }}
    >
      {children}
    </ProviderAuthContext.Provider>
  );
};
