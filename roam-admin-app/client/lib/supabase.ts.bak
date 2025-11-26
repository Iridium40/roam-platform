import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

// Check for missing environment variables and provide helpful error messages
const missingVars: string[] = [];
  if (!supabaseUrl) missingVars.push("VITE_PUBLIC_SUPABASE_URL");
  if (!supabaseAnonKey) missingVars.push("VITE_PUBLIC_SUPABASE_ANON_KEY");

if (missingVars.length > 0) {
  console.error("❌ Missing Supabase environment variables:", missingVars.join(', '));
  console.error("\n🔧 Quick Fix:");
  console.error("1. For local development: Create .env file with:");
  console.error("   VITE_PUBLIC_SUPABASE_URL=https://your-project.supabase.co");
  console.error("   VITE_PUBLIC_SUPABASE_ANON_KEY=your-anon-key");
  console.error("\n2. For production: Set environment variables in your deployment platform");
  console.error("\n📋 Get credentials from: https://supabase.com/dashboard → Your Project → Settings → API");
  console.error("\n📖 See ENVIRONMENT_SETUP_GUIDE.md for detailed instructions");

  throw new Error(`Missing Supabase environment variables: ${missingVars.join(', ')}. See console for setup instructions.`);
}

// Log Supabase URL for debugging (only in development)
if (import.meta.env.DEV) {
  console.log(
    "🔗 Supabase URL:",
    supabaseUrl
      .replace(/https?:\/\//, "")
      .replace(/\.supabase\.co.*/, ".supabase.co"),
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Export helper for checking if Supabase is configured
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Export missing variables for UI components
export const getMissingSupabaseVars = () => {
  const missing: string[] = [];
  if (!import.meta.env.VITE_PUBLIC_SUPABASE_URL) missing.push("VITE_PUBLIC_SUPABASE_URL");
  if (!import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY)
    missing.push("VITE_PUBLIC_SUPABASE_ANON_KEY");
  return missing;
};

// Export types for database tables
export type Database = {
  public: {
    Tables: {
      // Add your table types here as you create them
      // Example:
      // users: {
      //   Row: {
      //     id: string;
      //     email: string;
      //     created_at: string;
      //   };
      //   Insert: {
      //     email: string;
      //   };
      //   Update: {
      //     email?: string;
      //   };
      // };
    };
  };
};
