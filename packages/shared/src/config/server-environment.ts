import { z } from 'zod';

// Server-side environment variable schema for validation
const ServerEnvironmentSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Supabase configuration
  VITE_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  VITE_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service role key is required'),
  
  // Stripe configuration
  VITE_STRIPE_PUBLISHABLE_KEY: z.string().min(1, 'Stripe publishable key is required'),
  STRIPE_SECRET_KEY: z.string().min(1, 'Stripe secret key is required'),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  
  // Twilio configuration
  VITE_TWILIO_ACCOUNT_SID: z.string().min(1, 'Twilio account SID is required'),
  VITE_TWILIO_AUTH_TOKEN: z.string().min(1, 'Twilio auth token is required'),
  VITE_TWILIO_CONVERSATIONS_SERVICE_SID: z.string().min(1, 'Twilio conversations service SID is required'),
  TWILIO_FROM_NUMBER: z.string().optional(),
  
  // Email configuration (Resend)
  RESEND_API_KEY: z.string().min(1, 'Resend API key is required'),
  
  // Email verification (Emailable)
  EMAILABLE_API_KEY: z.string().optional(), // Server-side only
  
  // Plaid configuration
  PLAID_CLIENT_ID: z.string().optional(),
  PLAID_SECRET: z.string().optional(),
  PLAID_ENV: z.enum(['sandbox', 'development', 'production']).default('sandbox'),
  PLAID_WEBHOOK_URL: z.string().optional(),
  
  // Google configuration
  VITE_GOOGLE_MAPS_API_KEY: z.string().optional(),
  VITE_GOOGLE_CLIENT_ID: z.string().optional(),
  
  // App configuration
  VITE_APP_URL: z.string().url('Invalid app URL').optional(),
  VITE_API_BASE_URL: z.string().url('Invalid API base URL').optional(),
  VITE_APP_VERSION: z.string().default('1.0.0'),
  FRONTEND_URL: z.string().optional(),
  
  // Feature flags
  VITE_ENABLE_REAL_TIME: z.string().transform((val: string) => val === 'true').default('false'),
  VITE_ENABLE_ANALYTICS: z.string().transform((val: string) => val === 'true').default('false'),
  VITE_ENABLE_DEBUG_MODE: z.string().transform((val: string) => val === 'true').default('false'),
  VITE_ENABLE_PERFORMANCE_MONITORING: z.string().transform((val: string) => val === 'true').default('false'),
  
  // JWT configuration
  JWT_SECRET: z.string().min(1, 'JWT secret is required'),
  
  // Push notifications
  VITE_VAPID_PUBLIC_KEY: z.string().optional(),
  
  // CDN and external services
  VITE_CDN_BASE_URL: z.string().optional(),
  VITE_GA_TRACKING_ID: z.string().optional(),
  VITE_SENTRY_DSN: z.string().optional(),
  
  // Development overrides
  VITE_JWT_SECRET: z.string().optional(),
  VITE_RESEND_API_KEY: z.string().optional(),
  VITE_SUPABASE_URL: z.string().optional(),
  VITE_SUPABASE_ANON_KEY: z.string().optional(),
  
  // Test/Development variables
  PING_MESSAGE: z.string().optional(),
});

// Server-side environment configuration type
export type ServerEnvironmentConfigType = z.infer<typeof ServerEnvironmentSchema>;

// Server-side environment configuration class
export class ServerEnvironmentConfig {
  private static instance: ServerEnvironmentConfig | null = null;
  private config: ServerEnvironmentConfigType;

  private constructor() {
    this.config = this.loadAndValidateConfig();
  }

  public static getInstance(): ServerEnvironmentConfig {
    if (!ServerEnvironmentConfig.instance) {
      ServerEnvironmentConfig.instance = new ServerEnvironmentConfig();
    }
    return ServerEnvironmentConfig.instance;
  }

  private loadAndValidateConfig(): ServerEnvironmentConfigType {
    try {
      // Load environment variables from process.env
      const envVars = {
        NODE_ENV: process.env.NODE_ENV,
        VITE_PUBLIC_SUPABASE_URL: process.env.VITE_PUBLIC_SUPABASE_URL,
        VITE_PUBLIC_SUPABASE_ANON_KEY: process.env.VITE_PUBLIC_SUPABASE_ANON_KEY,
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
        VITE_STRIPE_PUBLISHABLE_KEY: process.env.VITE_STRIPE_PUBLISHABLE_KEY,
        STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
        STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
        VITE_TWILIO_ACCOUNT_SID: process.env.VITE_TWILIO_ACCOUNT_SID,
        VITE_TWILIO_AUTH_TOKEN: process.env.VITE_TWILIO_AUTH_TOKEN,
        VITE_TWILIO_CONVERSATIONS_SERVICE_SID: process.env.VITE_TWILIO_CONVERSATIONS_SERVICE_SID,
        TWILIO_FROM_NUMBER: process.env.TWILIO_FROM_NUMBER,
        RESEND_API_KEY: process.env.RESEND_API_KEY,
        EMAILABLE_API_KEY: process.env.EMAILABLE_API_KEY,
        PLAID_CLIENT_ID: process.env.PLAID_CLIENT_ID,
        PLAID_SECRET: process.env.PLAID_SECRET,
        PLAID_ENV: process.env.PLAID_ENV,
        PLAID_WEBHOOK_URL: process.env.PLAID_WEBHOOK_URL,
        VITE_GOOGLE_MAPS_API_KEY: process.env.VITE_GOOGLE_MAPS_API_KEY,
        VITE_GOOGLE_CLIENT_ID: process.env.VITE_GOOGLE_CLIENT_ID,
        VITE_APP_URL: process.env.VITE_APP_URL,
        VITE_API_BASE_URL: process.env.VITE_API_BASE_URL,
        VITE_APP_VERSION: process.env.VITE_APP_VERSION,
        FRONTEND_URL: process.env.FRONTEND_URL,
        VITE_ENABLE_REAL_TIME: process.env.VITE_ENABLE_REAL_TIME,
        VITE_ENABLE_ANALYTICS: process.env.VITE_ENABLE_ANALYTICS,
        VITE_ENABLE_DEBUG_MODE: process.env.VITE_ENABLE_DEBUG_MODE,
        VITE_ENABLE_PERFORMANCE_MONITORING: process.env.VITE_ENABLE_PERFORMANCE_MONITORING,
        JWT_SECRET: process.env.JWT_SECRET,
        VITE_JWT_SECRET: process.env.VITE_JWT_SECRET,
        VITE_RESEND_API_KEY: process.env.VITE_RESEND_API_KEY,
        VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
        VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
        VITE_VAPID_PUBLIC_KEY: process.env.VITE_VAPID_PUBLIC_KEY,
        VITE_CDN_BASE_URL: process.env.VITE_CDN_BASE_URL,
        VITE_GA_TRACKING_ID: process.env.VITE_GA_TRACKING_ID,
        VITE_SENTRY_DSN: process.env.VITE_SENTRY_DSN,
        PING_MESSAGE: process.env.PING_MESSAGE,
      };

      // Validate and parse environment variables
      const validatedConfig = ServerEnvironmentSchema.parse(envVars);
      
      // Apply fallbacks for development
      if (validatedConfig.NODE_ENV === 'development') {
        validatedConfig.JWT_SECRET = validatedConfig.JWT_SECRET || validatedConfig.VITE_JWT_SECRET || '';
        validatedConfig.RESEND_API_KEY = validatedConfig.RESEND_API_KEY || validatedConfig.VITE_RESEND_API_KEY || '';
        validatedConfig.VITE_PUBLIC_SUPABASE_URL = validatedConfig.VITE_PUBLIC_SUPABASE_URL || validatedConfig.VITE_SUPABASE_URL || '';
        validatedConfig.VITE_PUBLIC_SUPABASE_ANON_KEY = validatedConfig.VITE_PUBLIC_SUPABASE_ANON_KEY || validatedConfig.VITE_SUPABASE_ANON_KEY || '';
        validatedConfig.EMAILABLE_API_KEY = validatedConfig.EMAILABLE_API_KEY || '';
      }

      return validatedConfig;
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('❌ Server environment validation failed:');
        error.errors.forEach((err: any) => {
          console.error(`  - ${err.path.join('.')}: ${err.message}`);
        });
        console.error('\n🔧 Please check your .env file and ensure all required variables are set.');
        console.error('📋 See packages/shared/src/config/server-environment.ts for the complete list of required variables.');
      }
      throw new Error(`Server environment configuration error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Getters for all configuration values
  public get nodeEnv(): string {
    return this.config.NODE_ENV;
  }

  public get supabase() {
    return {
      url: this.config.VITE_PUBLIC_SUPABASE_URL,
      anonKey: this.config.VITE_PUBLIC_SUPABASE_ANON_KEY,
      serviceRoleKey: this.config.SUPABASE_SERVICE_ROLE_KEY,
    };
  }

  public get stripe() {
    return {
      publishableKey: this.config.VITE_STRIPE_PUBLISHABLE_KEY,
      secretKey: this.config.STRIPE_SECRET_KEY,
      webhookSecret: this.config.STRIPE_WEBHOOK_SECRET,
    };
  }

  public get twilio() {
    return {
      accountSid: this.config.VITE_TWILIO_ACCOUNT_SID,
      authToken: this.config.VITE_TWILIO_AUTH_TOKEN,
      conversationsServiceSid: this.config.VITE_TWILIO_CONVERSATIONS_SERVICE_SID,
      fromNumber: this.config.TWILIO_FROM_NUMBER,
    };
  }

  public get email() {
    return {
      resendApiKey: this.config.RESEND_API_KEY,
      emailableApiKey: this.config.EMAILABLE_API_KEY,
    };
  }

  public get plaid() {
    return {
      clientId: this.config.PLAID_CLIENT_ID,
      secret: this.config.PLAID_SECRET,
      env: this.config.PLAID_ENV,
      webhookUrl: this.config.PLAID_WEBHOOK_URL,
    };
  }

  public get google() {
    return {
      mapsApiKey: this.config.VITE_GOOGLE_MAPS_API_KEY,
      clientId: this.config.VITE_GOOGLE_CLIENT_ID,
    };
  }

  public get app() {
    return {
      url: this.config.VITE_APP_URL,
      apiBaseUrl: this.config.VITE_API_BASE_URL,
      version: this.config.VITE_APP_VERSION,
      frontendUrl: this.config.FRONTEND_URL,
    };
  }

  public get features() {
    return {
      enableRealTime: this.config.VITE_ENABLE_REAL_TIME,
      enableAnalytics: this.config.VITE_ENABLE_ANALYTICS,
      enableDebugMode: this.config.VITE_ENABLE_DEBUG_MODE,
      enablePerformanceMonitoring: this.config.VITE_ENABLE_PERFORMANCE_MONITORING,
    };
  }

  public get jwt() {
    return {
      secret: this.config.JWT_SECRET,
    };
  }

  public get pushNotifications() {
    return {
      vapidPublicKey: this.config.VITE_VAPID_PUBLIC_KEY,
    };
  }

  public get cdn() {
    return {
      baseUrl: this.config.VITE_CDN_BASE_URL,
    };
  }

  public get analytics() {
    return {
      gaTrackingId: this.config.VITE_GA_TRACKING_ID,
    };
  }

  public get sentry() {
    return {
      dsn: this.config.VITE_SENTRY_DSN,
    };
  }

  public get test() {
    return {
      pingMessage: this.config.PING_MESSAGE,
    };
  }

  // Utility methods
  public isDevelopment(): boolean {
    return this.config.NODE_ENV === 'development';
  }

  public isProduction(): boolean {
    return this.config.NODE_ENV === 'production';
  }

  public isTest(): boolean {
    return this.config.NODE_ENV === 'test';
  }

  // Get all configuration for debugging
  public getAllConfig(): ServerEnvironmentConfigType {
    return { ...this.config };
  }

  // Validate specific service configurations
  public validateSupabaseConfig(): boolean {
    return !!(this.config.VITE_PUBLIC_SUPABASE_URL && 
              this.config.VITE_PUBLIC_SUPABASE_ANON_KEY && 
              this.config.SUPABASE_SERVICE_ROLE_KEY);
  }

  public validateStripeConfig(): boolean {
    return !!(this.config.VITE_STRIPE_PUBLISHABLE_KEY && this.config.STRIPE_SECRET_KEY);
  }

  public validateTwilioConfig(): boolean {
    return !!(this.config.VITE_TWILIO_ACCOUNT_SID && 
              this.config.VITE_TWILIO_AUTH_TOKEN && 
              this.config.VITE_TWILIO_CONVERSATIONS_SERVICE_SID);
  }

  public validateEmailConfig(): boolean {
    return !!this.config.RESEND_API_KEY;
  }

  public validatePlaidConfig(): boolean {
    return !!(this.config.PLAID_CLIENT_ID && this.config.PLAID_SECRET && this.config.PLAID_WEBHOOK_URL);
  }
}

// Export singleton instance
export const serverEnv = ServerEnvironmentConfig.getInstance();

// Export helper functions for backward compatibility
export const getServerEnvironmentConfig = () => ServerEnvironmentConfig.getInstance();
export const validateServerEnvironment = () => {
  try {
    ServerEnvironmentConfig.getInstance();
    return true;
  } catch {
    return false;
  }
};
