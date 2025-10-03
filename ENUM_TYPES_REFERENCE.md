# 📊 ROAM Platform PostgreSQL Enum Types Reference

*Complete reference for all PostgreSQL enum types used in the ROAM platform*

**Last Updated**: 2025-10-03

---

## 🚨 CRITICAL: Querying Enum Types in Supabase

When using Supabase/PostgREST to query enum columns, you **MUST** cast the enum to text for equality comparisons, otherwise you'll get a **406 (Not Acceptable)** error.

### ❌ INCORRECT (Will fail with 406 error)
```typescript
const { data, error } = await supabase
  .from("service_subcategories")
  .select("*")
  .eq("service_subcategory_type", "esthetician");  // ❌ WRONG
```

### ✅ CORRECT (Cast to text)
```typescript
const { data, error } = await supabase
  .from("service_subcategories")
  .select("*")
  .eq("service_subcategory_type::text", "esthetician");  // ✅ RIGHT
```

---

## 📋 Service Category Types

**Enum Name**: `service_category_types`  
**Table**: `service_categories`  
**Column**: `service_category_type`  
**Status**: ✅ CONFIRMED WORKING

### Values

| Value | Description | Example Services |
|-------|-------------|------------------|
| `beauty` | Beauty and personal care services | Hair, makeup, nails, skincare |
| `fitness` | Fitness and training services | Personal training, yoga, pilates |
| `therapy` | Therapy and massage services | Massage, physical therapy, chiropractic |
| `healthcare` | Healthcare and medical services | IV therapy, nurse practitioner, physician |

### Usage Example
```typescript
// Query all beauty service categories
const { data, error } = await supabase
  .from("service_categories")
  .select("*")
  .eq("service_category_type::text", "beauty");
```

---

## 📋 Service Subcategory Types

**Enum Name**: `service_subcategory_types`  
**Table**: `service_subcategories`  
**Column**: `service_subcategory_type`  
**Status**: ✅ CONFIRMED WORKING

### Values

| Value | Category | Description |
|-------|----------|-------------|
| `hair_and_makeup` | beauty | Hair styling, coloring, and makeup application |
| `spray_tan` | beauty | Spray tanning and bronzing services |
| `esthetician` | beauty | Facials, skincare treatments, waxing |
| `injectables` | beauty | Botox, dermal fillers, cosmetic injections |
| `yoga_instructor` | fitness | Yoga instruction and classes |
| `pilates_instructor` | fitness | Pilates instruction and classes |
| `personal_trainer` | fitness | One-on-one fitness training |
| `massage_therapy` | therapy | Therapeutic and relaxation massage |
| `physical_therapy` | therapy | Physical rehabilitation and therapy |
| `chiropractor` | therapy | Chiropractic adjustments and care |
| `iv_therapy` | healthcare | IV hydration and vitamin therapy |
| `nurse_practitioner` | healthcare | Advanced nursing care and services |
| `physician` | healthcare | Medical doctor services |
| `health_coach` | healthcare | Health and wellness coaching |

### Category Groupings

#### Beauty Services
- `hair_and_makeup`
- `spray_tan`
- `esthetician`
- `injectables`

#### Fitness Services
- `yoga_instructor`
- `pilates_instructor`
- `personal_trainer`

#### Therapy Services
- `massage_therapy`
- `physical_therapy`
- `chiropractor`

#### Healthcare Services
- `iv_therapy`
- `nurse_practitioner`
- `physician`
- `health_coach`

### Usage Example
```typescript
// Query all esthetician subcategories
const { data, error } = await supabase
  .from("service_subcategories")
  .select("*")
  .eq("service_subcategory_type::text", "esthetician");

// Query subcategories for a specific business
const { data: subcategoryData } = await supabase
  .from("service_subcategories")
  .select("id, category_id")
  .eq("service_subcategory_type::text", subcategoryType)
  .single();
```

---

## 📋 Other Enum Types

### Verification Status
**Enum Name**: `verification_status`  
**Used in**: `business_profiles`, `providers`

**Values** (to be confirmed):
- `pending`
- `approved`
- `rejected`
- `suspended`

### Delivery Type
**Enum Name**: `delivery_type`  
**Used in**: `business_services`, `services`

**Values** (to be confirmed):
- `in_person`
- `mobile`
- `virtual`
- `hybrid`

### Business Type
**Enum Name**: `business_type`  
**Used in**: `business_profiles`

**Values** (to be confirmed):
- `small_business`
- `enterprise`
- `individual`

### User Role
**Enum Name**: `user_role`  
**Used in**: `admin_users`, `providers`, `user_roles`

**Values** (to be confirmed):
- `customer`
- `admin`
- `Owner`
- `Dispatcher`
- `Provider`

---

## 🛠️ Adding New Enum Values

If you need to add a new value to an enum type, use this SQL command:

```sql
-- Add a new service category type
ALTER TYPE service_category_types ADD VALUE 'new_category';

-- Add a new service subcategory type
ALTER TYPE service_subcategory_types ADD VALUE 'new_subcategory';
```

**⚠️ WARNING**: 
- Enum values **cannot be removed** once added
- Enum values **cannot be renamed**
- Adding enum values requires careful database migration
- Always coordinate with the team before modifying enums

---

## 🐛 Common Issues & Solutions

### Issue: 406 Not Acceptable Error
**Error**: `GET https://[project].supabase.co/rest/v1/service_subcategories?service_subcategory_type=eq.esthetician 406 (Not Acceptable)`

**Cause**: Attempting to query an enum column without casting to text

**Solution**: Add `::text` to the column name in the query:
```typescript
// Change this:
.eq("service_subcategory_type", "esthetician")

// To this:
.eq("service_subcategory_type::text", "esthetician")
```

### Issue: Invalid Input Value for Enum
**Error**: `invalid input value for enum service_category_types: "some_value"`

**Cause**: Trying to insert a value that doesn't exist in the enum

**Solution**: 
1. Check the enum values in this document
2. Use an existing value, OR
3. Add the new value to the enum using `ALTER TYPE`

---

## 📚 Related Documentation

- [DATABASE_SCHEMA_REFERENCE.md](./DATABASE_SCHEMA_REFERENCE.md) - Complete database schema
- [BUSINESS_SERVICE_ELIGIBILITY_INTEGRATION.md](./BUSINESS_SERVICE_ELIGIBILITY_INTEGRATION.md) - Service eligibility system

---

## ✅ Changelog

### 2025-10-03
- ✅ Created comprehensive enum types reference
- ✅ Documented `service_category_types` enum (4 values)
- ✅ Documented `service_subcategory_types` enum (14 values)
- ✅ Added critical Supabase query casting requirements
- ✅ Fixed 406 error in admin business subcategories query
- ✅ Added category groupings and mappings
- ✅ Added common issues and solutions section

---

## 🔄 TODO: Confirm Additional Enums

The following enum types are used in the platform but need confirmation of their exact values:

- [ ] `verification_status` - Verify all possible values
- [ ] `delivery_type` - Confirm delivery type options
- [ ] `business_type` - Document business type options
- [ ] `user_role` - Verify all user roles
- [ ] `announcement_audience` - Document announcement audiences
- [ ] `announcement_type` - Document announcement types
- [ ] `booking_status` - Document booking statuses
- [ ] `payment_status` - Document payment statuses

*Please update this document as you confirm additional enum values.*
