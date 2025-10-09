# Supabase Database Migration Guide
## Development → Production Database Clone

**Date:** October 9, 2025  
**Purpose:** Migrate schema and selective data from development to production Supabase

---

## ⚠️ Important Safety Warnings

Before starting:
- ✅ **Backup everything** - No going back after migration
- ✅ **Test in staging first** - Never test on production
- ✅ **Review what you're copying** - Don't copy test/sensitive data
- ✅ **Plan downtime** - If applicable
- ✅ **Have rollback plan** - Know how to revert

---

## 📋 Prerequisites

### 1. Install Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# Or via npm
npm install -g supabase

# Verify installation
supabase --version
```

### 2. Get Your Project References

You'll need:
- **Development Project Reference** (from Supabase dashboard URL)
- **Production Project Reference** (from Supabase dashboard URL)
- **Database Passwords** (from Supabase dashboard → Settings → Database)

**Finding Project Reference:**
- Dashboard URL: `https://supabase.com/dashboard/project/[PROJECT_REF]`
- Or Settings → General → Reference ID

---

## 🚀 Quick Start (Automated)

We've created scripts to automate this process:

```bash
# 1. Setup configuration
./scripts/supabase/setup-migration.sh

# 2. Export development schema and data
./scripts/supabase/export-dev-db.sh

# 3. Review what will be migrated
cat supabase/migrations/dev-to-prod-export.sql

# 4. Import to production (after review!)
./scripts/supabase/import-to-prod.sh
```

---

## 📖 Manual Step-by-Step Guide

### Step 1: Login to Supabase CLI

```bash
# Login to Supabase
supabase login

# This will open browser for authentication
# Follow the prompts to authenticate
```

### Step 2: Link to Development Project

```bash
# Navigate to project directory
cd /Users/alans/Desktop/ROAM/roam-platform

# Link to development database
supabase link --project-ref YOUR_DEV_PROJECT_REF

# You'll be prompted for the database password
```

### Step 3: Pull Development Schema

```bash
# Create migrations directory if it doesn't exist
mkdir -p supabase/migrations

# Pull schema from development
supabase db pull

# This creates a migration file in supabase/migrations/
# Example: supabase/migrations/20251009_remote_schema.sql
```

### Step 4: Review the Schema Export

```bash
# View the latest migration file
ls -la supabase/migrations/

# Review the schema
cat supabase/migrations/[latest_migration_file].sql

# Look for:
# - All tables you expect
# - Proper RLS policies
# - Functions and triggers
# - Indexes
```

### Step 5: Export Data (Selective)

⚠️ **IMPORTANT:** Only export reference/lookup data, NOT user data!

```bash
# Export specific tables (reference data only)
supabase db dump --data-only \
  -t services \
  -t service_categories \
  -t service_subcategories \
  -t addons \
  -t subscription_plans \
  > supabase/data/reference-data.sql

# DO NOT export:
# - users (auth.users)
# - bookings
# - businesses
# - business_providers
# - payments
# - Any PII or sensitive data
```

### Step 6: Link to Production Project

```bash
# Unlink from development
supabase unlink

# Link to production database
supabase link --project-ref YOUR_PROD_PROJECT_REF

# Enter production database password when prompted
```

### Step 7: Push Schema to Production

```bash
# Push all migrations to production
supabase db push

# Verify the push
supabase db diff

# If diff shows no changes, schema was successfully applied
```

### Step 8: Import Reference Data (Optional)

```bash
# ONLY if you want reference data
# Review the file first!
cat supabase/data/reference-data.sql

# Import to production
psql \
  -h db.YOUR_PROD_PROJECT_REF.supabase.co \
  -p 5432 \
  -d postgres \
  -U postgres \
  -f supabase/data/reference-data.sql
```

### Step 9: Verify Production Database

```bash
# Check tables exist
supabase db list

# Or connect directly
psql "postgresql://postgres:[PASSWORD]@db.YOUR_PROD_PROJECT_REF.supabase.co:5432/postgres"

# Run verification queries
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```

---

## 🔧 Alternative Method: Direct Database Dump

### Full Schema Export

```bash
# Export complete schema from development
pg_dump \
  -h db.YOUR_DEV_PROJECT_REF.supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  --schema-only \
  --no-owner \
  --no-acl \
  > dev-schema.sql
```

### Import to Production

```bash
# Import schema to production
psql \
  -h db.YOUR_PROD_PROJECT_REF.supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  -f dev-schema.sql
```

---

## 📊 What to Migrate

### ✅ DO Migrate (Schema)

- ✅ Table structures
- ✅ Indexes
- ✅ Foreign keys
- ✅ RLS policies
- ✅ Functions
- ✅ Triggers
- ✅ Views
- ✅ Enums
- ✅ Extensions

### ✅ DO Migrate (Reference Data)

- ✅ Service categories
- ✅ Service subcategories
- ✅ Default services
- ✅ Default addons
- ✅ Subscription plans
- ✅ System configurations
- ✅ Pricing templates

### ❌ DON'T Migrate (User Data)

- ❌ User accounts (create fresh in production)
- ❌ Test bookings
- ❌ Test businesses
- ❌ Development API keys
- ❌ Test payment records
- ❌ Uploaded files/documents
- ❌ Any PII (Personal Identifiable Information)

---

## 🔒 Security Considerations

### 1. Environment Variables

Update all production apps with new database credentials:

**Development:**
```bash
VITE_PUBLIC_SUPABASE_URL=https://YOUR_DEV_REF.supabase.co
VITE_PUBLIC_SUPABASE_ANON_KEY=dev_anon_key
```

**Production:**
```bash
VITE_PUBLIC_SUPABASE_URL=https://YOUR_PROD_REF.supabase.co
VITE_PUBLIC_SUPABASE_ANON_KEY=prod_anon_key
SUPABASE_SERVICE_ROLE_KEY=prod_service_role_key
```

### 2. API Keys

Generate new API keys in production:
- Anon key (public)
- Service role key (secret)

**Never** reuse development keys in production!

### 3. Row Level Security (RLS)

Verify RLS policies are enabled:

```sql
-- Check RLS is enabled on all tables
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Should show rowsecurity = true for all tables
```

Enable if missing:

```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

---

## ✅ Post-Migration Checklist

### 1. Verify Schema

```sql
-- Count tables
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public';

-- List all tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check indexes
SELECT indexname, tablename FROM pg_indexes 
WHERE schemaname = 'public';

-- Verify RLS policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';
```

### 2. Verify Functions

```sql
-- List all functions
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public';
```

### 3. Verify Extensions

```sql
-- Check extensions
SELECT * FROM pg_extension;

-- Should include:
-- - uuid-ossp
-- - pgcrypto
-- - pg_trgm (if using full-text search)
```

### 4. Test Connections

```bash
# Test from application
ROAM_ENV=production npm run test:smoke

# Should connect successfully to production database
```

### 5. Create First Admin User

```sql
-- Via Supabase Dashboard or SQL
INSERT INTO auth.users (email, encrypted_password, role)
VALUES ('admin@roamyourbestlife.com', crypt('temp_password', gen_salt('bf')), 'admin');

-- Or use Supabase Dashboard → Authentication → Users → Invite User
```

---

## 🔄 Rollback Plan

If something goes wrong:

### Option 1: Restore from Backup

```bash
# Supabase creates automatic backups
# Go to: Dashboard → Database → Backups
# Click "Restore" on the backup before migration
```

### Option 2: Fresh Start

```bash
# If migration failed and database is corrupted
# 1. Reset production database
supabase db reset --linked

# 2. Start over with corrected migration
```

---

## 📝 Migration Checklist

Use this checklist during migration:

- [ ] **Pre-Migration**
  - [ ] Supabase CLI installed and updated
  - [ ] Development database accessible
  - [ ] Production database created (empty)
  - [ ] Both project references noted
  - [ ] Database passwords saved securely
  - [ ] Backup of development database taken

- [ ] **Schema Migration**
  - [ ] Linked to development project
  - [ ] Pulled schema successfully
  - [ ] Reviewed migration file
  - [ ] Linked to production project
  - [ ] Pushed schema to production
  - [ ] Verified all tables created
  - [ ] Verified all indexes created
  - [ ] Verified RLS policies applied

- [ ] **Data Migration** (Optional)
  - [ ] Identified reference data tables
  - [ ] Exported reference data only
  - [ ] Reviewed exported data (no PII)
  - [ ] Imported to production
  - [ ] Verified data imported correctly

- [ ] **Post-Migration**
  - [ ] All tables present
  - [ ] All functions working
  - [ ] RLS policies enabled
  - [ ] Extensions installed
  - [ ] Test queries successful
  - [ ] Application connects successfully
  - [ ] Created first admin user

- [ ] **Environment Configuration**
  - [ ] Updated production env vars
  - [ ] Deployed apps with new credentials
  - [ ] Verified API connections
  - [ ] Tested authentication
  - [ ] Smoke tests passing

---

## 🆘 Troubleshooting

### Connection Refused

```bash
# Check connection string
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"

# Verify:
# - Correct project reference
# - Correct password
# - IP allowlist (if configured)
```

### Permission Denied

```bash
# Use postgres user (superuser)
psql -U postgres

# Or check user permissions
SELECT * FROM pg_roles WHERE rolname = 'postgres';
```

### Migration File Errors

```bash
# If migration fails, check for:
# - Syntax errors
# - Missing dependencies
# - Conflicting constraints

# View detailed error
supabase db push --debug
```

### Schema Differences

```bash
# Compare development and production
supabase db diff

# If shows unexpected differences:
# - Review what changed
# - May need to manually fix
# - Or re-export schema
```

---

## 📚 Resources

- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [Database Migrations](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [Production Checklist](https://supabase.com/docs/guides/platform/going-into-prod)

---

## 🎯 Quick Commands Reference

```bash
# Login
supabase login

# Link project
supabase link --project-ref YOUR_PROJECT_REF

# Pull schema
supabase db pull

# Push schema
supabase db push

# View diff
supabase db diff

# Reset database
supabase db reset

# Unlink project
supabase unlink
```

---

**Need help? Check the automated scripts in `/scripts/supabase/`**

*Last Updated: October 9, 2025*

