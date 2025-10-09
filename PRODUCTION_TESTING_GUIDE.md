# ROAM Platform - Production Testing Guide

*Last Updated: October 9, 2025*

## Overview

This guide provides comprehensive instructions for testing the ROAM platform in production environments. It covers automated testing, manual testing procedures, and monitoring strategies to ensure platform reliability and performance.

---

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Test Suites Overview](#test-suites-overview)
3. [Quick Start](#quick-start)
4. [Automated Testing](#automated-testing)
5. [Manual Testing](#manual-testing)
6. [Production Monitoring](#production-monitoring)
7. [Incident Response](#incident-response)
8. [Testing Checklist](#testing-checklist)

---

## Testing Philosophy

### Goals
- **Verify critical functionality** after each deployment
- **Catch regressions** before users are impacted
- **Monitor performance** and identify bottlenecks
- **Ensure security** best practices are maintained

### Testing Pyramid
```
          /\
         /  \  E2E Tests (Few, Comprehensive)
        /    \
       /------\
      /        \  Integration Tests (More, Focused)
     /          \
    /------------\
   /              \  Unit Tests + Smoke Tests (Many, Fast)
  /                \
 /------------------\
```

### Deployment Testing Strategy
1. **Pre-Deployment**: Run smoke tests on staging
2. **Post-Deployment**: Run smoke tests on production
3. **Regular Monitoring**: Run full test suite nightly
4. **User Acceptance**: Manual E2E testing weekly

---

## Test Suites Overview

### 1. Smoke Tests (`production-tests/smoke-tests.ts`)
**Purpose**: Quick health checks for critical functionality
**Duration**: < 2 minutes
**Frequency**: After every deployment

**What it tests**:
- ✓ Application availability (all 3 apps)
- ✓ Critical API endpoints
- ✓ Database connectivity
- ✓ Third-party integrations (Stripe, Google Maps)
- ✓ Static assets & CDN
- ✓ Security headers

**Exit Codes**:
- `0` = All passed
- `1` = Warnings only (non-critical issues)
- `2` = Critical failures

### 2. API Tests (`production-tests/api-tests.ts`)
**Purpose**: Comprehensive API endpoint testing
**Duration**: 5-10 minutes
**Frequency**: Daily + on-demand

**What it tests**:
- ✓ Authentication flow
- ✓ Provider App APIs (20+ endpoints)
- ✓ Customer App APIs (15+ endpoints)
- ✓ Admin App APIs (10+ endpoints)
- ✓ Database queries
- ✓ Performance benchmarks

### 3. E2E Tests (`production-tests/e2e-tests.ts`)
**Purpose**: End-to-end user flow validation
**Duration**: 15-30 minutes
**Frequency**: Weekly + before major releases

**Critical Flows**:
- ✓ Provider Onboarding (Phase 1 & 2)
- ✓ Booking Management
- ✓ Customer Booking Flow
- ✓ Payment Processing
- ✓ Admin Application Review

### 4. Monitoring Dashboard (`production-tests/monitoring-dashboard.ts`)
**Purpose**: Real-time health monitoring
**Duration**: Continuous
**Frequency**: Always running

**Monitors**:
- ✓ Uptime status
- ✓ API response times
- ✓ Error rates
- ✓ Database performance
- ✓ User activity

---

## Quick Start

### Prerequisites

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env.production.test
# Edit .env.production.test with production values

# Install test dependencies
npm install -D @playwright/test ts-node
```

### Environment Variables

Create `.env.production.test`:

```bash
# Application URLs
PROVIDER_APP_URL=https://roamprovider.app
CUSTOMER_APP_URL=https://roamyourbestlife.com
ADMIN_APP_URL=https://admin.roamyourbestlife.com

# Supabase
VITE_PUBLIC_SUPABASE_URL=your_supabase_url
VITE_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Test Credentials
TEST_EMAIL=test@roamprovider.app
TEST_PASSWORD=your_test_password

# Optional: Admin credentials for admin tests
ADMIN_EMAIL=admin@roamyourbestlife.com
ADMIN_PASSWORD=your_admin_password
```

### Running Tests

```bash
# 1. Smoke Tests (fastest, run after deployment)
npm run test:smoke

# 2. API Tests (comprehensive API coverage)
npm run test:api

# 3. E2E Tests (full user flows)
npm run test:e2e

# 4. All Tests
npm run test:production

# 5. Start Monitoring Dashboard
npm run monitor
```

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "test:smoke": "ts-node -r dotenv/config production-tests/smoke-tests.ts",
    "test:api": "ts-node -r dotenv/config production-tests/api-tests.ts",
    "test:e2e": "playwright test production-tests/e2e-tests.ts",
    "test:production": "npm run test:smoke && npm run test:api && npm run test:e2e",
    "monitor": "ts-node production-tests/monitoring-dashboard.ts"
  }
}
```

---

## Automated Testing

### Continuous Integration

Add to `.github/workflows/production-tests.yml`:

```yaml
name: Production Tests

on:
  schedule:
    # Run every hour
    - cron: '0 * * * *'
  workflow_dispatch:
    # Allow manual trigger

jobs:
  smoke-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run Smoke Tests
        env:
          PROVIDER_APP_URL: ${{ secrets.PROVIDER_APP_URL }}
          CUSTOMER_APP_URL: ${{ secrets.CUSTOMER_APP_URL }}
          ADMIN_APP_URL: ${{ secrets.ADMIN_APP_URL }}
          VITE_PUBLIC_SUPABASE_URL: ${{ secrets.VITE_PUBLIC_SUPABASE_URL }}
          VITE_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.VITE_PUBLIC_SUPABASE_ANON_KEY }}
        run: npm run test:smoke
      
      - name: Upload Results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: smoke-test-results
          path: smoke-test-results.json
      
      - name: Notify on Failure
        if: failure()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Production smoke tests failed!'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}

  api-tests:
    runs-on: ubuntu-latest
    needs: smoke-tests
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      
      - name: Run API Tests
        env:
          PROVIDER_APP_URL: ${{ secrets.PROVIDER_APP_URL }}
          TEST_EMAIL: ${{ secrets.TEST_EMAIL }}
          TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
        run: npm run test:api
      
      - name: Upload Results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: api-test-results
          path: production-test-results.json
```

### Test Automation Best Practices

1. **Run smoke tests** after every production deployment
2. **Run full API tests** nightly at 2 AM
3. **Run E2E tests** weekly on Sundays
4. **Alert on failures** via Slack/email
5. **Store test results** for trend analysis

---

## Manual Testing

### Pre-Deployment Checklist

Before deploying to production, manually verify:

#### Provider App
- [ ] Login/Signup works
- [ ] Dashboard loads correctly
- [ ] Bookings tab displays data
- [ ] Services tab loads without errors
- [ ] Image uploads work
- [ ] Forms validate correctly

#### Customer App
- [ ] Homepage loads
- [ ] Search functionality works
- [ ] Service details display
- [ ] Booking flow completes
- [ ] Payment processing works
- [ ] Confirmation emails sent

#### Admin App
- [ ] Admin login works
- [ ] Pending applications display
- [ ] Application approval works
- [ ] Provider management functions
- [ ] Reports generate correctly

### Post-Deployment Verification

Within 15 minutes of deployment:

```bash
# 1. Run smoke tests
npm run test:smoke

# 2. Manual checks
curl https://roamprovider.app/api/test-db-connection
curl https://roamyourbestlife.com
curl https://admin.roamyourbestlife.com

# 3. Check error logs
vercel logs --prod
# or
heroku logs --tail --app roam-platform

# 4. Monitor real-time metrics
# Check Vercel Analytics or New Relic dashboard
```

### Browser Testing Matrix

Test on:
- ✓ Chrome (latest)
- ✓ Firefox (latest)
- ✓ Safari (latest)
- ✓ Edge (latest)
- ✓ Mobile Safari (iOS)
- ✓ Mobile Chrome (Android)

### Device Testing

- ✓ Desktop (1920x1080)
- ✓ Laptop (1366x768)
- ✓ Tablet (iPad)
- ✓ Mobile (iPhone, Android)

---

## Production Monitoring

### Real-Time Monitoring

Use the monitoring dashboard:

```bash
npm run monitor
```

This provides:
- ✓ Uptime status (all apps)
- ✓ API response times
- ✓ Error rate tracking
- ✓ Active users
- ✓ Recent bookings
- ✓ System alerts

### Key Metrics to Watch

#### Application Health
- **Uptime**: Should be > 99.9%
- **Response Time**: < 2s for pages, < 500ms for APIs
- **Error Rate**: < 0.1%

#### User Activity
- **Active Users**: Monitor for unusual drops
- **Booking Rate**: Track hourly/daily trends
- **Conversion Rate**: Signup → Active Provider

#### Performance
- **API Latency**: P50, P95, P99
- **Database Queries**: Slow query detection
- **CDN Performance**: Asset load times

### Alerting Thresholds

Configure alerts for:

| Metric | Warning | Critical |
|--------|---------|----------|
| Uptime | < 99.5% | < 99% |
| API Response Time | > 1s | > 3s |
| Error Rate | > 1% | > 5% |
| Failed Logins | > 10/min | > 50/min |
| Database Connections | > 80% | > 95% |

### Third-Party Monitoring

Recommended tools:

1. **Vercel Analytics** - Built-in performance monitoring
2. **Sentry** - Error tracking and alerts
3. **Datadog / New Relic** - APM and infrastructure monitoring
4. **Pingdom / UptimeRobot** - Uptime monitoring
5. **Stripe Dashboard** - Payment monitoring

---

## Incident Response

### When Tests Fail

#### Smoke Tests Failed
**Severity**: Critical
**Action**: Immediate rollback or hotfix

```bash
# 1. Identify the issue
cat smoke-test-results.json

# 2. Check logs
vercel logs --prod | grep ERROR

# 3. Rollback if necessary
vercel rollback

# 4. Notify team
# Post in #incidents Slack channel
```

#### API Tests Failed
**Severity**: High
**Action**: Investigate within 1 hour

```bash
# 1. Review failed tests
cat production-test-results.json | jq '.results[] | select(.status == "failed")'

# 2. Test specific endpoint manually
curl -v https://roamprovider.app/api/bookings

# 3. Check database
# Login to Supabase dashboard, run diagnostics

# 4. Deploy fix or rollback
```

#### E2E Tests Failed
**Severity**: Medium
**Action**: Investigate within 4 hours

- Review user flow
- Check for UI regressions
- Verify third-party integrations
- Test manually

### Rollback Procedure

```bash
# Vercel
vercel rollback

# Or specific deployment
vercel rollback https://roamprovider-abc123.vercel.app

# Verify rollback
npm run test:smoke
```

---

## Testing Checklist

### After Every Deployment

- [ ] Run smoke tests
- [ ] Verify homepage loads
- [ ] Check Vercel deployment status
- [ ] Monitor error logs for 15 minutes
- [ ] Verify no spike in error rate

### Weekly Testing

- [ ] Run full API test suite
- [ ] Manual E2E testing (critical flows)
- [ ] Review test results trends
- [ ] Update test data if needed
- [ ] Check for deprecated APIs

### Monthly Testing

- [ ] Full E2E test suite
- [ ] Cross-browser testing
- [ ] Mobile device testing
- [ ] Performance benchmarking
- [ ] Security audit
- [ ] Load testing

### Before Major Releases

- [ ] All test suites pass
- [ ] Manual testing complete
- [ ] Staging environment validated
- [ ] Database migrations tested
- [ ] Rollback plan documented
- [ ] Team notified of deployment
- [ ] Monitor dashboard ready

---

## Test Data Management

### Test Accounts

Maintain these test accounts:

```
Provider Test Account:
- Email: test-provider@roamprovider.app
- Role: provider
- Business: Test Car Wash
- Status: active

Customer Test Account:
- Email: test-customer@roamyourbestlife.com
- Role: customer
- Status: active

Admin Test Account:
- Email: test-admin@roamyourbestlife.com
- Role: admin
- Status: active
```

### Test Data Cleanup

```sql
-- Run weekly to clean up test data
DELETE FROM bookings WHERE customer_id IN (
  SELECT id FROM users WHERE email LIKE '%+test%@%'
);

DELETE FROM businesses WHERE business_name LIKE 'Test %';

DELETE FROM users WHERE email LIKE '%+test%@%';
```

---

## Performance Benchmarks

### Target Metrics

| Metric | Target | Measured |
|--------|--------|----------|
| Homepage Load | < 2s | |
| Dashboard Load | < 3s | |
| API Response (GET) | < 200ms | |
| API Response (POST) | < 500ms | |
| Database Query | < 100ms | |
| Search Results | < 1s | |
| Image Upload | < 5s | |

### Load Testing

Use tools like:
- **k6** - Load testing
- **Artillery** - Load testing
- **Apache JMeter** - Performance testing

Example k6 script:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  vus: 100, // 100 virtual users
  duration: '30s',
};

export default function() {
  let res = http.get('https://roamprovider.app');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 2s': (r) => r.timings.duration < 2000,
  });
  sleep(1);
}
```

---

## Continuous Improvement

### Review Test Results

Monthly review:
- Identify flaky tests
- Update test data
- Add tests for new features
- Remove obsolete tests
- Optimize slow tests

### Test Coverage Goals

- **API Coverage**: 80%+ of endpoints
- **E2E Coverage**: All critical user flows
- **Browser Coverage**: Latest 2 versions
- **Mobile Coverage**: iOS + Android

---

## Resources

### Documentation
- [API Architecture](./API_ARCHITECTURE.md)
- [Database Schema Reference](./DATABASE_SCHEMA_REFERENCE.md)
- [Phase 2 Testing Guide](./PHASE2_TESTING_GUIDE.md)

### Test Files
- `production-tests/smoke-tests.ts` - Quick health checks
- `production-tests/api-tests.ts` - Comprehensive API testing
- `production-tests/e2e-tests.ts` - End-to-end flows
- `production-tests/monitoring-dashboard.ts` - Real-time monitoring

### Support
- **Slack**: #engineering channel
- **On-Call**: PagerDuty rotation
- **Documentation**: Notion workspace

---

## Contact

For questions about production testing:
- **Engineering Lead**: [Contact Info]
- **DevOps**: [Contact Info]
- **On-Call**: [PagerDuty Link]

---

**Last Updated**: October 9, 2025
**Next Review**: November 9, 2025

