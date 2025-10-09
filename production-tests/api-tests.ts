/**
 * ROAM Platform - Production API Testing Suite
 * 
 * This script tests all critical API endpoints across the platform
 * Run with: ts-node production-tests/api-tests.ts
 */

import { createClient } from '@supabase/supabase-js';

// Auto-select URLs based on environment (ROAM_ENV or NODE_ENV)
function getUrls() {
  const env = process.env.ROAM_ENV || process.env.NODE_ENV || 'development';
  
  if (env === 'production' || env === 'prod') {
    return {
      CUSTOMER_APP_URL: 'https://roamyourbestlife.com',
      PROVIDER_APP_URL: 'https://providers.roamyourbestlife.com',
      ADMIN_APP_URL: 'https://admin.roamyourbestlife.com',
    };
  }
  
  // Development (default)
  return {
    CUSTOMER_APP_URL: 'https://roamservices.app',
    PROVIDER_APP_URL: 'https://roamproviders.app',
    ADMIN_APP_URL: 'https://roamadmin.app',
  };
}

// Configuration - URLs auto-selected based on ROAM_ENV
const urls = getUrls();
const CONFIG = {
  // Auto-selected URLs (override with env vars if needed)
  PROVIDER_APP_URL: process.env.PROVIDER_APP_URL || urls.PROVIDER_APP_URL,
  ADMIN_APP_URL: process.env.ADMIN_APP_URL || urls.ADMIN_APP_URL,
  CUSTOMER_APP_URL: process.env.CUSTOMER_APP_URL || urls.CUSTOMER_APP_URL,
  SUPABASE_URL: process.env.VITE_PUBLIC_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.VITE_PUBLIC_SUPABASE_ANON_KEY || '',
  TEST_EMAIL: process.env.TEST_EMAIL || 'test@example.com',
  TEST_PASSWORD: process.env.TEST_PASSWORD || 'TestPassword123!',
  TIMEOUT: 30000, // 30 seconds
};

// Test results tracking
interface TestResult {
  name: string;
  endpoint: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];
let testCount = 0;
let passedCount = 0;
let failedCount = 0;

// Utility functions
function log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    error: '\x1b[31m',   // Red
    warn: '\x1b[33m',    // Yellow
  };
  const reset = '\x1b[0m';
  const icons = {
    info: 'ℹ',
    success: '✓',
    error: '✗',
    warn: '⚠',
  };
  console.log(`${colors[type]}${icons[type]} ${message}${reset}`);
}

async function runTest(
  name: string,
  endpoint: string,
  testFn: () => Promise<void>
): Promise<void> {
  testCount++;
  const startTime = Date.now();
  
  try {
    log(`Running: ${name}`, 'info');
    await testFn();
    const duration = Date.now() - startTime;
    passedCount++;
    results.push({
      name,
      endpoint,
      status: 'passed',
      duration,
    });
    log(`PASSED (${duration}ms): ${name}`, 'success');
  } catch (error) {
    const duration = Date.now() - startTime;
    failedCount++;
    const errorMessage = error instanceof Error ? error.message : String(error);
    results.push({
      name,
      endpoint,
      status: 'failed',
      duration,
      error: errorMessage,
    });
    log(`FAILED (${duration}ms): ${name} - ${errorMessage}`, 'error');
  }
}

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

// ==============================================================================
// Authentication Tests
// ==============================================================================

async function testAuthenticationFlow() {
  log('\n=== Authentication Flow Tests ===\n', 'info');
  
  const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  let authToken = '';

  // Test 1: Health Check
  await runTest(
    'Provider App Health Check',
    CONFIG.PROVIDER_APP_URL,
    async () => {
      const response = await fetchWithTimeout(CONFIG.PROVIDER_APP_URL);
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
    }
  );

  // Test 2: Signup API Endpoint
  await runTest(
    'Signup API Endpoint Availability',
    `${CONFIG.PROVIDER_APP_URL}/api/auth/signup`,
    async () => {
      const testEmail = `test+${Date.now()}@example.com`;
      const response = await fetchWithTimeout(
        `${CONFIG.PROVIDER_APP_URL}/api/auth/signup`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: testEmail,
            password: 'TestPassword123!',
            role: 'provider',
          }),
        }
      );
      
      // Accept 200 (success) or 400 (validation error) as valid responses
      if (response.status !== 200 && response.status !== 400 && response.status !== 409) {
        throw new Error(`Unexpected status: ${response.status}`);
      }
    }
  );

  // Test 3: Login with existing credentials (if provided)
  if (CONFIG.TEST_EMAIL && CONFIG.TEST_PASSWORD) {
    await runTest(
      'Login with Test Credentials',
      'Supabase Auth',
      async () => {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: CONFIG.TEST_EMAIL,
          password: CONFIG.TEST_PASSWORD,
        });
        
        if (error) throw error;
        if (!data.session) throw new Error('No session returned');
        
        authToken = data.session.access_token;
      }
    );
  }

  return authToken;
}

// ==============================================================================
// Provider App API Tests
// ==============================================================================

async function testProviderAppAPIs(authToken: string) {
  log('\n=== Provider App API Tests ===\n', 'info');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`,
  };

  // Test: Database Connection
  await runTest(
    'Test Database Connection',
    `${CONFIG.PROVIDER_APP_URL}/api/test-db-connection`,
    async () => {
      const response = await fetchWithTimeout(
        `${CONFIG.PROVIDER_APP_URL}/api/test-db-connection`,
        { headers }
      );
      
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`DB connection failed: ${response.status} - ${text}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(`DB connection check returned failure: ${JSON.stringify(data)}`);
      }
    }
  );

  // Test: Bookings API
  await runTest(
    'Bookings API - List Bookings',
    `${CONFIG.PROVIDER_APP_URL}/api/bookings`,
    async () => {
      const response = await fetchWithTimeout(
        `${CONFIG.PROVIDER_APP_URL}/api/bookings`,
        { headers }
      );
      
      if (!response.ok && response.status !== 404) {
        throw new Error(`Bookings API failed: ${response.status}`);
      }
      
      const text = await response.text();
      if (text.trim()) {
        const data = JSON.parse(text);
        if (data.error && response.status >= 500) {
          throw new Error(`Server error: ${data.error}`);
        }
      }
    }
  );

  // Test: Services API
  await runTest(
    'Services API - List Services',
    `${CONFIG.PROVIDER_APP_URL}/api/business/services`,
    async () => {
      const response = await fetchWithTimeout(
        `${CONFIG.PROVIDER_APP_URL}/api/business/services`,
        { headers }
      );
      
      if (!response.ok && response.status !== 404) {
        throw new Error(`Services API failed: ${response.status}`);
      }
      
      // Verify JSON parsing works
      const text = await response.text();
      if (text.trim()) {
        JSON.parse(text); // Will throw if invalid JSON
      }
    }
  );

  // Test: Business Profile API
  await runTest(
    'Business Profile API',
    `${CONFIG.PROVIDER_APP_URL}/api/business/profile/test`,
    async () => {
      const response = await fetchWithTimeout(
        `${CONFIG.PROVIDER_APP_URL}/api/business/profile/test`,
        { headers }
      );
      
      // 404 is acceptable (no business found), 500 is not
      if (response.status >= 500) {
        throw new Error(`Business Profile API server error: ${response.status}`);
      }
    }
  );

  // Test: Notifications API
  await runTest(
    'Notifications API - Edge Function',
    `${CONFIG.PROVIDER_APP_URL}/api/notifications/edge`,
    async () => {
      const response = await fetchWithTimeout(
        `${CONFIG.PROVIDER_APP_URL}/api/notifications/edge`,
        { headers }
      );
      
      // Should return 200 or 404, not 500
      if (response.status >= 500) {
        throw new Error(`Notifications API error: ${response.status}`);
      }
    }
  );

  // Test: Stripe Connect Account Creation
  await runTest(
    'Stripe Connect - Account Creation Endpoint',
    `${CONFIG.PROVIDER_APP_URL}/api/stripe/create-connect-account`,
    async () => {
      const response = await fetchWithTimeout(
        `${CONFIG.PROVIDER_APP_URL}/api/stripe/create-connect-account`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ userId: 'test' }),
        }
      );
      
      // Accept various status codes (endpoint exists and handles requests)
      if (response.status === 500) {
        const data = await response.json();
        // Check if it's a known error (not a crash)
        if (!data.error) {
          throw new Error('Stripe endpoint crashed without error message');
        }
      }
    }
  );

  // Test: Phase 2 Onboarding APIs
  await runTest(
    'Phase 2 Progress API',
    `${CONFIG.PROVIDER_APP_URL}/api/onboarding/phase2-progress/test`,
    async () => {
      const response = await fetchWithTimeout(
        `${CONFIG.PROVIDER_APP_URL}/api/onboarding/phase2-progress/test`,
        { headers }
      );
      
      if (response.status >= 500) {
        throw new Error(`Phase 2 Progress API error: ${response.status}`);
      }
    }
  );
}

// ==============================================================================
// Customer App API Tests
// ==============================================================================

async function testCustomerAppAPIs(authToken: string) {
  log('\n=== Customer App API Tests ===\n', 'info');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`,
  };

  // Test: Health Check
  await runTest(
    'Customer App Health Check',
    CONFIG.CUSTOMER_APP_URL,
    async () => {
      const response = await fetchWithTimeout(CONFIG.CUSTOMER_APP_URL);
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
    }
  );

  // Test: Bookings Creation API
  await runTest(
    'Bookings Creation API',
    `${CONFIG.CUSTOMER_APP_URL}/api/bookings/create`,
    async () => {
      const response = await fetchWithTimeout(
        `${CONFIG.CUSTOMER_APP_URL}/api/bookings/create`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            serviceId: 'test',
            providerId: 'test',
            bookingDate: new Date().toISOString(),
          }),
        }
      );
      
      // Should handle request (not crash)
      if (response.status >= 500) {
        const data = await response.json();
        if (!data.error) {
          throw new Error('Bookings creation endpoint crashed');
        }
      }
    }
  );

  // Test: Stripe Checkout
  await runTest(
    'Stripe Checkout Session Creation',
    `${CONFIG.CUSTOMER_APP_URL}/api/stripe/create-checkout-session`,
    async () => {
      const response = await fetchWithTimeout(
        `${CONFIG.CUSTOMER_APP_URL}/api/stripe/create-checkout-session`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            amount: 1000,
            currency: 'usd',
            bookingId: 'test',
          }),
        }
      );
      
      if (response.status === 500) {
        const data = await response.json();
        if (!data.error) {
          throw new Error('Stripe checkout endpoint crashed');
        }
      }
    }
  );
}

// ==============================================================================
// Admin App API Tests
// ==============================================================================

async function testAdminAppAPIs(authToken: string) {
  log('\n=== Admin App API Tests ===\n', 'info');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`,
  };

  // Test: Health Check
  await runTest(
    'Admin App Health Check',
    CONFIG.ADMIN_APP_URL,
    async () => {
      const response = await fetchWithTimeout(CONFIG.ADMIN_APP_URL);
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
    }
  );

  // Test: List Test Users
  await runTest(
    'Admin API - List Test Users',
    `${CONFIG.ADMIN_APP_URL}/api/admin/list-test-users`,
    async () => {
      const response = await fetchWithTimeout(
        `${CONFIG.ADMIN_APP_URL}/api/admin/list-test-users`,
        { headers }
      );
      
      if (response.status >= 500) {
        throw new Error(`List test users API error: ${response.status}`);
      }
    }
  );
}

// ==============================================================================
// Database Integration Tests
// ==============================================================================

async function testDatabaseIntegration() {
  log('\n=== Database Integration Tests ===\n', 'info');

  const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

  // Test: Services Table Query
  await runTest(
    'Database - Query Services Table',
    'services',
    async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .limit(5);
      
      if (error) throw error;
      // Data can be empty, that's okay
    }
  );

  // Test: Bookings Table Query
  await runTest(
    'Database - Query Bookings Table',
    'bookings',
    async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, booking_status')
        .limit(5);
      
      if (error) throw error;
    }
  );

  // Test: Businesses Table Query
  await runTest(
    'Database - Query Businesses Table',
    'businesses',
    async () => {
      const { data, error } = await supabase
        .from('businesses')
        .select('id, business_name, business_status')
        .limit(5);
      
      if (error) throw error;
    }
  );

  // Test: Business Services Junction Table
  await runTest(
    'Database - Query Business Services',
    'business_services',
    async () => {
      const { data, error } = await supabase
        .from('business_services')
        .select('*')
        .limit(5);
      
      if (error) throw error;
    }
  );
}

// ==============================================================================
// Performance Tests
// ==============================================================================

async function testPerformance() {
  log('\n=== Performance Tests ===\n', 'info');

  // Test: Homepage Load Time
  await runTest(
    'Performance - Provider App Homepage',
    CONFIG.PROVIDER_APP_URL,
    async () => {
      const startTime = Date.now();
      const response = await fetchWithTimeout(CONFIG.PROVIDER_APP_URL);
      const loadTime = Date.now() - startTime;
      
      if (!response.ok) {
        throw new Error(`Failed to load: ${response.status}`);
      }
      
      if (loadTime > 3000) {
        log(`Warning: Slow load time: ${loadTime}ms`, 'warn');
      }
    }
  );

  // Test: API Response Time
  await runTest(
    'Performance - API Response Time',
    `${CONFIG.PROVIDER_APP_URL}/api/test-db-connection`,
    async () => {
      const startTime = Date.now();
      const response = await fetchWithTimeout(
        `${CONFIG.PROVIDER_APP_URL}/api/test-db-connection`
      );
      const responseTime = Date.now() - startTime;
      
      if (responseTime > 2000) {
        log(`Warning: Slow API response: ${responseTime}ms`, 'warn');
      }
    }
  );
}

// ==============================================================================
// Main Test Runner
// ==============================================================================

async function main() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'info');
  log('║        ROAM Platform - Production Testing Suite           ║', 'info');
  log('╚════════════════════════════════════════════════════════════╝\n', 'info');

  const startTime = Date.now();

  // Validate configuration
  if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
    log('Error: Missing required environment variables', 'error');
    log('Please set VITE_PUBLIC_SUPABASE_URL and VITE_PUBLIC_SUPABASE_ANON_KEY', 'error');
    process.exit(1);
  }

  try {
    // Run authentication tests first
    const authToken = await testAuthenticationFlow();

    // Run API tests if we have an auth token
    if (authToken) {
      await testProviderAppAPIs(authToken);
      await testCustomerAppAPIs(authToken);
      await testAdminAppAPIs(authToken);
    } else {
      log('Skipping authenticated API tests (no auth token)', 'warn');
    }

    // Run database tests
    await testDatabaseIntegration();

    // Run performance tests
    await testPerformance();

  } catch (error) {
    log(`Fatal error: ${error}`, 'error');
  }

  // Print summary
  const duration = Date.now() - startTime;
  log('\n╔════════════════════════════════════════════════════════════╗', 'info');
  log('║                     Test Summary                           ║', 'info');
  log('╚════════════════════════════════════════════════════════════╝\n', 'info');
  
  log(`Total Tests: ${testCount}`, 'info');
  log(`Passed: ${passedCount}`, 'success');
  log(`Failed: ${failedCount}`, failedCount > 0 ? 'error' : 'info');
  log(`Duration: ${(duration / 1000).toFixed(2)}s\n`, 'info');

  // Print failed tests details
  if (failedCount > 0) {
    log('Failed Tests:', 'error');
    results
      .filter(r => r.status === 'failed')
      .forEach(r => {
        log(`  - ${r.name}`, 'error');
        log(`    Endpoint: ${r.endpoint}`, 'error');
        log(`    Error: ${r.error}`, 'error');
      });
  }

  // Export results to JSON
  const resultsJson = JSON.stringify({
    summary: {
      total: testCount,
      passed: passedCount,
      failed: failedCount,
      duration,
      timestamp: new Date().toISOString(),
    },
    results,
  }, null, 2);

  const fs = await import('fs');
  fs.writeFileSync('production-test-results.json', resultsJson);
  log('\nResults saved to: production-test-results.json', 'success');

  // Exit with appropriate code
  process.exit(failedCount > 0 ? 1 : 0);
}

// Run tests
if (require.main === module) {
  main().catch(console.error);
}

export { runTest, testAuthenticationFlow, testProviderAppAPIs };

