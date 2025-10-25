#!/usr/bin/env ts-node

/**
 * Phase 1 Onboarding Monitoring Dashboard
 * 
 * Real-time monitoring for ROAM Phase 1 onboarding on production
 * Tracks application health, performance, and user flows
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Configuration
const CONFIG = {
  PROVIDER_APP_URL: process.env.PROVIDER_APP_URL || 'https://roamprovider.app',
  SUPABASE_URL: process.env.VITE_PUBLIC_SUPABASE_URL!,
  SUPABASE_ANON_KEY: process.env.VITE_PUBLIC_SUPABASE_ANON_KEY!,
  MONITORING_INTERVAL: parseInt(process.env.MONITORING_INTERVAL || '5000'),
  ALERT_THRESHOLD_RESPONSE_TIME: parseInt(process.env.ALERT_THRESHOLD_RESPONSE_TIME || '2000'),
  ALERT_THRESHOLD_ERROR_RATE: parseFloat(process.env.ALERT_THRESHOLD_ERROR_RATE || '0.05'),
  MAX_METRICS_HISTORY: 1000,
};

// Initialize Supabase client
const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

interface Metric {
  timestamp: number;
  type: 'health' | 'performance' | 'error' | 'user_flow';
  name: string;
  value: number;
  status: 'success' | 'warning' | 'error';
  details?: any;
}

interface MonitoringStats {
  uptime: number;
  responseTime: number;
  errorRate: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  lastCheck: number;
  alerts: string[];
}

class Phase1MonitoringDashboard {
  private metrics: Metric[] = [];
  private stats: MonitoringStats = {
    uptime: 100,
    responseTime: 0,
    errorRate: 0,
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    lastCheck: 0,
    alerts: []
  };
  private isRunning = false;
  private startTime = Date.now();

  async start(): Promise<void> {
    console.log('🚀 Starting Phase 1 Monitoring Dashboard...');
    console.log(`📍 Monitoring: ${CONFIG.PROVIDER_APP_URL}`);
    console.log(`⏱️  Interval: ${CONFIG.MONITORING_INTERVAL}ms`);
    console.log(`🚨 Alert Thresholds: Response < ${CONFIG.ALERT_THRESHOLD_RESPONSE_TIME}ms, Error Rate < ${(CONFIG.ALERT_THRESHOLD_ERROR_RATE * 100).toFixed(1)}%`);
    console.log('\nPress Ctrl+C to stop monitoring and export metrics\n');

    this.isRunning = true;
    this.startTime = Date.now();

    // Set up graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Stopping monitoring...');
      this.isRunning = false;
      this.exportMetrics();
      process.exit(0);
    });

    // Start monitoring loop
    await this.monitoringLoop();
  }

  private async monitoringLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        await this.checkApplicationHealth();
        await this.checkPerformanceMetrics();
        await this.checkUserFlows();
        await this.checkDatabaseHealth();
        
        this.updateStats();
        this.displayDashboard();
        
        // Wait for next check
        await this.sleep(CONFIG.MONITORING_INTERVAL);
      } catch (error) {
        console.error('❌ Monitoring error:', error);
        this.addMetric('error', 'monitoring_error', 1, 'error', { error: String(error) });
        await this.sleep(CONFIG.MONITORING_INTERVAL);
      }
    }
  }

  private async checkApplicationHealth(): Promise<void> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(CONFIG.PROVIDER_APP_URL, {
        method: 'GET',
        timeout: 10000
      });
      
      const responseTime = Date.now() - startTime;
      const status = response.ok ? 'success' : 'error';
      
      this.addMetric('health', 'application_availability', response.status, status, {
        responseTime,
        status: response.status,
        statusText: response.statusText
      });

      // Check specific endpoints
      await this.checkOnboardingEndpoint();
      await this.checkAPIEndpoints();
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.addMetric('health', 'application_availability', 0, 'error', {
        responseTime,
        error: String(error)
      });
    }
  }

  private async checkOnboardingEndpoint(): Promise<void> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${CONFIG.PROVIDER_APP_URL}/provider-onboarding/phase1`, {
        method: 'GET',
        timeout: 10000
      });
      
      const responseTime = Date.now() - startTime;
      const status = response.ok ? 'success' : 'error';
      
      this.addMetric('health', 'onboarding_page', response.status, status, {
        responseTime,
        status: response.status
      });
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.addMetric('health', 'onboarding_page', 0, 'error', {
        responseTime,
        error: String(error)
      });
    }
  }

  private async checkAPIEndpoints(): Promise<void> {
    const endpoints = [
      '/api/onboarding/status/test',
      '/api/auth/signup',
      '/api/onboarding/business-info',
      '/api/onboarding/upload-documents',
      '/api/onboarding/submit-application'
    ];

    for (const endpoint of endpoints) {
      const startTime = Date.now();
      
      try {
        const response = await fetch(`${CONFIG.PROVIDER_APP_URL}${endpoint}`, {
          method: 'GET',
          timeout: 5000
        });
        
        const responseTime = Date.now() - startTime;
        const status = response.ok ? 'success' : 'warning'; // 404s are expected for test endpoints
        
        this.addMetric('health', `api_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`, response.status, status, {
          responseTime,
          status: response.status
        });
        
      } catch (error) {
        const responseTime = Date.now() - startTime;
        this.addMetric('health', `api_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`, 0, 'error', {
          responseTime,
          error: String(error)
        });
      }
    }
  }

  private async checkPerformanceMetrics(): Promise<void> {
    // Test response times for critical paths
    const criticalPaths = [
      { name: 'homepage', url: CONFIG.PROVIDER_APP_URL },
      { name: 'onboarding', url: `${CONFIG.PROVIDER_APP_URL}/provider-onboarding/phase1` },
      { name: 'api_status', url: `${CONFIG.PROVIDER_APP_URL}/api/onboarding/status/test` }
    ];

    for (const path of criticalPaths) {
      const startTime = Date.now();
      
      try {
        const response = await fetch(path.url, {
          method: 'GET',
          timeout: 10000
        });
        
        const responseTime = Date.now() - startTime;
        const status = responseTime < CONFIG.ALERT_THRESHOLD_RESPONSE_TIME ? 'success' : 'warning';
        
        this.addMetric('performance', `response_time_${path.name}`, responseTime, status, {
          url: path.url,
          status: response.status
        });
        
      } catch (error) {
        const responseTime = Date.now() - startTime;
        this.addMetric('performance', `response_time_${path.name}`, responseTime, 'error', {
          url: path.url,
          error: String(error)
        });
      }
    }
  }

  private async checkUserFlows(): Promise<void> {
    // Simulate key user flow checks
    await this.checkAuthenticationFlow();
    await this.checkBusinessInfoFlow();
    await this.checkDocumentUploadFlow();
  }

  private async checkAuthenticationFlow(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Test signup endpoint (should return validation error for empty data)
      const response = await fetch(`${CONFIG.PROVIDER_APP_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      const responseTime = Date.now() - startTime;
      const status = response.status === 400 ? 'success' : 'warning'; // Expected validation error
      
      this.addMetric('user_flow', 'auth_signup_validation', response.status, status, {
        responseTime,
        expectedValidation: true
      });
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.addMetric('user_flow', 'auth_signup_validation', 0, 'error', {
        responseTime,
        error: String(error)
      });
    }
  }

  private async checkBusinessInfoFlow(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Test business info validation (should return validation error for empty data)
      const response = await fetch(`${CONFIG.PROVIDER_APP_URL}/api/onboarding/business-info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      const responseTime = Date.now() - startTime;
      const status = response.status === 400 ? 'success' : 'warning'; // Expected validation error
      
      this.addMetric('user_flow', 'business_info_validation', response.status, status, {
        responseTime,
        expectedValidation: true
      });
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.addMetric('user_flow', 'business_info_validation', 0, 'error', {
        responseTime,
        error: String(error)
      });
    }
  }

  private async checkDocumentUploadFlow(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Test document upload validation (should return validation error for missing data)
      const formData = new FormData();
      const response = await fetch(`${CONFIG.PROVIDER_APP_URL}/api/onboarding/upload-documents`, {
        method: 'POST',
        body: formData
      });
      
      const responseTime = Date.now() - startTime;
      const status = response.status === 400 ? 'success' : 'warning'; // Expected validation error
      
      this.addMetric('user_flow', 'document_upload_validation', response.status, status, {
        responseTime,
        expectedValidation: true
      });
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.addMetric('user_flow', 'document_upload_validation', 0, 'error', {
        responseTime,
        error: String(error)
      });
    }
  }

  private async checkDatabaseHealth(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Test database connectivity
      const { data, error } = await supabase
        .from('business_profiles')
        .select('count')
        .limit(1);
      
      const responseTime = Date.now() - startTime;
      const status = error ? 'error' : 'success';
      
      this.addMetric('health', 'database_connectivity', responseTime, status, {
        responseTime,
        error: error?.message
      });
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.addMetric('health', 'database_connectivity', responseTime, 'error', {
        responseTime,
        error: String(error)
      });
    }
  }

  private addMetric(type: Metric['type'], name: string, value: number, status: Metric['status'], details?: any): void {
    const metric: Metric = {
      timestamp: Date.now(),
      type,
      name,
      value,
      status,
      details
    };
    
    this.metrics.push(metric);
    
    // Keep only recent metrics
    if (this.metrics.length > CONFIG.MAX_METRICS_HISTORY) {
      this.metrics = this.metrics.slice(-CONFIG.MAX_METRICS_HISTORY);
    }
  }

  private updateStats(): void {
    const now = Date.now();
    const recentMetrics = this.metrics.filter(m => now - m.timestamp < 60000); // Last minute
    
    this.stats.totalRequests = recentMetrics.length;
    this.stats.successfulRequests = recentMetrics.filter(m => m.status === 'success').length;
    this.stats.failedRequests = recentMetrics.filter(m => m.status === 'error').length;
    this.stats.errorRate = this.stats.totalRequests > 0 ? this.stats.failedRequests / this.stats.totalRequests : 0;
    
    // Calculate average response time
    const responseTimeMetrics = recentMetrics.filter(m => m.name.includes('response_time'));
    this.stats.responseTime = responseTimeMetrics.length > 0 
      ? responseTimeMetrics.reduce((sum, m) => sum + m.value, 0) / responseTimeMetrics.length 
      : 0;
    
    // Calculate uptime
    const uptimeMetrics = recentMetrics.filter(m => m.name === 'application_availability');
    this.stats.uptime = uptimeMetrics.length > 0 
      ? (uptimeMetrics.filter(m => m.status === 'success').length / uptimeMetrics.length) * 100 
      : 100;
    
    this.stats.lastCheck = now;
    
    // Check for alerts
    this.checkAlerts();
  }

  private checkAlerts(): void {
    this.stats.alerts = [];
    
    if (this.stats.responseTime > CONFIG.ALERT_THRESHOLD_RESPONSE_TIME) {
      this.stats.alerts.push(`⚠️  High response time: ${Math.round(this.stats.responseTime)}ms`);
    }
    
    if (this.stats.errorRate > CONFIG.ALERT_THRESHOLD_ERROR_RATE) {
      this.stats.alerts.push(`🚨 High error rate: ${(this.stats.errorRate * 100).toFixed(1)}%`);
    }
    
    if (this.stats.uptime < 99) {
      this.stats.alerts.push(`🔴 Low uptime: ${this.stats.uptime.toFixed(1)}%`);
    }
  }

  private displayDashboard(): void {
    // Clear screen and move cursor to top
    process.stdout.write('\x1B[2J\x1B[0f');
    
    const runtime = Math.round((Date.now() - this.startTime) / 1000);
    const uptime = this.stats.uptime.toFixed(1);
    const responseTime = Math.round(this.stats.responseTime);
    const errorRate = (this.stats.errorRate * 100).toFixed(1);
    
    console.log('🚀 ROAM Phase 1 Monitoring Dashboard');
    console.log('='.repeat(60));
    console.log(`📍 URL: ${CONFIG.PROVIDER_APP_URL}`);
    console.log(`⏱️  Runtime: ${runtime}s | Last Check: ${new Date(this.stats.lastCheck).toLocaleTimeString()}`);
    console.log('');
    
    // Status indicators
    const statusColor = this.stats.alerts.length === 0 ? '🟢' : '🔴';
    console.log(`${statusColor} Status: ${this.stats.alerts.length === 0 ? 'HEALTHY' : 'ISSUES DETECTED'}`);
    console.log('');
    
    // Key metrics
    console.log('📊 Key Metrics:');
    console.log(`   Uptime: ${uptime}% ${uptime >= 99 ? '✅' : '❌'}`);
    console.log(`   Response Time: ${responseTime}ms ${responseTime < CONFIG.ALERT_THRESHOLD_RESPONSE_TIME ? '✅' : '⚠️'}`);
    console.log(`   Error Rate: ${errorRate}% ${this.stats.errorRate < CONFIG.ALERT_THRESHOLD_ERROR_RATE ? '✅' : '🚨'}`);
    console.log(`   Total Requests: ${this.stats.totalRequests}`);
    console.log(`   Success Rate: ${this.stats.totalRequests > 0 ? ((this.stats.successfulRequests / this.stats.totalRequests) * 100).toFixed(1) : 0}%`);
    console.log('');
    
    // Alerts
    if (this.stats.alerts.length > 0) {
      console.log('🚨 Alerts:');
      this.stats.alerts.forEach(alert => console.log(`   ${alert}`));
      console.log('');
    }
    
    // Recent metrics
    const recentMetrics = this.metrics.slice(-5);
    console.log('📈 Recent Activity:');
    recentMetrics.forEach(metric => {
      const time = new Date(metric.timestamp).toLocaleTimeString();
      const status = metric.status === 'success' ? '✅' : metric.status === 'warning' ? '⚠️' : '❌';
      console.log(`   ${time} ${status} ${metric.name}: ${metric.value}${metric.type === 'performance' ? 'ms' : ''}`);
    });
    
    console.log('');
    console.log('Press Ctrl+C to stop monitoring and export metrics');
  }

  private exportMetrics(): void {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `phase1-monitoring-${timestamp}.json`;
    const filepath = path.join(__dirname, filename);
    
    const exportData = {
      summary: {
        startTime: this.startTime,
        endTime: Date.now(),
        duration: Date.now() - this.startTime,
        totalMetrics: this.metrics.length,
        finalStats: this.stats
      },
      metrics: this.metrics,
      config: CONFIG
    };
    
    fs.writeFileSync(filepath, JSON.stringify(exportData, null, 2));
    console.log(`\n📄 Metrics exported to: ${filepath}`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main execution
async function main() {
  const dashboard = new Phase1MonitoringDashboard();
  await dashboard.start();
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Monitoring dashboard failed:', error);
    process.exit(1);
  });
}

export { Phase1MonitoringDashboard };
