import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@roam/shared";

const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

// Only log environment variables once in development
if (import.meta.env.DEV && !window.__SUPABASE_ADMIN_DEBUG_LOGGED__) {
  console.log('=== Admin App Environment Variable Debug ===');
  console.log('NODE_ENV:', import.meta.env.MODE);
  console.log('VITE_PUBLIC_SUPABASE_URL:', supabaseUrl);
  console.log('VITE_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '***' + supabaseAnonKey.slice(-4) : 'undefined');
  console.log('All VITE_ env vars:', Object.keys(import.meta.env).filter(key => key.startsWith('VITE_')));
  window.__SUPABASE_ADMIN_DEBUG_LOGGED__ = true;
}

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

// Singleton pattern to prevent multiple GoTrueClient instances
let supabaseInstance: SupabaseClient<Database> | null = null;

const createSupabaseClient = (): SupabaseClient<Database> => {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      // Use a specific storage key to avoid conflicts
      storageKey: 'roam-admin-supabase-auth'
    },
    global: {
      headers: {
        'X-Client-Info': 'roam-admin-app'
      }
    }
  });

  // Test connection only once in development
  if (import.meta.env.DEV && !window.__SUPABASE_ADMIN_CONNECTION_TESTED__) {
    supabaseInstance.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error('❌ Supabase connection test failed:', error.message);
      } else {
        console.log('✅ Supabase connection test successful');
        console.log('Session data:', data.session ? 'Session exists' : 'No session');
      }
      window.__SUPABASE_ADMIN_CONNECTION_TESTED__ = true;
    }).catch(error => {
      console.error('❌ Supabase connection test error:', error.message);
      window.__SUPABASE_ADMIN_CONNECTION_TESTED__ = true;
    });
  }

  return supabaseInstance;
};

export const supabase = createSupabaseClient();

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

// Add type declarations to prevent TypeScript errors
declare global {
  interface Window {
    __SUPABASE_ADMIN_DEBUG_LOGGED__?: boolean;
    __SUPABASE_ADMIN_CONNECTION_TESTED__?: boolean;
  }
}

// Re-export Database type for convenience
export type { Database };
