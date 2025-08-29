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
  const missingVars = [];
  if (!supabaseUrl) missingVars.push('VITE_PUBLIC_SUPABASE_URL');
  if (!supabaseAnonKey) missingVars.push('VITE_PUBLIC_SUPABASE_ANON_KEY');

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
