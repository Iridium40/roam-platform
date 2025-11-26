# ROAM Platform - Production Testing Suite

Comprehensive testing and monitoring tools for the ROAM Platform in production environments.

## 📋 Overview

This directory contains automated tests and monitoring tools to ensure the reliability, performance, and correctness of the ROAM platform in production.

### Test Suites

1. **Smoke Tests** (`smoke-tests.ts`) - Quick health checks (~2 min)
2. **API Tests** (`api-tests.ts`) - Comprehensive endpoint testing (~5-10 min)
3. **Provider API Performance** (`provider-api-performance.ts`) - Provider app API benchmarks (~3-5 min)
4. **E2E Tests** (`e2e-tests.ts`) - Full user flow validation (~15-30 min)
5. **Monitoring Dashboard** (`monitoring-dashboard.ts`) - Real-time health monitoring

## 🚀 Quick Start

### Prerequisites

```bash
# Install dependencies
cd production-tests
npm install

# Install Playwright browsers (for E2E tests)
npm run install:playwright
```

### Configuration

Create `.env.production.test` in the root directory:

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

# Optional
ADMIN_EMAIL=admin@roamyourbestlife.com
ADMIN_PASSWORD=your_admin_password
```

## 🧪 Running Tests

### Smoke Tests (Recommended after deployment)

```bash
npm run test:smoke
```

**What it does:**
- ✓ Checks application availability (3 apps)
- ✓ Tests critical API endpoints
- ✓ Verifies database connectivity
- ✓ Validates third-party integrations
- ✓ Checks security headers

**Duration:** < 2 minutes  
**Exit Codes:**
- `0` = All passed ✓
- `1` = Warnings (non-critical)
- `2` = Critical failures

### API Tests

```bash
npm run test:api
```

**What it does:**
- ✓ Tests authentication flow
- ✓ Tests 40+ API endpoints
- ✓ Validates database queries
- ✓ Measures performance
- ✓ Checks JSON parsing safety

**Duration:** 5-10 minutes

### E2E Tests

```bash
npm run test:e2e
```

**What it does:**
- ✓ Provider onboarding (Phase 1 & 2)
- ✓ Booking management
- ✓ Customer booking flow
- ✓ Payment processing
- ✓ Admin application review

**Duration:** 15-30 minutes

### Provider API Performance Tests

```bash
# Development environment
npm run test:provider-perf

# Production environment
npm run test:provider-perf:prod
```

**What it does:**
- ✓ Tests 20+ Provider App API endpoints
- ✓ Measures response times against thresholds
- ✓ Runs load tests with concurrent requests
- ✓ Identifies slow endpoints and N+1 patterns
- ✓ Generates optimization recommendations

**Performance Thresholds:**
| Rating | Response Time |
|--------|---------------|
| ⚡ Excellent | < 200ms |
| ✓ Good | < 500ms |
| ○ Acceptable | < 1000ms |
| ⚠ Slow | > 1000ms |

**Endpoints Tested:**
- Bookings API (list, filter, paginate)
- Service Eligibility & Business Services
- Business Profile, Hours, Tax Info
- Stripe APIs (balance, transactions, payouts)
- Provider Profile
- Chat & Notifications
- Twilio Conversations

**Load Testing:**
- Configurable concurrency (default: 5)
- Measures P95 response times
- Tracks requests per second throughput

**Duration:** 3-5 minutes

### All Tests

```bash
npm run test:all
```

Runs smoke + API tests (E2E requires Playwright setup)

## 📊 Monitoring Dashboard

Real-time production monitoring:

```bash
npm run monitor
```

**Features:**
- ✓ Live uptime tracking
- ✓ Response time monitoring
- ✓ Error rate detection
- ✓ Alert system
- ✓ Historical metrics
- ✓ Auto-export on exit

**Controls:**
- `Ctrl+C` to exit and export metrics

## 📁 Files

```
production-tests/
├── smoke-tests.ts                  # Quick health checks
├── api-tests.ts                    # API endpoint testing
├── provider-api-performance.ts     # Provider App performance benchmarks
├── e2e-tests.ts                    # End-to-end user flows
├── monitoring-dashboard.ts         # Real-time monitoring
├── phase1-production-tests.ts      # Phase 1 specific tests
├── phase1-tests.ts                 # Phase 1 local tests
├── phase1-monitoring.ts            # Phase 1 monitoring
├── package.json                    # Dependencies
└── README.md                       # This file
```

## 🎯 Testing Strategy

### After Every Deployment

```bash
# 1. Run smoke tests immediately
npm run test:smoke

# 2. Monitor for 15 minutes
npm run monitor
```

### Daily (Automated)

```bash
# Run via GitHub Actions at 2 AM
npm run test:all
```

### Weekly (Manual)

```bash
# Full regression testing
npm run test:smoke
npm run test:api
npm run test:e2e
```

## 📈 Test Results

Results are saved to JSON files:

- `smoke-test-results.json` - Smoke test results
- `production-test-results.json` - API test results
- `provider-api-performance-results.json` - Provider API performance benchmarks
- `monitoring-YYYY-MM-DD.json` - Monitoring metrics

### Example Result

```json
{
  "summary": {
    "total": 25,
    "passed": 24,
    "failed": 1,
    "duration": 45000,
    "timestamp": "2025-10-09T12:00:00.000Z"
  },
  "results": [...]
}
```

## 🚨 Alert Thresholds

Alerts are triggered when:

| Metric | Warning | Critical |
|--------|---------|----------|
| Response Time | > 1s | > 3s |
| Error Rate | > 1% | > 5% |
| Uptime | < 99.5% | < 99% |

## 🔧 CI/CD Integration

### GitHub Actions

Add to `.github/workflows/production-tests.yml`:

```yaml
name: Production Tests

on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:

jobs:
  smoke-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: cd production-tests && npm install
      - run: cd production-tests && npm run test:smoke
        env:
          PROVIDER_APP_URL: ${{ secrets.PROVIDER_APP_URL }}
          VITE_PUBLIC_SUPABASE_URL: ${{ secrets.VITE_PUBLIC_SUPABASE_URL }}
          VITE_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.VITE_PUBLIC_SUPABASE_ANON_KEY }}
```

### Vercel Deploy Hook

Trigger tests after deployment:

```bash
# In Vercel deploy hook
curl -X POST https://api.github.com/repos/YOUR_REPO/dispatches \
  -H "Authorization: token $GITHUB_TOKEN" \
  -d '{"event_type":"production-deploy"}'
```

## 🐛 Troubleshooting

### Tests Failing

1. **Check environment variables**
   ```bash
   cat ../.env.production.test
   ```

2. **Verify applications are accessible**
   ```bash
   curl -I https://roamprovider.app
   ```

3. **Check test results**
   ```bash
   cat smoke-test-results.json | jq '.results[] | select(.status == "failed")'
   ```

### Timeout Errors

Increase timeout in test files:

```typescript
const CONFIG = {
  TIMEOUT: 30000, // Increase to 30 seconds
};
```

### Database Connection Issues

```bash
# Verify Supabase is accessible
curl $VITE_PUBLIC_SUPABASE_URL

# Check auth endpoint
curl $VITE_PUBLIC_SUPABASE_URL/auth/v1/health
```

## 📚 Documentation

For detailed testing procedures, see:
- [Production Testing Guide](../PRODUCTION_TESTING_GUIDE.md)
- [API Architecture](../API_ARCHITECTURE.md)
- [Database Schema Reference](../DATABASE_SCHEMA_REFERENCE.md)

## 🎓 Best Practices

### DO ✓

- Run smoke tests after every deployment
- Monitor metrics dashboard during deployments
- Review test results daily
- Update test data regularly
- Add tests for new features

### DON'T ✗

- Skip smoke tests after "small" changes
- Ignore warnings in test results
- Use production data for testing
- Run load tests during peak hours
- Commit credentials to repository

## 🔐 Security

**Important:** Never commit real credentials!

- Use `.env.production.test` (gitignored)
- Use test accounts only
- Rotate test credentials monthly
- Use Stripe test keys only

## 📞 Support

For issues with production tests:

- **Slack**: #engineering
- **Email**: devops@roamyourbestlife.com
- **On-Call**: Check PagerDuty

## 🚀 Future Enhancements

- [x] Load testing suite (Provider API Performance Tests)
- [x] Performance regression detection (threshold-based)
- [ ] Visual regression testing
- [ ] Synthetic monitoring
- [ ] Automated rollback on failures
- [ ] Customer App performance tests
- [ ] Admin App performance tests

---

**Last Updated:** October 9, 2025  
**Maintained By:** Engineering Team

