/**
 * ROAM Provider App - API Performance Testing Suite
 * 
 * Comprehensive performance testing for all Provider App API endpoints.
 * Tests response times, throughput, and identifies optimization opportunities.
 * 
 * Run with:
 *   ts-node -r dotenv/config production-tests/provider-api-performance.ts dotenv_config_path=../.env.production.test
 * 
 * Environment Variables:
 *   ROAM_ENV=production|development (auto-selects URLs)
 *   VITE_PUBLIC_SUPABASE_URL - Supabase URL
 *   VITE_PUBLIC_SUPABASE_ANON_KEY - Supabase anon key
 *   TEST_PROVIDER_EMAIL - Test provider email
 *   TEST_PROVIDER_PASSWORD - Test provider password
 *   TEST_BUSINESS_ID - Business ID to test (optional, uses first from provider if not set)
 */

import { createClient } from '@supabase/supabase-js';

// ============================================================================
// Configuration
// ============================================================================

interface Config {
  PROVIDER_APP_URL: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  TEST_EMAIL: string;
  TEST_PASSWORD: string;
  TEST_BUSINESS_ID: string;
  TIMEOUT: number;
  // Performance thresholds (in ms)
  THRESHOLDS: {
    FAST: number;      // Under this is excellent
    ACCEPTABLE: number; // Under this is ok
    SLOW: number;      // Above this is concerning
  };
}

function getConfig(): Config {
  const env = process.env.ROAM_ENV || process.env.NODE_ENV || 'development';
  
  const urls = env === 'production' || env === 'prod'
    ? { PROVIDER_APP_URL: 'https://providers.roamyourbestlife.com' }
    : { PROVIDER_APP_URL: 'https://roamproviders.app' };

  return {
    PROVIDER_APP_URL: process.env.PROVIDER_APP_URL || urls.PROVIDER_APP_URL,
    SUPABASE_URL: process.env.VITE_PUBLIC_SUPABASE_URL || '',
    SUPABASE_ANON_KEY: process.env.VITE_PUBLIC_SUPABASE_ANON_KEY || '',
    TEST_EMAIL: process.env.TEST_PROVIDER_EMAIL || process.env.TEST_EMAIL || '',
    TEST_PASSWORD: process.env.TEST_PROVIDER_PASSWORD || process.env.TEST_PASSWORD || '',
    TEST_BUSINESS_ID: process.env.TEST_BUSINESS_ID || '',
    TIMEOUT: 30000,
    THRESHOLDS: {
      FAST: 200,
      ACCEPTABLE: 500,
      SLOW: 1000,
    },
  };
}

const CONFIG = getConfig();

// ============================================================================
// Types
// ============================================================================

interface PerformanceResult {
  endpoint: string;
  method: string;
  responseTime: number;
  status: number;
  statusText: string;
  dataSize: number;
  rating: 'excellent' | 'good' | 'acceptable' | 'slow' | 'critical';
  threshold: number;
  passed: boolean;
  error?: string;
  details?: any;
}

interface LoadTestResult {
  endpoint: string;
  concurrency: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
  requestsPerSecond: number;
  totalDuration: number;
}

interface TestContext {
  authToken: string;
  userId: string;
  providerId: string;
  businessId: string;
}

// ============================================================================
// Logging Utilities
// ============================================================================

const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '═'.repeat(70));
  log(`  ${title}`, 'bold');
  console.log('═'.repeat(70) + '\n');
}

function logResult(result: PerformanceResult) {
  const icon = result.passed ? '✓' : '✗';
  const ratingColors: Record<string, keyof typeof colors> = {
    excellent: 'green',
    good: 'green',
    acceptable: 'yellow',
    slow: 'yellow',
    critical: 'red',
  };
  const color = ratingColors[result.rating] || 'reset';
  
  const timeStr = `${result.responseTime}ms`.padStart(8);
  const statusStr = `${result.status}`.padStart(3);
  const sizeStr = result.dataSize > 0 ? ` (${formatBytes(result.dataSize)})` : '';
  
  log(
    `${icon} ${result.method.padEnd(6)} ${result.endpoint.padEnd(50)} ${timeStr} [${statusStr}]${sizeStr}`,
    color
  );
  
  if (result.error) {
    log(`    └─ Error: ${result.error}`, 'red');
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function getRating(responseTime: number, customThreshold?: number): PerformanceResult['rating'] {
  const threshold = customThreshold || CONFIG.THRESHOLDS.ACCEPTABLE;
  
  if (responseTime < CONFIG.THRESHOLDS.FAST) return 'excellent';
  if (responseTime < CONFIG.THRESHOLDS.ACCEPTABLE) return 'good';
  if (responseTime < CONFIG.THRESHOLDS.SLOW) return 'acceptable';
  if (responseTime < threshold * 2) return 'slow';
  return 'critical';
}

// ============================================================================
// HTTP Utilities
// ============================================================================

async function fetchWithMetrics(
  url: string,
  options: RequestInit = {},
  threshold?: number
): Promise<PerformanceResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);
  
  const startTime = performance.now();
  let response: Response | null = null;
  let dataSize = 0;
  let body = '';
  
  try {
    response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    
    body = await response.text();
    dataSize = new TextEncoder().encode(body).length;
    
    const responseTime = Math.round(performance.now() - startTime);
    const rating = getRating(responseTime, threshold);
    
    return {
      endpoint: url.replace(CONFIG.PROVIDER_APP_URL, ''),
      method: (options.method || 'GET').toUpperCase(),
      responseTime,
      status: response.status,
      statusText: response.statusText,
      dataSize,
      rating,
      threshold: threshold || CONFIG.THRESHOLDS.ACCEPTABLE,
      passed: response.status < 400 && responseTime < (threshold || CONFIG.THRESHOLDS.SLOW),
      details: tryParseJson(body),
    };
  } catch (error: any) {
    const responseTime = Math.round(performance.now() - startTime);
    return {
      endpoint: url.replace(CONFIG.PROVIDER_APP_URL, ''),
      method: (options.method || 'GET').toUpperCase(),
      responseTime,
      status: error.name === 'AbortError' ? 408 : 0,
      statusText: error.name === 'AbortError' ? 'Timeout' : 'Network Error',
      dataSize: 0,
      rating: 'critical',
      threshold: threshold || CONFIG.THRESHOLDS.ACCEPTABLE,
      passed: false,
      error: error.message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function tryParseJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ============================================================================
// Authentication
// ============================================================================

async function authenticate(): Promise<TestContext | null> {
  log('Authenticating test user...', 'cyan');
  
  if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
    log('⚠ Missing Supabase configuration. Running in unauthenticated mode.', 'yellow');
    return null;
  }
  
  if (!CONFIG.TEST_EMAIL || !CONFIG.TEST_PASSWORD) {
    log('⚠ Missing test credentials. Running in unauthenticated mode.', 'yellow');
    log('  Set TEST_PROVIDER_EMAIL and TEST_PROVIDER_PASSWORD for full tests.', 'dim');
    return null;
  }
  
  const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: CONFIG.TEST_EMAIL,
      password: CONFIG.TEST_PASSWORD,
    });
    
    if (authError || !authData.session) {
      log(`⚠ Authentication failed: ${authError?.message || 'No session'}. Running partial tests.`, 'yellow');
      return null;
    }
    
    const authToken = authData.session.access_token;
    const userId = authData.user.id;
    
    // Get provider and business info
    const { data: providerData, error: providerError } = await supabase
      .from('providers')
      .select('id, business_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();
    
    if (providerError || !providerData) {
      log(`⚠ Provider lookup failed. Running partial tests.`, 'yellow');
      return null;
    }
    
    const businessId = CONFIG.TEST_BUSINESS_ID || providerData.business_id;
    
    log(`✓ Authenticated as user: ${userId}`, 'green');
    log(`✓ Provider ID: ${providerData.id}`, 'green');
    log(`✓ Business ID: ${businessId}`, 'green');
    
    return {
      authToken,
      userId,
      providerId: providerData.id,
      businessId,
    };
  } catch (error: any) {
    log(`⚠ Auth error: ${error.message}. Running partial tests.`, 'yellow');
    return null;
  }
}

// ============================================================================
// Performance Tests
// ============================================================================

async function testEndpoint(
  _name: string,
  url: string,
  options: RequestInit,
  threshold?: number
): Promise<PerformanceResult> {
  const result = await fetchWithMetrics(url, options, threshold);
  logResult(result);
  return result;
}

async function runUnauthenticatedTests(): Promise<PerformanceResult[]> {
  const results: PerformanceResult[] = [];
  
  logSection('UNAUTHENTICATED ENDPOINT TESTS');
  
  // Health Check - no auth needed
  results.push(await testEndpoint(
    'Health Check',
    CONFIG.PROVIDER_APP_URL,
    {},
    2000 // Initial page load
  ));
  
  // Static assets / public endpoints
  results.push(await testEndpoint(
    'Favicon',
    `${CONFIG.PROVIDER_APP_URL}/favicon.ico`,
    {},
    500
  ));
  
  // API endpoints that might work without auth (typically return 401/400)
  // These test endpoint availability and response time
  results.push(await testEndpoint(
    'Bookings API (no auth)',
    `${CONFIG.PROVIDER_APP_URL}/api/bookings`,
    {},
    500
  ));
  
  results.push(await testEndpoint(
    'Business Services (no auth)',
    `${CONFIG.PROVIDER_APP_URL}/api/business/services`,
    {},
    500
  ));
  
  results.push(await testEndpoint(
    'Service Eligibility (no auth)',
    `${CONFIG.PROVIDER_APP_URL}/api/business/service-eligibility`,
    {},
    500
  ));
  
  results.push(await testEndpoint(
    'Auth Signup Endpoint',
    `${CONFIG.PROVIDER_APP_URL}/api/auth/signup`,
    { method: 'OPTIONS' },
    500
  ));
  
  results.push(await testEndpoint(
    'Stripe Balance (no auth)',
    `${CONFIG.PROVIDER_APP_URL}/api/stripe/balance`,
    {},
    800
  ));
  
  results.push(await testEndpoint(
    'Notifications Edge (no auth)',
    `${CONFIG.PROVIDER_APP_URL}/api/notifications/edge`,
    {},
    500
  ));
  
  return results;
}

async function runProviderApiTests(ctx: TestContext): Promise<PerformanceResult[]> {
  const results: PerformanceResult[] = [];
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${ctx.authToken}`,
  };
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Core Data APIs
  // ═══════════════════════════════════════════════════════════════════════════
  
  logSection('CORE DATA APIs');
  
  // Dashboard Stats API - OPTIMIZED single query for all metrics
  results.push(await testEndpoint(
    'Dashboard Stats (optimized)',
    `${CONFIG.PROVIDER_APP_URL}/api/business/dashboard-stats?business_id=${ctx.businessId}`,
    { headers },
    200 // Should be very fast with database function
  ));
  
  // Bookings API - Critical for dashboard
  results.push(await testEndpoint(
    'Bookings List',
    `${CONFIG.PROVIDER_APP_URL}/api/bookings?business_id=${ctx.businessId}`,
    { headers },
    500 // Bookings should load under 500ms
  ));
  
  // Bookings with pagination
  results.push(await testEndpoint(
    'Bookings (paginated)',
    `${CONFIG.PROVIDER_APP_URL}/api/bookings?business_id=${ctx.businessId}&limit=25&offset=0`,
    { headers },
    400
  ));
  
  // Bookings by status
  results.push(await testEndpoint(
    'Bookings (confirmed only)',
    `${CONFIG.PROVIDER_APP_URL}/api/bookings?business_id=${ctx.businessId}&status=confirmed`,
    { headers },
    400
  ));
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Business Configuration APIs
  // ═══════════════════════════════════════════════════════════════════════════
  
  logSection('BUSINESS CONFIGURATION APIs');
  
  // Service Eligibility - Important for services tab
  results.push(await testEndpoint(
    'Service Eligibility',
    `${CONFIG.PROVIDER_APP_URL}/api/business/service-eligibility?business_id=${ctx.businessId}`,
    { headers },
    400
  ));
  
  // Business Services List
  results.push(await testEndpoint(
    'Business Services',
    `${CONFIG.PROVIDER_APP_URL}/api/business/services?business_id=${ctx.businessId}`,
    { headers },
    400
  ));
  
  // Business Hours
  results.push(await testEndpoint(
    'Business Hours',
    `${CONFIG.PROVIDER_APP_URL}/api/business/hours?business_id=${ctx.businessId}`,
    { headers },
    300
  ));
  
  // Business Profile
  results.push(await testEndpoint(
    'Business Profile',
    `${CONFIG.PROVIDER_APP_URL}/api/business/profile/${ctx.businessId}`,
    { headers },
    300
  ));
  
  // Tax Info
  results.push(await testEndpoint(
    'Tax Info',
    `${CONFIG.PROVIDER_APP_URL}/api/business/tax-info?business_id=${ctx.businessId}`,
    { headers },
    300
  ));
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Financial APIs (Stripe)
  // ═══════════════════════════════════════════════════════════════════════════
  
  logSection('FINANCIAL APIs (Stripe)');
  
  // Stripe Balance
  results.push(await testEndpoint(
    'Stripe Balance',
    `${CONFIG.PROVIDER_APP_URL}/api/stripe/balance?business_id=${ctx.businessId}`,
    { headers },
    800 // Stripe APIs can be slower due to external call
  ));
  
  // Stripe Transactions
  results.push(await testEndpoint(
    'Stripe Transactions',
    `${CONFIG.PROVIDER_APP_URL}/api/stripe/transactions?business_id=${ctx.businessId}`,
    { headers },
    1000
  ));
  
  // Stripe Payouts
  results.push(await testEndpoint(
    'Stripe Payouts',
    `${CONFIG.PROVIDER_APP_URL}/api/stripe/payouts?business_id=${ctx.businessId}`,
    { headers },
    800
  ));
  
  // Payout Schedule
  results.push(await testEndpoint(
    'Payout Schedule',
    `${CONFIG.PROVIDER_APP_URL}/api/stripe/payout-schedule?business_id=${ctx.businessId}`,
    { headers },
    500
  ));
  
  // Connect Account Status
  results.push(await testEndpoint(
    'Connect Account Status',
    `${CONFIG.PROVIDER_APP_URL}/api/stripe/check-connect-account-status?business_id=${ctx.businessId}`,
    { headers },
    600
  ));
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Staff & Provider APIs
  // ═══════════════════════════════════════════════════════════════════════════
  
  logSection('STAFF & PROVIDER APIs');
  
  // Provider Profile
  results.push(await testEndpoint(
    'Provider Profile',
    `${CONFIG.PROVIDER_APP_URL}/api/provider/profile/${ctx.userId}`,
    { headers },
    300
  ));
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Communication APIs
  // ═══════════════════════════════════════════════════════════════════════════
  
  logSection('COMMUNICATION APIs');
  
  // Chat Endpoint
  results.push(await testEndpoint(
    'Chat Messages',
    `${CONFIG.PROVIDER_APP_URL}/api/chat?business_id=${ctx.businessId}`,
    { headers },
    500
  ));
  
  // Notifications
  results.push(await testEndpoint(
    'Notifications (edge)',
    `${CONFIG.PROVIDER_APP_URL}/api/notifications/edge`,
    { headers },
    400
  ));
  
  // Twilio Conversations List
  results.push(await testEndpoint(
    'Twilio Conversations',
    `${CONFIG.PROVIDER_APP_URL}/api/twilio-conversations/list-conversations?business_id=${ctx.businessId}`,
    { headers },
    800 // External service
  ));
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Utility APIs
  // ═══════════════════════════════════════════════════════════════════════════
  
  logSection('UTILITY APIs');
  
  // Diagnostic
  results.push(await testEndpoint(
    'Diagnostic',
    `${CONFIG.PROVIDER_APP_URL}/api/diagnostic`,
    { headers },
    200
  ));
  
  // Health Check (no auth needed)
  results.push(await testEndpoint(
    'Health Check',
    CONFIG.PROVIDER_APP_URL,
    {},
    1000 // Initial page load
  ));
  
  return results;
}

// ============================================================================
// Load Testing
// ============================================================================

async function runLoadTest(
  url: string,
  options: RequestInit,
  concurrency: number,
  totalRequests: number
): Promise<LoadTestResult> {
  const responseTimes: number[] = [];
  let successCount = 0;
  let failCount = 0;
  
  const startTime = performance.now();
  
  // Create batches based on concurrency
  const batches = Math.ceil(totalRequests / concurrency);
  
  for (let batch = 0; batch < batches; batch++) {
    const requestsInBatch = Math.min(concurrency, totalRequests - batch * concurrency);
    const promises: Promise<void>[] = [];
    
    for (let i = 0; i < requestsInBatch; i++) {
      promises.push(
        fetchWithMetrics(url, options).then(result => {
          responseTimes.push(result.responseTime);
          if (result.passed) successCount++;
          else failCount++;
        })
      );
    }
    
    await Promise.all(promises);
  }
  
  const totalDuration = performance.now() - startTime;
  responseTimes.sort((a, b) => a - b);
  
  const p95Index = Math.floor(responseTimes.length * 0.95);
  
  return {
    endpoint: url.replace(CONFIG.PROVIDER_APP_URL, ''),
    concurrency,
    totalRequests,
    successfulRequests: successCount,
    failedRequests: failCount,
    avgResponseTime: Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length),
    minResponseTime: responseTimes[0] || 0,
    maxResponseTime: responseTimes[responseTimes.length - 1] || 0,
    p95ResponseTime: responseTimes[p95Index] || 0,
    requestsPerSecond: Math.round((totalRequests / totalDuration) * 1000),
    totalDuration: Math.round(totalDuration),
  };
}

async function runLoadTests(ctx: TestContext): Promise<LoadTestResult[]> {
  logSection('LOAD TESTING');
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${ctx.authToken}`,
  };
  
  const results: LoadTestResult[] = [];
  
  // Define load test scenarios
  const scenarios = [
    {
      name: 'Bookings API',
      url: `${CONFIG.PROVIDER_APP_URL}/api/bookings?business_id=${ctx.businessId}&limit=25`,
      concurrency: 5,
      requests: 20,
    },
    {
      name: 'Service Eligibility',
      url: `${CONFIG.PROVIDER_APP_URL}/api/business/service-eligibility?business_id=${ctx.businessId}`,
      concurrency: 3,
      requests: 15,
    },
    {
      name: 'Business Services',
      url: `${CONFIG.PROVIDER_APP_URL}/api/business/services?business_id=${ctx.businessId}`,
      concurrency: 5,
      requests: 20,
    },
  ];
  
  for (const scenario of scenarios) {
    log(`\nLoad testing: ${scenario.name}`, 'cyan');
    log(`  Concurrency: ${scenario.concurrency}, Total Requests: ${scenario.requests}`, 'dim');
    
    const result = await runLoadTest(
      scenario.url,
      { headers },
      scenario.concurrency,
      scenario.requests
    );
    
    results.push(result);
    
    // Log results
    const successRate = ((result.successfulRequests / result.totalRequests) * 100).toFixed(1);
    const rateColor = result.successfulRequests === result.totalRequests ? 'green' : 'yellow';
    
    log(`  ├─ Success Rate: ${successRate}%`, rateColor);
    log(`  ├─ Avg Response: ${result.avgResponseTime}ms`, result.avgResponseTime < 500 ? 'green' : 'yellow');
    log(`  ├─ P95 Response: ${result.p95ResponseTime}ms`, result.p95ResponseTime < 1000 ? 'green' : 'yellow');
    log(`  ├─ Min/Max: ${result.minResponseTime}ms / ${result.maxResponseTime}ms`, 'dim');
    log(`  └─ Throughput: ${result.requestsPerSecond} req/s`, 'dim');
  }
  
  return results;
}

// ============================================================================
// Report Generation
// ============================================================================

function generateReport(
  performanceResults: PerformanceResult[],
  loadResults: LoadTestResult[]
) {
  logSection('PERFORMANCE REPORT SUMMARY');
  
  // Categorize results
  const passed = performanceResults.filter(r => r.passed);
  const failed = performanceResults.filter(r => !r.passed);
  
  const byRating = {
    excellent: performanceResults.filter(r => r.rating === 'excellent'),
    good: performanceResults.filter(r => r.rating === 'good'),
    acceptable: performanceResults.filter(r => r.rating === 'acceptable'),
    slow: performanceResults.filter(r => r.rating === 'slow'),
    critical: performanceResults.filter(r => r.rating === 'critical'),
  };
  
  // Summary
  log(`Total Endpoints Tested: ${performanceResults.length}`, 'bold');
  log(`  ✓ Passed: ${passed.length}`, 'green');
  log(`  ✗ Failed: ${failed.length}`, failed.length > 0 ? 'red' : 'reset');
  
  console.log('\nPerformance Distribution:');
  log(`  ⚡ Excellent (<${CONFIG.THRESHOLDS.FAST}ms): ${byRating.excellent.length}`, 'green');
  log(`  ✓ Good (<${CONFIG.THRESHOLDS.ACCEPTABLE}ms): ${byRating.good.length}`, 'green');
  log(`  ○ Acceptable (<${CONFIG.THRESHOLDS.SLOW}ms): ${byRating.acceptable.length}`, 'yellow');
  log(`  ⚠ Slow: ${byRating.slow.length}`, 'yellow');
  log(`  ✗ Critical: ${byRating.critical.length}`, byRating.critical.length > 0 ? 'red' : 'reset');
  
  // Average response time
  const avgResponseTime = Math.round(
    performanceResults.reduce((sum, r) => sum + r.responseTime, 0) / performanceResults.length
  );
  log(`\nAverage Response Time: ${avgResponseTime}ms`, avgResponseTime < 500 ? 'green' : 'yellow');
  
  // Slowest endpoints
  const slowest = [...performanceResults]
    .sort((a, b) => b.responseTime - a.responseTime)
    .slice(0, 5);
  
  console.log('\nSlowest Endpoints:');
  slowest.forEach((r, i) => {
    const color = r.rating === 'critical' ? 'red' : r.rating === 'slow' ? 'yellow' : 'reset';
    log(`  ${i + 1}. ${r.endpoint} - ${r.responseTime}ms`, color);
  });
  
  // Failed endpoints
  if (failed.length > 0) {
    console.log('\n⚠ Failed Endpoints:');
    failed.forEach(r => {
      log(`  • ${r.method} ${r.endpoint} - ${r.status} ${r.statusText}`, 'red');
      if (r.error) log(`    Error: ${r.error}`, 'dim');
    });
  }
  
  // Load test summary
  if (loadResults.length > 0) {
    console.log('\nLoad Test Summary:');
    loadResults.forEach(r => {
      const successRate = ((r.successfulRequests / r.totalRequests) * 100).toFixed(0);
      log(`  • ${r.endpoint.substring(0, 40)}...`, 'cyan');
      log(`    ${successRate}% success, ${r.avgResponseTime}ms avg, ${r.requestsPerSecond} req/s`, 'dim');
    });
  }
  
  // Recommendations
  logSection('OPTIMIZATION RECOMMENDATIONS');
  
  const recommendations: string[] = [];
  
  // Check for slow database queries
  const slowDbEndpoints = performanceResults.filter(
    r => r.responseTime > 500 && r.endpoint.includes('/api/') && !r.endpoint.includes('stripe')
  );
  if (slowDbEndpoints.length > 0) {
    recommendations.push(`📊 ${slowDbEndpoints.length} database API(s) are slow (>500ms). Consider:`);
    recommendations.push('   - Using nested Supabase relations instead of multiple queries');
    recommendations.push('   - Adding database indexes for frequently filtered columns');
    recommendations.push('   - Using the admin_dashboard_stats view pattern');
  }
  
  // Check for Stripe API slowness
  const stripeEndpoints = performanceResults.filter(r => r.endpoint.includes('stripe'));
  const slowStripe = stripeEndpoints.filter(r => r.responseTime > 1000);
  if (slowStripe.length > 0) {
    recommendations.push(`💳 ${slowStripe.length} Stripe API(s) are slow (>1s). Consider:`);
    recommendations.push('   - Caching Stripe balance data (TTL 30-60 seconds)');
    recommendations.push('   - Batching Stripe API calls where possible');
  }
  
  // Check for failed endpoints
  if (failed.length > 0) {
    recommendations.push(`🔴 ${failed.length} endpoint(s) failed. Immediate action needed!`);
  }
  
  // General optimization suggestion
  if (avgResponseTime > 400) {
    recommendations.push('⚡ Overall average response time is high. Consider:');
    recommendations.push('   - Implementing response caching for read-heavy endpoints');
    recommendations.push('   - Using Promise.all() for parallel queries');
    recommendations.push('   - Reviewing N+1 query patterns in bookings API');
  }
  
  if (recommendations.length > 0) {
    recommendations.forEach(r => console.log(r));
  } else {
    log('✓ All endpoints performing well! No immediate optimizations needed.', 'green');
  }
  
  return {
    summary: {
      total: performanceResults.length,
      passed: passed.length,
      failed: failed.length,
      avgResponseTime,
      byRating: {
        excellent: byRating.excellent.length,
        good: byRating.good.length,
        acceptable: byRating.acceptable.length,
        slow: byRating.slow.length,
        critical: byRating.critical.length,
      },
    },
    performanceResults,
    loadResults,
    recommendations,
    timestamp: new Date().toISOString(),
  };
}

// ============================================================================
// Main Runner
// ============================================================================

async function main() {
  console.log('\n' + '╔' + '═'.repeat(68) + '╗');
  console.log('║' + ' '.repeat(15) + 'ROAM Provider App - API Performance Tests' + ' '.repeat(12) + '║');
  console.log('╚' + '═'.repeat(68) + '╝\n');
  
  log(`Environment: ${process.env.ROAM_ENV || 'development'}`, 'cyan');
  log(`Provider App URL: ${CONFIG.PROVIDER_APP_URL}`, 'dim');
  log(`Performance Thresholds: Fast <${CONFIG.THRESHOLDS.FAST}ms, Acceptable <${CONFIG.THRESHOLDS.ACCEPTABLE}ms, Slow <${CONFIG.THRESHOLDS.SLOW}ms\n`, 'dim');
  
  try {
    // Authenticate
    logSection('AUTHENTICATION');
    const ctx = await authenticate();
    
    let performanceResults: PerformanceResult[] = [];
    let loadResults: LoadTestResult[] = [];
    
    if (ctx) {
      // Run full authenticated performance tests
      performanceResults = await runProviderApiTests(ctx);
      
      // Run load tests
      loadResults = await runLoadTests(ctx);
    } else {
      // Run unauthenticated tests only
      log('\n⚠ Running limited tests (no authentication)\n', 'yellow');
      performanceResults = await runUnauthenticatedTests();
    }
    
    // Generate report
    const report = generateReport(performanceResults, loadResults);
    
    // Save results
    const fs = await import('fs');
    const reportPath = 'provider-api-performance-results.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    log(`\n📄 Results saved to: ${reportPath}`, 'green');
    
    // Exit code based on results
    const exitCode = report.summary.failed > 0 || report.summary.byRating.critical > 0 ? 1 : 0;
    process.exit(exitCode);
    
  } catch (error) {
    log(`\n❌ Fatal error: ${error}`, 'red');
    process.exit(1);
  }
}

// Run
if (require.main === module) {
  main().catch(console.error);
}

export { runProviderApiTests, runLoadTests, generateReport };

