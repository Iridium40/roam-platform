import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { AuthAPI } from "@/lib/supabase-utils/auth";
import { apiClient } from "@/lib/api/client";
import { toast } from "@/hooks/use-toast";
// IMPORTANT: Use static import to ensure singleton - dynamic imports can create multiple instances
import { supabase } from "@/lib/supabase";

// Dev-only debug logging
const isDev = import.meta.env.DEV;
const debugLog = isDev ? (...args: any[]) => console.log(...args) : () => {};

// Provider type - v3 auth fix with nested relations support
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
  
  // Nested relations (for dashboard optimization)
  business_profiles?: {
    id: string;
    business_name: string;
    business_type: string;
    phone: string;
    contact_email: string;
    website_url: string | null;
    business_description: string | null;
    logo_url: string | null;
    cover_image_url: string | null;
    is_active: boolean;
    created_at: string;
  };
  
  business_locations?: Array<{
    id: string;
    location_name: string;
    address_line1: string;
    address_line2: string | null;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    latitude: number | null;
    longitude: number | null;
    phone: string | null;
    is_primary: boolean;
    is_active: boolean;
  }>;
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
  const [authInitialized, setAuthInitialized] = useState(false);
  const authProcessingRef = useRef<Set<string>>(new Set());
  const lastProcessedUserRef = useRef<string | null>(null);
  const authValidationRef = useRef<boolean>(false);

  const clearStoredData = useCallback(() => {
    localStorage.removeItem("roam_provider");
    localStorage.removeItem("roam_access_token");
    localStorage.removeItem("roam_user_type");
  }, []);

  // Validate auth state and return session if valid (avoids redundant getSession calls)
  const getValidSession = useCallback(async (): Promise<{ user: { id: string }; access_token: string } | null> => {
    try {
      // Use static import (imported at top of file) to ensure singleton
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        debugLog("Auth validation failed:", error.message);
        clearStoredData();
        return null;
      }
      
      if (!session?.user) {
        debugLog("No active session found");
        clearStoredData();
        return null;
      }
      
      debugLog("Auth state validated for user:", session.user.id);
      return session;
    } catch (error) {
      if (isDev) console.error("Auth validation error:", error);
      clearStoredData();
      return null;
    }
  }, [clearStoredData]);

  const processUserAuth = useCallback(async (userId: string, accessToken: string, skipValidation = false): Promise<boolean> => {
    // Validate auth state first (skip if already validated by caller)
    if (!skipValidation) {
      const session = await getValidSession();
      if (!session) {
        debugLog("Auth validation failed, skipping user processing");
        return false;
      }
    }

    // Prevent duplicate processing with Set-based tracking
    if (authProcessingRef.current.has(userId)) {
      debugLog("Auth already processing for user:", userId);
      return true;
    }

    // Skip if this is the same user we just processed
    if (lastProcessedUserRef.current === userId) {
      debugLog("Skipping - same user already processed:", userId);
      return true;
    }

    authProcessingRef.current.add(userId);
    debugLog("Processing auth for user:", userId);
    
    try {
      const providerData = await AuthAPI.getProviderByUserId(userId);
      
      if (providerData) {
        debugLog("Provider data loaded:", providerData.provider_role);
        setProvider(providerData);
        lastProcessedUserRef.current = userId;
        
        localStorage.setItem("roam_provider", JSON.stringify(providerData));
        localStorage.setItem("roam_access_token", accessToken);
        localStorage.setItem("roam_user_type", "provider");
        apiClient.setAuthToken(accessToken);
        return true;
      } else {
        debugLog("No provider data found");
        clearStoredData();
        lastProcessedUserRef.current = null;
        return false;
      }
    } catch (error) {
      if (isDev) console.error("Auth processing error:", error);
      clearStoredData();
      lastProcessedUserRef.current = null;
      return false;
    } finally {
      authProcessingRef.current.delete(userId);
    }
  }, [clearStoredData, getValidSession]);

  // Initial auth setup with immediate validation
  useEffect(() => {
    if (authInitialized) return;

    const initAuth = async () => {
      try {
        // Check localStorage first for fast restore
        const storedProvider = localStorage.getItem("roam_provider");
        const storedToken = localStorage.getItem("roam_access_token");

        if (storedProvider && storedToken) {
          try {
            const providerData = JSON.parse(storedProvider);
            if (providerData.user_id) {
              // Verify the session is still valid before restoring
              const session = await getValidSession();
              if (session && session.user.id === providerData.user_id) {
                setProvider(providerData);
                lastProcessedUserRef.current = providerData.user_id;
                apiClient.setAuthToken(storedToken);
                debugLog("Restored from localStorage:", providerData.provider_role);
                setLoading(false);
                setAuthInitialized(true);
                return;
              }
            }
          } catch (e) {
            debugLog("Invalid stored data, clearing");
          }
          // If we got here, stored data is invalid
          clearStoredData();
        }

        // No valid cached data - get session and process
        const session = await getValidSession();
        
        if (session) {
          // Skip validation in processUserAuth since we just validated
          await processUserAuth(session.user.id, session.access_token, true);
        }
      } catch (error) {
        if (isDev) console.error("Auth initialization error:", error);
        clearStoredData();
      } finally {
        setLoading(false);
        setAuthInitialized(true);
      }
    };

    initAuth();
  }, [authInitialized, processUserAuth, clearStoredData, getValidSession]);

  // Auth state listener
  useEffect(() => {
    if (!authInitialized) return;

    let authSubscription: any;
    
    const setupListener = () => {
      // Use static import (imported at top of file) to ensure singleton
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        debugLog("Auth event:", event, session?.user?.id);
        
        if (event === 'SIGNED_IN' && session?.user) {
          // Only process if different from current user
          if (lastProcessedUserRef.current !== session.user.id) {
            debugLog("New sign-in detected");
            await processUserAuth(session.user.id, session.access_token);
          } else {
            debugLog("Same user sign-in, skipping");
          }
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          // For token refresh, only update if we don't have current provider data
          if (!provider && lastProcessedUserRef.current === session.user.id) {
            debugLog("Token refreshed, updating provider data");
            await processUserAuth(session.user.id, session.access_token);
          } else {
            debugLog("Token refreshed, but already have current data");
          }
        } else if (event === 'SIGNED_OUT') {
          debugLog("Sign-out detected");
          setProvider(null);
          lastProcessedUserRef.current = null;
          authProcessingRef.current.clear();
          clearStoredData();
          apiClient.clearAuthToken();
          setLoading(false);
        }
      });
      
      authSubscription = data.subscription;
    };

    setupListener();

    return () => {
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, [authInitialized, processUserAuth, clearStoredData, provider]); // Added provider to dependencies

  const signOut = async () => {
    setLoading(true);
    try {
      setProvider(null);
      lastProcessedUserRef.current = null;
      authProcessingRef.current.clear();
      clearStoredData();
      apiClient.clearAuthToken();
      await AuthAPI.signOut();
    } catch (error) {
      if (isDev) console.error("Sign out error:", error);
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
        await signOut();
      }
    } catch (error) {
      if (isDev) console.error("Refresh error:", error);
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
