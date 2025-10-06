# Staff Service Assignment - Database Tables

## Overview
The service assignment feature for providers uses the `provider_services` and `provider_addons` tables to track which services and add-ons each provider can offer.

---

## Tables Used

### 1. `provider_services`
**Purpose:** Tracks which services a provider is authorized to offer

```sql
create table public.provider_services (
  id uuid not null default gen_random_uuid (),
  provider_id uuid not null,
  service_id uuid not null,
  is_active boolean null default true,
  created_at timestamp without time zone null default now(),
  constraint provider_services_pkey primary key (id),
  constraint provider_services_provider_id_service_id_key unique (provider_id, service_id),
  constraint provider_services_provider_id_fkey foreign KEY (provider_id) references providers (id) on delete CASCADE,
  constraint provider_services_service_id_fkey foreign KEY (service_id) references services (id)
) TABLESPACE pg_default;

create index IF not exists idx_provider_services_provider on public.provider_services 
  using btree (provider_id, is_active) TABLESPACE pg_default;
```

**Key Points:**
- Unique constraint on `(provider_id, service_id)` prevents duplicates
- `is_active` flag allows soft deletion (deactivation)
- Cascading delete when provider is deleted
- Indexed on `(provider_id, is_active)` for fast queries

### 2. `provider_addons`
**Purpose:** Tracks which add-ons a provider can offer

```sql
create table public.provider_addons (
  id uuid not null default gen_random_uuid (),
  provider_id uuid not null,
  addon_id uuid not null,
  is_active boolean null default true,
  created_at timestamp without time zone null default now(),
  constraint provider_addons_pkey primary key (id),
  constraint provider_addons_provider_addon_key unique (provider_id, addon_id),
  constraint provider_addons_addon_fkey foreign KEY (addon_id) references service_addons (id) on delete CASCADE,
  constraint provider_addons_provider_fkey foreign KEY (provider_id) references providers (id) on delete CASCADE
) TABLESPACE pg_default;
```

**Key Points:**
- Unique constraint on `(provider_id, addon_id)` prevents duplicates
- `is_active` flag allows soft deletion (deactivation)
- Cascading delete when provider or addon is deleted

---

## How the Feature Works

### Service Assignment Process

1. **Owner/Dispatcher selects services** for a provider in the Staff page
2. **System deactivates all existing services** for that provider:
   ```sql
   UPDATE provider_services 
   SET is_active = false 
   WHERE provider_id = ?
   ```

3. **System inserts/updates selected services**:
   ```sql
   INSERT INTO provider_services (provider_id, service_id, is_active)
   VALUES (?, ?, true)
   ON CONFLICT (provider_id, service_id) 
   DO UPDATE SET is_active = true
   ```

4. **System auto-assigns compatible add-ons** based on selected services

### Add-on Auto-Assignment Process

1. **Find eligible add-ons** for selected services:
   ```sql
   SELECT DISTINCT addon_id 
   FROM service_addon_eligibility 
   WHERE service_id IN (selected_service_ids)
   ```

2. **Filter to business-available add-ons**:
   ```sql
   SELECT addon_id 
   FROM business_addons 
   WHERE business_id = ? AND is_available = true
   ```

3. **Deactivate all existing add-ons**:
   ```sql
   UPDATE provider_addons 
   SET is_active = false 
   WHERE provider_id = ?
   ```

4. **Insert/update eligible add-ons**:
   ```sql
   INSERT INTO provider_addons (provider_id, addon_id, is_active)
   VALUES (?, ?, true)
   ON CONFLICT (provider_id, addon_id) 
   DO UPDATE SET is_active = true
   ```

---

## API Endpoints

### GET `/api/provider/services/:providerId`
**Purpose:** Fetch all services assigned to a provider

**Query:**
```sql
SELECT 
  ps.id,
  ps.provider_id,
  ps.service_id,
  ps.is_active,
  ps.created_at,
  s.id as "services.id",
  s.name as "services.name",
  s.description as "services.description",
  s.min_price as "services.min_price",
  s.duration_minutes as "services.duration_minutes",
  s.image_url as "services.image_url"
FROM provider_services ps
LEFT JOIN services s ON ps.service_id = s.id
WHERE ps.provider_id = ?
```

**Response:**
```json
{
  "provider_id": "uuid",
  "services": [
    {
      "id": "uuid",
      "provider_id": "uuid",
      "service_id": "uuid",
      "is_active": true,
      "created_at": "timestamp",
      "services": {
        "id": "uuid",
        "name": "Service Name",
        "description": "Description",
        "min_price": 50,
        "duration_minutes": 60,
        "image_url": "url"
      }
    }
  ]
}
```

### POST `/api/provider/services`
**Purpose:** Assign services to a provider (bulk operation)

**Request Body:**
```json
{
  "provider_id": "uuid",
  "service_ids": ["uuid1", "uuid2", "uuid3"]
}
```

**Operations:**
1. Deactivate all existing: `UPDATE provider_services SET is_active = false WHERE provider_id = ?`
2. Upsert selected services with `is_active = true`

**Response:**
```json
{
  "success": true,
  "message": "Provider services updated successfully",
  "assigned_count": 3
}
```

### GET `/api/provider/addons/:providerId`
**Purpose:** Fetch all add-ons assigned to a provider

**Query:**
```sql
SELECT 
  pa.id,
  pa.provider_id,
  pa.addon_id,
  pa.is_active,
  pa.created_at,
  sa.id as "service_addons.id",
  sa.name as "service_addons.name",
  sa.description as "service_addons.description",
  sa.image_url as "service_addons.image_url"
FROM provider_addons pa
LEFT JOIN service_addons sa ON pa.addon_id = sa.id
WHERE pa.provider_id = ?
```

### POST `/api/provider/addons`
**Purpose:** Assign add-ons to a provider (bulk operation)

**Request Body:**
```json
{
  "provider_id": "uuid",
  "addon_ids": ["uuid1", "uuid2", "uuid3"]
}
```

**Operations:**
1. Deactivate all existing: `UPDATE provider_addons SET is_active = false WHERE provider_id = ?`
2. Upsert selected add-ons with `is_active = true`

---

## Data Flow

### When Assigning Services

```
1. User selects services in UI
   ↓
2. POST /api/provider/services
   ↓
3. UPDATE provider_services SET is_active = false WHERE provider_id = ?
   ↓
4. UPSERT INTO provider_services (provider_id, service_id, is_active)
   ON CONFLICT (provider_id, service_id) DO UPDATE SET is_active = true
   ↓
5. Query service_addon_eligibility for compatible add-ons
   ↓
6. Filter add-ons by business_addons.is_available
   ↓
7. UPDATE provider_addons SET is_active = false WHERE provider_id = ?
   ↓
8. UPSERT INTO provider_addons (provider_id, addon_id, is_active)
   ON CONFLICT (provider_id, addon_id) DO UPDATE SET is_active = true
   ↓
9. Return success response
```

---

## Important Implementation Details

### Why use `is_active` instead of DELETE?

**Advantages:**
1. **Audit trail** - Can see historical service assignments
2. **Soft delete** - Can reactivate services without losing data
3. **Performance** - UPDATE is faster than DELETE + INSERT
4. **Data integrity** - Keeps foreign key relationships intact

### Upsert Strategy

**Using ON CONFLICT:**
```sql
INSERT INTO provider_services (provider_id, service_id, is_active)
VALUES (?, ?, true)
ON CONFLICT (provider_id, service_id) 
DO UPDATE SET is_active = true
```

**Benefits:**
- Handles both new and existing assignments
- Single query instead of SELECT then INSERT or UPDATE
- Atomic operation (thread-safe)
- Leverages unique constraint for conflict detection

### Index Usage

The index `idx_provider_services_provider (provider_id, is_active)` optimizes:
- Fetching active services for a provider
- Deactivating services (WHERE provider_id = ? AND is_active = true)
- Counting active services per provider

---

## UI Flow

### Staff Management Page → Edit Provider → Services Tab

1. **Load Business Services:**
   - Query `business_services` WHERE `is_active = true`
   - Display as selectable list with checkboxes

2. **Load Provider Services:**
   - Query `provider_services` WHERE `provider_id = ? AND is_active = true`
   - Pre-check services already assigned to provider

3. **User Selects Services:**
   - Check/uncheck services
   - Display count of selected services

4. **Save Changes:**
   - Call `POST /api/provider/services` with selected service IDs
   - Auto-assign compatible add-ons
   - Show success toast
   - Refresh provider data

---

## Example Usage

### Scenario: Assign 3 services to a provider

**Step 1: Load provider's current services**
```javascript
GET /api/provider/services/provider-uuid-123
```

**Response:**
```json
{
  "provider_id": "provider-uuid-123",
  "services": [
    {
      "id": "ps-uuid-1",
      "service_id": "service-uuid-A",
      "is_active": true
    }
  ]
}
```
Provider currently has 1 service assigned.

**Step 2: User selects 3 services (A, B, C)**
```javascript
POST /api/provider/services
Body: {
  "provider_id": "provider-uuid-123",
  "service_ids": ["service-uuid-A", "service-uuid-B", "service-uuid-C"]
}
```

**Database Operations:**
```sql
-- 1. Deactivate all existing
UPDATE provider_services 
SET is_active = false 
WHERE provider_id = 'provider-uuid-123';

-- 2. Upsert A (already exists, reactivate)
INSERT INTO provider_services (provider_id, service_id, is_active)
VALUES ('provider-uuid-123', 'service-uuid-A', true)
ON CONFLICT (provider_id, service_id) 
DO UPDATE SET is_active = true;

-- 3. Upsert B (new, insert)
INSERT INTO provider_services (provider_id, service_id, is_active)
VALUES ('provider-uuid-123', 'service-uuid-B', true)
ON CONFLICT (provider_id, service_id) 
DO UPDATE SET is_active = true;

-- 4. Upsert C (new, insert)
INSERT INTO provider_services (provider_id, service_id, is_active)
VALUES ('provider-uuid-123', 'service-uuid-C', true)
ON CONFLICT (provider_id, service_id) 
DO UPDATE SET is_active = true;
```

**Result:**
- Service A: Remains active
- Service B: Added (is_active = true)
- Service C: Added (is_active = true)

---

## Status

✅ **Database tables exist and are properly structured**  
✅ **API endpoints implemented in `server/index.ts`**  
✅ **UI components implemented in `StaffManager.tsx`**  
⚠️ **Services tab temporarily disabled pending server restart**  

### To Enable:

1. Kill all node processes
2. Restart dev server: `cd roam-provider-app && npm run dev`
3. Uncomment Services tab in `StaffManager.tsx` line 924-926
4. Refresh browser

The feature is fully implemented and ready to use after a clean restart.
