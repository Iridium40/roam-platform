# 🏷️ Business Service Eligibility Integration

**Created**: 2025-10-02  
**Purpose**: Display approved service categories and subcategories in provider app business settings

---

## 📋 Overview

This document describes the implementation of the business service eligibility feature, which shows businesses which service categories and subcategories they are approved to offer on the platform.

### Key Concepts

- **Service Categories**: Top-level groupings (e.g., "Automotive", "Beauty", "Home Services")
- **Service Subcategories**: Specific service types within categories (e.g., "Oil Change", "Haircut", "Plumbing")
- **Business Eligibility**: Admin-approved associations between businesses and service categories/subcategories
- **Approval Flow**: Platform admins approve businesses for specific service categories and subcategories via `business_service_categories` and `business_service_subcategories` tables

---

## 🗄️ Database Schema

### Tables Involved

#### 1. `business_service_categories`
Tracks which service categories a business is approved to offer.

```sql
create table public.business_service_categories (
  id uuid not null default gen_random_uuid(),
  business_id uuid not null,
  category_id uuid null,
  is_active boolean null default true,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint business_service_categories_pkey primary key (id),
  constraint business_service_categories_business_id_fkey 
    foreign KEY (business_id) references business_profiles (id) on delete CASCADE,
  constraint business_service_categories_category_id_fkey 
    foreign KEY (category_id) references service_categories (id)
);
```

**Key Fields**:
- `business_id`: Foreign key to `business_profiles`
- `category_id`: Foreign key to `service_categories`
- `is_active`: Boolean flag to enable/disable approval
- `created_at`: Approval timestamp
- `updated_at`: Last modification timestamp

#### 2. `business_service_subcategories`
Tracks which service subcategories a business is approved to offer.

```sql
create table public.business_service_subcategories (
  id uuid not null default gen_random_uuid(),
  business_id uuid not null,
  category_id uuid null,
  subcategory_id uuid null,
  is_active boolean null default true,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint business_service_subcategories_pkey primary key (id),
  constraint business_service_subcategories_business_id_fkey 
    foreign KEY (business_id) references business_profiles (id) on delete CASCADE,
  constraint business_service_subcategories_category_id_fkey 
    foreign KEY (category_id) references service_categories (id),
  constraint business_service_subcategories_subcategory_id_fkey 
    foreign KEY (subcategory_id) references service_subcategories (id)
);
```

**Key Fields**:
- `business_id`: Foreign key to `business_profiles`
- `category_id`: Foreign key to parent `service_categories`
- `subcategory_id`: Foreign key to `service_subcategories`
- `is_active`: Boolean flag to enable/disable approval
- `created_at`: Approval timestamp
- `updated_at`: Last modification timestamp

#### 3. `service_categories`
Master table of all available service categories on the platform.

```sql
create table public.service_categories (
  id uuid not null default gen_random_uuid(),
  service_category_type public.service_category_types not null,
  description text null,
  is_active boolean null default true,
  created_at timestamp without time zone null default now(),
  image_url text null,
  sort_order integer null,
  constraint service_categories_pkey primary key (id)
);
```

**Key Fields**:
- `service_category_type`: Enum type name (e.g., "automotive", "beauty")
- `description`: Category description
- `image_url`: Category icon/image
- `sort_order`: Display order
- `is_active`: Whether category is available

#### 4. `service_subcategories`
Master table of all available service subcategories on the platform.

```sql
create table public.service_subcategories (
  id uuid not null default gen_random_uuid(),
  category_id uuid not null,
  service_subcategory_type public.service_subcategory_types not null,
  description text null,
  is_active boolean null default true,
  created_at timestamp without time zone null default now(),
  image_url text null,
  constraint service_subcategories_pkey primary key (id),
  constraint service_subcategories_category_id_fkey 
    foreign KEY (category_id) references service_categories (id) on delete CASCADE
);
```

**Key Fields**:
- `category_id`: Foreign key to parent `service_categories`
- `service_subcategory_type`: Enum type name (e.g., "oil_change", "haircut")
- `description`: Subcategory description
- `image_url`: Subcategory icon/image
- `is_active`: Whether subcategory is available

---

## 🔌 API Implementation

### Endpoint: `GET /api/business/service-eligibility`

**File**: `roam-provider-app/api/business/service-eligibility.ts`

#### Request

```typescript
GET /api/business/service-eligibility?business_id={uuid}
```

**Query Parameters**:
- `business_id` (required): UUID of the business

#### Response

```typescript
{
  business_id: string;
  approved_categories: Array<{
    category_id: string;
    category_name: string;
    description: string | null;
    image_url: string | null;
    sort_order: number | null;
    is_active: boolean;
    approved_at: string;
    subcategories: Array<{
      subcategory_id: string;
      subcategory_name: string;
      description: string | null;
      image_url: string | null;
      is_active: boolean;
      approved_at: string;
    }>;
  }>;
  stats: {
    total_categories: number;
    total_subcategories: number;
  };
  last_updated: string | null;
  additional_info: string | null;
}
```

#### Example Response

```json
{
  "business_id": "a3b483e5-b375-4a61-a0d7-08eaf8a5dffe",
  "approved_categories": [
    {
      "category_id": "c1234567-89ab-cdef-0123-456789abcdef",
      "category_name": "automotive",
      "description": "Automotive services including repairs, maintenance, and detailing",
      "image_url": "https://example.com/automotive.png",
      "sort_order": 1,
      "is_active": true,
      "approved_at": "2025-09-15T10:30:00Z",
      "subcategories": [
        {
          "subcategory_id": "s1234567-89ab-cdef-0123-456789abcdef",
          "subcategory_name": "oil_change",
          "description": "Oil change and filter replacement services",
          "image_url": "https://example.com/oil-change.png",
          "is_active": true,
          "approved_at": "2025-09-15T10:35:00Z"
        },
        {
          "subcategory_id": "s2345678-89ab-cdef-0123-456789abcdef",
          "subcategory_name": "tire_service",
          "description": "Tire rotation, balancing, and replacement",
          "image_url": "https://example.com/tire-service.png",
          "is_active": true,
          "approved_at": "2025-09-15T10:40:00Z"
        }
      ]
    },
    {
      "category_id": "c2345678-89ab-cdef-0123-456789abcdef",
      "category_name": "beauty",
      "description": "Beauty and personal care services",
      "image_url": "https://example.com/beauty.png",
      "sort_order": 2,
      "is_active": true,
      "approved_at": "2025-09-16T14:20:00Z",
      "subcategories": [
        {
          "subcategory_id": "s3456789-89ab-cdef-0123-456789abcdef",
          "subcategory_name": "haircut",
          "description": "Professional haircut and styling services",
          "image_url": "https://example.com/haircut.png",
          "is_active": true,
          "approved_at": "2025-09-16T14:25:00Z"
        }
      ]
    }
  ],
  "stats": {
    "total_categories": 2,
    "total_subcategories": 3
  },
  "last_updated": "2025-09-16T14:25:00Z",
  "additional_info": null
}
```

#### Empty State Response

```json
{
  "business_id": "a3b483e5-b375-4a61-a0d7-08eaf8a5dffe",
  "approved_categories": [],
  "stats": {
    "total_categories": 0,
    "total_subcategories": 0
  },
  "last_updated": null,
  "additional_info": "No service categories have been approved for this business yet. Contact platform administration for approval."
}
```

#### Error Responses

**400 Bad Request** - Missing business_id
```json
{
  "error": "Business ID is required"
}
```

**500 Internal Server Error** - Database error
```json
{
  "error": "Failed to fetch service categories"
}
```

---

## 🎨 Frontend Implementation

### Hook: `useBusinessSettings`

**File**: `roam-provider-app/client/pages/dashboard/components/business-settings/hooks/useBusinessSettings.ts`

The hook manages service eligibility state and provides a method to load the data:

```typescript
// Service eligibility state
const [serviceEligibility, setServiceEligibility] = useState<ServiceEligibility | null>(null);
const [eligibilityLoading, setEligibilityLoading] = useState(false);
const [eligibilityError, setEligibilityError] = useState<string | null>(null);

// Load service eligibility
const loadServiceEligibility = async () => {
  if (!business?.id) return;

  setEligibilityLoading(true);
  setEligibilityError(null);

  try {
    const response = await fetch(`/api/business/service-eligibility?business_id=${business.id}`);
    
    if (!response.ok) {
      throw new Error(`Failed to load service eligibility: ${response.statusText}`);
    }

    const data = await response.json();
    setServiceEligibility(data);
  } catch (error: any) {
    console.error("Error loading service eligibility:", error);
    setEligibilityError(error.message || "Failed to load service eligibility");
  } finally {
    setEligibilityLoading(false);
  }
};

// Load on mount
useEffect(() => {
  loadServiceEligibility();
}, [business?.id]);
```

### Component: `ServiceCategoriesSection`

**File**: `roam-provider-app/client/pages/dashboard/components/business-settings/ServiceCategoriesSection.tsx`

The component displays the approved service categories and subcategories with:

1. **Loading State**: Spinner while fetching data
2. **Error State**: Error message with retry button
3. **Empty State**: Informative message when no categories are approved
4. **Success State**: Organized display of categories and subcategories

**Key Features**:
- Summary statistics (total categories, subcategories, business ID)
- Last updated timestamp
- Categories organized with subcategories grouped underneath
- Visual badges for approved status
- Responsive grid layout for subcategories
- Icon-based visual hierarchy

### Container: `BusinessSettingsTabRefactored`

**File**: `roam-provider-app/client/pages/dashboard/components/BusinessSettingsTabRefactored.tsx`

The container component:
1. Uses `useBusinessSettings` hook to manage state
2. Passes service eligibility data to `ServiceCategoriesSection`
3. Handles tab navigation for business settings
4. Coordinates with other business settings sections

```typescript
<TabsContent value="services" className="space-y-6">
  <ServiceCategoriesSection
    serviceEligibility={serviceEligibility}
    eligibilityLoading={eligibilityLoading}
    eligibilityError={eligibilityError}
    onLoadServiceEligibility={loadServiceEligibility}
  />
</TabsContent>
```

---

## 🔄 Data Flow

```
1. Component Mount
   └─> useBusinessSettings hook initialized
       └─> useEffect triggers loadServiceEligibility()
           └─> API Request: GET /api/business/service-eligibility?business_id={uuid}
               └─> Server Handler (service-eligibility.ts)
                   ├─> Query: business_service_categories (with service_categories join)
                   ├─> Query: business_service_subcategories (with service_subcategories join)
                   └─> Organize data: group subcategories under categories
                       └─> Response: {business_id, approved_categories, stats, last_updated}
                           └─> Hook updates state: setServiceEligibility(data)
                               └─> Component receives data via props
                                   └─> ServiceCategoriesSection renders UI

2. User Views Services Tab
   └─> Tab switch to "services"
       └─> ServiceCategoriesSection displays:
           ├─> Summary statistics cards
           ├─> Category cards with subcategories
           └─> Last updated info

3. Error Handling
   ├─> Network error → Display error state with retry button
   ├─> Empty data → Display informative empty state
   └─> Database error → Display error message from API
```

---

## 🧪 Testing Checklist

### API Testing

- [ ] **Valid business_id**: Returns approved categories and subcategories
- [ ] **Missing business_id**: Returns 400 error
- [ ] **Non-existent business_id**: Returns empty arrays with stats showing 0
- [ ] **Business with no approvals**: Returns empty state message
- [ ] **Business with categories but no subcategories**: Returns categories with empty subcategories arrays
- [ ] **Business with subcategories**: Returns properly nested data structure
- [ ] **Inactive categories/subcategories**: Filtered out (only active records returned)
- [ ] **CORS headers**: Properly set for cross-origin requests
- [ ] **Response format**: Matches TypeScript interface expectations

### Frontend Testing

- [ ] **Loading state**: Spinner displays while fetching
- [ ] **Error state**: Error message and retry button appear on failure
- [ ] **Empty state**: Informative message when no approvals exist
- [ ] **Success state**: Categories and subcategories display correctly
- [ ] **Statistics**: Counts match actual data
- [ ] **Last updated**: Timestamp displays correctly
- [ ] **Responsive layout**: Works on mobile, tablet, desktop
- [ ] **Tab navigation**: Switching between tabs preserves data
- [ ] **Data refresh**: Retry button reloads data successfully
- [ ] **Visual hierarchy**: Categories and subcategories clearly distinguished

### Database Testing

- [ ] **Foreign key constraints**: Proper relationships maintained
- [ ] **Cascade deletes**: Business deletion removes approval records
- [ ] **Active flags**: is_active filters work correctly
- [ ] **Timestamps**: created_at and updated_at populate correctly
- [ ] **Category ordering**: sort_order respected in response
- [ ] **Multiple businesses**: No data leakage between businesses

---

## 🚀 Deployment Notes

### Environment Variables Required

```bash
# Supabase connection (already configured)
VITE_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Vercel Configuration

The API endpoint is automatically deployed as a Vercel Serverless Function:
- **Runtime**: Node.js
- **Path**: `/api/business/service-eligibility`
- **Memory**: 1024 MB (default)
- **Timeout**: 10 seconds (default)

### Database Setup

Ensure the following tables exist and have proper permissions:
1. `business_service_categories`
2. `business_service_subcategories`
3. `service_categories`
4. `service_subcategories`

### Admin Workflow

For businesses to see approved categories, admins must:
1. Create records in `business_service_categories` for each approved category
2. Create records in `business_service_subcategories` for each approved subcategory
3. Set `is_active = true` on approval records
4. Set `is_active = false` to revoke approval (soft delete)

---

## 📊 Query Performance

### Optimizations Implemented

1. **Single query per table**: Uses Supabase's join syntax to fetch related data in one query
2. **Filtered results**: Only active records returned (`is_active = true`)
3. **Indexed fields**: Foreign keys and is_active should be indexed
4. **Sorted results**: Categories sorted by sort_order, minimizing client-side processing

### Expected Performance

- **Small datasets** (< 10 categories, < 50 subcategories): < 100ms
- **Medium datasets** (10-50 categories, 50-200 subcategories): < 300ms
- **Large datasets** (> 50 categories, > 200 subcategories): < 500ms

### Caching Considerations

Future optimization: Implement caching layer since service eligibility changes infrequently:
- **Cache key**: `service-eligibility:${business_id}`
- **TTL**: 1 hour (3600 seconds)
- **Invalidation**: On admin approval/revocation

---

## 🔐 Security Considerations

### Current Implementation

✅ **Business-scoped queries**: All queries filter by `business_id` parameter  
✅ **Read-only operation**: GET endpoint only, no mutations  
✅ **Service role key**: Uses Supabase service role for database access  
✅ **CORS configured**: Allows cross-origin requests with proper headers

### Future Enhancements

⚠️ **Authentication**: Add user authentication check to verify requester owns the business  
⚠️ **Rate limiting**: Implement rate limits to prevent abuse  
⚠️ **Input validation**: Add additional business_id format validation  
⚠️ **Audit logging**: Log access to service eligibility data

---

## 📚 Related Documentation

- [DATABASE_SCHEMA_REFERENCE.md](./DATABASE_SCHEMA_REFERENCE.md) - Complete database schema
- [API_ARCHITECTURE.md](./API_ARCHITECTURE.md) - API patterns and standards
- [BUSINESS_LOCATIONS_INTEGRATION.md](./BUSINESS_LOCATIONS_INTEGRATION.md) - Similar feature implementation

---

## 🐛 Known Issues & Limitations

### Current Limitations

1. **No pagination**: All approved categories/subcategories returned in one request
   - Impact: Potential performance issues for businesses with 100+ approvals
   - Mitigation: Most businesses have < 20 categories, so acceptable for now

2. **No caching**: Fresh database query on every request
   - Impact: Higher database load, slower response times
   - Mitigation: Implement Redis caching in future iteration

3. **No real-time updates**: Component doesn't auto-refresh when approvals change
   - Impact: Users must refresh page to see new approvals
   - Mitigation: Add WebSocket subscription or polling in future

4. **No approval history**: No audit trail of approval changes
   - Impact: Can't see when categories were added/removed
   - Mitigation: Add `business_service_approval_history` table

### Workarounds

- **Large datasets**: Add pagination support if businesses exceed 50+ categories
- **Stale data**: Add manual refresh button (already implemented)
- **Approval tracking**: Use `created_at` and `updated_at` timestamps for basic tracking

---

## 🎯 Future Enhancements

### Phase 2 Features

1. **Search & Filter**: Allow businesses to search/filter approved categories
2. **Request Approval**: In-app flow to request new category approvals
3. **Approval Notifications**: Notify businesses when new categories are approved
4. **Category Details**: Link to services available within each category
5. **Analytics**: Track which categories are most popular/profitable

### Phase 3 Features

1. **Dynamic Pricing**: Category-specific pricing recommendations
2. **Service Templates**: Pre-built service configurations for approved categories
3. **Compliance Tracking**: Category-specific certification requirements
4. **Performance Metrics**: Category-level booking and revenue analytics

---

## ✅ Implementation Checklist

- [x] Create API endpoint: `/api/business/service-eligibility`
- [x] Implement database queries with joins
- [x] Add error handling and validation
- [x] Create TypeScript interfaces
- [x] Update `useBusinessSettings` hook
- [x] Verify `ServiceCategoriesSection` component integration
- [x] Add loading, error, and empty states
- [x] Test API with curl/Postman
- [x] Test frontend component rendering
- [ ] Test with real business data in production
- [x] Add comprehensive documentation
- [ ] Update admin documentation for approval workflow
- [ ] Add monitoring and alerting

---

**Last Updated**: 2025-10-02  
**Status**: ✅ Implementation Complete, Pending Production Testing
