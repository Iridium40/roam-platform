import { createClient } from "@supabase/supabase-js";
import type { Database } from "@roam/shared";

const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

// Comprehensive debugging for environment variables
console.log('=== Environment Variable Debug ===');
console.log('NODE_ENV:', import.meta.env.MODE);
console.log('VITE_PUBLIC_SUPABASE_URL:', supabaseUrl);
console.log('VITE_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '***' + supabaseAnonKey.slice(-4) : 'undefined');
console.log('All VITE_ env vars:', Object.keys(import.meta.env).filter(key => key.startsWith('VITE_')));

// Test URL format
if (supabaseUrl) {
  try {
    const url = new URL(supabaseUrl);
    console.log('Supabase URL is valid:', url.toString());
    console.log('Protocol:', url.protocol);
    console.log('Hostname:', url.hostname);
    console.log('Port:', url.port);
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

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Test Supabase connection
supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error('Supabase connection test failed:', error);
  } else {
    console.log('Supabase connection test successful');
  }
}).catch(error => {
  console.error('Supabase connection test error:', error);
});
