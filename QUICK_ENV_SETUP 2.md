# Quick Environment Setup

## 🚀 5-Minute Setup

### Step 1: Create Environment Files

```bash
# Copy templates
cp .env.development.template .env.development
cp .env.production.template .env.production
```

### Step 2: Get Development Supabase Credentials

1. Go to: https://supabase.com/dashboard/project/vssomyuyhicaxsgiaupo/settings/api
2. Copy these to `.env.development`:
   - **URL**: Already filled in (`vssomyuyhicaxsgiaupo`)
   - **Anon key**: Copy the `anon` `public` key
   - **Service role**: Copy the `service_role` key (⚠️ secret!)

```bash
# Edit .env.development
nano .env.development

# Update these lines:
VITE_PUBLIC_SUPABASE_ANON_KEY=[paste anon key]
SUPABASE_SERVICE_ROLE_KEY=[paste service role key]
```

### Step 3: Get Production Supabase Credentials

1. Find your production project reference (from migration)
2. Go to: https://supabase.com/dashboard/project/[YOUR_PROD_REF]/settings/api
3. Copy these to `.env.production`:
   - **URL**: Replace `[YOUR_PROD_PROJECT_REF]` with actual ref
   - **Anon key**: Copy the `anon` `public` key
   - **Service role**: Copy the `service_role` key

```bash
# Edit .env.production
nano .env.production

# Update these lines:
VITE_PUBLIC_SUPABASE_URL=https://[actual_prod_ref].supabase.co
VITE_PUBLIC_SUPABASE_ANON_KEY=[paste prod anon key]
SUPABASE_SERVICE_ROLE_KEY=[paste prod service role key]
```

### Step 4: Set Active Environment

For local development:
```bash
cp .env.development .env
```

For production testing:
```bash
cp .env.production .env
```

### Step 5: Verify

```bash
# Test development
ROAM_ENV=development npm run test:smoke

# Test production
ROAM_ENV=production npm run test:smoke
```

---

## 📋 Where to Find Credentials

### Supabase (Development)
- **Dashboard**: https://supabase.com/dashboard/project/vssomyuyhicaxsgiaupo
- **API Settings**: https://supabase.com/dashboard/project/vssomyuyhicaxsgiaupo/settings/api
- **Copy**: `anon` key and `service_role` key

### Supabase (Production)
- **Dashboard**: https://supabase.com/dashboard/project/[YOUR_PROD_REF]
- **API Settings**: https://supabase.com/dashboard/project/[YOUR_PROD_REF]/settings/api
- **Copy**: `anon` key and `service_role` key

### Stripe
- **Dashboard**: https://dashboard.stripe.com/apikeys
- **Development**: Use **Test** keys
- **Production**: Use **Live** keys (toggle in dashboard)

---

## ✅ Quick Checklist

- [ ] Copied `.env.development.template` to `.env.development`
- [ ] Copied `.env.production.template` to `.env.production`
- [ ] Added development Supabase credentials to `.env.development`
- [ ] Added production Supabase credentials to `.env.production`
- [ ] Verified development works: `ROAM_ENV=development npm run test:smoke`
- [ ] Verified production works: `ROAM_ENV=production npm run test:smoke`

---

## 🎯 What You Get

After setup:
- ✅ Separate development and production databases
- ✅ Switch environments with `ROAM_ENV`
- ✅ Safe to develop without affecting production
- ✅ Ready to deploy to production

---

**That's it! Your environment is configured.** 🎉

For detailed information, see: [ENV_SETUP_GUIDE.md](./ENV_SETUP_GUIDE.md)

