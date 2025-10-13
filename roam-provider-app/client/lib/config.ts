// Centralized configuration management using shared environment config
import { env } from '@roam/shared/dist/config/environment';

// Re-export the shared configuration for backward compatibility
export const config = {
  api: {
    baseUrl: env.app.apiBaseUrl || '/api',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
  },
  supabase: {
    url: env.supabase.url,
    anonKey: env.supabase.anonKey,
    serviceRoleKey: env.supabase.serviceRoleKey,
  },
  stripe: {
    publishableKey: env.stripe.publishableKey,
    secretKey: env.stripe.secretKey,
    webhookSecret: env.stripe.webhookSecret,
  },
  plaid: {
    clientId: env.plaid.clientId,
    secret: env.plaid.secret,
    env: env.plaid.env,
    webhookUrl: env.plaid.webhookUrl,
  },
  twilio: {
    accountSid: env.twilio.accountSid,
    authToken: env.twilio.authToken,
    conversationsServiceSid: env.twilio.conversationsServiceSid,
    fromNumber: env.twilio.fromNumber,
  },
  email: {
    resendApiKey: env.email.resendApiKey,
  },
  google: {
    mapsApiKey: env.google.mapsApiKey,
    clientId: env.google.clientId,
  },
  features: {
    enableRealTime: env.features.enableRealTime,
    enableAnalytics: env.features.enableAnalytics,
    enableDebugMode: env.features.enableDebugMode,
    enablePerformanceMonitoring: env.features.enablePerformanceMonitoring,
  },
  app: {
    name: 'ROAM Partner Portal',
    version: env.app.version,
    environment: env.nodeEnv,
    isDevelopment: env.isDevelopment(),
    isProduction: env.isProduction(),
    url: env.app.url,
    frontendUrl: env.app.frontendUrl,
  },
  pushNotifications: {
    vapidPublicKey: env.pushNotifications.vapidPublicKey,
  },
  cdn: {
    baseUrl: env.cdn.baseUrl,
  },
  analytics: {
    gaTrackingId: env.analytics.gaTrackingId,
  },
  sentry: {
    dsn: env.sentry.dsn,
  },
  limits: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxImageSize: 5 * 1024 * 1024, // 5MB
    maxUploadRetries: 3,
    maxSearchResults: 100,
    maxPaginationLimit: 50,
  },
  timeouts: {
    apiRequest: 30000,
    fileUpload: 60000,
    realtimeConnection: 10000,
    sessionTimeout: 3600000, // 1 hour
  },
  urls: {
    termsOfService: '/terms',
    privacyPolicy: '/privacy',
    support: '/support',
    documentation: '/docs',
  },
} as const;

// Type-safe configuration access
export type Config = typeof config;

// Environment-specific configurations
export const getEnvironmentConfig = () => {
  const env = config.app.environment;
  
  switch (env) {
    case 'development':
      return {
        ...config,
        api: {
          ...config.api,
          timeout: 60000, // Longer timeout for development
        },
        features: {
          ...config.features,
          enableDebugMode: true,
          enablePerformanceMonitoring: true,
        },
      };
    
    case 'production':
      return {
        ...config,
        features: {
          ...config.features,
          enableDebugMode: false,
          enablePerformanceMonitoring: true,
        },
      };
    
    case 'test':
      return {
        ...config,
        api: {
          ...config.api,
          baseUrl: 'http://localhost:3000/api',
        },
        features: {
          ...config.features,
          enableRealTime: false,
          enableAnalytics: false,
        },
      };
    
    default:
      return config;
  }
};

// Configuration validation
export const validateConfig = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Validate using shared environment config
  if (!env.validateSupabaseConfig()) {
    errors.push('Invalid Supabase configuration');
  }
  
  if (!env.validateStripeConfig()) {
    errors.push('Invalid Stripe configuration');
  }
  
  if (!env.validateTwilioConfig()) {
    errors.push('Invalid Twilio configuration');
  }
  
  if (!env.validateEmailConfig()) {
    errors.push('Invalid Email configuration');
  }
  
  // Validate API configuration
  if (config.api.timeout < 5000) {
    errors.push('API timeout must be at least 5000ms');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Configuration utilities
export const configUtils = {
  // Get feature flag value
  isFeatureEnabled: (feature: keyof typeof config.features): boolean => {
    return config.features[feature] || false;
  },
  
  // Get environment-specific value
  getEnvValue: <T>(key: string, defaultValue: T): T => {
    // Use shared environment config instead of direct access
    const envConfig = env.getAllConfig();
    return (envConfig as any)[key] || defaultValue;
  },
  
  // Check if running in specific environment
  isEnvironment: (envName: string): boolean => {
    return config.app.environment === envName;
  },
  
  // Get API endpoint URL
  getApiUrl: (endpoint: string): string => {
    return `${config.api.baseUrl}${endpoint}`;
  },
  
  // Get file upload URL
  getUploadUrl: (): string => {
    return `${config.api.baseUrl}/upload`;
  },
  
  // Get WebSocket URL for real-time features
  getWebSocketUrl: (): string => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws`;
  },
  
  // Get CDN URL for assets
  getCdnUrl: (path: string): string => {
    const cdnBase = config.cdn.baseUrl;
    if (cdnBase) {
      return `${cdnBase}${path}`;
    }
    return path;
  },
  
  // Get analytics configuration
  getAnalyticsConfig: () => {
    if (!config.features.enableAnalytics) {
      return null;
    }
    
    return {
      trackingId: config.analytics.gaTrackingId,
      debugMode: config.features.enableDebugMode,
    };
  },
  
  // Get error reporting configuration
  getErrorReportingConfig: () => {
    return {
      enabled: config.features.enableDebugMode || config.app.isProduction,
      dsn: config.sentry.dsn,
      environment: config.app.environment,
    };
  },
};

// Export default configuration
export default config;
