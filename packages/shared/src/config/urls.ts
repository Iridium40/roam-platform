/**
 * ROAM Platform - Centralized URL Configuration
 * 
 * Automatically selects URLs based on environment
 * No need to explicitly set URLs - just set ROAM_ENV or NODE_ENV
 */

export type Environment = 'development' | 'production' | 'staging' | 'test';

interface AppUrls {
  customer: string;
  provider: string;
  admin: string;
}

/**
 * URL Configuration by Environment
 */
const URL_CONFIG: Record<Environment, AppUrls> = {
  development: {
    customer: 'https://roamservices.app',
    provider: 'https://roamproviders.app',
    admin: 'https://roamyoubestlifeops.com',
  },
  production: {
    customer: 'https://roamyourbestlife.com',
    provider: 'https://providers.roamyourbestlife.com',
    admin: 'https://admin.roamyourbestlife.com',
  },
  staging: {
    customer: 'https://staging.roamyourbestlife.com',
    provider: 'https://providers-staging.roamyourbestlife.com',
    admin: 'https://admin-staging.roamyourbestlife.com',
  },
  test: {
    customer: 'http://localhost:3000',
    provider: 'http://localhost:3001',
    admin: 'http://localhost:3002',
  },
};

/**
 * Get current environment
 * Priority: ROAM_ENV > NODE_ENV > default to 'development'
 */
function getCurrentEnvironment(): Environment {
  const env = (process.env.ROAM_ENV || process.env.NODE_ENV || 'development').toLowerCase();
  
  // Validate environment
  if (env === 'dev') return 'development';
  if (env === 'prod') return 'production';
  if (['development', 'production', 'staging', 'test'].includes(env)) {
    return env as Environment;
  }
  
  console.warn(`Unknown environment: ${env}. Defaulting to 'development'`);
  return 'development';
}

/**
 * Get URLs for current environment
 */
function getUrls(): AppUrls {
  const env = getCurrentEnvironment();
  return URL_CONFIG[env];
}

/**
 * Get URL for specific app in current environment
 */
function getAppUrl(app: keyof AppUrls): string {
  const urls = getUrls();
  return urls[app];
}

/**
 * Check if running in specific environment
 */
function isEnvironment(env: Environment): boolean {
  return getCurrentEnvironment() === env;
}

// Export main API
export const urls = {
  /**
   * Get all URLs for current environment
   */
  all: getUrls,
  
  /**
   * Get customer app URL
   */
  get customer(): string {
    return getAppUrl('customer');
  },
  
  /**
   * Get provider app URL
   */
  get provider(): string {
    return getAppUrl('provider');
  },
  
  /**
   * Get admin app URL
   */
  get admin(): string {
    return getAppUrl('admin');
  },
  
  /**
   * Get current environment
   */
  get environment(): Environment {
    return getCurrentEnvironment();
  },
  
  /**
   * Check if in production
   */
  get isProduction(): boolean {
    return isEnvironment('production');
  },
  
  /**
   * Check if in development
   */
  get isDevelopment(): boolean {
    return isEnvironment('development');
  },
  
  /**
   * Check if in staging
   */
  get isStaging(): boolean {
    return isEnvironment('staging');
  },
  
  /**
   * Check if in test
   */
  get isTest(): boolean {
    return isEnvironment('test');
  },
  
  /**
   * Override URLs (useful for testing or manual override)
   */
  override: (customUrls: Partial<AppUrls>): AppUrls => {
    const currentUrls = getUrls();
    return { ...currentUrls, ...customUrls };
  },
};

// Export for direct access
export { getCurrentEnvironment, getUrls, getAppUrl, isEnvironment };

// Export URL config for reference
export { URL_CONFIG };

/**
 * Usage Examples:
 * 
 * // Get URLs for current environment
 * import { urls } from '@roam/shared/config/urls';
 * 
 * console.log(urls.customer);   // Auto-selects based on ROAM_ENV
 * console.log(urls.provider);   // Auto-selects based on ROAM_ENV
 * console.log(urls.admin);      // Auto-selects based on ROAM_ENV
 * 
 * // Check environment
 * if (urls.isProduction) {
 *   // Production-specific code
 * }
 * 
 * if (urls.isDevelopment) {
 *   // Development-specific code
 * }
 * 
 * // Get all URLs
 * const allUrls = urls.all();
 * console.log(allUrls); // { customer: '...', provider: '...', admin: '...' }
 * 
 * // Override for testing
 * const testUrls = urls.override({ customer: 'http://localhost:3000' });
 */

