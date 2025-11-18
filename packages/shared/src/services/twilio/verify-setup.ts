/**
 * Twilio Conversations Setup Verification
 * 
 * Use this utility to verify that all Twilio environment variables
 * and Supabase configuration are properly set up.
 */

import { createTwilioConversationsService } from './TwilioConversationsService';
import { ConversationService } from './ConversationService';
import type { TwilioConfig } from './types';

/**
 * Verify Twilio configuration
 */
export function verifyTwilioConfig(): {
  isValid: boolean;
  missing: string[];
  config?: TwilioConfig;
} {
  const envSource = typeof window !== 'undefined' 
    ? (import.meta as any).env 
    : process.env;

  const accountSid = envSource.VITE_TWILIO_ACCOUNT_SID || envSource.TWILIO_ACCOUNT_SID;
  const authToken = envSource.VITE_TWILIO_AUTH_TOKEN || envSource.TWILIO_AUTH_TOKEN;
  const conversationsServiceSid = envSource.VITE_TWILIO_CONVERSATIONS_SERVICE_SID || envSource.TWILIO_CONVERSATIONS_SERVICE_SID;

  const missing: string[] = [];
  
  if (!accountSid) missing.push('VITE_TWILIO_ACCOUNT_SID or TWILIO_ACCOUNT_SID');
  if (!authToken) missing.push('VITE_TWILIO_AUTH_TOKEN or TWILIO_AUTH_TOKEN');
  if (!conversationsServiceSid) missing.push('VITE_TWILIO_CONVERSATIONS_SERVICE_SID or TWILIO_CONVERSATIONS_SERVICE_SID');

  return {
    isValid: missing.length === 0,
    missing,
    config: missing.length === 0 ? {
      accountSid,
      authToken,
      conversationsServiceSid,
    } : undefined,
  };
}

/**
 * Verify Supabase configuration
 */
export function verifySupabaseConfig(): {
  isValid: boolean;
  missing: string[];
  hasServiceRole: boolean;
} {
  const envSource = typeof window !== 'undefined' 
    ? (import.meta as any).env 
    : process.env;

  const supabaseUrl = envSource.VITE_PUBLIC_SUPABASE_URL || envSource.SUPABASE_URL;
  const supabaseAnonKey = envSource.VITE_PUBLIC_SUPABASE_ANON_KEY || envSource.SUPABASE_ANON_KEY;
  const supabaseServiceKey = envSource.SUPABASE_SERVICE_ROLE_KEY;

  const missing: string[] = [];
  
  if (!supabaseUrl) missing.push('VITE_PUBLIC_SUPABASE_URL or SUPABASE_URL');
  if (!supabaseAnonKey && !supabaseServiceKey) {
    missing.push('VITE_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY');
  }

  return {
    isValid: missing.length === 0,
    missing,
    hasServiceRole: !!supabaseServiceKey,
  };
}

/**
 * Verify complete setup (Twilio + Supabase)
 */
export function verifyCompleteSetup(): {
  twilio: ReturnType<typeof verifyTwilioConfig>;
  supabase: ReturnType<typeof verifySupabaseConfig>;
  allValid: boolean;
  canCreateService: boolean;
} {
  const twilio = verifyTwilioConfig();
  const supabase = verifySupabaseConfig();
  
  const allValid = twilio.isValid && supabase.isValid;
  const canCreateService = allValid && (supabase.hasServiceRole || !!(
    typeof window !== 'undefined' 
      ? (import.meta as any).env?.VITE_PUBLIC_SUPABASE_ANON_KEY
      : process.env.VITE_PUBLIC_SUPABASE_ANON_KEY
  ));

  return {
    twilio,
    supabase,
    allValid,
    canCreateService,
  };
}

/**
 * Test Twilio connection by listing conversations
 */
export async function testTwilioConnection(): Promise<{
  success: boolean;
  error?: string;
  conversationCount?: number;
}> {
  try {
    const verification = verifyTwilioConfig();
    
    if (!verification.isValid || !verification.config) {
      return {
        success: false,
        error: `Missing Twilio configuration: ${verification.missing.join(', ')}`,
      };
    }

    const conversationService = new ConversationService(verification.config);
    const result = await conversationService.listConversations(1);

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to connect to Twilio',
      };
    }

    return {
      success: true,
      conversationCount: Array.isArray(result.data) ? result.data.length : 0,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test service initialization
 */
export async function testServiceInitialization(): Promise<{
  success: boolean;
  error?: string;
  serviceCreated: boolean;
}> {
  try {
    const verification = verifyCompleteSetup();
    
    if (!verification.canCreateService) {
      return {
        success: false,
        error: `Setup incomplete. Missing: ${[
          ...verification.twilio.missing,
          ...verification.supabase.missing,
        ].join(', ')}`,
        serviceCreated: false,
      };
    }

    const service = createTwilioConversationsService();
    
    if (!service) {
      return {
        success: false,
        error: 'Failed to create TwilioConversationsService',
        serviceCreated: false,
      };
    }

    return {
      success: true,
      serviceCreated: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      serviceCreated: false,
    };
  }
}

/**
 * Print setup status to console (useful for debugging)
 */
export function printSetupStatus(): void {
  const setup = verifyCompleteSetup();
  
  console.log('=== Twilio Conversations Setup Status ===');
  console.log('\n📱 Twilio Configuration:');
  console.log(`  Valid: ${setup.twilio.isValid ? '✅' : '❌'}`);
  if (setup.twilio.missing.length > 0) {
    console.log(`  Missing: ${setup.twilio.missing.join(', ')}`);
  } else {
    console.log('  Account SID: ✅');
    console.log('  Auth Token: ✅');
    console.log('  Conversations Service SID: ✅');
  }
  
  console.log('\n🗄️  Supabase Configuration:');
  console.log(`  Valid: ${setup.supabase.isValid ? '✅' : '❌'}`);
  if (setup.supabase.missing.length > 0) {
    console.log(`  Missing: ${setup.supabase.missing.join(', ')}`);
  } else {
    console.log('  Supabase URL: ✅');
    console.log(`  Service Role Key: ${setup.supabase.hasServiceRole ? '✅' : '⚠️  (using anon key)'}`);
    console.log('  Anon Key: ✅');
  }
  
  console.log('\n🎯 Overall Status:');
  console.log(`  All Valid: ${setup.allValid ? '✅' : '❌'}`);
  console.log(`  Can Create Service: ${setup.canCreateService ? '✅' : '❌'}`);
  console.log('\n========================================\n');
}

