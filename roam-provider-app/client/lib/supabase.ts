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

// Create admin client for server-side operations (only in browser if service role key is available)
// Note: Service role key should NEVER be exposed to the client in production
// This is only for admin operations that bypass RLS
let supabaseAdminInstance: SupabaseClient<Database> | null = null;

export const supabaseAdmin = (() => {
  // Only create admin client if service role key is available AND we're in development
  // In production, admin operations should be done server-side only
  if (supabaseAdminInstance) {
    return supabaseAdminInstance;
  }

  const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  
  // Only create admin client in development or if explicitly enabled
  if (serviceRoleKey && (import.meta.env.DEV || import.meta.env.VITE_ENABLE_ADMIN_CLIENT === 'true')) {
    supabaseAdminInstance = createClient<Database>(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          storageKey: 'roam-provider-admin-auth' // Use different storage key to avoid conflicts
        },
        global: {
          headers: {
            'X-Client-Info': 'roam-provider-admin'
          }
        }
      }
    );
    return supabaseAdminInstance;
  }

  // Return regular client as fallback (should not be used for admin operations)
  console.warn('Admin client not available - using regular client. Admin operations should be done server-side.');
  return supabase;
})();

// Add type declarations to prevent TypeScript errors
declare global {
  interface Window {
    __SUPABASE_DEBUG_LOGGED__?: boolean;
    __SUPABASE_CONNECTION_TESTED__?: boolean;
  }
}

