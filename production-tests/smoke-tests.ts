/**
 * ROAM Platform - Smoke Testing Suite
 * 
 * Quick health checks for production deployments
 * Run after each deployment to verify critical functionality
 * 
 * Run: ts-node production-tests/smoke-tests.ts
 * Expected duration: < 2 minutes
 */

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
  PROVIDER_APP_URL: process.env.PROVIDER_APP_URL || urls.PROVIDER_APP_URL,
  ADMIN_APP_URL: process.env.ADMIN_APP_URL || urls.ADMIN_APP_URL,
  CUSTOMER_APP_URL: process.env.CUSTOMER_APP_URL || urls.CUSTOMER_APP_URL,
  SUPABASE_URL: process.env.VITE_PUBLIC_SUPABASE_URL || '',
  TIMEOUT: 10000, // 10 seconds
};

interface SmokeTestResult {
  category: string;
  test: string;
  status: 'passed' | 'failed' | 'warning';
  duration: number;
  message?: string;
}

const results: SmokeTestResult[] = [];
let passed = 0;
let failed = 0;
let warnings = 0;

// Utility functions
function log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warn: '\x1b[33m',
  };
  const reset = '\x1b[0m';
  console.log(`${colors[type]}${message}${reset}`);
}

async function smokeTest(
  category: string,
  test: string,
  fn: () => Promise<void>
): Promise<void> {
  const startTime = Date.now();
  
  try {
    await fn();
    const duration = Date.now() - startTime;
    passed++;
    results.push({ category, test, status: 'passed', duration });
    log(`  ✓ ${test} (${duration}ms)`, 'success');
  } catch (error) {
    const duration = Date.now() - startTime;
    const message = error instanceof Error ? error.message : String(error);
    
    // Check if it's a warning vs critical failure
    if (message.includes('WARNING:')) {
      warnings++;
      results.push({ category, test, status: 'warning', duration, message });
      log(`  ⚠ ${test} - ${message}`, 'warn');
    } else {
      failed++;
      results.push({ category, test, status: 'failed', duration, message });
      log(`  ✗ ${test} - ${message}`, 'error');
    }
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
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}

// ==============================================================================
// Smoke Tests
// ==============================================================================

async function testApplicationAvailability() {
  log('\n[1/6] Application Availability', 'info');

  await smokeTest('Availability', 'Provider App Homepage', async () => {
    const response = await fetchWithTimeout(CONFIG.PROVIDER_APP_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  });

  await smokeTest('Availability', 'Customer App Homepage', async () => {
    const response = await fetchWithTimeout(CONFIG.CUSTOMER_APP_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  });

  await smokeTest('Availability', 'Admin App Homepage', async () => {
    const response = await fetchWithTimeout(CONFIG.ADMIN_APP_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  });
}

async function testCriticalAPIs() {
  log('\n[2/6] Critical API Endpoints', 'info');

  // Provider App APIs
  await smokeTest('API', 'Provider Auth API', async () => {
    const response = await fetchWithTimeout(`${CONFIG.PROVIDER_APP_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@test.com', password: 'test' }),
    });
    // Should return 400 (validation) or 409 (exists), not 500
    if (response.status >= 500) {
      throw new Error(`Server error: ${response.status}`);
    }
  });

  await smokeTest('API', 'Database Connection Test', async () => {
    const response = await fetchWithTimeout(
      `${CONFIG.PROVIDER_APP_URL}/api/test-db-connection`
    );
    if (!response.ok) {
      throw new Error(`DB connection failed: ${response.status}`);
    }
    const data = await response.json();
    if (!data.success) {
      throw new Error('Database connection test returned failure');
    }
  });

  await smokeTest('API', 'Bookings API', async () => {
    const response = await fetchWithTimeout(`${CONFIG.PROVIDER_APP_URL}/api/bookings`);
    // 401 (unauthorized) is okay, 500 is not
    if (response.status >= 500) {
      throw new Error(`Server error: ${response.status}`);
    }
  });

  await smokeTest('API', 'Services API', async () => {
    const response = await fetchWithTimeout(`${CONFIG.PROVIDER_APP_URL}/api/business/services`);
    if (response.status >= 500) {
      throw new Error(`Server error: ${response.status}`);
    }
  });
}

async function testDatabaseConnectivity() {
  log('\n[3/6] Database Connectivity', 'info');

  if (!CONFIG.SUPABASE_URL) {
    log('  ⚠ Skipping database tests (no SUPABASE_URL)', 'warn');
    warnings++;
    return;
  }

  await smokeTest('Database', 'Supabase Reachability', async () => {
    const response = await fetchWithTimeout(CONFIG.SUPABASE_URL);
    if (!response.ok && response.status !== 404) {
      throw new Error(`Cannot reach Supabase: ${response.status}`);
    }
  });

  await smokeTest('Database', 'Auth Endpoint', async () => {
    const response = await fetchWithTimeout(`${CONFIG.SUPABASE_URL}/auth/v1/health`);
    if (!response.ok && response.status !== 404) {
      throw new Error(`Auth endpoint unreachable: ${response.status}`);
    }
  });
}

async function testThirdPartyIntegrations() {
  log('\n[4/6] Third-Party Integrations', 'info');

  await smokeTest('Integration', 'Stripe Connectivity', async () => {
    const response = await fetchWithTimeout('https://api.stripe.com/v1');
    // Even without auth, Stripe should respond (401 or 200)
    if (response.status >= 500) {
      throw new Error('Stripe API unreachable');
    }
  });

  await smokeTest('Integration', 'Google Maps API', async () => {
    // Test if Google Maps loads
    const response = await fetchWithTimeout('https://maps.googleapis.com/maps/api/js');
    if (!response.ok && response.status !== 403) {
      throw new Error('WARNING: Google Maps API may be unavailable');
    }
  });
}

async function testStaticAssets() {
  log('\n[5/6] Static Assets & CDN', 'info');

  await smokeTest('Assets', 'Provider App Assets', async () => {
    const response = await fetchWithTimeout(`${CONFIG.PROVIDER_APP_URL}/assets`);
    // Accept 404 (no directory listing) or 403 (forbidden)
    if (response.status >= 500) {
      throw new Error('Assets endpoint error');
    }
  });

  await smokeTest('Assets', 'CSS Loading', async () => {
    const html = await (await fetchWithTimeout(CONFIG.PROVIDER_APP_URL)).text();
    if (!html.includes('.css') && !html.includes('stylesheet')) {
      throw new Error('WARNING: No CSS references found in HTML');
    }
  });

  await smokeTest('Assets', 'JavaScript Loading', async () => {
    const html = await (await fetchWithTimeout(CONFIG.PROVIDER_APP_URL)).text();
    if (!html.includes('.js') && !html.includes('script')) {
      throw new Error('WARNING: No JS references found in HTML');
    }
  });
}

async function testSecurityHeaders() {
  log('\n[6/6] Security & Headers', 'info');

  await smokeTest('Security', 'HTTPS Redirect', async () => {
    const httpUrl = CONFIG.PROVIDER_APP_URL.replace('https://', 'http://');
    try {
      const response = await fetchWithTimeout(httpUrl, { redirect: 'manual' });
      if (response.status !== 301 && response.status !== 302 && response.status !== 308) {
        // Some platforms auto-handle this, so just warn
        throw new Error('WARNING: HTTP not redirecting to HTTPS');
      }
    } catch (error) {
      // Connection refused on HTTP is actually good (HTTPS only)
      if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
        return; // Pass
      }
      throw error;
    }
  });

  await smokeTest('Security', 'Security Headers Present', async () => {
    const response = await fetchWithTimeout(CONFIG.PROVIDER_APP_URL);
    const headers = response.headers;
    
    const requiredHeaders = [
      'x-content-type-options',
      'x-frame-options',
      'referrer-policy',
    ];
    
    const missing = requiredHeaders.filter(h => !headers.has(h));
    if (missing.length > 0) {
      throw new Error(`WARNING: Missing security headers: ${missing.join(', ')}`);
    }
  });

  await smokeTest('Security', 'CORS Headers', async () => {
    const response = await fetchWithTimeout(
      `${CONFIG.PROVIDER_APP_URL}/api/bookings`,
      { method: 'OPTIONS' }
    );
    // Should have CORS headers or handle OPTIONS
    if (response.status === 404) {
      throw new Error('WARNING: OPTIONS method not supported');
    }
  });
}

// ==============================================================================
// Main Runner
// ==============================================================================

async function main() {
  const startTime = Date.now();
  
  log('\n╔════════════════════════════════════════════════════════════╗', 'info');
  log('║         ROAM Platform - Smoke Testing Suite               ║', 'info');
  log('║         Quick Production Health Checks                    ║', 'info');
  log('╚════════════════════════════════════════════════════════════╝\n', 'info');

  try {
    await testApplicationAvailability();
    await testCriticalAPIs();
    await testDatabaseConnectivity();
    await testThirdPartyIntegrations();
    await testStaticAssets();
    await testSecurityHeaders();
  } catch (error) {
    log(`\nFatal error: ${error}`, 'error');
  }

  const duration = Date.now() - startTime;
  const total = passed + failed + warnings;

  log('\n╔════════════════════════════════════════════════════════════╗', 'info');
  log('║                    Smoke Test Summary                      ║', 'info');
  log('╚════════════════════════════════════════════════════════════╝\n', 'info');
  
  log(`Total Checks: ${total}`, 'info');
  log(`Passed: ${passed}`, 'success');
  log(`Warnings: ${warnings}`, warnings > 0 ? 'warn' : 'info');
  log(`Failed: ${failed}`, failed > 0 ? 'error' : 'info');
  log(`Duration: ${(duration / 1000).toFixed(2)}s`, 'info');

  // Determine overall status
  let status = 'PASSED';
  let statusColor: 'success' | 'warn' | 'error' = 'success';
  
  if (failed > 0) {
    status = 'FAILED';
    statusColor = 'error';
  } else if (warnings > 0) {
    status = 'PASSED WITH WARNINGS';
    statusColor = 'warn';
  }

  log(`\nOverall Status: ${status}\n`, statusColor);

  // Show failed tests
  if (failed > 0) {
    log('Critical Failures:', 'error');
    results
      .filter(r => r.status === 'failed')
      .forEach(r => {
        log(`  ✗ [${r.category}] ${r.test}: ${r.message}`, 'error');
      });
    log('', 'info');
  }

  // Show warnings
  if (warnings > 0) {
    log('Warnings:', 'warn');
    results
      .filter(r => r.status === 'warning')
      .forEach(r => {
        log(`  ⚠ [${r.category}] ${r.test}: ${r.message}`, 'warn');
      });
    log('', 'info');
  }

  // Export results
  const resultsJson = JSON.stringify({
    summary: {
      total,
      passed,
      warnings,
      failed,
      duration,
      status,
      timestamp: new Date().toISOString(),
    },
    results,
  }, null, 2);

  const fs = await import('fs');
  fs.writeFileSync('smoke-test-results.json', resultsJson);
  log('Results saved to: smoke-test-results.json\n', 'success');

  // Exit codes:
  // 0 = all passed
  // 1 = warnings only
  // 2 = failures
  process.exit(failed > 0 ? 2 : warnings > 0 ? 1 : 0);
}

// Run smoke tests
if (require.main === module) {
  main().catch(console.error);
}

export { smokeTest, testApplicationAvailability, testCriticalAPIs };

