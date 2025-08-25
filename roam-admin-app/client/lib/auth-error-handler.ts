import { supabase } from "./supabase";

/**
 * Global authentication error handler
 * Call this function whenever you catch an authentication-related error
 */
export const handleAuthError = async (error: any): Promise<boolean> => {
  console.error("Authentication error:", error);

  // Check if it's a refresh token error or session-related error
  const isAuthError =
    error?.message?.includes("Refresh Token Not Found") ||
    error?.message?.includes("Invalid Refresh Token") ||
    error?.message?.includes("JWT expired") ||
    error?.message?.includes("Invalid JWT") ||
    error?.message?.includes("Auth session missing") ||
    error?.code === "PGRST301"; // PostgREST auth error

  if (isAuthError) {

    try {
      // Force sign out to clear invalid session
      await supabase.auth.signOut();

      // Clear any local storage data
      localStorage.removeItem("admin_settings");
      localStorage.removeItem("supabase.auth.token");

      // Clear session storage as well
      sessionStorage.clear();


      // Show user notification if possible
      try {
        const event = new CustomEvent("auth-session-expired", {
          detail: { message: "Your session has expired. Please log in again." },
        });
        window.dispatchEvent(event);
      } catch (e) {
        // Ignore if custom events aren't supported
      }

      // Small delay to allow any cleanup, then redirect
      setTimeout(() => {
        if (window.location.pathname !== "/admin/login") {
          window.location.href = "/admin/login";
        }
      }, 1000);

      return true; // Indicates that auth error was handled
    } catch (signOutError) {
      console.error("Error during forced sign out:", signOutError);
      // Even if sign out fails, redirect to login
      window.location.href = "/admin/login";
      return true;
    }
  }

  return false; // Not an auth error
};

/**
 * Wrapper for Supabase operations that automatically handles auth errors
 */
export const withAuthErrorHandling = async <T>(
  operation: () => Promise<T>,
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    const wasHandled = await handleAuthError(error);
    if (!wasHandled) {
      // Re-throw if it wasn't an auth error
      throw error;
    }
    // If it was an auth error, we've handled it and redirected
    throw new Error("Authentication session expired. Please log in again.");
  }
};
