import { createClient } from '@supabase/supabase-js';

/**
 * Create a Supabase client for Vercel serverless functions
 * Returns null if environment variables are not configured
 */
export function createSupabaseClient() {
  const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      envKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE'))
    });
    return null;
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        'x-application-name': 'roam-admin-vercel'
      }
    }
  });
}

/**
 * Validate that required environment variables are set
 * Returns error response if validation fails, null if successful
 */
export function validateEnvironment() {
  const requiredVars = [
    'VITE_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    return {
      error: 'Server configuration error',
      details: `Missing required environment variables: ${missing.join(', ')}`,
      hint: 'Please set these variables in your Vercel project settings'
    };
  }
  
  return null;
}
