# Supabase Database Migration - Quick Reference

## 🚀 Three Simple Steps

### Step 1: Export from Development
```bash
./scripts/supabase/1-export-dev-schema.sh
```
- Enter your **development** project reference
- Enter database password
- Script exports schema automatically
- ✅ Creates migration file in `supabase/migrations/`

### Step 2: Export Data (Optional)
```bash
./scripts/supabase/2-export-dev-data.sh
```
- Exports **reference data only** (services, categories)
- **Does NOT** export user data or bookings
- ✅ Creates data file in `supabase/data/`

### Step 3: Import to Production
```bash
./scripts/supabase/3-import-to-prod.sh
```
- Enter your **production** project reference
- Confirms multiple times (safety!)
- Pushes schema to production
- Optionally imports reference data
- ✅ Production database ready!

---

## 📋 What You Need

Before starting, have ready:

1. **Development Project Reference**
   - Find it: Supabase Dashboard → Your dev project
   - URL: `https://supabase.com/dashboard/project/[THIS_PART]`

2. **Production Project Reference**
   - Find it: Supabase Dashboard → Your prod project
   - URL: `https://supabase.com/dashboard/project/[THIS_PART]`

3. **Database Passwords**
   - Dev: Dashboard → Settings → Database → Database Password
   - Prod: Dashboard → Settings → Database → Database Password

---

## ⏱️ Time Required

- Export schema: **2-5 minutes**
- Export data: **1-3 minutes** (optional)
- Import to prod: **5-10 minutes**

**Total: ~15-20 minutes**

---

## ⚠️ Safety Features

The scripts include multiple safety checks:

✅ Requires explicit confirmation  
✅ Shows what will be migrated  
✅ Asks for project ref confirmation  
✅ Does NOT export user data  
✅ Unlinks after each operation  
✅ Validates success

---

## 🎯 After Migration

1. **Update Environment Variables**
   ```bash
   # In Vercel, update:
   VITE_PUBLIC_SUPABASE_URL=https://YOUR_PROD_REF.supabase.co
   VITE_PUBLIC_SUPABASE_ANON_KEY=your_new_prod_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_new_prod_service_key
   ```

2. **Test Connection**
   ```bash
   ROAM_ENV=production npm run test:smoke
   ```

3. **Create First Admin User**
   - Go to: Supabase Dashboard → Authentication → Users
   - Click "Invite User"
   - Enter: `admin@roamyourbestlife.com`

---

## 🆘 Quick Troubleshooting

### "Command not found: supabase"
```bash
brew install supabase/tap/supabase
```

### "Failed to link"
- Check project reference is correct (no spaces, exact match)
- Verify password is correct
- Ensure you're a member of the project

### "Permission denied"
- Make scripts executable: `chmod +x scripts/supabase/*.sh`

### "Migration errors"
- Ensure production database is **empty**
- Check migration file for syntax errors
- Try manual migration (see full guide)

---

## 📚 Full Documentation

- **Detailed Guide**: [SUPABASE_MIGRATION_GUIDE.md](./SUPABASE_MIGRATION_GUIDE.md)
- **Scripts README**: [scripts/supabase/README.md](./scripts/supabase/README.md)

---

## 🎉 That's It!

Three commands, 15 minutes, and your production database is ready!

```bash
./scripts/supabase/1-export-dev-schema.sh
./scripts/supabase/2-export-dev-data.sh      # optional
./scripts/supabase/3-import-to-prod.sh
```

**Questions? Check the full migration guide!**

