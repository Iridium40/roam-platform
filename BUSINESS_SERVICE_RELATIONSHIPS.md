# Business Service Relationships Documentation

**Last Updated**: 2025-10-03

---

## 📊 Overview

This document explains the relationship structure between businesses and their service offerings through junction/bridge tables.

---

## 🔗 Relationship Architecture

### Core Concept

The ROAM platform uses **junction tables** (also called bridge tables or join tables) to create many-to-many relationships between:
- `business_profiles` (businesses)
- `service_categories` (high-level service types)
- `service_subcategories` (specific service offerings)

---

## 📐 Database Schema Relationships

```
business_profiles (1)
    ↓
    ├─→ business_service_categories (N) ─→ service_categories (1)
    │        (Junction Table)                  (Lookup Table)
    │
    └─→ business_service_subcategories (N) ─→ service_subcategories (1)
             (Junction Table)                   (Lookup Table)
                    ↓
                    └─→ service_categories (1)
                         (Parent Category)
```

---

## 📋 Table Details

### 1. `business_service_categories`
**Purpose**: Links businesses to high-level service categories  
**Type**: Junction/Bridge Table  
**Relationship**: Many-to-Many between `business_profiles` and `service_categories`

**Schema**:
```sql
create table public.business_service_categories (
  id uuid not null default gen_random_uuid(),
  business_id uuid not null,              -- FK to business_profiles
  category_id uuid not null,              -- FK to service_categories
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  
  constraint business_service_categories_pkey primary key (id),
  constraint business_service_categories_business_id_fkey 
    foreign key (business_id) references business_profiles (id) on delete CASCADE,
  constraint business_service_categories_category_id_fkey 
    foreign key (category_id) references service_categories (id)
);
```

**Example Data**:
| id | business_id | category_id | Service Category |
|----|-------------|-------------|------------------|
| uuid-1 | business-123 | cat-beauty | Beauty |
| uuid-2 | business-123 | cat-fitness | Fitness |
| uuid-3 | business-456 | cat-therapy | Therapy |

**What This Means**:
- Business 123 offers **Beauty** and **Fitness** services
- Business 456 offers **Therapy** services

---

### 2. `business_service_subcategories`
**Purpose**: Links businesses to specific service subcategories  
**Type**: Junction/Bridge Table  
**Relationship**: Many-to-Many between `business_profiles` and `service_subcategories`

**Schema**:
```sql
create table public.business_service_subcategories (
  id uuid not null default gen_random_uuid(),
  business_id uuid not null,              -- FK to business_profiles
  category_id uuid null,                  -- FK to service_categories (parent)
  subcategory_id uuid not null,           -- FK to service_subcategories
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  
  constraint business_service_subcategories_pkey primary key (id),
  constraint business_service_subcategories_business_id_fkey 
    foreign key (business_id) references business_profiles (id) on delete CASCADE,
  constraint business_service_subcategories_category_id_fkey 
    foreign key (category_id) references service_categories (id),
  constraint business_service_subcategories_subcategory_id_fkey 
    foreign key (subcategory_id) references service_subcategories (id)
);
```

**Example Data**:
| id | business_id | category_id | subcategory_id | Service Subcategory |
|----|-------------|-------------|----------------|---------------------|
| uuid-1 | business-123 | cat-beauty | sub-esthetician | Esthetician |
| uuid-2 | business-123 | cat-beauty | sub-spray-tan | Spray Tan |
| uuid-3 | business-123 | cat-fitness | sub-personal-trainer | Personal Trainer |

**What This Means**:
- Business 123 offers:
  - **Esthetician** services (under Beauty category)
  - **Spray Tan** services (under Beauty category)
  - **Personal Trainer** services (under Fitness category)

---

## 🎯 Why Use Junction Tables?

### Without Junction Tables (❌ Bad)
```sql
business_profiles:
  service_categories: ['beauty', 'fitness']  -- Can't track details
  service_subcategories: ['esthetician', 'spray_tan']  -- Hard to query
```

**Problems**:
- Can't track when relationship was created
- Can't mark services as active/inactive
- Hard to query and filter
- Can't add metadata about the relationship

### With Junction Tables (✅ Good)
```sql
business_service_categories:
  business_id → business_profiles
  category_id → service_categories
  is_active, created_at, updated_at
```

**Benefits**:
- ✅ Track relationship metadata (active status, timestamps)
- ✅ Easy to query and join
- ✅ Can add pricing, availability later
- ✅ Proper referential integrity
- ✅ CASCADE deletes when business is removed

---

## 🔄 Data Flow: Admin Edit Business

### User Action Flow

1. **Admin opens "Edit Business" dialog**
   - Fetches current categories from `business_service_categories`
   - Fetches current subcategories from `business_service_subcategories`
   - Displays checkboxes with current selections

2. **Admin checks/unchecks categories and subcategories**
   - UI updates `editFormData.service_categories` array
   - UI updates `editFormData.service_subcategories` array

3. **Admin clicks "Save Changes"**

### Backend Processing

```typescript
// Step 1: Delete all existing category relationships
DELETE FROM business_service_categories WHERE business_id = 'business-123';

// Step 2: Insert new category relationships
for each selected category:
  INSERT INTO business_service_categories 
  (business_id, category_id) 
  VALUES ('business-123', '<category_id>');

// Step 3: Delete all existing subcategory relationships
DELETE FROM business_service_subcategories WHERE business_id = 'business-123';

// Step 4: Insert new subcategory relationships
for each selected subcategory:
  INSERT INTO business_service_subcategories 
  (business_id, category_id, subcategory_id) 
  VALUES ('business-123', '<category_id>', '<subcategory_id>');
```

---

## 📝 Current Implementation

### Admin App: `AdminBusinesses.tsx`

**Fetching Current Selections**:
```typescript
// Fetch all categories (master list)
const { data: allCategories } = await supabase
  .from("service_categories")
  .select("id, service_category_type");

// Fetch all subcategories (master list)
const { data: allSubcategories } = await supabase
  .from("service_subcategories")
  .select("id, category_id, service_subcategory_type");
```

**Saving Selections** (client-side filtering to avoid enum issues):
```typescript
// Update categories
const { data: allCategories } = await supabase
  .from("service_categories")
  .select("id, service_category_type");

for (const categoryType of editFormData.service_categories) {
  const categoryData = allCategories?.find(
    (cat) => cat.service_category_type === categoryType
  );
  
  if (categoryData) {
    await fetch('/api/business-service-categories', {
      method: 'POST',
      body: JSON.stringify({
        businessId: editingBusiness.id,
        categoryId: categoryData.id,
      }),
    });
  }
}

// Update subcategories
const { data: allSubcategories } = await supabase
  .from("service_subcategories")
  .select("id, category_id, service_subcategory_type");

for (const subcategoryType of editFormData.service_subcategories) {
  const subcategoryData = allSubcategories?.find(
    (sub) => sub.service_subcategory_type === subcategoryType
  );
  
  if (subcategoryData) {
    await fetch('/api/business-service-subcategories', {
      method: 'POST',
      body: JSON.stringify({
        businessId: editingBusiness.id,
        categoryId: subcategoryData.category_id,
        subcategoryId: subcategoryData.id,
      }),
    });
  }
}
```

---

## 🔍 Querying Business Services

### Get All Categories for a Business

```typescript
const { data } = await supabase
  .from('business_service_categories')
  .select(`
    id,
    is_active,
    service_categories (
      id,
      service_category_type,
      description
    )
  `)
  .eq('business_id', businessId)
  .eq('is_active', true);
```

**Result**:
```json
[
  {
    "id": "uuid-1",
    "is_active": true,
    "service_categories": {
      "id": "cat-beauty",
      "service_category_type": "beauty",
      "description": "Beauty and personal care services"
    }
  }
]
```

### Get All Subcategories for a Business

```typescript
const { data } = await supabase
  .from('business_service_subcategories')
  .select(`
    id,
    is_active,
    service_categories (
      id,
      service_category_type
    ),
    service_subcategories (
      id,
      service_subcategory_type,
      description
    )
  `)
  .eq('business_id', businessId)
  .eq('is_active', true);
```

**Result**:
```json
[
  {
    "id": "uuid-1",
    "is_active": true,
    "service_categories": {
      "id": "cat-beauty",
      "service_category_type": "beauty"
    },
    "service_subcategories": {
      "id": "sub-esthetician",
      "service_subcategory_type": "esthetician",
      "description": "Skincare and esthetician services"
    }
  }
]
```

---

## 🎨 Example: Complete Business Setup

### Scenario
**Business**: "Miami Spa & Wellness"  
**Categories**: Beauty, Therapy  
**Subcategories**: Esthetician, Spray Tan (Beauty), Massage Therapy (Therapy)

### Database State

#### `business_profiles`
| id | business_name | ... |
|----|--------------|-----|
| biz-123 | Miami Spa & Wellness | ... |

#### `service_categories`
| id | service_category_type | description |
|----|---------------------|-------------|
| cat-1 | beauty | Beauty services |
| cat-2 | therapy | Therapy services |

#### `service_subcategories`
| id | category_id | service_subcategory_type | description |
|----|-------------|------------------------|-------------|
| sub-1 | cat-1 | esthetician | Skincare services |
| sub-2 | cat-1 | spray_tan | Spray tanning |
| sub-3 | cat-2 | massage_therapy | Massage therapy |

#### `business_service_categories` (Junction)
| id | business_id | category_id |
|----|-------------|-------------|
| junc-1 | biz-123 | cat-1 |
| junc-2 | biz-123 | cat-2 |

**Meaning**: Miami Spa offers Beauty and Therapy categories

#### `business_service_subcategories` (Junction)
| id | business_id | category_id | subcategory_id |
|----|-------------|-------------|----------------|
| junc-3 | biz-123 | cat-1 | sub-1 |
| junc-4 | biz-123 | cat-1 | sub-2 |
| junc-5 | biz-123 | cat-2 | sub-3 |

**Meaning**: 
- Miami Spa offers Esthetician (Beauty)
- Miami Spa offers Spray Tan (Beauty)
- Miami Spa offers Massage Therapy (Therapy)

---

## 🚨 Important Notes

### Enum Query Issues
**Problem**: PostgREST doesn't support enum casting in filters  
**Solution**: Fetch all records and filter client-side

```typescript
// ❌ DOESN'T WORK
.eq("service_category_type", "beauty")
.eq("service_category_type::text", "beauty")

// ✅ WORKS
const { data: all } = await supabase.from("service_categories").select("*");
const beauty = all?.find(cat => cat.service_category_type === "beauty");
```

### Cascade Deletes
When a business is deleted, all relationships are automatically deleted:
```sql
ON DELETE CASCADE
```

This ensures:
- ✅ No orphaned records in junction tables
- ✅ Clean database integrity
- ✅ No manual cleanup needed

---

## 📚 Related Documentation

- [DATABASE_SCHEMA_REFERENCE.md](./DATABASE_SCHEMA_REFERENCE.md) - Complete schema reference
- [ENUM_TYPES_REFERENCE.md](./ENUM_TYPES_REFERENCE.md) - Enum types and querying
- [ENUM_QUERY_FIX_SUMMARY.md](./ENUM_QUERY_FIX_SUMMARY.md) - Enum query solutions

---

## ✅ Verification

To verify the relationships are working:

1. Open Admin App → Businesses
2. Edit a business
3. Select categories and subcategories
4. Save changes
5. Query the junction tables:

```sql
-- Check categories
SELECT * FROM business_service_categories WHERE business_id = '<your-business-id>';

-- Check subcategories
SELECT * FROM business_service_subcategories WHERE business_id = '<your-business-id>';
```

You should see one row per selected category/subcategory with the correct foreign key relationships!

---

**Last Updated**: 2025-10-03  
**Status**: ✅ Working correctly with client-side enum filtering
