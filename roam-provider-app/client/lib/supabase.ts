import { createClient } from "@supabase/supabase-js";
import type { Database } from "@roam/shared";

const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

// Debug environment variables in development
if (import.meta.env.DEV) {
  console.log('Supabase URL:', supabaseUrl);
  console.log('Supabase Anon Key:', supabaseAnonKey ? '***' + supabaseAnonKey.slice(-4) : 'undefined');
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase environment variables:");
  console.error("VITE_PUBLIC_SUPABASE_URL:", supabaseUrl);
  console.error("VITE_PUBLIC_SUPABASE_ANON_KEY:", supabaseAnonKey ? '***' + supabaseAnonKey.slice(-4) : 'undefined');
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
