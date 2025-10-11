# Production Deployment Checklist

**Date**: October 9, 2025  
**Status**: 🔴 ACTION REQUIRED - Production environment variables missing

---

## Current Issue

**Error**: `Invalid API key` in production `/api/businesses` endpoint  
**Cause**: Missing or incorrect `SUPABASE_SERVICE_ROLE_KEY` in production environment  
**Impact**: Admin app cannot fetch data from production Supabase database

---

## Required Actions

### 1. ✅ Supabase Production Setup

#### A. Create Production Project
- [ ] New production Supabase project created
- [ ] Project URL: `https://____________.supabase.co`
- [ ] Project Ref: `____________`

#### B. Migrate Database Schema
```bash
# Export from development
supabase db dump --project-ref <dev-ref> --schema public > schema.sql

# Import to production
supabase db push --project-ref <prod-ref> --file schema.sql
```

Or use pg_dump/psql:
```bash
# Export
PGPASSWORD=dev_password pg_dump \
  --no-owner --no-privileges \
  -h db.<dev-ref>.supabase.co \
  -U postgres -d postgres \
  -F p > production_dump.sql

# Import
PGPASSWORD=prod_password psql \
  -h db.<prod-ref>.supabase.co \
  -U postgres -d postgres \
  -f production_dump.sql
```

#### C. Create Storage Buckets
- [ ] `roam-file-storage` bucket created
- [ ] Public access enabled
- [ ] Folder structure: `provider-documents/{business_id}/`
- [ ] Folder structure: `business-images/`
- [ ] Folder structure: `provider-images/`

#### D. Configure RLS Policies
- [ ] Copy RLS policies from development
- [ ] Test policies with anon key
- [ ] Verify service role bypasses RLS

---

### 2. ✅ Environment Variables Configuration

#### Admin App (Vercel)

Navigate to: **Vercel Dashboard → roam-admin-app → Settings → Environment Variables**

**Required Variables**:

```bash
# Supabase Configuration
VITE_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
VITE_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...  # From Supabase Settings → API
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...      # ⚠️ SECRET - Service role key

# API Configuration
VITE_API_BASE_URL=https://roam-admin-app.vercel.app  # Or your custom domain

# Email Configuration (Resend)
RESEND_API_KEY=re_JBNNe1T8_HFN82Wv52nUE1UxutPpPZTgT
RESEND_FROM_EMAIL=ROAM Support <contactus@roamyourbestlife.com>

# JWT Token Configuration (must match provider app)
JWT_SECRET=kX9j2mP5nQ8vR4wT7yZ1aC3bD6eF9gH2jK4lM7nP0qS
VITE_JWT_SECRET=kX9j2mP5nQ8vR4wT7yZ1aC3bD6eF9gH2jK4lM7nP0qS

# Provider App URL (for Phase 2 approval links)
FRONTEND_URL=https://roam-provider-app.vercel.app    # Or your custom domain
VITE_FRONTEND_URL=https://roam-provider-app.vercel.app

# Token Settings
PHASE2_TOKEN_EXPIRATION=7d
```

**Checklist**:
- [ ] All variables added to Vercel
- [ ] Variables set for "Production" environment
- [ ] Service role key is correct (test in Supabase SQL Editor first)
- [ ] Anon key is correct
- [ ] URLs are production URLs (not localhost)

#### Provider App (Vercel)

Navigate to: **Vercel Dashboard → roam-provider-app → Settings → Environment Variables**

**Required Variables**:

```bash
# Supabase Configuration
VITE_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
VITE_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...  # Same as admin app
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...      # ⚠️ SECRET - Service role key

# API Configuration
VITE_API_BASE_URL=http://localhost:3002   # For local dev
# OR for production:
# VITE_API_BASE_URL=https://roam-provider-app.vercel.app

# Email Configuration (Resend)
RESEND_API_KEY=re_JBNNe1T8_HFN82Wv52nUE1UxutPpPZTgT
RESEND_FROM_EMAIL=ROAM Support <providersupport@roamyourbestlife.com>

# JWT Token Configuration (must match admin app)
JWT_SECRET=kX9j2mP5nQ8vR4wT7yZ1aC3bD6eF9gH2jK4lM7nP0qS
VITE_JWT_SECRET=kX9j2mP5nQ8vR4wT7yZ1aC3bD6eF9gH2jK4lM7nP0qS

# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...  # Or pk_live_... for production
STRIPE_SECRET_KEY=sk_test_...            # Or sk_live_... for production

# Twilio Configuration
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...

# Plaid Configuration
PLAID_CLIENT_ID=...
PLAID_SECRET=...
PLAID_ENV=sandbox  # Or 'production' for live

# Google Maps
VITE_GOOGLE_MAPS_API_KEY=...
```

**Checklist**:
- [ ] All variables added to Vercel
- [ ] JWT_SECRET matches admin app
- [ ] Supabase keys match admin app
- [ ] Stripe keys are for production (if live)
- [ ] Plaid is configured correctly

#### Customer App (Vercel)

Navigate to: **Vercel Dashboard → roam-customer-app → Settings → Environment Variables**

**Required Variables**:

```bash
# Supabase Configuration
VITE_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
VITE_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# API Configuration
VITE_API_BASE_URL=http://localhost:3004   # For local dev

# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Google Maps
VITE_GOOGLE_MAPS_API_KEY=...
```

---

### 3. ✅ Post-Deployment Verification

#### A. Test Admin App
- [ ] Navigate to: https://roam-admin-app.vercel.app
- [ ] Check browser console for errors
- [ ] Verify `/api/businesses` endpoint works
- [ ] Test business verification page
- [ ] Test document review modal
- [ ] Test approval email sending

#### B. Test Provider App
- [ ] Navigate to: https://roam-provider-app.vercel.app
- [ ] Test signup flow (Phase 1)
- [ ] Test document upload
- [ ] Test Phase 2 approval link
- [ ] Test dashboard after approval

#### C. Test Customer App
- [ ] Navigate to: https://roam-customer-app.vercel.app
- [ ] Test search functionality
- [ ] Test booking flow
- [ ] Test payment processing

---

### 4. ✅ Database Migration Verification

After migrating database from dev to production:

#### A. Verify Tables
```sql
-- In Supabase SQL Editor (Production)
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Expected tables** (from `DATABASE_SCHEMA_REFERENCE.md`):
- [ ] `admin_users`
- [ ] `business_documents`
- [ ] `business_profiles`
- [ ] `business_services`
- [ ] `bookings`
- [ ] `customer_profiles`
- [ ] `providers`
- [ ] `services`
- [ ] `service_categories`
- [ ] `service_subcategories`
- [ ] And ~60+ more tables...

#### B. Verify Storage Buckets
```sql
-- Check storage buckets
SELECT * FROM storage.buckets;
```

**Expected**:
- [ ] `roam-file-storage` bucket exists
- [ ] `public` property is `true`

#### C. Verify RLS Policies
```sql
-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

#### D. Test Data Access
```sql
-- Test anon key access (should be restricted)
-- Run this in API or client with anon key
SELECT * FROM business_profiles LIMIT 1;

-- Test service role access (should work)
-- Run this in SQL Editor
SELECT * FROM business_profiles LIMIT 1;
```

---

### 5. ✅ Common Issues & Solutions

#### Issue: "Invalid API key"
**Solution**: 
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel
- Copy key from Supabase Settings → API (service_role key)
- Redeploy after adding variable

#### Issue: "Bucket not found"
**Solution**:
- Create `roam-file-storage` bucket in Supabase Storage
- Set bucket to public
- Configure CORS if needed

#### Issue: "Failed to fetch"
**Solution**:
- Check Vercel function logs
- Verify `VITE_PUBLIC_SUPABASE_URL` is correct
- Test Supabase connection with `curl`

#### Issue: "403 Forbidden" on API calls
**Solution**:
- Check RLS policies
- Verify service role key is being used server-side
- Ensure anon key is only used client-side

---

### 6. ✅ Security Checklist

- [ ] Service role keys are ONLY in server-side environment variables
- [ ] Service role keys are NEVER exposed to client
- [ ] Anon keys are used client-side only
- [ ] JWT_SECRET is strong and matches across apps
- [ ] Production Stripe keys are used (not test keys)
- [ ] Resend API key is valid and has quota
- [ ] All API endpoints have proper error handling
- [ ] Database backups are configured in Supabase

---

### 7. ✅ Monitoring Setup

#### Vercel
- [ ] Enable Vercel Analytics
- [ ] Set up error alerting
- [ ] Configure function timeout limits

#### Supabase
- [ ] Enable database backups (daily recommended)
- [ ] Set up database connection alerts
- [ ] Monitor API usage quotas
- [ ] Check storage usage

---

## Quick Reference

### Get Supabase Credentials

1. **Go to**: https://app.supabase.com/project/YOUR_PROJECT/settings/api
2. **Copy**:
   - Project URL → `VITE_PUBLIC_SUPABASE_URL`
   - anon public → `VITE_PUBLIC_SUPABASE_ANON_KEY`
   - service_role → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

### Redeploy Vercel Project

```bash
# Option 1: Push new commit
git add -A
git commit -m "Update environment variables"
git push

# Option 2: Redeploy from dashboard
# Vercel Dashboard → Deployments → Three dots → Redeploy
```

### Test API Endpoint

```bash
# Test businesses endpoint
curl https://roam-admin-app.vercel.app/api/businesses

# Expected: JSON with businesses data
# Actual error: "Invalid API key" means env vars not set
```

---

## Status

- [ ] Supabase production project created
- [ ] Database schema migrated
- [ ] Storage buckets created
- [ ] Environment variables added to Vercel
- [ ] Admin app redeployed
- [ ] Provider app redeployed
- [ ] Customer app redeployed
- [ ] All apps tested and working

---

**Next Step**: Add environment variables to Vercel and redeploy

**Documentation**: See `API_ARCHITECTURE.md`, `DATABASE_SCHEMA_REFERENCE.md`
