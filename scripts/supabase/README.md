# Supabase Migration Scripts

Automated scripts for migrating your development database to production.

## 🚀 Quick Start

```bash
# Navigate to project root
cd /Users/alans/Desktop/ROAM/roam-platform

# Run scripts in order:
./scripts/supabase/1-export-dev-schema.sh
./scripts/supabase/2-export-dev-data.sh      # Optional
./scripts/supabase/3-import-to-prod.sh
```

## 📋 Scripts Overview

### 1. Export Development Schema
**Script:** `1-export-dev-schema.sh`

**What it does:**
- Logs into Supabase CLI
- Links to your development database
- Exports complete schema (tables, functions, RLS policies)
- Creates migration file in `supabase/migrations/`
- Unlinks from development

**Run time:** 2-5 minutes

### 2. Export Reference Data (Optional)
**Script:** `2-export-dev-data.sh`

**What it does:**
- Exports ONLY reference/lookup data
- Safe tables: service_categories, services, addons, etc.
- Does NOT export user data or bookings
- Creates data file in `supabase/data/`

**Run time:** 1-3 minutes

### 3. Import to Production
**Script:** `3-import-to-prod.sh`

**What it does:**
- Links to production database
- Pushes schema to production
- Optionally imports reference data
- Verifies migration success
- Unlinks from production

**Run time:** 5-10 minutes

## ⚠️ Important Notes

### Before Running

1. **Backup First** - Always backup before migration
2. **Review Schema** - Check migration file before importing
3. **Clean Production** - Ensure production database is empty
4. **Have Credentials Ready**:
   - Development project reference
   - Production project reference
   - Database passwords

### What Gets Migrated

✅ **Schema (Always)**
- Tables
- Indexes
- Foreign keys
- RLS policies
- Functions
- Triggers
- Enums

✅ **Data (Optional)**
- Service categories
- Services
- Addons
- Subscription plans

❌ **Never Migrated**
- User accounts
- Bookings
- Businesses
- Test data
- Uploaded files

## 📊 Process Flow

```
Development DB
     ↓
[1. Export Schema]
     ↓
supabase/migrations/
     ↓
[2. Export Data] (optional)
     ↓
supabase/data/
     ↓
[3. Import to Prod]
     ↓
Production DB
```

## 🔧 Manual Alternative

If scripts don't work, use Supabase CLI directly:

```bash
# Export from dev
supabase link --project-ref DEV_REF
supabase db pull
supabase unlink

# Import to prod
supabase link --project-ref PROD_REF
supabase db push
supabase unlink
```

## ✅ Post-Migration Checklist

After running scripts:

- [ ] Verify tables in production dashboard
- [ ] Check RLS policies are enabled
- [ ] Update environment variables
- [ ] Test database connections
- [ ] Run smoke tests
- [ ] Create first admin user

## 🆘 Troubleshooting

### "Command not found: supabase"
```bash
brew install supabase/tap/supabase
```

### "Failed to link to project"
- Check project reference is correct
- Verify database password
- Ensure you have project access

### "Permission denied"
- Use postgres user
- Check user permissions in Supabase dashboard

### Migration shows errors
- Review error message
- Check migration file syntax
- Ensure production is empty
- Try manual migration

## 📚 Full Documentation

See: [SUPABASE_MIGRATION_GUIDE.md](../../SUPABASE_MIGRATION_GUIDE.md)

---

**Need help? Check the full guide or contact support.**

