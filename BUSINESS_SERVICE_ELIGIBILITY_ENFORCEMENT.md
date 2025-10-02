# 🔒 Business Service Eligibility Enforcement

**Created**: 2025-10-02  
**Purpose**: Ensure businesses can only add services they are approved to offer based on platform admin authorization

---

## 📋 Overview

This document describes the enforcement mechanism that ensures businesses can only add services to their offerings (`business_services` table) if they have been approved by platform administrators for the corresponding service categories and subcategories.

### Key Security Principles

1. **Admin-Controlled Approval**: Only platform admins can approve businesses for service categories/subcategories
2. **Double Validation**: Both category AND subcategory must be approved
3. **API-Level Enforcement**: Validation happens server-side, preventing unauthorized additions
4. **Granular Control**: Admins can revoke approval by setting `is_active = false`

---

## 🔐 Authorization Architecture

### Approval Hierarchy

```
Platform Admin
    ↓ (approves)
Business → Service Category (e.g., "Automotive")
    ↓ (approves)
Business → Service Subcategory (e.g., "Oil Change")
    ↓ (enables)
Business → Add Specific Services (e.g., "Standard Oil Change", "Synthetic Oil Change")
```

### Database Tables

1. **`business_service_categories`**: Categories business is approved for
2. **`business_service_subcategories`**: Subcategories business is approved for
3. **`service_categories`**: Master list of all categories
4. **`service_subcategories`**: Master list of all subcategories (linked to categories)
5. **`services`**: Individual services (linked to subcategories)
6. **`business_services`**: Services business offers (what we're protecting)

---

## 🛡️ Enforcement Points

### 1. Eligible Services Endpoint

**Endpoint**: `GET /api/business-eligible-services?business_id={uuid}`

**File**: `roam-provider-app/api/business-eligible-services.ts`

#### What It Does

Returns only services from subcategories that:
1. Business is approved for (in `business_service_subcategories`)
2. Whose parent category business is also approved for (in `business_service_categories`)
3. Both approvals are active (`is_active = true`)

#### Validation Steps

```typescript
// Step 1: Verify business exists
✓ Check business_profiles.id = business_id

// Step 2: Get approved subcategories
✓ Query business_service_subcategories WHERE business_id AND is_active = true

// Step 3: Get approved categories
✓ Query business_service_categories WHERE business_id AND is_active = true

// Step 4: Filter subcategories by category approval
✓ Only include subcategories whose category_id is in approved categories

// Step 5: Fetch eligible services
✓ Query services WHERE subcategory_id IN (valid subcategories) AND is_active = true

// Step 6: Enrich with configuration status
✓ Mark which services are already added to business_services
```

#### Response Structure

```json
{
  "business_id": "uuid",
  "service_count": 15,
  "eligible_services": [
    {
      "id": "service-uuid",
      "name": "Standard Oil Change",
      "description": "...",
      "min_price": 49.99,
      "duration_minutes": 30,
      "subcategory_id": "uuid",
      "subcategory_name": "oil_change",
      "category_name": "automotive",
      "is_configured": false,
      "business_price": null,
      "business_is_active": null
    }
  ],
  "approved_categories_count": 3,
  "approved_subcategories_count": 8
}
```

#### Empty State Response

If business has no approvals:

```json
{
  "business_id": "uuid",
  "service_count": 0,
  "eligible_services": [],
  "message": "No approved service categories or subcategories. Contact platform administration for service approval."
}
```

---

### 2. Add Service Endpoint

**Endpoint**: `POST /api/business/services`

**File**: `roam-provider-app/api/business/services.ts`

#### What It Does

Validates service eligibility before allowing business to add it to their offerings.

#### Validation Steps

```typescript
// Step 1: Validate input
✓ Require business_id, service_id, business_price
✓ Validate business_price > 0

// Step 2: Verify service exists and is active
✓ Query services WHERE id = service_id AND is_active = true
✓ Extract subcategory_id from service

// Step 3: Check subcategory approval
✓ Query business_service_subcategories 
  WHERE business_id AND subcategory_id AND is_active = true
✓ Extract category_id from result

// Step 4: Check parent category approval
✓ Query business_service_categories 
  WHERE business_id AND category_id AND is_active = true

// Step 5: Check for duplicates
✓ Query business_services WHERE business_id AND service_id
✓ Return 409 Conflict if exists

// Step 6: Insert service
✓ Insert into business_services with validated data
```

#### Request Body

```json
{
  "business_id": "uuid",
  "service_id": "uuid",
  "business_price": 59.99,
  "delivery_type": "both",
  "is_active": true
}
```

#### Success Response (201 Created)

```json
{
  "message": "Service added successfully",
  "service": {
    "id": "business-service-uuid",
    "business_id": "uuid",
    "service_id": "uuid",
    "business_price": 59.99,
    "delivery_type": "both",
    "is_active": true,
    "created_at": "2025-10-02T12:00:00Z",
    "services": {
      "id": "uuid",
      "name": "Standard Oil Change",
      "description": "...",
      "min_price": 49.99,
      "duration_minutes": 30,
      "image_url": "..."
    }
  }
}
```

#### Error Responses

**400 Bad Request** - Invalid input
```json
{
  "error": "business_price must be greater than 0"
}
```

**403 Forbidden** - Not approved for subcategory
```json
{
  "error": "Business is not approved for this service subcategory",
  "details": "Contact platform administration to get approved for this service category"
}
```

**403 Forbidden** - Not approved for parent category
```json
{
  "error": "Business is not approved for the parent service category",
  "details": "Contact platform administration to get approved for this service category"
}
```

**404 Not Found** - Service doesn't exist
```json
{
  "error": "Service not found or inactive"
}
```

**409 Conflict** - Service already added
```json
{
  "error": "Service already added to business"
}
```

---

### 3. Update Service Endpoint

**Endpoint**: `PUT /api/business/services`

**File**: `roam-provider-app/api/business/services.ts`

#### What It Does

Updates existing business service (price, delivery type, status). **No eligibility check needed** since service was validated when added.

#### Request Body

```json
{
  "business_id": "uuid",
  "service_id": "uuid",
  "business_price": 69.99,
  "delivery_type": "mobile",
  "is_active": false
}
```

#### Success Response (200 OK)

```json
{
  "message": "Service updated successfully",
  "service": { /* updated service object */ }
}
```

---

### 4. Delete Service Endpoint

**Endpoint**: `DELETE /api/business/services?business_id={uuid}&service_id={uuid}`

**File**: `roam-provider-app/api/business/services.ts`

#### What It Does

Removes service from business offerings. **No eligibility check needed** - businesses can always remove services.

#### Success Response (200 OK)

```json
{
  "message": "Service removed successfully"
}
```

---

## 🎨 Frontend Integration

### Services Tab

**File**: `roam-provider-app/client/pages/dashboard/components/ServicesTabRefactored.tsx`

The services tab displays:
1. **Current Services**: Services business has already added
2. **Add Service Modal**: Shows only eligible services for selection

### Add Service Modal

**File**: `roam-provider-app/client/pages/dashboard/components/services/AddServiceModal.tsx`

**Key Features**:
- Populated with `eligibleServices` from `useServices` hook
- Only shows services from approved categories/subcategories
- Filters out services already added to business
- Shows category and subcategory names for context

### useServices Hook

**File**: `roam-provider-app/client/hooks/services/useServices.ts`

**Key Functions**:
```typescript
// Loads eligible services (already filtered by backend)
const loadServicesData = async () => {
  const eligibleRes = await fetch(`/api/business-eligible-services?business_id=${businessId}`);
  // Backend returns only approved services
};

// Attempts to add service (backend validates eligibility)
const addService = async (serviceForm: ServiceFormData) => {
  const response = await fetch('/api/business/services', {
    method: 'POST',
    body: JSON.stringify({ /* service data */ })
  });
  // Backend rejects if not eligible
};
```

---

## 🔄 Admin Approval Workflow

### How Admins Approve Businesses

#### 1. Approve for Service Category

```sql
INSERT INTO business_service_categories (business_id, category_id, is_active)
VALUES ('business-uuid', 'category-uuid', true);
```

#### 2. Approve for Service Subcategories

```sql
INSERT INTO business_service_subcategories (business_id, category_id, subcategory_id, is_active)
VALUES 
  ('business-uuid', 'category-uuid', 'subcategory1-uuid', true),
  ('business-uuid', 'category-uuid', 'subcategory2-uuid', true);
```

#### 3. Revoke Approval (Soft Delete)

```sql
-- Revoke entire category
UPDATE business_service_categories 
SET is_active = false 
WHERE business_id = 'uuid' AND category_id = 'uuid';

-- Revoke specific subcategory
UPDATE business_service_subcategories 
SET is_active = false 
WHERE business_id = 'uuid' AND subcategory_id = 'uuid';
```

### Effect of Revocation

- **Existing Services**: Remain in `business_services` but business cannot add new services from revoked categories
- **Eligible Services API**: Immediately stops returning services from revoked categories
- **Add Service Attempts**: Immediately rejected with 403 Forbidden

---

## 🧪 Testing Scenarios

### Scenario 1: Business with No Approvals

```bash
# Request: Get eligible services
GET /api/business-eligible-services?business_id={uuid}

# Response: Empty with message
{
  "service_count": 0,
  "eligible_services": [],
  "message": "No approved service categories or subcategories..."
}

# Request: Try to add service
POST /api/business/services
{ "business_id": "uuid", "service_id": "uuid", "business_price": 50 }

# Response: 403 Forbidden
{
  "error": "Business is not approved for this service subcategory"
}
```

### Scenario 2: Approved for Category Only (Not Subcategory)

```bash
# Setup:
# - business_service_categories: Category A approved
# - business_service_subcategories: No subcategories approved

# Request: Get eligible services
GET /api/business-eligible-services?business_id={uuid}

# Response: Empty (subcategories filter out services)
{
  "service_count": 0,
  "eligible_services": [],
  "approved_categories_count": 1,
  "approved_subcategories_count": 0
}

# Request: Try to add service from Category A
POST /api/business/services
{ "business_id": "uuid", "service_id": "service-in-category-a", "business_price": 50 }

# Response: 403 Forbidden
{
  "error": "Business is not approved for this service subcategory"
}
```

### Scenario 3: Approved for Subcategory Only (Not Parent Category)

```bash
# Setup:
# - business_service_categories: Category A NOT approved
# - business_service_subcategories: Subcategory A1 approved (parent = Category A)

# Request: Get eligible services
GET /api/business-eligible-services?business_id={uuid}

# Response: Empty (parent category check filters out)
{
  "service_count": 0,
  "eligible_services": [],
  "approved_categories_count": 0,
  "approved_subcategories_count": 1
}

# Request: Try to add service from Subcategory A1
POST /api/business/services
{ "business_id": "uuid", "service_id": "service-in-a1", "business_price": 50 }

# Response: 403 Forbidden
{
  "error": "Business is not approved for the parent service category"
}
```

### Scenario 4: Fully Approved (Category + Subcategory)

```bash
# Setup:
# - business_service_categories: Category A approved
# - business_service_subcategories: Subcategory A1 approved (parent = Category A)

# Request: Get eligible services
GET /api/business-eligible-services?business_id={uuid}

# Response: Services listed
{
  "service_count": 5,
  "eligible_services": [
    { "id": "s1", "name": "Service 1", "subcategory_name": "a1", "category_name": "automotive" },
    { "id": "s2", "name": "Service 2", "subcategory_name": "a1", "category_name": "automotive" }
  ],
  "approved_categories_count": 1,
  "approved_subcategories_count": 1
}

# Request: Add service from Subcategory A1
POST /api/business/services
{ "business_id": "uuid", "service_id": "s1", "business_price": 50 }

# Response: 201 Created
{
  "message": "Service added successfully",
  "service": { /* service object */ }
}
```

### Scenario 5: Duplicate Service Addition

```bash
# Setup: Service already in business_services

# Request: Try to add same service again
POST /api/business/services
{ "business_id": "uuid", "service_id": "s1", "business_price": 50 }

# Response: 409 Conflict
{
  "error": "Service already added to business"
}
```

### Scenario 6: Inactive Service

```bash
# Setup: Service exists but is_active = false

# Request: Try to add inactive service
POST /api/business/services
{ "business_id": "uuid", "service_id": "inactive-service", "business_price": 50 }

# Response: 404 Not Found
{
  "error": "Service not found or inactive"
}
```

---

## 🔍 Validation Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Business Tries to Add Service                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │  Service Exists?     │
                  │  & is_active = true? │
                  └──────────┬───────────┘
                             │
                        Yes  │  No → 404 Not Found
                             ▼
                  ┌──────────────────────┐
                  │  Get Subcategory ID  │
                  │  from Service        │
                  └──────────┬───────────┘
                             │
                             ▼
          ┌──────────────────────────────────────────┐
          │  Business Approved for Subcategory?      │
          │  (business_service_subcategories table)  │
          └──────────┬───────────────────────────────┘
                     │
                Yes  │  No → 403 Forbidden (subcategory)
                     ▼
          ┌──────────────────────────────────────────┐
          │  Get Parent Category ID                  │
          │  from Subcategory Approval               │
          └──────────┬───────────────────────────────┘
                     │
                     ▼
          ┌──────────────────────────────────────────┐
          │  Business Approved for Parent Category?  │
          │  (business_service_categories table)     │
          └──────────┬───────────────────────────────┘
                     │
                Yes  │  No → 403 Forbidden (category)
                     ▼
          ┌──────────────────────────────────────────┐
          │  Service Already Added to Business?      │
          │  (business_services table)               │
          └──────────┬───────────────────────────────┘
                     │
                 No  │  Yes → 409 Conflict
                     ▼
          ┌──────────────────────────────────────────┐
          │  ✅ INSERT into business_services        │
          │  201 Created                             │
          └──────────────────────────────────────────┘
```

---

## 🛠️ Troubleshooting

### Problem: Business can't see any eligible services

**Possible Causes**:
1. No categories approved in `business_service_categories`
2. No subcategories approved in `business_service_subcategories`
3. Subcategories approved but parent categories not approved
4. Approvals exist but `is_active = false`
5. Services exist but `is_active = false` in `services` table

**Solution**:
```sql
-- Check category approvals
SELECT * FROM business_service_categories 
WHERE business_id = 'uuid' AND is_active = true;

-- Check subcategory approvals
SELECT * FROM business_service_subcategories 
WHERE business_id = 'uuid' AND is_active = true;

-- Check if subcategories have approved parent categories
SELECT bss.*, bsc.id as category_approval_id
FROM business_service_subcategories bss
LEFT JOIN business_service_categories bsc 
  ON bss.business_id = bsc.business_id 
  AND bss.category_id = bsc.category_id 
  AND bsc.is_active = true
WHERE bss.business_id = 'uuid' AND bss.is_active = true;
```

### Problem: Business getting 403 when adding service

**Possible Causes**:
1. Subcategory not approved
2. Parent category not approved
3. Approval records inactive (`is_active = false`)

**Solution**:
```sql
-- Get service's category hierarchy
SELECT 
  s.id as service_id,
  s.name as service_name,
  ss.id as subcategory_id,
  ss.service_subcategory_type,
  sc.id as category_id,
  sc.service_category_type
FROM services s
JOIN service_subcategories ss ON s.subcategory_id = ss.id
JOIN service_categories sc ON ss.category_id = sc.id
WHERE s.id = 'service-uuid';

-- Check if business is approved for both
SELECT 
  'Category' as approval_type,
  bsc.id,
  bsc.is_active
FROM business_service_categories bsc
WHERE bsc.business_id = 'business-uuid' 
  AND bsc.category_id = 'category-uuid'
UNION ALL
SELECT 
  'Subcategory' as approval_type,
  bss.id,
  bss.is_active
FROM business_service_subcategories bss
WHERE bss.business_id = 'business-uuid' 
  AND bss.subcategory_id = 'subcategory-uuid';
```

### Problem: Eligible services API returns different count than expected

**Possible Causes**:
1. Some subcategories don't have approved parent categories (filtered out)
2. Some services are inactive
3. Some approvals are inactive

**Solution**:
```sql
-- Debug query: Show all steps
WITH approved_cats AS (
  SELECT category_id
  FROM business_service_categories
  WHERE business_id = 'uuid' AND is_active = true
),
approved_subs AS (
  SELECT subcategory_id, category_id
  FROM business_service_subcategories
  WHERE business_id = 'uuid' AND is_active = true
),
valid_subs AS (
  SELECT s.subcategory_id
  FROM approved_subs s
  INNER JOIN approved_cats c ON s.category_id = c.category_id
)
SELECT 
  (SELECT COUNT(*) FROM approved_cats) as approved_categories,
  (SELECT COUNT(*) FROM approved_subs) as approved_subcategories,
  (SELECT COUNT(*) FROM valid_subs) as valid_subcategories,
  (SELECT COUNT(*) FROM services WHERE subcategory_id IN (SELECT subcategory_id FROM valid_subs) AND is_active = true) as eligible_services;
```

---

## 📊 Database Queries for Admins

### Approve Business for Service Category

```sql
-- Insert approval (if not exists)
INSERT INTO business_service_categories (business_id, category_id, is_active)
VALUES ('business-uuid', 'category-uuid', true)
ON CONFLICT (business_id, category_id) 
DO UPDATE SET is_active = true, updated_at = NOW();
```

### Approve Business for Service Subcategories

```sql
-- Approve multiple subcategories at once
INSERT INTO business_service_subcategories (business_id, category_id, subcategory_id, is_active)
VALUES 
  ('business-uuid', 'category-uuid', 'sub1-uuid', true),
  ('business-uuid', 'category-uuid', 'sub2-uuid', true),
  ('business-uuid', 'category-uuid', 'sub3-uuid', true)
ON CONFLICT (business_id, subcategory_id) 
DO UPDATE SET is_active = true, updated_at = NOW();
```

### Revoke Category Approval

```sql
-- Soft delete (keeps history)
UPDATE business_service_categories
SET is_active = false, updated_at = NOW()
WHERE business_id = 'business-uuid' AND category_id = 'category-uuid';
```

### Revoke Subcategory Approval

```sql
-- Soft delete (keeps history)
UPDATE business_service_subcategories
SET is_active = false, updated_at = NOW()
WHERE business_id = 'business-uuid' AND subcategory_id = 'subcategory-uuid';
```

### View Business Approvals Summary

```sql
SELECT 
  bp.business_name,
  COUNT(DISTINCT bsc.category_id) as approved_categories,
  COUNT(DISTINCT bss.subcategory_id) as approved_subcategories,
  COUNT(DISTINCT bs.service_id) as configured_services
FROM business_profiles bp
LEFT JOIN business_service_categories bsc 
  ON bp.id = bsc.business_id AND bsc.is_active = true
LEFT JOIN business_service_subcategories bss 
  ON bp.id = bss.business_id AND bss.is_active = true
LEFT JOIN business_services bs 
  ON bp.id = bs.business_id
WHERE bp.id = 'business-uuid'
GROUP BY bp.id, bp.business_name;
```

---

## 🚀 Deployment Checklist

- [x] Update `/api/business-eligible-services` endpoint with category validation
- [x] Add POST endpoint to `/api/business/services` with eligibility checks
- [x] Add PUT endpoint to `/api/business/services`
- [x] Add DELETE endpoint to `/api/business/services`
- [x] Update API documentation headers
- [x] Ensure `useServices` hook uses updated API
- [x] Verify frontend `AddServiceModal` shows only eligible services
- [ ] Test with real business data in production
- [ ] Create admin UI for managing approvals
- [ ] Add monitoring for 403 errors (approval issues)
- [ ] Document admin approval workflow for support team

---

## 📚 Related Documentation

- [DATABASE_SCHEMA_REFERENCE.md](./DATABASE_SCHEMA_REFERENCE.md) - Database tables and relationships
- [API_ARCHITECTURE.md](./API_ARCHITECTURE.md) - API patterns and standards
- [BUSINESS_SERVICE_ELIGIBILITY_INTEGRATION.md](./BUSINESS_SERVICE_ELIGIBILITY_INTEGRATION.md) - Service eligibility display feature

---

**Last Updated**: 2025-10-02  
**Status**: ✅ Implementation Complete, Pending Production Testing
