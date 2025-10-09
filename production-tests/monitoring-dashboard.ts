/**
 * ROAM Platform - Production Monitoring Dashboard
 * 
 * Real-time monitoring of platform health and performance
 * Run: ts-node production-tests/monitoring-dashboard.ts
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
  PROVIDER_APP_URL: process.env.PROVIDER_APP_URL || urls.PROVIDER_APP_URL,
  ADMIN_APP_URL: process.env.ADMIN_APP_URL || urls.ADMIN_APP_URL,
  CUSTOMER_APP_URL: process.env.CUSTOMER_APP_URL || urls.CUSTOMER_APP_URL,
  SUPABASE_URL: process.env.VITE_PUBLIC_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.VITE_PUBLIC_SUPABASE_ANON_KEY || '',
  CHECK_INTERVAL: 60000, // 1 minute
  ALERT_THRESHOLD: {
    responseTime: 3000, // 3 seconds
    errorRate: 0.05, // 5%
    uptimeMin: 0.99, // 99%
  },
};

interface HealthStatus {
  timestamp: string;
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  error?: string;
}

interface Metrics {
  uptime: number;
  totalChecks: number;
  successfulChecks: number;
  averageResponseTime: number;
  errorRate: number;
  lastChecked: string;
}

const healthHistory: HealthStatus[] = [];
const metrics: Record<string, Metrics> = {
  providerApp: { uptime: 100, totalChecks: 0, successfulChecks: 0, averageResponseTime: 0, errorRate: 0, lastChecked: '' },
  customerApp: { uptime: 100, totalChecks: 0, successfulChecks: 0, averageResponseTime: 0, errorRate: 0, lastChecked: '' },
  adminApp: { uptime: 100, totalChecks: 0, successfulChecks: 0, averageResponseTime: 0, errorRate: 0, lastChecked: '' },
  database: { uptime: 100, totalChecks: 0, successfulChecks: 0, averageResponseTime: 0, errorRate: 0, lastChecked: '' },
};

// Utility functions
function log(message: string, color = '\x1b[0m') {
  console.log(`${color}${message}\x1b[0m`);
}

function clearScreen() {
  console.clear();
  // Or use: console.log('\x1Bc');
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'healthy': return '\x1b[32m'; // Green
    case 'degraded': return '\x1b[33m'; // Yellow
    case 'down': return '\x1b[31m'; // Red
    default: return '\x1b[0m';
  }
}

function getStatusIcon(status: string): string {
  switch (status) {
    case 'healthy': return '✓';
    case 'degraded': return '⚠';
    case 'down': return '✗';
    default: return '?';
  }
}

// Health check functions
async function checkEndpoint(url: string, timeout = 10000): Promise<HealthStatus> {
  const startTime = Date.now();
  const service = new URL(url).hostname;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    const responseTime = Date.now() - startTime;
    const status = response.ok ? 'healthy' : 'degraded';
    
    return {
      timestamp: new Date().toISOString(),
      service,
      status,
      responseTime,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      timestamp: new Date().toISOString(),
      service,
      status: 'down',
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function checkDatabase(): Promise<HealthStatus> {
  const startTime = Date.now();
  
  try {
    if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
      throw new Error('Supabase configuration missing');
    }
    
    const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    const { error } = await supabase.from('services').select('id').limit(1);
    
    const responseTime = Date.now() - startTime;
    
    if (error) {
      return {
        timestamp: new Date().toISOString(),
        service: 'database',
        status: 'degraded',
        responseTime,
        error: error.message,
      };
    }
    
    return {
      timestamp: new Date().toISOString(),
      service: 'database',
      status: 'healthy',
      responseTime,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      timestamp: new Date().toISOString(),
      service: 'database',
      status: 'down',
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Update metrics
function updateMetrics(service: string, health: HealthStatus) {
  const metric = metrics[service];
  
  metric.totalChecks++;
  if (health.status === 'healthy') {
    metric.successfulChecks++;
  }
  
  metric.uptime = (metric.successfulChecks / metric.totalChecks) * 100;
  metric.errorRate = 1 - (metric.successfulChecks / metric.totalChecks);
  metric.averageResponseTime = 
    (metric.averageResponseTime * (metric.totalChecks - 1) + health.responseTime) / metric.totalChecks;
  metric.lastChecked = health.timestamp;
}

// Alert system
function checkAlerts(service: string, health: HealthStatus) {
  const alerts: string[] = [];
  
  // Response time alert
  if (health.responseTime > CONFIG.ALERT_THRESHOLD.responseTime) {
    alerts.push(`⚠ HIGH RESPONSE TIME: ${service} took ${formatDuration(health.responseTime)}`);
  }
  
  // Error rate alert
  const metric = metrics[service];
  if (metric.errorRate > CONFIG.ALERT_THRESHOLD.errorRate) {
    alerts.push(`⚠ HIGH ERROR RATE: ${service} at ${(metric.errorRate * 100).toFixed(2)}%`);
  }
  
  // Uptime alert
  if (metric.uptime < CONFIG.ALERT_THRESHOLD.uptimeMin * 100) {
    alerts.push(`⚠ LOW UPTIME: ${service} at ${metric.uptime.toFixed(2)}%`);
  }
  
  // Service down alert
  if (health.status === 'down') {
    alerts.push(`🚨 SERVICE DOWN: ${service} - ${health.error}`);
  }
  
  return alerts;
}

// Display dashboard
function displayDashboard() {
  clearScreen();
  
  log('╔════════════════════════════════════════════════════════════════════╗', '\x1b[36m');
  log('║           ROAM Platform - Production Monitoring Dashboard         ║', '\x1b[36m');
  log('╚════════════════════════════════════════════════════════════════════╝', '\x1b[36m');
  log('');
  
  // System Status
  log('┌─ System Status ─────────────────────────────────────────────────┐', '\x1b[36m');
  
  Object.entries(metrics).forEach(([service, metric]) => {
    const lastCheck = healthHistory.filter(h => h.service.includes(service)).pop();
    const status = lastCheck?.status || 'unknown';
    const color = getStatusColor(status);
    const icon = getStatusIcon(status);
    
    const serviceName = service.replace(/([A-Z])/g, ' $1').trim();
    const paddedName = serviceName.padEnd(20);
    const statusStr = status.toUpperCase().padEnd(10);
    const uptimeStr = `${metric.uptime.toFixed(2)}%`.padStart(8);
    const responseTime = formatDuration(metric.averageResponseTime).padStart(8);
    
    log(`│ ${icon} ${paddedName} ${statusStr} Uptime: ${uptimeStr} Avg: ${responseTime} │`, color);
  });
  
  log('└─────────────────────────────────────────────────────────────────┘', '\x1b[36m');
  log('');
  
  // Recent Activity
  log('┌─ Recent Checks (Last 5) ────────────────────────────────────────┐', '\x1b[36m');
  
  const recentChecks = healthHistory.slice(-5);
  recentChecks.forEach(check => {
    const time = new Date(check.timestamp).toLocaleTimeString();
    const service = check.service.padEnd(25);
    const status = check.status.padEnd(10);
    const responseTime = formatDuration(check.responseTime).padStart(8);
    const color = getStatusColor(check.status);
    
    log(`│ ${time} | ${service} | ${status} | ${responseTime} │`, color);
  });
  
  if (recentChecks.length === 0) {
    log('│ No checks yet...                                                │', '\x1b[90m');
  }
  
  log('└─────────────────────────────────────────────────────────────────┘', '\x1b[36m');
  log('');
  
  // Active Alerts
  const allAlerts: string[] = [];
  Object.entries(metrics).forEach(([service, _]) => {
    const lastCheck = healthHistory.filter(h => h.service.includes(service)).pop();
    if (lastCheck) {
      const alerts = checkAlerts(service, lastCheck);
      allAlerts.push(...alerts);
    }
  });
  
  if (allAlerts.length > 0) {
    log('┌─ Active Alerts ─────────────────────────────────────────────────┐', '\x1b[31m');
    allAlerts.forEach(alert => {
      log(`│ ${alert.padEnd(64)} │`, '\x1b[31m');
    });
    log('└─────────────────────────────────────────────────────────────────┘', '\x1b[31m');
    log('');
  }
  
  // Statistics
  const totalChecks = Object.values(metrics).reduce((sum, m) => sum + m.totalChecks, 0);
  const avgUptime = Object.values(metrics).reduce((sum, m) => sum + m.uptime, 0) / Object.keys(metrics).length;
  const avgResponseTime = Object.values(metrics).reduce((sum, m) => sum + m.averageResponseTime, 0) / Object.keys(metrics).length;
  
  log('┌─ Statistics ────────────────────────────────────────────────────┐', '\x1b[36m');
  log(`│ Total Checks: ${totalChecks.toString().padStart(10)}                                        │`);
  log(`│ Average Uptime: ${avgUptime.toFixed(2).padStart(6)}%                                      │`);
  log(`│ Average Response: ${formatDuration(avgResponseTime).padStart(8)}                                    │`);
  log(`│ Next Check: ${formatDuration(CONFIG.CHECK_INTERVAL).padStart(8)}                                       │`);
  log('└─────────────────────────────────────────────────────────────────┘', '\x1b[36m');
  
  log('');
  log('Press Ctrl+C to exit', '\x1b[90m');
  log('');
}

// Get database statistics
async function getDatabaseStats() {
  try {
    const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    
    // Get counts
    const { count: bookingsCount } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true });
    
    const { count: businessesCount } = await supabase
      .from('businesses')
      .select('*', { count: 'exact', head: true });
    
    const { count: servicesCount } = await supabase
      .from('services')
      .select('*', { count: 'exact', head: true });
    
    return {
      bookings: bookingsCount || 0,
      businesses: businessesCount || 0,
      services: servicesCount || 0,
    };
  } catch (error) {
    return null;
  }
}

// Main monitoring loop
async function runMonitoring() {
  log('Starting monitoring dashboard...', '\x1b[36m');
  log('Performing initial health checks...', '\x1b[36m');
  
  // Initial check
  await performHealthChecks();
  displayDashboard();
  
  // Set up interval
  setInterval(async () => {
    await performHealthChecks();
    displayDashboard();
  }, CONFIG.CHECK_INTERVAL);
}

async function performHealthChecks() {
  // Check all services
  const checks = await Promise.all([
    checkEndpoint(CONFIG.PROVIDER_APP_URL),
    checkEndpoint(CONFIG.CUSTOMER_APP_URL),
    checkEndpoint(CONFIG.ADMIN_APP_URL),
    checkDatabase(),
  ]);
  
  // Update metrics
  updateMetrics('providerApp', checks[0]);
  updateMetrics('customerApp', checks[1]);
  updateMetrics('adminApp', checks[2]);
  updateMetrics('database', checks[3]);
  
  // Store history
  healthHistory.push(...checks);
  
  // Keep only last 100 checks
  if (healthHistory.length > 100) {
    healthHistory.splice(0, healthHistory.length - 100);
  }
}

// Export metrics to JSON
async function exportMetrics() {
  const data = {
    timestamp: new Date().toISOString(),
    metrics,
    recentChecks: healthHistory.slice(-20),
    stats: await getDatabaseStats(),
  };
  
  const fs = await import('fs');
  fs.writeFileSync(
    `monitoring-${new Date().toISOString().split('T')[0]}.json`,
    JSON.stringify(data, null, 2)
  );
}

// Handle exit
process.on('SIGINT', async () => {
  log('\n\nExporting metrics...', '\x1b[36m');
  await exportMetrics();
  log('Monitoring stopped.', '\x1b[36m');
  process.exit(0);
});

// Start monitoring
if (require.main === module) {
  if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
    log('Error: Missing Supabase configuration', '\x1b[31m');
    log('Set VITE_PUBLIC_SUPABASE_URL and VITE_PUBLIC_SUPABASE_ANON_KEY', '\x1b[31m');
    process.exit(1);
  }
  
  runMonitoring().catch(console.error);
}

export {
  checkEndpoint,
  checkDatabase,
  updateMetrics,
  checkAlerts,
  metrics,
  healthHistory,
};

