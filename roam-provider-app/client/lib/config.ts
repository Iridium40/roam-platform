// Centralized configuration management
export const config = {
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
  },
  supabase: {
    url: import.meta.env.VITE_PUBLIC_SUPABASE_URL,
    anonKey: import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY,
    serviceRoleKey: import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  stripe: {
    publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
    secretKey: import.meta.env.STRIPE_SECRET_KEY,
    webhookSecret: import.meta.env.STRIPE_WEBHOOK_SECRET,
  },
  plaid: {
    clientId: import.meta.env.PLAID_CLIENT_ID,
    secret: import.meta.env.PLAID_SECRET,
    env: import.meta.env.PLAID_ENV || 'sandbox',
  },
  twilio: {
    accountSid: import.meta.env.VITE_TWILIO_ACCOUNT_SID,
    authToken: import.meta.env.VITE_TWILIO_AUTH_TOKEN,
    conversationsServiceSid: import.meta.env.VITE_TWILIO_CONVERSATIONS_SERVICE_SID,
  },
  email: {
    resendApiKey: import.meta.env.RESEND_API_KEY,
  },
  google: {
    mapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  },
  features: {
    enableRealTime: import.meta.env.VITE_ENABLE_REAL_TIME === 'true',
    enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    enableDebugMode: import.meta.env.VITE_ENABLE_DEBUG_MODE === 'true',
    enablePerformanceMonitoring: import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING === 'true',
  },
  app: {
    name: 'ROAM Partner Portal',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    environment: import.meta.env.MODE,
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD,
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
  
  // Required environment variables
  const requiredVars = [
    'VITE_PUBLIC_SUPABASE_URL',
    'VITE_PUBLIC_SUPABASE_ANON_KEY',
    'VITE_STRIPE_PUBLISHABLE_KEY',
  ];
  
  requiredVars.forEach(varName => {
    if (!import.meta.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    }
  });
  
  // Validate Supabase configuration
  if (!config.supabase.url || !config.supabase.anonKey) {
    errors.push('Invalid Supabase configuration');
  }
  
  // Validate Stripe configuration
  if (!config.stripe.publishableKey) {
    errors.push('Invalid Stripe configuration');
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
    return (import.meta.env[key] as T) || defaultValue;
  },
  
  // Check if running in specific environment
  isEnvironment: (env: string): boolean => {
    return config.app.environment === env;
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
    const cdnBase = import.meta.env.VITE_CDN_BASE_URL;
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
      trackingId: import.meta.env.VITE_GA_TRACKING_ID,
      debugMode: config.features.enableDebugMode,
    };
  },
  
  // Get error reporting configuration
  getErrorReportingConfig: () => {
    return {
      enabled: config.features.enableDebugMode || config.app.isProduction,
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: config.app.environment,
    };
  },
};

// Export default configuration
export default config;
