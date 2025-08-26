import { createClient } from "@supabase/supabase-js";
import type { Database } from "@roam/shared";
import { logger } from '@/utils/logger';

const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

// Comprehensive debugging for environment variables
console.log('=== Customer App Environment Variable Debug ===');
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
    
    // Test network connectivity to the hostname
    console.log('Testing network connectivity...');
    fetch(`${url.protocol}//${url.hostname}/rest/v1/`, {
      method: 'HEAD',
      mode: 'cors',
      headers: {
        'apikey': supabaseAnonKey || '',
        'Authorization': `Bearer ${supabaseAnonKey || ''}`
      }
    }).then(response => {
      console.log('✅ Network connectivity test successful:', response.status);
    }).catch(error => {
      console.error('❌ Network connectivity test failed:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        type: error.constructor.name
      });
    });
    
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

// Test Supabase connection with detailed error handling
supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error('❌ Supabase connection test failed:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      status: error.status,
      statusText: error.statusText
    });
  } else {
    console.log('✅ Supabase connection test successful');
    console.log('Session data:', data.session ? 'Session exists' : 'No session');
  }
}).catch(error => {
  console.error('❌ Supabase connection test error:', error);
  console.error('Error details:', {
    name: error.name,
    message: error.message,
    type: error.constructor.name,
    stack: error.stack?.split('\n').slice(0, 3).join('\n')
  });
});
