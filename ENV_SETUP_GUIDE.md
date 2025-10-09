# Environment Setup Guide - Development & Production

## 📋 Overview

Your ROAM platform now supports separate Development and Production environments with different Supabase databases.

---

## 🗂️ Environment Files

| File | Purpose | When Used |
|------|---------|-----------|
| `.env.development` | Development Supabase | `ROAM_ENV=development` |
| `.env.production` | Production Supabase | `ROAM_ENV=production` |
| `.env.production.test` | Production testing | Test scripts |

---

## 🔑 Getting Your Supabase Credentials

### Development Supabase (Existing)

1. Go to: https://supabase.com/dashboard/project/vssomyuyhicaxsgiaupo/settings/api
2. Copy these values to `.env.development`:
   - **URL**: `https://vssomyuyhicaxsgiaupo.supabase.co`
   - **anon/public key**: Copy from "Project API keys" → `anon` `public`
   - **service_role key**: Copy from "Project API keys" → `service_role` (⚠️ Keep secret!)

### Production Supabase (New)

1. Go to: https://supabase.com/dashboard/project/[YOUR_PROD_REF]/settings/api
2. Copy these values to `.env.production`:
   - **URL**: `https://[YOUR_PROD_REF].supabase.co`
   - **anon/public key**: Copy from "Project API keys" → `anon` `public`
   - **service_role key**: Copy from "Project API keys" → `service_role` (⚠️ Keep secret!)

---

## 🚀 Usage

### Development Mode

```bash
# Set environment
export ROAM_ENV=development

# Or use .env.development
cp .env.development .env

# Run development servers
npm run dev:provider
npm run dev:customer
npm run dev:admin

# Test against development
npm run test:smoke
```

**Uses:**
- Development Supabase: `vssomyuyhicaxsgiaupo`
- URLs: `roamproviders.app`, `roamservices.app`, `roamadmin.app`
- Stripe test keys
- Debug mode enabled

### Production Mode

```bash
# Set environment
export ROAM_ENV=production

# Or use .env.production
cp .env.production .env

# Test against production
npm run test:smoke

# Deploy to production
vercel deploy --prod
```

**Uses:**
- Production Supabase: `[YOUR_PROD_REF]`
- URLs: `providers.roamyourbestlife.com`, `roamyourbestlife.com`, `admin.roamyourbestlife.com`
- Stripe live keys
- Debug mode disabled

---

## 📝 Step-by-Step Setup

### 1. Update Development Environment

```bash
# Edit .env.development
nano .env.development
```

Add your **existing** development Supabase credentials:
```bash
VITE_PUBLIC_SUPABASE_URL=https://vssomyuyhicaxsgiaupo.supabase.co
VITE_PUBLIC_SUPABASE_ANON_KEY=[copy from dashboard]
SUPABASE_SERVICE_ROLE_KEY=[copy from dashboard]
```

### 2. Update Production Environment

```bash
# Edit .env.production
nano .env.production
```

Add your **new** production Supabase credentials:
```bash
VITE_PUBLIC_SUPABASE_URL=https://[PROD_REF].supabase.co
VITE_PUBLIC_SUPABASE_ANON_KEY=[copy from prod dashboard]
SUPABASE_SERVICE_ROLE_KEY=[copy from prod dashboard]
```

### 3. Set Active Environment

For local development:
```bash
# Use development
cp .env.development .env

# Or export
export ROAM_ENV=development
```

For production testing:
```bash
# Use production
cp .env.production .env

# Or export
export ROAM_ENV=production
```

---

## 🔐 Security Best Practices

### ✅ DO

- ✅ Keep `.env.production` in `.gitignore`
- ✅ Use different service role keys for dev/prod
- ✅ Use Stripe **test** keys in development
- ✅ Use Stripe **live** keys in production
- ✅ Store production keys in Vercel dashboard
- ✅ Rotate keys regularly

### ❌ DON'T

- ❌ Commit `.env.production` to git
- ❌ Use production keys in development
- ❌ Share service role keys
- ❌ Use same Supabase for dev and prod
- ❌ Mix development and production credentials

---

## 🎯 Vercel Deployment

### Set Environment Variables in Vercel

For each app (Provider, Customer, Admin):

**Production Environment:**
```bash
ROAM_ENV=production
NODE_ENV=production
VITE_PUBLIC_SUPABASE_URL=https://[PROD_REF].supabase.co
VITE_PUBLIC_SUPABASE_ANON_KEY=[prod_anon_key]
SUPABASE_SERVICE_ROLE_KEY=[prod_service_role_key]
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
# ... other production vars
```

**Preview Environment:**
```bash
ROAM_ENV=development
NODE_ENV=development
VITE_PUBLIC_SUPABASE_URL=https://vssomyuyhicaxsgiaupo.supabase.co
VITE_PUBLIC_SUPABASE_ANON_KEY=[dev_anon_key]
# ... other development vars
```

---

## 🧪 Testing

### Test Development Environment

```bash
export ROAM_ENV=development
npm run test:smoke
```

Should connect to:
- Development Supabase
- Development URLs

### Test Production Environment

```bash
export ROAM_ENV=production
npm run test:smoke
```

Should connect to:
- Production Supabase
- Production URLs

---

## 📊 Environment Variables Matrix

| Variable | Development | Production |
|----------|-------------|------------|
| `ROAM_ENV` | `development` | `production` |
| `Supabase URL` | `vssomyuyhicaxsgiaupo` | `[PROD_REF]` |
| `Supabase Keys` | Dev anon/service | Prod anon/service |
| `Stripe Keys` | Test (`pk_test_`, `sk_test_`) | Live (`pk_live_`, `sk_live_`) |
| `Debug Mode` | Enabled | Disabled |
| `Analytics` | Disabled | Enabled |
| `Customer URL` | `roamservices.app` | `roamyourbestlife.com` |
| `Provider URL` | `roamproviders.app` | `providers.roamyourbestlife.com` |
| `Admin URL` | `roamadmin.app` | `admin.roamyourbestlife.com` |

---

## ✅ Verification Checklist

After setup:

- [ ] `.env.development` has development Supabase credentials
- [ ] `.env.production` has production Supabase credentials
- [ ] Both files are in `.gitignore`
- [ ] Development uses Stripe test keys
- [ ] Production uses Stripe live keys
- [ ] Can connect to development: `ROAM_ENV=development npm run test:smoke`
- [ ] Can connect to production: `ROAM_ENV=production npm run test:smoke`
- [ ] Vercel has production environment variables set
- [ ] No production credentials in git history

---

## 🆘 Troubleshooting

### "Cannot connect to Supabase"

Check:
```bash
echo $ROAM_ENV
cat .env | grep SUPABASE_URL
```

Verify URL matches your Supabase project.

### "Wrong database being used"

```bash
# Clear any cached env
unset VITE_PUBLIC_SUPABASE_URL
unset VITE_PUBLIC_SUPABASE_ANON_KEY

# Set environment explicitly
export ROAM_ENV=production
```

### "Keys not working"

Regenerate keys in Supabase dashboard:
- Settings → API → Generate new keys

---

## 📚 Related Documentation

- [ENV_CONFIGURATION_GUIDE.md](./ENV_CONFIGURATION_GUIDE.md) - URL configuration
- [SUPABASE_MIGRATION_GUIDE.md](./SUPABASE_MIGRATION_GUIDE.md) - Database migration
- [PRODUCTION_TESTING_GUIDE.md](./PRODUCTION_TESTING_GUIDE.md) - Testing guide

---

**Your platform now supports both Development and Production environments! 🎉**

