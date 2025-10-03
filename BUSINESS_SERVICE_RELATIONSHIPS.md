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
- `service_categories` (high-level service types like "Beauty", "Fitness")
- `service_subcategories` (specific service types like "Esthetician", "Personal Trainer")
- `services` (individual service offerings with pricing and details)

### The Three-Level System

1. **Categories** → What type of services does the business offer? (Beauty, Fitness, Therapy, Healthcare)
2. **Subcategories** → What specific service types? (Esthetician, Massage Therapy, Personal Trainer)
3. **Services** → What exact services with pricing? ("Deep Tissue Massage - 60 min", "Facial Treatment")

---

## 📐 Database Schema Relationships

```
business_profiles (1)
    ↓
    ├─→ business_service_categories (N) ─→ service_categories (1)
    │        (Junction Table)                  (Lookup Table)
    │        "What types of services?"         "Beauty, Fitness, etc."
    │
    ├─→ business_service_subcategories (N) ─→ service_subcategories (1)
    │        (Junction Table)                   (Lookup Table)
    │        "What specific services?"          "Esthetician, Massage, etc."
    │             ↓
    │             └─→ service_categories (1)
    │                  (Parent Category)
    │
    └─→ business_services (N) ─→ services (1)
             (Junction Table)        (Lookup Table)
             "Exact offerings        "Service catalog with
              with custom pricing"    descriptions, durations"
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

### 3. `business_services`
**Purpose**: Links businesses to specific service offerings with custom pricing  
**Type**: Junction/Bridge Table  
**Relationship**: Many-to-Many between `business_profiles` and `services`

**Schema**:
```sql
create table public.business_services (
  id uuid not null default gen_random_uuid(),
  business_id uuid not null,              -- FK to business_profiles
  service_id uuid not null,               -- FK to services
  business_price numeric(10, 2) not null, -- Custom price for this business
  is_active boolean default true,
  delivery_type public.delivery_type,     -- in_person, mobile, virtual, hybrid
  created_at timestamp with time zone default now(),
  
  constraint business_services_pkey primary key (id),
  constraint business_services_unique unique (business_id, service_id),
  constraint business_services_business_fkey 
    foreign key (business_id) references business_profiles (id) on delete CASCADE,
  constraint business_services_service_fkey 
    foreign key (service_id) references services (id) on delete CASCADE
);
```

**Key Fields**:
- `business_price` - The price THIS business charges (can differ from base service price)
- `delivery_type` - How this business delivers the service (in_person, mobile, virtual, hybrid)
- `is_active` - Whether this business currently offers this service

**Example Data**:
| id | business_id | service_id | business_price | delivery_type | Service Name |
|----|-------------|------------|----------------|---------------|--------------|
| uuid-1 | biz-123 | svc-facial | 85.00 | in_person | Classic Facial - 60 min |
| uuid-2 | biz-123 | svc-massage | 120.00 | mobile | Deep Tissue Massage - 60 min |
| uuid-3 | biz-456 | svc-facial | 95.00 | in_person | Classic Facial - 60 min |

**What This Means**:
- Business 123 offers "Classic Facial" for **$85** (in-person)
- Business 123 offers "Deep Tissue Massage" for **$120** (mobile service)
- Business 456 offers the same "Classic Facial" but charges **$95**
- Each business can set their own price for the same service!

**The Hierarchy**:
```
service_subcategories: "esthetician"
    ↓
services: "Classic Facial - 60 min", "Express Facial - 30 min"
    ↓
business_services: Business A charges $85, Business B charges $95
```

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

## 🔄 The Complete Service Hierarchy

### Understanding the Three Levels

The platform has a three-level hierarchy for organizing services:

#### Level 1: Categories (High-Level Grouping)
**Table**: `service_categories` via `business_service_categories`  
**Question**: What general types of services does the business offer?  
**Examples**: Beauty, Fitness, Therapy, Healthcare

#### Level 2: Subcategories (Service Specializations)
**Table**: `service_subcategories` via `business_service_subcategories`  
**Question**: What specific service specializations?  
**Examples**: Esthetician, Personal Trainer, Massage Therapy, Nurse Practitioner

#### Level 3: Services (Individual Offerings)
**Table**: `services` via `business_services`  
**Question**: What exact services with pricing and details?  
**Examples**: 
- "Classic Facial - 60 min" (under Esthetician)
- "Express Facial - 30 min" (under Esthetician)
- "Deep Tissue Massage - 60 min" (under Massage Therapy)
- "Personal Training Session - 60 min" (under Personal Trainer)

### Real-World Example

**Scenario**: A customer searches for "Facial services near me"

```
1. System finds businesses with service_subcategories = "esthetician"
   ↓
2. Within those businesses, finds specific services like:
   - "Classic Facial - 60 min"
   - "Express Facial - 30 min"
   - "Deep Pore Cleansing Facial - 90 min"
   ↓
3. Shows each business's custom pricing via business_services:
   - Spa A: Classic Facial $85
   - Spa B: Classic Facial $95
   - Spa C: Classic Facial $75
```

### Key Difference: Categories/Subcategories vs Services

| Aspect | Categories/Subcategories | Services |
|--------|-------------------------|----------|
| **Pricing** | No pricing | Has `business_price` |
| **Details** | Just types/classifications | Duration, description, requirements |
| **Customization** | Same for all businesses | Each business sets own price |
| **Searchability** | Filter by type | Filter by specific service |
| **Purpose** | "What do you specialize in?" | "What exact offerings do you have?" |

**Example**:
```
Category: Beauty
  └─ Subcategory: Esthetician (tells customers business does skincare)
       └─ Services: 
           • Classic Facial - 60 min ($85)
           • Express Facial - 30 min ($55)
           • Anti-Aging Facial - 90 min ($120)
```

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

#### `services` (Master Service Catalog)
| id | subcategory_id | name | duration_minutes | min_price | description |
|----|----------------|------|------------------|-----------|-------------|
| svc-1 | sub-1 | Classic Facial - 60 min | 60 | 75 | Deep cleansing facial |
| svc-2 | sub-1 | Express Facial - 30 min | 30 | 45 | Quick facial treatment |
| svc-3 | sub-2 | Full Body Spray Tan | 20 | 40 | Professional spray tan |
| svc-4 | sub-3 | Deep Tissue Massage - 60 min | 60 | 90 | Therapeutic massage |
| svc-5 | sub-3 | Swedish Massage - 60 min | 60 | 85 | Relaxation massage |

**Meaning**: These are the available services in the platform catalog

#### `business_services` (Junction with Pricing)
| id | business_id | service_id | business_price | delivery_type | is_active |
|----|-------------|------------|----------------|---------------|-----------|
| bs-1 | biz-123 | svc-1 | 85.00 | in_person | true |
| bs-2 | biz-123 | svc-2 | 55.00 | in_person | true |
| bs-3 | biz-123 | svc-3 | 45.00 | in_person | true |
| bs-4 | biz-123 | svc-4 | 120.00 | in_person | true |
| bs-5 | biz-123 | svc-5 | 110.00 | mobile | true |

**Meaning**:
- Miami Spa offers **Classic Facial** for **$85** (they charge $10 more than min_price)
- Miami Spa offers **Express Facial** for **$55** (they charge $10 more than min_price)
- Miami Spa offers **Full Body Spray Tan** for **$45** (they charge $5 more than min_price)
- Miami Spa offers **Deep Tissue Massage** for **$120** (they charge $30 more than min_price)
- Miami Spa offers **Swedish Massage** for **$110** as a **mobile service** (they charge $25 more than min_price)

### The Complete Picture

```
Miami Spa & Wellness
├─ Categories: [Beauty, Therapy]
│
├─ Subcategories: 
│  ├─ Esthetician (Beauty)
│  ├─ Spray Tan (Beauty)
│  └─ Massage Therapy (Therapy)
│
└─ Specific Services with Pricing:
   ├─ Classic Facial - 60 min ($85, in-person)
   ├─ Express Facial - 30 min ($55, in-person)
   ├─ Full Body Spray Tan ($45, in-person)
   ├─ Deep Tissue Massage - 60 min ($120, in-person)
   └─ Swedish Massage - 60 min ($110, mobile)
```

**Why This Structure?**
1. **Categories** tell customers "We do Beauty and Therapy"
2. **Subcategories** tell customers "We specialize in Facials, Spray Tans, and Massage"
3. **Services** tell customers exact offerings and prices

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
