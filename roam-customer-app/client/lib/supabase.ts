import { createClient } from "@supabase/supabase-js";
import type { Database } from "@roam/shared";
import { logger } from '@/utils/logger';

const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

// Environment variable validation

// Test URL format
if (supabaseUrl) {
  try {
    const url = new URL(supabaseUrl);
  } catch (error) {
    console.error('Invalid Supabase URL format:', error);
  }
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase environment variables:");
  console.error("VITE_PUBLIC_SUPABASE_URL:", supabaseUrl);
  console.error("VITE_PUBLIC_SUPABASE_ANON_KEY:", supabaseAnonKey ? '***' + supabaseAnonKey.slice(-4) : 'undefined');
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'X-Client-Info': 'roam-customer-app'
    }
  }
});

// Test Supabase connection
supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error('Supabase connection test failed:', error);
  }
}).catch(error => {
  console.error('Supabase connection test error:', error);
});
