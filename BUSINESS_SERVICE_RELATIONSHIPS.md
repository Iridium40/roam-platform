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
    ├─→ business_services (N) ─→ services (1)
    │        (Junction Table)        (Lookup Table)
    │        "Exact offerings         "Service catalog with
    │         with custom pricing"     descriptions, durations"
    │             ↓
    │             └─→ service_subcategories (1)
    │                  (Parent Subcategory)
    │                       ↓
    │                       └─→ service_addon_eligibility (N) ─→ service_addons (1)
    │                                (Junction Table)                (Lookup Table)
    │                                "Which add-ons work             "CBD Oil, Hot Stones,
    │                                 with which services?"           Aromatherapy, etc."
    │
    └─→ business_addons (N) ─→ service_addons (1)
             (Junction Table)       (Lookup Table)
             "Business-specific     "Platform-wide add-on
              add-on pricing"        catalog"

Booking Flow:
bookings (1)
    ↓
    ├─→ service_id ─→ services (1)
    │
    └─→ booking_addons (N) ─→ service_addons (1)
             (Junction Table)       (Lookup Table)
             "Add-ons selected      "Add-on details"
              for this booking"
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

### Understanding the Four Levels

The platform has a **four-level hierarchy** for organizing services and enhancements:

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

#### Level 4: Add-Ons (Optional Enhancements)
**Tables**: `service_addons` via `service_addon_eligibility` and `business_addons`  
**Question**: What optional enhancements can be added to services?  
**Examples**:
- "CBD Oil" (+$25) - for massage services
- "Hot Stones" (+$30) - for massage services
- "Paraffin Wax Treatment" (+$20) - for facial services
- "Extended Time" (+$40) - for various services

### Real-World Example

**Scenario**: A customer searches for "Massage services near me"

```
1. System finds businesses with service_subcategories = "massage_therapy"
   ↓
2. Within those businesses, finds specific services like:
   - "Deep Tissue Massage - 60 min"
   - "Swedish Massage - 60 min"
   - "Sports Massage - 90 min"
   ↓
3. Shows each business's custom pricing via business_services:
   - Spa A: Deep Tissue Massage $110
   - Spa B: Deep Tissue Massage $120
   - Spa C: Deep Tissue Massage $95
   ↓
4. When customer selects a service, shows available add-ons:
   - ✨ CBD Oil +$25 (Recommended)
   - ✨ Hot Stones +$30 (Recommended)
   - Aromatherapy +$15
```

### Complete Visual Hierarchy

```
Category: Beauty
  ↓
Subcategory: Esthetician
  ↓
Services:
  ├─ Classic Facial - 60 min ($85)
  │   ├─ Add-On: Paraffin Wax Treatment (+$20)
  │   └─ Add-On: Extended Time (+$30)
  │
  ├─ Express Facial - 30 min ($55)
  │   └─ Add-On: Paraffin Wax Treatment (+$20)
  │
  └─ Anti-Aging Facial - 90 min ($120)
      ├─ Add-On: Paraffin Wax Treatment (+$20)
      └─ Add-On: LED Light Therapy (+$40)

Category: Therapy
  ↓
Subcategory: Massage Therapy
  ↓
Services:
  ├─ Deep Tissue Massage - 60 min ($120)
  │   ├─ Add-On: ✨ CBD Oil (+$25) [Recommended]
  │   ├─ Add-On: ✨ Hot Stones (+$30) [Recommended]
  │   └─ Add-On: Aromatherapy (+$15)
  │
  └─ Swedish Massage - 60 min ($110)
      ├─ Add-On: ✨ CBD Oil (+$25) [Recommended]
      └─ Add-On: Aromatherapy (+$15)
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

## 🎁 Add-Ons System (Level 4)

### Overview

Add-ons are optional enhancements that customers can add to their service bookings. The add-ons system uses **three tables** to create a flexible, multi-business pricing system:

1. **`service_addons`** - Master catalog of all available add-ons
2. **`service_addon_eligibility`** - Defines which add-ons work with which services
3. **`business_addons`** - Business-specific pricing and availability

### The Add-Ons Hierarchy

```
service_addons (Master Catalog)
    ↓
service_addon_eligibility (Eligibility Rules)
    ↓ (links to services)
services
    ↓
business_addons (Business-Specific Pricing)
    ↓
bookings → booking_addons (Customer Selections)
```

---

### 4. `service_addons` (Master Add-Ons Catalog)
**Purpose**: Master list of all available add-ons in the platform  
**Type**: Lookup/Reference Table  
**Relationship**: One-to-Many with `service_addon_eligibility` and `business_addons`

**Schema**:
```sql
create table public.service_addons (
  id uuid not null default gen_random_uuid(),
  name character varying(255) not null,   -- "CBD Oil", "Hot Stones", "Aromatherapy"
  description text null,                  -- "Premium CBD-infused massage oil"
  image_url text null,
  is_active boolean default true,
  created_at timestamp without time zone default now(),
  updated_at timestamp without time zone default now(),
  
  constraint service_addons_pkey primary key (id)
);
```

**Example Data**:
| id | name | description | is_active |
|----|------|-------------|-----------|
| addon-1 | CBD Oil | Premium CBD-infused massage oil for enhanced relaxation | true |
| addon-2 | Hot Stones | Heated volcanic stones for deep tissue relief | true |
| addon-3 | Aromatherapy | Essential oil therapy for stress relief | true |
| addon-4 | Extended Time | Add 30 minutes to your service | true |
| addon-5 | Paraffin Wax Treatment | Moisturizing hand and foot treatment | true |

**What This Means**:
- These are the **platform-wide** add-ons available
- All businesses can offer these, but set their own prices
- Add-ons are reusable across multiple services and businesses

---

### 5. `service_addon_eligibility` (Eligibility Rules)
**Purpose**: Defines which add-ons are compatible with which services  
**Type**: Junction/Bridge Table  
**Relationship**: Many-to-Many between `services` and `service_addons`

**Schema**:
```sql
create table public.service_addon_eligibility (
  id uuid not null default gen_random_uuid(),
  service_id uuid not null,               -- FK to services
  addon_id uuid not null,                 -- FK to service_addons
  is_recommended boolean default false,   -- Featured/recommended add-on
  created_at timestamp without time zone default now(),
  
  constraint service_addon_eligibility_pkey primary key (id),
  constraint service_addon_eligibility_service_id_addon_id_key unique (service_id, addon_id),
  constraint service_addon_eligibility_addon_id_fkey 
    foreign key (addon_id) references service_addons (id) on delete CASCADE,
  constraint service_addon_eligibility_service_id_fkey 
    foreign key (service_id) references services (id)
);
```

**Key Fields**:
- `service_id` - Which service can have this add-on
- `addon_id` - Which add-on is compatible
- `is_recommended` - Whether to feature/highlight this add-on
- **UNIQUE constraint** - Each service-addon pair only exists once

**Example Data**:
| id | service_id | addon_id | is_recommended | Service → Add-On |
|----|------------|----------|----------------|------------------|
| elig-1 | svc-massage-60 | addon-1 | true | Deep Tissue Massage → CBD Oil ✓ |
| elig-2 | svc-massage-60 | addon-2 | true | Deep Tissue Massage → Hot Stones ✓ |
| elig-3 | svc-massage-60 | addon-3 | false | Deep Tissue Massage → Aromatherapy ✓ |
| elig-4 | svc-massage-90 | addon-1 | true | Swedish Massage → CBD Oil ✓ |
| elig-5 | svc-facial-60 | addon-5 | true | Classic Facial → Paraffin Wax ✓ |

**What This Means**:
- **Deep Tissue Massage** can have CBD Oil (recommended), Hot Stones (recommended), or Aromatherapy
- **Swedish Massage** can have CBD Oil
- **Classic Facial** can have Paraffin Wax Treatment
- **Spray Tan** services would have NO add-ons (no eligibility records)

**Logic**:
```
If service_addon_eligibility exists for (service_id, addon_id):
  → Customer CAN add this add-on to their booking
  
If is_recommended = true:
  → Show with special badge/highlight in UI
```

---

### 6. `business_addons` (Business-Specific Pricing)
**Purpose**: Stores business-specific pricing and availability for add-ons  
**Type**: Junction/Bridge Table  
**Relationship**: Many-to-Many between `business_profiles` and `service_addons`

**Schema**:
```sql
create table public.business_addons (
  id uuid not null default gen_random_uuid(),
  business_id uuid not null,              -- FK to business_profiles
  addon_id uuid not null,                 -- FK to service_addons
  custom_price numeric(10, 2) null,       -- Business's price for this add-on
  is_available boolean default true,      -- Business offers this add-on
  created_at timestamp without time zone default now(),
  
  constraint business_addon_pricing_pkey primary key (id),
  constraint business_addon_pricing_business_id_addon_id_key unique (business_id, addon_id),
  constraint business_addon_pricing_business_id_fkey 
    foreign key (business_id) references business_profiles (id) on delete CASCADE,
  constraint business_addon_pricing_addon_id_fkey 
    foreign key (addon_id) references service_addons (id) on delete CASCADE
);
```

**Key Fields**:
- `custom_price` - This business's price for the add-on
- `is_available` - Whether this business currently offers this add-on
- **UNIQUE constraint** - Each business-addon pair only exists once

**Example Data**:
| id | business_id | addon_id | custom_price | is_available | Business → Add-On Pricing |
|----|-------------|----------|--------------|--------------|---------------------------|
| ba-1 | biz-123 | addon-1 | 25.00 | true | Miami Spa: CBD Oil = $25 |
| ba-2 | biz-123 | addon-2 | 30.00 | true | Miami Spa: Hot Stones = $30 |
| ba-3 | biz-123 | addon-3 | 15.00 | false | Miami Spa: Aromatherapy = $15 (unavailable) |
| ba-4 | biz-456 | addon-1 | 20.00 | true | Wellness Center: CBD Oil = $20 |
| ba-5 | biz-456 | addon-2 | 35.00 | true | Wellness Center: Hot Stones = $35 |

**What This Means**:
- **Miami Spa** charges $25 for CBD Oil, $30 for Hot Stones
- **Miami Spa** has Aromatherapy in their system but it's currently unavailable
- **Wellness Center** charges $20 for CBD Oil (cheaper!), $35 for Hot Stones (more expensive!)
- Each business sets their own prices independently

---

## 🔄 Add-Ons Data Flow

### How Add-Ons Work End-to-End

#### 1. **Platform Setup** (Admin/System)
```sql
-- Create master add-on
INSERT INTO service_addons (name, description)
VALUES ('CBD Oil', 'Premium CBD-infused massage oil');
```

#### 2. **Service Configuration** (Admin/System)
```sql
-- Define which services can have CBD Oil
INSERT INTO service_addon_eligibility (service_id, addon_id, is_recommended)
VALUES 
  ('deep-tissue-massage-60', 'cbd-oil-addon', true),
  ('swedish-massage-60', 'cbd-oil-addon', true),
  ('sports-massage-60', 'cbd-oil-addon', false);
```

**Result**: CBD Oil is now compatible with all massage services

#### 3. **Business Setup** (Business Owner)
```sql
-- Miami Spa decides to offer CBD Oil for $25
INSERT INTO business_addons (business_id, addon_id, custom_price, is_available)
VALUES ('miami-spa', 'cbd-oil-addon', 25.00, true);

-- Wellness Center offers it for $20
INSERT INTO business_addons (business_id, addon_id, custom_price, is_available)
VALUES ('wellness-center', 'cbd-oil-addon', 20.00, true);
```

**Result**: Two businesses offering same add-on at different prices

#### 4. **Customer Booking Flow**

**Step 1**: Customer selects "Deep Tissue Massage - 60 min" at Miami Spa

**Step 2**: Query eligible add-ons:
```typescript
const { data: eligibleAddons } = await supabase
  .from('service_addon_eligibility')
  .select(`
    id,
    is_recommended,
    service_addons (
      id,
      name,
      description,
      image_url
    )
  `)
  .eq('service_id', selectedServiceId);

// Get business pricing
const { data: businessPricing } = await supabase
  .from('business_addons')
  .select('addon_id, custom_price, is_available')
  .eq('business_id', businessId)
  .eq('is_available', true);
```

**Step 3**: Show available add-ons with business pricing:
```
Available Add-Ons for Deep Tissue Massage:
✨ CBD Oil - $25 (Recommended)
✨ Hot Stones - $30 (Recommended)
   Aromatherapy - $15
```

**Step 4**: Customer selects CBD Oil and Hot Stones

**Step 5**: Create booking with add-ons:
```sql
-- Create booking
INSERT INTO bookings (customer_id, service_id, total_amount)
VALUES ('customer-123', 'service-456', 180.00);  -- $120 + $25 + $35

-- Link selected add-ons
INSERT INTO booking_addons (booking_id, addon_id, quantity, price)
VALUES 
  ('booking-789', 'cbd-oil-addon', 1, 25.00),
  ('booking-789', 'hot-stones-addon', 1, 30.00);
```

---

## 🎯 Real-World Example: Complete Service with Add-Ons

### Scenario
**Business**: Miami Spa & Wellness  
**Service**: Deep Tissue Massage - 60 min  
**Base Price**: $120  
**Available Add-Ons**: CBD Oil ($25), Hot Stones ($30), Aromatherapy ($15)

### Database State

#### `services` (Service Definition)
| id | name | duration_minutes | min_price |
|----|------|------------------|-----------|
| svc-massage | Deep Tissue Massage - 60 min | 60 | 90 |

#### `business_services` (Business Offering)
| id | business_id | service_id | business_price | delivery_type |
|----|-------------|------------|----------------|---------------|
| bs-1 | miami-spa | svc-massage | 120.00 | in_person |

#### `service_addons` (Master Add-Ons)
| id | name | description |
|----|------|-------------|
| addon-cbd | CBD Oil | Premium CBD-infused massage oil |
| addon-stones | Hot Stones | Heated volcanic stones |
| addon-aroma | Aromatherapy | Essential oil therapy |

#### `service_addon_eligibility` (Compatibility)
| id | service_id | addon_id | is_recommended |
|----|------------|----------|----------------|
| elig-1 | svc-massage | addon-cbd | true |
| elig-2 | svc-massage | addon-stones | true |
| elig-3 | svc-massage | addon-aroma | false |

#### `business_addons` (Miami Spa Pricing)
| id | business_id | addon_id | custom_price | is_available |
|----|-------------|----------|--------------|--------------|
| ba-1 | miami-spa | addon-cbd | 25.00 | true |
| ba-2 | miami-spa | addon-stones | 30.00 | true |
| ba-3 | miami-spa | addon-aroma | 15.00 | true |

### Customer Booking

**Customer Selection**:
- Deep Tissue Massage - 60 min: **$120**
- ✨ CBD Oil (Recommended): **+$25**
- ✨ Hot Stones (Recommended): **+$30**

**Total**: **$175**

#### `bookings` (Booking Record)
| id | customer_id | service_id | total_amount | status |
|----|-------------|------------|--------------|--------|
| booking-1 | cust-123 | svc-massage | 175.00 | confirmed |

#### `booking_addons` (Selected Add-Ons)
| id | booking_id | addon_id | quantity | price | subtotal |
|----|------------|----------|----------|-------|----------|
| ba-1 | booking-1 | addon-cbd | 1 | 25.00 | 25.00 |
| ba-2 | booking-1 | addon-stones | 1 | 30.00 | 30.00 |

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

### Get Available Add-Ons for a Service

```typescript
// Step 1: Get eligible add-ons for the service
const { data: eligibleAddons } = await supabase
  .from('service_addon_eligibility')
  .select(`
    id,
    is_recommended,
    service_addons (
      id,
      name,
      description,
      image_url
    )
  `)
  .eq('service_id', serviceId);

// Step 2: Get business pricing for these add-ons
const addonIds = eligibleAddons?.map(e => e.service_addons.id) || [];

const { data: businessPricing } = await supabase
  .from('business_addons')
  .select('addon_id, custom_price, is_available')
  .eq('business_id', businessId)
  .in('addon_id', addonIds)
  .eq('is_available', true);

// Step 3: Merge data
const addonsWithPricing = eligibleAddons?.map(eligible => ({
  ...eligible.service_addons,
  is_recommended: eligible.is_recommended,
  price: businessPricing?.find(bp => bp.addon_id === eligible.service_addons.id)?.custom_price
})).filter(addon => addon.price !== undefined);
```

**Result**:
```json
[
  {
    "id": "addon-cbd",
    "name": "CBD Oil",
    "description": "Premium CBD-infused massage oil",
    "is_recommended": true,
    "price": 25.00
  },
  {
    "id": "addon-stones",
    "name": "Hot Stones",
    "description": "Heated volcanic stones",
    "is_recommended": true,
    "price": 30.00
  }
]
```

---

## 🎨 Example: Complete Business Setup

### Scenario
**Business**: "Miami Spa & Wellness"  
**Categories**: Beauty, Therapy  
**Subcategories**: Esthetician, Spray Tan (Beauty), Massage Therapy (Therapy)  
**Services**: Classic Facial, Express Facial, Spray Tan, Deep Tissue Massage, Swedish Massage  
**Add-Ons**: CBD Oil, Hot Stones, Aromatherapy, Paraffin Wax Treatment

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

#### `service_addons` (Master Add-Ons Catalog)
| id | name | description | is_active |
|----|------|-------------|-----------|
| addon-1 | CBD Oil | Premium CBD-infused massage oil | true |
| addon-2 | Hot Stones | Heated volcanic stones | true |
| addon-3 | Aromatherapy | Essential oil therapy | true |
| addon-4 | Paraffin Wax Treatment | Moisturizing hand and foot treatment | true |

**Meaning**: Platform-wide add-on catalog

#### `service_addon_eligibility` (Which Add-Ons Work with Which Services)
| id | service_id | addon_id | is_recommended |
|----|------------|----------|----------------|
| elig-1 | svc-4 | addon-1 | true |
| elig-2 | svc-4 | addon-2 | true |
| elig-3 | svc-4 | addon-3 | false |
| elig-4 | svc-5 | addon-1 | true |
| elig-5 | svc-5 | addon-3 | false |
| elig-6 | svc-1 | addon-4 | true |
| elig-7 | svc-2 | addon-4 | false |

**Meaning**:
- Deep Tissue Massage can have: CBD Oil ✨, Hot Stones ✨, Aromatherapy
- Swedish Massage can have: CBD Oil ✨, Aromatherapy
- Classic Facial can have: Paraffin Wax ✨
- Express Facial can have: Paraffin Wax

#### `business_addons` (Miami Spa's Add-On Pricing)
| id | business_id | addon_id | custom_price | is_available |
|----|-------------|----------|--------------|--------------|
| ba-1 | biz-123 | addon-1 | 25.00 | true |
| ba-2 | biz-123 | addon-2 | 30.00 | true |
| ba-3 | biz-123 | addon-3 | 15.00 | true |
| ba-4 | biz-123 | addon-4 | 20.00 | true |

**Meaning**:
- Miami Spa charges **$25** for CBD Oil
- Miami Spa charges **$30** for Hot Stones
- Miami Spa charges **$15** for Aromatherapy
- Miami Spa charges **$20** for Paraffin Wax Treatment

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
├─ Specific Services with Pricing:
│  ├─ Classic Facial - 60 min ($85, in-person)
│  │   └─ Add-On: ✨ Paraffin Wax Treatment (+$20) [Recommended]
│  │
│  ├─ Express Facial - 30 min ($55, in-person)
│  │   └─ Add-On: Paraffin Wax Treatment (+$20)
│  │
│  ├─ Full Body Spray Tan ($45, in-person)
│  │   └─ (No add-ons available)
│  │
│  ├─ Deep Tissue Massage - 60 min ($120, in-person)
│  │   ├─ Add-On: ✨ CBD Oil (+$25) [Recommended]
│  │   ├─ Add-On: ✨ Hot Stones (+$30) [Recommended]
│  │   └─ Add-On: Aromatherapy (+$15)
│  │
│  └─ Swedish Massage - 60 min ($110, mobile)
│      ├─ Add-On: ✨ CBD Oil (+$25) [Recommended]
│      └─ Add-On: Aromatherapy (+$15)
```

### Customer Booking Example

**Customer selects**: Deep Tissue Massage - 60 min at Miami Spa  
**Base price**: $120  
**Available add-ons shown**:
- ✨ CBD Oil (+$25) [Recommended]
- ✨ Hot Stones (+$30) [Recommended]
- Aromatherapy (+$15)

**Customer adds**: CBD Oil + Hot Stones  
**Total**: $120 + $25 + $30 = **$175**

**Database records**:
```sql
-- Booking
INSERT INTO bookings (id, customer_id, service_id, total_amount, status)
VALUES ('booking-1', 'cust-123', 'svc-4', 175.00, 'confirmed');

-- Selected add-ons
INSERT INTO booking_addons (booking_id, addon_id, quantity, price)
VALUES 
  ('booking-1', 'addon-1', 1, 25.00),  -- CBD Oil
  ('booking-1', 'addon-2', 1, 30.00);  -- Hot Stones
```

**Why This Structure?**
1. **Categories** tell customers "We do Beauty and Therapy"
2. **Subcategories** tell customers "We specialize in Facials, Spray Tans, and Massage"
3. **Services** tell customers exact offerings and prices
4. **Add-Ons** let customers customize their experience with optional enhancements

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
