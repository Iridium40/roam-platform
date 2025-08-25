import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { logger } from "@/utils/logger";

export const useAuth = () => {
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        setLoading(true);
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          logger.error("Session check error:", sessionError);
          setError(sessionError.message);
          return;
        }

        if (session?.user) {
          await fetchCustomerProfile(session.user.id);
        }
      } catch (error: unknown) {
        logger.error("Error checking session:", error);
        setError("Failed to check authentication status");
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        logger.info("Auth state changed:", event, session?.user?.id);

        if (event === "SIGNED_IN" && session?.user) {
          await fetchCustomerProfile(session.user.id);
        } else if (event === "SIGNED_OUT") {
          setCustomer(null);
          setError(null);
        } else if (event === "TOKEN_REFRESHED" && session?.user) {
          await fetchCustomerProfile(session.user.id);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Fetch customer profile
  const fetchCustomerProfile = useCallback(async (userId: string) => {
    try {
      const { data: customerData, error: customerError } = await supabase
        .from("customer_profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (customerError) {
        logger.error("Error fetching customer profile:", customerError);
        setError("Failed to fetch customer profile");
        return;
      }

      if (customerData) {
        setCustomer(customerData);
        setError(null);
      }
    } catch (error: unknown) {
      logger.error("Error in fetchCustomerProfile:", error);
      setError("Failed to fetch customer profile");
    }
  }, []);

  // Sign in
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return { success: false, error: error.message };
      }

      if (data.user) {
        await fetchCustomerProfile(data.user.id);
        return { success: true };
      }

      return { success: false, error: "Sign in failed" };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Sign in failed";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [fetchCustomerProfile]);

  // Sign up
  const signUp = useCallback(async (email: string, password: string, userData: any) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
        },
      });

      if (error) {
        setError(error.message);
        return { success: false, error: error.message };
      }

      if (data.user) {
        // Create customer profile
        const { error: profileError } = await supabase
          .from("customer_profiles")
          .insert([
            {
              user_id: data.user.id,
              first_name: userData.first_name,
              last_name: userData.last_name,
              email: email,
              phone: userData.phone || null,
            },
          ]);

        if (profileError) {
          logger.error("Error creating customer profile:", profileError);
          setError("Account created but profile setup failed");
          return { success: false, error: "Profile setup failed" };
        }

        await fetchCustomerProfile(data.user.id);
        return { success: true };
      }

      return { success: false, error: "Sign up failed" };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Sign up failed";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [fetchCustomerProfile]);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();

      if (error) {
        setError(error.message);
        return { success: false, error: error.message };
      }

      setCustomer(null);
      setError(null);
      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Sign out failed";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    customer,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    fetchCustomerProfile,
  };
};
