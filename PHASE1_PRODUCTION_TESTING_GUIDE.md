# Phase 1 Production Testing Guide

## 🚀 Quick Start for Production Testing

This guide helps you test the ROAM Phase 1 onboarding process on your live Vercel production deployment.

## 📋 Prerequisites

1. **Production Deployment**: Your ROAM provider app must be deployed to Vercel
2. **Environment Variables**: Production Supabase credentials configured
3. **Test Data**: Clean test environment (recommended to use test Supabase project)

## ⚡ Quick Commands

```bash
# Navigate to production tests directory
cd production-tests

# Install dependencies
npm install

# Run Phase 1 production tests
npm run test:phase1

# Run all production tests including Phase 1
npm run test:all-with-phase1

# Run monitoring dashboard
npm run monitor
```

## 🔧 Configuration

### 1. Environment Setup

Create `.env.production.test` in the root directory:

```bash
# Production URLs
PROVIDER_APP_URL=https://roamprovider.app
CUSTOMER_APP_URL=https://roamyourbestlife.com
ADMIN_APP_URL=https://admin.roamyourbestlife.com

# Supabase (Production)
VITE_PUBLIC_SUPABASE_URL=your_production_supabase_url
VITE_PUBLIC_SUPABASE_ANON_KEY=your_production_supabase_anon_key

# Test Configuration
TEST_EMAIL=test@roamprovider.app
TEST_PASSWORD=TestPassword123!
```

### 2. Test Data

The production tests will:
- ✅ Create unique test accounts (timestamped emails)
- ✅ Generate test business data
- ✅ Upload test documents
- ✅ Submit test applications
- ✅ Clean up test data automatically

## 🧪 Test Scenarios

### Scenario 1: Complete Phase 1 Flow
```bash
npm run test:phase1
```

**What it tests:**
- ✅ Application health and availability
- ✅ User account creation and authentication
- ✅ Business information submission
- ✅ Document upload (all required types)
- ✅ Application submission and review
- ✅ Database verification
- ✅ Automatic cleanup

### Scenario 2: Health Check Only
```bash
npm run test:smoke
```

**What it tests:**
- ✅ Application availability
- ✅ API endpoint health
- ✅ Database connectivity
- ✅ Basic functionality

### Scenario 3: Full Production Suite
```bash
npm run test:all-with-phase1
```

**What it tests:**
- ✅ All smoke tests
- ✅ All API tests
- ✅ Complete Phase 1 onboarding flow
- ✅ Performance monitoring

## 📊 Test Results

### Success Criteria
- ✅ All tests pass without errors
- ✅ Response times < 2 seconds
- ✅ Database operations successful
- ✅ File uploads working
- ✅ Email notifications sent
- ✅ Clean test data removal

### Expected Output
```
🚀 Starting Phase 1 Production Testing...
📍 Testing URL: https://roamprovider.app
📧 Test Email: test-phase1-1696789012345@roamprovider.app

🏥 Testing Application Health...
  ✓ Running: Application Availability
    ✅ Passed (1234ms)
  ✓ Running: Onboarding Page Access
    ✅ Passed (567ms)
  ✓ Running: API Endpoints Health
    ✅ Passed (890ms)

🔐 Testing Authentication Flow...
  ✓ Running: Account Creation
    ✅ Passed (2345ms)
  ✓ Running: User Session Verification
    ✅ Passed (123ms)
  ✓ Running: Login Flow
    ✅ Passed (456ms)

📊 Phase 1 Production Testing Report
============================================================
🌐 Production URL: https://roamprovider.app
📧 Test Email: test-phase1-1696789012345@roamprovider.app
⏱️  Total Duration: 45s
📊 Total Tests: 18
✅ Passed: 18
❌ Failed: 0
⏭️  Skipped: 0
📈 Success Rate: 100%

✅ All Phase 1 production tests passed!
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Environment Variables Missing
```bash
Error: Missing environment variables
```
**Solution:** Check `.env.production.test` file exists and has correct values

#### 2. Application Not Available
```bash
Error: Application not available: 404 Not Found
```
**Solution:** Verify your Vercel deployment URL is correct

#### 3. Database Connection Failed
```bash
Error: Database query failed: Invalid API key
```
**Solution:** Check Supabase credentials in environment file

#### 4. Test Data Cleanup Failed
```bash
Warning: Could not delete test user
```
**Solution:** This is usually not critical - test data will be cleaned up manually

### Debug Mode

Run tests with verbose output:
```bash
DEBUG=true npm run test:phase1
```

### Manual Verification

After running tests, verify in your Supabase dashboard:
1. **auth.users** - Test user should be deleted
2. **business_profiles** - Test business should be deleted
3. **provider_applications** - Test application should be deleted
4. **provider_documents** - Test documents should be deleted

## 📈 Monitoring

### Real-time Monitoring
```bash
npm run monitor
```

**Features:**
- ✅ Live uptime tracking
- ✅ Response time monitoring
- ✅ Error rate detection
- ✅ Alert system
- ✅ Historical metrics

### Performance Thresholds
- **Response Time**: < 2 seconds (Warning: > 1s, Critical: > 3s)
- **Error Rate**: < 1% (Warning: > 1%, Critical: > 5%)
- **Uptime**: > 99.5% (Warning: < 99.5%, Critical: < 99%)

## 🔄 Continuous Testing

### Automated Testing
Set up automated testing with GitHub Actions:

```yaml
name: Production Phase 1 Tests
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:

jobs:
  phase1-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: cd production-tests && npm install
      - run: cd production-tests && npm run test:phase1
        env:
          PROVIDER_APP_URL: ${{ secrets.PROVIDER_APP_URL }}
          VITE_PUBLIC_SUPABASE_URL: ${{ secrets.VITE_PUBLIC_SUPABASE_URL }}
          VITE_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.VITE_PUBLIC_SUPABASE_ANON_KEY }}
```

### Vercel Deploy Hooks
Trigger tests after deployment:

```bash
# In Vercel deploy hook
curl -X POST https://api.github.com/repos/YOUR_REPO/dispatches \
  -H "Authorization: token $GITHUB_TOKEN" \
  -d '{"event_type":"production-deploy"}'
```

## 📚 Test Reports

Test results are saved to:
- `phase1-production-test-results.json` - Detailed test results
- `monitoring-YYYY-MM-DD.json` - Monitoring metrics

### Report Structure
```json
{
  "summary": {
    "total": 18,
    "passed": 18,
    "failed": 0,
    "skipped": 0,
    "duration": 45000,
    "timestamp": "2025-10-09T12:00:00.000Z",
    "productionUrl": "https://roamprovider.app",
    "testEmail": "test-phase1-1696789012345@roamprovider.app"
  },
  "suites": [...]
}
```

## 🎯 Best Practices

### DO ✅
- Run tests after every deployment
- Monitor metrics dashboard during deployments
- Review test results daily
- Use unique test data (timestamped emails)
- Clean up test data after testing
- Test during off-peak hours

### DON'T ❌
- Skip tests after "small" changes
- Ignore warnings in test results
- Use production data for testing
- Run tests during peak user hours
- Commit credentials to repository
- Leave test data in production

## 🆘 Support

### Getting Help
- **Slack**: #engineering
- **Email**: devops@roamyourbestlife.com
- **On-Call**: Check PagerDuty

### Emergency Procedures
1. **Tests Failing**: Check application health first
2. **Database Issues**: Verify Supabase connectivity
3. **Performance Issues**: Check Vercel deployment status
4. **Cleanup Issues**: Manually clean up test data in Supabase

## 🚀 Next Steps

After successful Phase 1 testing:
1. ✅ Document any issues found
2. ✅ Test edge cases and error scenarios
3. ✅ Verify mobile responsiveness
4. ✅ Test with real business data
5. ✅ Prepare for Phase 2 testing
6. ✅ Set up production monitoring

---

**Last Updated:** October 9, 2025  
**Testing Status:** Ready for production testing  
**Maintained By:** Engineering Team
