import { createClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

// Main Supabase client with proper typing
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: { 
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  realtime: { 
    params: { eventsPerSecond: 10 } 
  }
});

// Service role client for admin operations
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey,
  {
    auth: { autoRefreshToken: false }
  }
);

// Export types for convenience
export type { Database } from "../database.types";
export type { AuthCustomer, AuthProvider } from "../database.types";
