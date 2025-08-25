import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { logger } from "@/utils/logger";

export const useOAuth = () => {
  const [oauthLoading, setOauthLoading] = useState(false);

  // Sign in with Google
  const signInWithGoogle = useCallback(async () => {
    try {
      setOauthLoading(true);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        logger.error("Google OAuth error:", error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Google sign in failed";
      logger.error("Error in signInWithGoogle:", error);
      return { success: false, error: errorMessage };
    } finally {
      setOauthLoading(false);
    }
  }, []);

  // Sign in with Facebook
  const signInWithFacebook = useCallback(async () => {
    try {
      setOauthLoading(true);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "facebook",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        logger.error("Facebook OAuth error:", error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Facebook sign in failed";
      logger.error("Error in signInWithFacebook:", error);
      return { success: false, error: errorMessage };
    } finally {
      setOauthLoading(false);
    }
  }, []);

  // Sign in with Apple
  const signInWithApple = useCallback(async () => {
    try {
      setOauthLoading(true);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        logger.error("Apple OAuth error:", error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Apple sign in failed";
      logger.error("Error in signInWithApple:", error);
      return { success: false, error: errorMessage };
    } finally {
      setOauthLoading(false);
    }
  }, []);

  // Handle OAuth callback
  const handleOAuthCallback = useCallback(async () => {
    try {
      setOauthLoading(true);

      const { data, error } = await supabase.auth.getSession();

      if (error) {
        logger.error("OAuth callback error:", error);
        return { success: false, error: error.message };
      }

      if (data.session?.user) {
        // Check if customer profile exists
        const { data: customerData, error: customerError } = await supabase
          .from("customer_profiles")
          .select("*")
          .eq("user_id", data.session.user.id)
          .single();

        if (customerError && customerError.code === "PGRST116") {
          // Customer profile doesn't exist, create one
          const userData = data.session.user.user_metadata;
          const { error: createError } = await supabase
            .from("customer_profiles")
            .insert([
              {
                user_id: data.session.user.id,
                first_name: userData.full_name?.split(" ")[0] || userData.name?.split(" ")[0] || "",
                last_name: userData.full_name?.split(" ").slice(1).join(" ") || userData.name?.split(" ").slice(1).join(" ") || "",
                email: data.session.user.email,
                phone: userData.phone || null,
              },
            ]);

          if (createError) {
            logger.error("Error creating customer profile from OAuth:", createError);
            return { success: false, error: "Profile creation failed" };
          }
        }

        return { success: true, user: data.session.user };
      }

      return { success: false, error: "No session found" };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "OAuth callback failed";
      logger.error("Error in handleOAuthCallback:", error);
      return { success: false, error: errorMessage };
    } finally {
      setOauthLoading(false);
    }
  }, []);

  return {
    oauthLoading,
    signInWithGoogle,
    signInWithFacebook,
    signInWithApple,
    handleOAuthCallback,
  };
};
