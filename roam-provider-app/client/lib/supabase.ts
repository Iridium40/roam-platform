import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@roam/shared/dist/types/database";

const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

// Only log environment variables once in development
if (import.meta.env.DEV && !window.__SUPABASE_DEBUG_LOGGED__) {
  console.log('=== Environment Variable Debug ===');
  console.log('NODE_ENV:', import.meta.env.MODE);
  console.log('VITE_PUBLIC_SUPABASE_URL:', supabaseUrl);
  console.log('VITE_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '***' + supabaseAnonKey.slice(-4) : 'undefined');
  console.log('All VITE_ env vars:', Object.keys(import.meta.env).filter(key => key.startsWith('VITE_')));
  window.__SUPABASE_DEBUG_LOGGED__ = true;
}

if (!supabaseUrl || !supabaseAnonKey) {
  const missingVars = [];
  if (!supabaseUrl) missingVars.push('VITE_PUBLIC_SUPABASE_URL');
  if (!supabaseAnonKey) missingVars.push('VITE_PUBLIC_SUPABASE_ANON_KEY');

  console.error("❌ Missing Supabase environment variables:", missingVars.join(', '));
  throw new Error(`Missing Supabase environment variables: ${missingVars.join(', ')}.`);
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
      storageKey: 'roam-provider-supabase-auth'
    },
    global: {
      headers: {
        'X-Client-Info': 'roam-provider-app'
      }
    }
  });

  // Test connection only once in development
  if (import.meta.env.DEV && !window.__SUPABASE_CONNECTION_TESTED__) {
    supabaseInstance.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error('❌ Supabase connection test failed:', error.message);
      } else {
        console.log('✅ Supabase connection test successful');
        console.log('Session data:', data.session ? 'Session exists' : 'No session');
      }
      window.__SUPABASE_CONNECTION_TESTED__ = true;
    }).catch(error => {
      console.error('❌ Supabase connection test error:', error.message);
      window.__SUPABASE_CONNECTION_TESTED__ = true;
    });
  }

  return supabaseInstance;
};

export const supabase = createSupabaseClient();

// Add type declarations to prevent TypeScript errors
declare global {
  interface Window {
    __SUPABASE_DEBUG_LOGGED__?: boolean;
    __SUPABASE_CONNECTION_TESTED__?: boolean;
  }
}
