import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { AuthAPI } from "@/lib/supabase/auth";
import { apiClient } from "@/lib/api/client";
import { toast } from "@/hooks/use-toast";

// Local provider type - Updated to fix auth loop v2
interface Provider {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  provider_role: 'owner' | 'dispatcher' | 'provider';
  business_id: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  image_url: string | null;
  bio: string | null;
  verification_status: string | null;
  business_managed: boolean | null;
}

interface ProviderAuthContextType {
  provider: Provider | null;
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
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  const clearStoredData = useCallback(() => {
    localStorage.removeItem("roam_provider");
    localStorage.removeItem("roam_access_token");
    localStorage.removeItem("roam_user_type");
  }, []);

  const loadProviderData = useCallback(async (userId: string, accessToken: string) => {
    try {
      const providerData = await AuthAPI.getProviderByUserId(userId);
      
      if (providerData) {
        console.log("Setting provider data in context:", providerData.provider_role);
        setProvider(providerData);
        localStorage.setItem("roam_provider", JSON.stringify(providerData));
        localStorage.setItem("roam_access_token", accessToken);
        localStorage.setItem("roam_user_type", "provider");
        apiClient.setAuthToken(accessToken);
        return true;
      } else {
        console.log("No provider data found, clearing stored data");
        clearStoredData();
        return false;
      }
    } catch (error) {
      console.error("Error loading provider data:", error);
      clearStoredData();
      return false;
    }
  }, [clearStoredData]);

  useEffect(() => {
    const initializeAuth = async () => {
      if (isInitialized) return;
      
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
            setIsInitialized(true);
            return;
          } else {
            clearStoredData();
          }
        }

        // Try to get current session from Supabase
        const { data: { session } } = await import("@/lib/supabase").then(m => m.supabase.auth.getSession());
        
        if (session?.user) {
          await loadProviderData(session.user.id, session.access_token);
        } else {
          clearStoredData();
        }
      } catch (error) {
        console.error("Error during provider auth initialization:", error);
        clearStoredData();
      } finally {
        setLoading(false);
        setIsInitialized(true);
      }
    };

    initializeAuth();
  }, [isInitialized, clearStoredData, loadProviderData]);

  useEffect(() => {
    if (!isInitialized) return;

    // Set up auth state change listener
    let subscription: any;
    
    const setupAuthListener = async () => {
      const { supabase } = await import("@/lib/supabase");
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log("Auth state changed:", event, session?.user?.id);
        
        if (event === 'SIGNED_IN' && session?.user) {
          // Only process if we don't already have this user loaded
          if (provider?.user_id !== session.user.id) {
            console.log("SIGNED_IN event detected, fetching provider data...");
            console.log("Session user ID:", session.user.id);
            console.log("Session user email:", session.user.email);
            await loadProviderData(session.user.id, session.access_token);
          }
        } else if (event === 'SIGNED_OUT') {
          console.log("SIGNED_OUT event detected");
          setProvider(null);
          clearStoredData();
          apiClient.clearAuthToken();
        }
      });
      
      subscription = data.subscription;
    };

    setupAuthListener();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [isInitialized, provider?.user_id, clearStoredData, loadProviderData]);

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
