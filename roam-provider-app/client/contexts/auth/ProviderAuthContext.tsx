import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { AuthAPI } from "@/lib/supabase/auth";
import { apiClient } from "@/lib/api/client";
import { toast } from "@/hooks/use-toast";

// Provider type - v3 auth fix
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
  const [authInitialized, setAuthInitialized] = useState(false);
  const authProcessingRef = useRef<Set<string>>(new Set());
  const lastProcessedUserRef = useRef<string | null>(null);
  const authValidationRef = useRef<boolean>(false);

  const clearStoredData = useCallback(() => {
    localStorage.removeItem("roam_provider");
    localStorage.removeItem("roam_access_token");
    localStorage.removeItem("roam_user_type");
  }, []);

  // Immediate auth state validation to prevent loops
  const validateAuthState = useCallback(async (): Promise<boolean> => {
    if (authValidationRef.current) return true;
    
    try {
      const { supabase } = await import("@/lib/supabase");
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.log(" Auth validation failed:", error.message);
        clearStoredData();
        authValidationRef.current = true;
        return false;
      }
      
      if (!session?.user) {
        console.log(" No active session found");
        clearStoredData();
        authValidationRef.current = true;
        return false;
      }
      
      console.log(" Auth state validated for user:", session.user.id);
      authValidationRef.current = true;
      return true;
    } catch (error) {
      console.error(" Auth validation error:", error);
      clearStoredData();
      authValidationRef.current = true;
      return false;
    }
  }, [clearStoredData]);

  const processUserAuth = useCallback(async (userId: string, accessToken: string): Promise<boolean> => {
    // Validate auth state first
    const isValidAuth = await validateAuthState();
    if (!isValidAuth) {
      console.log(" Auth validation failed, skipping user processing");
      return false;
    }

    // Prevent duplicate processing with Set-based tracking
    if (authProcessingRef.current.has(userId)) {
      console.log(" Auth already processing for user:", userId);
      return true;
    }

    // Skip if this is the same user we just processed
    if (lastProcessedUserRef.current === userId) {
      console.log(" Skipping - same user already processed:", userId);
      return true;
    }

    authProcessingRef.current.add(userId);
    console.log(" Processing auth for user:", userId);
    
    try {
      const providerData = await AuthAPI.getProviderByUserId(userId);
      
      if (providerData) {
        console.log(" Provider data loaded:", providerData.provider_role);
        setProvider(providerData);
        lastProcessedUserRef.current = userId;
        
        localStorage.setItem("roam_provider", JSON.stringify(providerData));
        localStorage.setItem("roam_access_token", accessToken);
        localStorage.setItem("roam_user_type", "provider");
        apiClient.setAuthToken(accessToken);
        return true;
      } else {
        console.log(" No provider data found");
        clearStoredData();
        lastProcessedUserRef.current = null;
        return false;
      }
    } catch (error) {
      console.error(" Auth processing error:", error);
      clearStoredData();
      lastProcessedUserRef.current = null;
      return false;
    } finally {
      authProcessingRef.current.delete(userId);
    }
  }, [clearStoredData, validateAuthState]);

  // Initial auth setup with immediate validation
  useEffect(() => {
    if (authInitialized) return;

    const initAuth = async () => {
      try {
        // Immediate auth state validation
        const isValidAuth = await validateAuthState();
        if (!isValidAuth) {
          console.log(" Initial auth validation failed");
          setLoading(false);
          setAuthInitialized(true);
          return;
        }

        // Check localStorage first
        const storedProvider = localStorage.getItem("roam_provider");
        const storedToken = localStorage.getItem("roam_access_token");

        if (storedProvider && storedToken) {
          try {
            const providerData = JSON.parse(storedProvider);
            if (providerData.user_id) {
              setProvider(providerData);
              lastProcessedUserRef.current = providerData.user_id;
              apiClient.setAuthToken(storedToken);
              console.log(" Restored from localStorage:", providerData.provider_role);
              setLoading(false);
              setAuthInitialized(true);
              return;
            }
          } catch (e) {
            console.log(" Invalid stored data, clearing");
            clearStoredData();
          }
        }

        // Check current session
        const { data: { session } } = await import("@/lib/supabase").then(m => m.supabase.auth.getSession());
        
        if (session?.user) {
          await processUserAuth(session.user.id, session.access_token);
        } else {
          clearStoredData();
        }
      } catch (error) {
        console.error(" Auth initialization error:", error);
        clearStoredData();
      } finally {
        setLoading(false);
        setAuthInitialized(true);
      }
    };

    initAuth();
  }, [authInitialized, processUserAuth, clearStoredData, validateAuthState]);

  // Auth state listener
  useEffect(() => {
    if (!authInitialized) return;

    let authSubscription: any;
    
    const setupListener = async () => {
      const { supabase } = await import("@/lib/supabase");
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log(" Auth event:", event, session?.user?.id);
        
        if (event === 'SIGNED_IN' && session?.user) {
          // Only process if different from current user
          if (lastProcessedUserRef.current !== session.user.id) {
            console.log(" New sign-in detected");
            await processUserAuth(session.user.id, session.access_token);
          } else {
            console.log(" Same user sign-in, skipping");
          }
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          // For token refresh, only update if we don't have current provider data
          if (!provider && lastProcessedUserRef.current === session.user.id) {
            console.log(" Token refreshed, updating provider data");
            await processUserAuth(session.user.id, session.access_token);
          } else {
            console.log(" Token refreshed, but already have current data");
          }
        } else if (event === 'SIGNED_OUT') {
          console.log(" Sign-out detected");
          setProvider(null);
          lastProcessedUserRef.current = null;
          authProcessingRef.current.clear();
          clearStoredData();
          apiClient.clearAuthToken();
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
      console.error(" Sign out error:", error);
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
      console.error(" Refresh error:", error);
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
