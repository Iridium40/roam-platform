# 🔧 Enum Query Fix Summary

**Date**: 2025-10-03  
**Issue**: 406 (Not Acceptable) errors when querying PostgreSQL enum types in Supabase

---

## 🐛 Problem

When attempting to update business service categories and subcategories in the admin app, queries were failing with:

```
GET https://vssomyuyhicaxsgiaupo.supabase.co/rest/v1/service_subcategories?select=id%2Ccategory_id&service_subcategory_type=eq.esthetician 406 (Not Acceptable)
```

This occurred for all service subcategory types including:
- `esthetician`
- `physical_therapy`
- And all other subcategory enum values

---

## 🔍 Root Cause

PostgreSQL enum types cannot be queried using PostgREST filter operations. The database field `service_subcategory_type` is of type `service_subcategory_types` (enum), not `text`.

**Critical Discovery**: PostgREST does NOT support casting syntax in filter operations. Even using `column::text` in `.eq()` filters causes 406 errors because PostgREST cannot parse the casting syntax in query parameters.

When PostgREST receives queries like:
```typescript
.eq("service_subcategory_type", "esthetician")
// OR
.eq("service_subcategory_type::text", "esthetician")
```

Both fail because:
1. Direct enum comparison is not supported by PostgREST
2. Casting syntax `::text` in filters is not supported by PostgREST
3. URL encoding produces `service_subcategory_type%3A%3Atext=eq.esthetician` which PostgREST rejects

---

## ✅ Solution

Fetch all records and filter client-side in JavaScript, avoiding PostgREST's enum limitations entirely.

### Before (❌ Broken - Both approaches fail)

```typescript
// Attempt 1: Direct comparison (406 error)
const { data: subcategoryData } = await supabase
  .from("service_subcategories")
  .select("id, category_id")
  .eq("service_subcategory_type", subcategoryType)
  .single();

// Attempt 2: Casting syntax (also 406 error - PostgREST doesn't support this)
const { data: subcategoryData } = await supabase
  .from("service_subcategories")
  .select("id, category_id")
  .eq("service_subcategory_type::text", subcategoryType)
  .single();
```

### After (✅ Fixed - Client-side filtering)

```typescript
// Fetch all subcategories once (outside the loop for efficiency)
const { data: allSubcategories } = await supabase
  .from("service_subcategories")
  .select("id, category_id, service_subcategory_type");

// Filter client-side (avoids PostgREST enum casting issues)
for (const subcategoryType of editFormData.service_subcategories) {
  const subcategoryData = allSubcategories?.find(
    (sub: any) => sub.service_subcategory_type === subcategoryType
  );

  if (subcategoryData) {
    // Use subcategoryData.id and subcategoryData.category_id
    // to insert business_service_subcategories
  }
}
```

---

## 📝 Files Changed

### `/roam-admin-app/client/pages/AdminBusinesses.tsx`
**Line ~1713-1740**: Changed from PostgREST enum filtering to client-side filtering

```typescript
// BEFORE (Broken - 406 errors):
for (const subcategoryType of editFormData.service_subcategories) {
  const { data: subcategoryData } = await supabase
    .from("service_subcategories")
    .select("id, category_id")
    .eq("service_subcategory_type::text", subcategoryType)  // ❌ PostgREST rejects this
    .single();
  
  if (subcategoryData) {
    // insert logic...
  }
}

// AFTER (Working - client-side filter):
const { data: allSubcategories } = await supabase
  .from("service_subcategories")
  .select("id, category_id, service_subcategory_type");

for (const subcategoryType of editFormData.service_subcategories) {
  const subcategoryData = allSubcategories?.find(
    (sub: any) => sub.service_subcategory_type === subcategoryType
  );
  
  if (subcategoryData) {
    // insert logic...
  }
}
```

**Benefits of this approach**:
1. ✅ Avoids PostgREST enum limitations
2. ✅ More efficient - single query instead of N queries
3. ✅ Works with all enum types
4. ✅ No special PostgREST syntax needed

---

## 📚 Documentation Updates

### New Documentation
- ✅ **ENUM_TYPES_REFERENCE.md** - Comprehensive enum types reference with:
  - All service category types (4 values)
  - All service subcategory types (14 values)
  - **CORRECTED** Supabase query patterns (client-side filtering)
  - Common issues and solutions
  - Category groupings and mappings
  - Alternative solutions (PostgreSQL functions, RPC)

### Updated Documentation
- ✅ **DATABASE_SCHEMA_REFERENCE.md** - Added enum types section with:
  - Service category types documentation
  - Service subcategory types documentation
  - **CORRECTED** Query patterns
  - Category to subcategory mapping

---

## 🎯 Impact

This fix enables:
- ✅ Admin users can now update business service categories
- ✅ Admin users can now update business service subcategories
- ✅ All 14 subcategory types work correctly
- ✅ All 4 category types work correctly
- ✅ No more 406 errors when querying enum fields
- ✅ More efficient (1 query vs N queries)

---

## 🔄 Enum Types Documented

### Service Category Types (`service_category_types`)
1. `beauty` - Beauty and personal care services
2. `fitness` - Fitness and training services
3. `therapy` - Therapy and massage services
4. `healthcare` - Healthcare and medical services

### Service Subcategory Types (`service_subcategory_types`)
1. `hair_and_makeup` - Hair styling and makeup
2. `spray_tan` - Spray tanning
3. `esthetician` - Skincare and esthetician services
4. `massage_therapy` - Massage therapy
5. `iv_therapy` - IV therapy and hydration
6. `physical_therapy` - Physical therapy
7. `nurse_practitioner` - Nurse practitioner services
8. `physician` - Physician services
9. `chiropractor` - Chiropractic services
10. `yoga_instructor` - Yoga instruction
11. `pilates_instructor` - Pilates instruction
12. `personal_trainer` - Personal training
13. `injectables` - Injectable treatments
14. `health_coach` - Health coaching

---

## 🚨 Best Practices Going Forward

### When Querying Enum Fields in Supabase

**DO NOT** try to use casting in PostgREST filters - it doesn't work:

```typescript
// ❌ WILL NOT WORK
.eq("enum_column::text", value)
.in("enum_column::text", [value1, value2])
.neq("enum_column::text", value)
```

**DO** use one of these approaches:

#### Option 1: Client-Side Filtering (Recommended for small datasets)
```typescript
// ✅ WORKS - Fetch all and filter in JavaScript
const { data: all } = await supabase
  .from("table")
  .select("*");

const filtered = all?.filter(item => item.enum_column === targetValue);
```

#### Option 2: PostgreSQL Function + RPC (Recommended for large datasets)
```sql
-- Create function in database
CREATE OR REPLACE FUNCTION get_by_enum(enum_val text)
RETURNS SETOF your_table
LANGUAGE sql
AS $$
  SELECT * FROM your_table WHERE enum_column::text = enum_val;
$$;
```

```typescript
// ✅ WORKS - Call via RPC
const { data } = await supabase
  .rpc('get_by_enum', { enum_val: 'value' });
```

### When Creating New Enum Types

1. Document the enum in `ENUM_TYPES_REFERENCE.md`
2. Update `DATABASE_SCHEMA_REFERENCE.md` if needed
3. Use client-side filtering or RPC functions for queries
4. Test queries with sample data
5. Remember: PostgREST filters don't support enum casting

### When Adding Enum Values

1. Use `ALTER TYPE enum_name ADD VALUE 'new_value';`
2. Update documentation with new value
3. Coordinate with team (enum changes affect entire database)
4. Remember: enum values cannot be removed or renamed

---

## 📊 Commits

1. **8ddce32** - Initial attempt: Add ::text casting (didn't work)
2. **fbd8e5c** - Add comprehensive enum types documentation
3. **40c5fdb** - Add enum query fix summary documentation
4. **209ceb1** - Update README with enum types documentation links
5. **[NEW]** - Fix enum query with client-side filtering approach

---

## ✅ Testing

To verify the fix works:

1. Open Admin App → Businesses page
2. Edit a business
3. Select service categories and subcategories
4. Save changes
5. ✅ Verify no 406 errors in browser console
6. ✅ Confirm database updates correctly
7. ✅ Check that all 14 subcategory types can be selected

---

## 📖 Related Documentation

- [ENUM_TYPES_REFERENCE.md](./ENUM_TYPES_REFERENCE.md) - Complete enum types reference
- [DATABASE_SCHEMA_REFERENCE.md](./DATABASE_SCHEMA_REFERENCE.md) - Database schema
- [MFA_IMPLEMENTATION_SUMMARY.md](./MFA_IMPLEMENTATION_SUMMARY.md) - Recent implementation summaries

---

**Status**: ✅ RESOLVED  
**Verified**: 2025-10-03  
**Method**: Client-side filtering
