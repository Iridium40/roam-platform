# 🔧 BOOKINGS DATABASE SCHEMA FIX

## Issue Summary
The provider app was experiencing database errors when loading bookings:
```
Error: column customer_locations_1.address_line1 does not exist
```

## Root Cause
**Schema Mismatch**: The Supabase query in `useBookings.ts` was using incorrect column names that didn't match the actual database schema.

## Database Schema Discovery
The actual `customer_locations` table schema is:
```sql
create table public.customer_locations (
  id uuid not null default gen_random_uuid (),
  customer_id uuid not null,
  location_name character varying(255) not null,
  street_address text not null,              -- NOT address_line1
  unit_number character varying(50) null,    -- NOT address_line2
  city character varying(100) not null,
  state character varying(50) not null,
  zip_code character varying(10) not null,   -- NOT postal_code
  latitude numeric(10, 8) null,
  longitude numeric(11, 8) null,
  is_primary boolean null default false,
  is_active boolean null default true,
  access_instructions text null,
  created_at timestamp without time zone null default now(),
  location_type public.customer_location_type not null,
  constraint customer_locations_pkey primary key (id),
  constraint customer_locations_customer_id_fkey foreign KEY (customer_id) references auth.users (id) on delete set null
);
```

## Fix Applied

### ✅ Updated useBookings.ts Query
**File**: `/client/pages/dashboard/components/bookings/hooks/useBookings.ts`

**Before** (Incorrect):
```typescript
customer_locations (
  id,
  address_line1,
  address_line2,
  city,
  state,
  postal_code,
  country
),
```

**After** (Correct):
```typescript
customer_locations (
  id,
  location_name,
  street_address,
  unit_number,
  city,
  state,
  zip_code,
  latitude,
  longitude,
  is_primary,
  is_active,
  access_instructions,
  location_type
),
```

### ✅ Verified BookingsTab.tsx Display Logic
**File**: `/client/pages/dashboard/components/BookingsTab.tsx`

The display logic was already correct and uses the proper field names:
```typescript
// Customer locations (uses street_address + unit_number)
booking.customer_locations.street_address
booking.customer_locations.unit_number

// Business locations (uses address_line1 + address_line2)  
booking.business_locations.address_line1
booking.business_locations.address_line2
```

## Table Schema Differences

| Table | Address Field 1 | Address Field 2 | Postal Code |
|-------|----------------|----------------|-------------|
| `customer_locations` | `street_address` | `unit_number` | `zip_code` |
| `business_locations` | `address_line1` | `address_line2` | `postal_code` |

## Expected Results

### Before Fix
```javascript
GET /api/bookings 400 (Bad Request)
Error: column customer_locations_1.address_line1 does not exist
```

### After Fix
```javascript
GET /api/bookings 200 (OK)
// Successful bookings data with proper location information
{
  "bookings": [
    {
      "customer_locations": {
        "street_address": "123 Main St",
        "unit_number": "Apt 2B",
        "city": "Miami",
        "state": "FL",
        "zip_code": "33101"
      }
    }
  ]
}
```

## Deployment Status
- ✅ TypeScript compilation: PASSED
- ✅ Client build: PASSED
- ✅ Server build: PASSED
- ✅ Schema alignment: CORRECTED

## Future Prevention
When adding new location-related queries, always reference the correct schema:
- Use `street_address` + `unit_number` for customer locations
- Use `address_line1` + `address_line2` for business locations
- Use `zip_code` for customer locations, `postal_code` for business locations