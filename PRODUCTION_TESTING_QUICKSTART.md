# Production Testing - Quick Start Guide

**Get started with ROAM Platform production testing in 5 minutes! 🚀**

## ⚡ One-Command Setup

```bash
# From project root
./production-tests/setup.sh
```

This will:
- ✓ Check prerequisites
- ✓ Install dependencies
- ✓ Set up configuration
- ✓ Install Playwright browsers

## 🔧 Configuration (2 minutes)

Edit `.env.production.test`:

```bash
# Required
PROVIDER_APP_URL=https://roamprovider.app
CUSTOMER_APP_URL=https://roamyourbestlife.com
ADMIN_APP_URL=https://admin.roamyourbestlife.com
VITE_PUBLIC_SUPABASE_URL=your_supabase_url
VITE_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Optional (for authenticated tests)
TEST_EMAIL=test@roamprovider.app
TEST_PASSWORD=YourSecurePassword123!
```

## 🧪 Run Your First Test (1 minute)

```bash
# Quick smoke test
npm run test:smoke
```

**Expected Output:**
```
✓ Provider App Homepage (234ms)
✓ Customer App Homepage (189ms)
✓ Admin App Homepage (201ms)
✓ Database Connection Test (112ms)
...

Overall Status: PASSED
Total: 15, Passed: 15, Failed: 0
```

## 📊 Start Monitoring

```bash
npm run monitor
```

**You'll see:**
```
╔════════════════════════════════════════╗
║  ROAM Platform - Monitoring Dashboard ║
╚════════════════════════════════════════╝

┌─ System Status ────────────────────────┐
│ ✓ Provider App    HEALTHY   99.8%     │
│ ✓ Customer App    HEALTHY   100%      │
│ ✓ Admin App       HEALTHY   99.9%     │
│ ✓ Database        HEALTHY   100%      │
└────────────────────────────────────────┘
```

Press `Ctrl+C` to exit and save metrics.

## 🎯 After Deployment Workflow

```bash
# 1. Immediately after deployment
npm run test:smoke

# 2. If smoke tests pass, monitor for 15 min
npm run monitor

# 3. Daily full test (automated via GitHub Actions)
npm run test:api
```

## 📚 Available Commands

| Command | Duration | When to Use |
|---------|----------|-------------|
| `npm run test:smoke` | < 2 min | After every deployment |
| `npm run test:api` | 5-10 min | Daily or before releases |
| `npm run test:e2e` | 15-30 min | Weekly or major releases |
| `npm run test:production` | 10-15 min | Full automated testing |
| `npm run monitor` | Continuous | During deployments |

## 🚨 What If Tests Fail?

### Smoke Test Failed
```bash
# 1. Check which tests failed
cat production-tests/smoke-test-results.json

# 2. Test specific app manually
curl -I https://roamprovider.app

# 3. Check Vercel logs
vercel logs --prod

# 4. Rollback if critical
vercel rollback
```

### Response Time Warning
```
⚠ HIGH RESPONSE TIME: providerApp took 3.2s
```

**Action:** Check Vercel Analytics or database performance

### Application Down
```
🚨 SERVICE DOWN: providerApp - Connection refused
```

**Action:** Check deployment status, rollback if needed

## 📖 Full Documentation

- **Comprehensive Guide**: [PRODUCTION_TESTING_GUIDE.md](./PRODUCTION_TESTING_GUIDE.md)
- **Test Suite Details**: [production-tests/README.md](./production-tests/README.md)
- **Implementation Summary**: [PRODUCTION_TESTING_SUMMARY.md](./PRODUCTION_TESTING_SUMMARY.md)

## 🎓 Best Practices

### DO ✓
- Run smoke tests after every deployment
- Monitor during deployments
- Review test results daily
- Keep test credentials secure

### DON'T ✗
- Skip smoke tests for "small" changes
- Ignore warnings
- Use production user data for testing
- Commit credentials to git

## 🔐 Security Reminders

- ✓ Never commit `.env.production.test`
- ✓ Use test Stripe keys only
- ✓ Create dedicated test accounts
- ✓ Rotate credentials monthly

## 🆘 Need Help?

- **Slack**: #engineering
- **Email**: devops@roamyourbestlife.com
- **Docs**: See links above

---

**You're all set! Start with:** `npm run test:smoke` 🎉

