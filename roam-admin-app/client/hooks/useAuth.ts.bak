import { useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("Session error:", error);
        // Handle refresh token errors immediately
        if (
          error?.message?.includes("Refresh Token Not Found") ||
          error?.message?.includes("Invalid Refresh Token") ||
          error?.message?.includes("JWT expired")
        ) {
          supabase.auth.signOut();
          localStorage.removeItem("admin_settings");
        }
        // Clear any invalid session data
        setSession(null);
        setUser(null);
      } else {
        setSession(session);
        setUser(session?.user ?? null);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {

      // Handle specific auth events
      if (event === "TOKEN_REFRESHED") {
      } else if (event === "SIGNED_OUT") {
        // Clear any stored session data
        localStorage.removeItem("admin_settings");
      }

      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    return { data, error };
  };

  const signUp = async (email: string, password: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    setLoading(false);
    return { data, error };
  };

  const signOut = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    setLoading(false);
    return { error };
  };

  const handleAuthError = async (error: any) => {
    console.error("Authentication error:", error);

    // Check if it's a refresh token error
    if (
      error?.message?.includes("Refresh Token Not Found") ||
      error?.message?.includes("Invalid Refresh Token") ||
      error?.message?.includes("JWT expired")
    ) {
      // Force sign out to clear invalid session
      await supabase.auth.signOut();
      // Clear any local storage data
      localStorage.removeItem("admin_settings");
      // The auth state change listener will handle the redirect
    }
  };

  return {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    handleAuthError,
  };
}
