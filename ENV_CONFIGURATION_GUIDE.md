# ROAM Platform - Environment Configuration Guide

## Overview

The ROAM Platform uses a centralized environment configuration system that automatically selects the correct URLs based on your environment setting. **No need to manually set URLs everywhere!**

---

## 🎯 Quick Start

### Set Your Environment

Just set **one** environment variable:

```bash
# For Development
ROAM_ENV=development

# For Production
ROAM_ENV=production
```

That's it! All URLs are automatically configured.

---

## 🌐 URL Configuration by Environment

### Development Environment
```bash
ROAM_ENV=development
```

**URLs automatically used:**
- Customer: `https://roamservices.app`
- Provider: `https://roamproviders.app`
- Admin: `https://roamadmin.app`

### Production Environment
```bash
ROAM_ENV=production
```

**URLs automatically used:**
- Customer: `https://roamyourbestlife.com`
- Provider: `https://providers.roamyourbestlife.com`
- Admin: `https://admin.roamyourbestlife.com`

---

## 📋 Environment Variable Priority

The system checks for environment variables in this order:

1. **`ROAM_ENV`** (highest priority)
2. **`NODE_ENV`**
3. **Default**: `development`

### Accepted Values

| Value | Result |
|-------|--------|
| `development`, `dev` | Development URLs |
| `production`, `prod` | Production URLs |
| `staging` | Staging URLs (if configured) |
| `test` | Test URLs (localhost) |

---

## 🔧 Configuration Files

### 1. For Development (Local)

Create `.env` in project root:

```bash
# .env
ROAM_ENV=development

# All other config (Supabase, Stripe, etc.)
VITE_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
VITE_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
# ... etc
```

### 2. For Production Testing

Create `.env.production.test`:

```bash
# .env.production.test
ROAM_ENV=production

# Production credentials
VITE_PUBLIC_SUPABASE_URL=https://your-prod.supabase.co
VITE_PUBLIC_SUPABASE_ANON_KEY=your_prod_anon_key
# ... etc
```

### 3. For Vercel Deployment

Set in Vercel dashboard:

**Production Environment:**
```
ROAM_ENV=production
```

**Preview/Development:**
```
ROAM_ENV=development
```

---

## 💻 Usage in Code

### Using the Shared Package (Recommended)

```typescript
import { urls } from '@roam/shared/config/urls';

// Automatically gets the right URL for current environment
console.log(urls.customer);   // Auto-selected
console.log(urls.provider);   // Auto-selected
console.log(urls.admin);      // Auto-selected

// Check environment
if (urls.isProduction) {
  // Production-specific code
}

if (urls.isDevelopment) {
  // Development-specific code
}

// Get all URLs
const allUrls = urls.all();
console.log(allUrls);
// { customer: '...', provider: '...', admin: '...' }
```

### In Production Tests

Production test files automatically use the centralized configuration:

```typescript
// In api-tests.ts, smoke-tests.ts, etc.
// URLs are auto-selected based on ROAM_ENV
const CONFIG = {
  PROVIDER_APP_URL: /* auto-selected */,
  CUSTOMER_APP_URL: /* auto-selected */,
  ADMIN_APP_URL: /* auto-selected */,
};
```

---

## 🔄 Switching Environments

### Local Development to Production Testing

```bash
# Development mode
ROAM_ENV=development npm run dev

# Switch to production for testing
ROAM_ENV=production npm run test:smoke
```

### CI/CD Pipeline

```yaml
# .github/workflows/tests.yml
env:
  ROAM_ENV: production  # Tests against production URLs
```

---

## 🛠️ Manual URL Override (Optional)

If you need to override URLs for testing:

```bash
# Still respects ROAM_ENV for defaults
ROAM_ENV=production

# But override specific URLs
PROVIDER_APP_URL=https://custom-provider.com
CUSTOMER_APP_URL=https://custom-customer.com
```

---

## 📁 Where URLs Are Used

The environment-based configuration is used in:

✅ Production test suites
- `production-tests/api-tests.ts`
- `production-tests/smoke-tests.ts`
- `production-tests/e2e-tests.ts`
- `production-tests/monitoring-dashboard.ts`

✅ Shared packages
- `packages/shared/src/config/urls.ts`

✅ Application configurations
- Provider App config
- Customer App config
- Admin App config

---

## 🎯 Benefits

### ✅ Simplicity
- Set **one** variable instead of three URLs
- No manual URL management
- Consistent across all apps

### ✅ Safety
- No accidental production URLs in development
- No accidental development URLs in production
- Environment-specific defaults

### ✅ Flexibility
- Easy to switch environments
- Override when needed
- Supports multiple environments (dev, staging, prod)

### ✅ Maintainability
- URLs defined in one place
- Easy to update all apps at once
- No scattered URL configurations

---

## 📊 Examples

### Example 1: Local Development

```bash
# .env
ROAM_ENV=development

# Start apps
npm run dev:provider   # Uses https://roamproviders.app
npm run dev:customer   # Uses https://roamservices.app
npm run dev:admin      # Uses https://roamadmin.app
```

### Example 2: Production Testing

```bash
# .env.production.test
ROAM_ENV=production

# Run tests
npm run test:smoke     # Tests https://providers.roamyourbestlife.com
npm run test:api       # Tests https://roamyourbestlife.com
npm run monitor        # Monitors production URLs
```

### Example 3: Staging Environment

```bash
# .env.staging
ROAM_ENV=staging

# Deploy to staging
vercel deploy --env ROAM_ENV=staging
```

---

## 🔐 Security Best Practices

### ✅ DO
- Use `.env` files (gitignored)
- Set `ROAM_ENV` in Vercel dashboard
- Use different credentials per environment
- Keep `.env.example` updated

### ❌ DON'T
- Commit `.env` files to git
- Mix development and production credentials
- Hardcode URLs in code
- Use production credentials in development

---

## 🆘 Troubleshooting

### URLs not changing?

Check your environment variable:
```bash
# In terminal
echo $ROAM_ENV
echo $NODE_ENV

# In code
console.log(process.env.ROAM_ENV);
console.log(process.env.NODE_ENV);
```

### Using wrong URLs?

Verify configuration:
```bash
# Run this in your app
node -e "console.log(require('./packages/shared/src/config/urls').urls.all())"
```

### Need to override temporarily?

```bash
# Override for single command
PROVIDER_APP_URL=https://test.com npm run test:smoke

# Or set in .env
PROVIDER_APP_URL=https://test.com
```

---

## 📚 Related Documentation

- [Production Testing Guide](./PRODUCTION_TESTING_GUIDE.md)
- [Environment Configuration](./packages/shared/src/config/urls.ts)
- [Setup Guide](./.env.example)

---

## Summary

**Single Source of Truth:**
- Set `ROAM_ENV=development` or `ROAM_ENV=production`
- All URLs automatically configured
- Override only when needed
- Works everywhere: apps, tests, CI/CD

**That's it! 🎉**

---

*Last Updated: October 9, 2025*

