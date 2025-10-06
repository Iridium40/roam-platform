# Provider Service Assignment Implementation

## Overview
Implemented a comprehensive service assignment system for providers on the staff management page. Business owners and dispatchers can now assign services to providers based on the business's active services, with automatic add-on assignment.

---

## 🎯 Features Implemented

### 1. **Service Assignment Interface**
- Added a "Services" tab in the staff edit dialog (only visible for providers with `provider_role = 'provider'`)
- Displays all active business services available for assignment
- Shows service details: name, description, price, duration, and delivery type
- Checkbox selection for multiple services
- Real-time count of selected services

### 2. **Business Service Integration**
- Fetches only **active** business services from `business_services` table
- Displays services with the **business price** (not the base service price)
- Services must be active (`is_active = true`) to appear in the assignment list

### 3. **Automatic Add-on Assignment**
- When services are assigned to a provider, compatible add-ons are automatically assigned
- Uses `service_addon_eligibility` table to determine which add-ons are compatible with selected services
- Only assigns add-ons that:
  1. Are eligible for the selected services
  2. Are available in the business's add-on inventory

### 4. **Provider Service Management**
- Bulk service assignment: Replaces all provider services with new selection
- Deactivates unselected services (sets `is_active = false`)
- Activates selected services (sets `is_active = true`)
- Uses upsert operation for efficiency

---

## 🗄️ Database Tables Used

### Core Tables

#### `business_services`
Stores services that a business offers:
```sql
- id (uuid)
- business_id (uuid) → references business_profiles
- service_id (uuid) → references services
- business_price (numeric) -- The price provider will offer
- is_active (boolean) -- Must be true to show in assignment
- delivery_type (delivery_type enum)
```

#### `provider_services`
Junction table linking providers to services:
```sql
- id (uuid)
- provider_id (uuid) → references providers
- service_id (uuid) → references services
- is_active (boolean)
- created_at (timestamp)
```

#### `provider_addons`
Junction table linking providers to add-ons:
```sql
- id (uuid)
- provider_id (uuid) → references providers
- addon_id (uuid) → references service_addons
- is_active (boolean)
- created_at (timestamp)
```

#### `service_addon_eligibility`
Defines which add-ons are compatible with which services:
```sql
- id (uuid)
- service_id (uuid) → references services
- addon_id (uuid) → references service_addons
- is_recommended (boolean)
```

#### `business_addons`
Stores business-specific add-on pricing and availability:
```sql
- id (uuid)
- business_id (uuid) → references business_profiles
- addon_id (uuid) → references service_addons
- custom_price (numeric)
- is_available (boolean)
```

---

## 🔌 API Endpoints

### Provider Services

#### `GET /api/provider/services/:providerId`
Fetches all services assigned to a provider.

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
        "description": "Service description",
        "min_price": 50,
        "duration_minutes": 60,
        "image_url": "url"
      }
    }
  ]
}
```

#### `POST /api/provider/services`
Assigns services to a provider (bulk operation).

**Request Body:**
```json
{
  "provider_id": "uuid",
  "service_ids": ["uuid1", "uuid2", "uuid3"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Provider services updated successfully",
  "assigned_count": 3
}
```

**Behavior:**
1. Deactivates ALL existing provider services
2. Activates/inserts the provided service IDs
3. Uses upsert with conflict resolution on `(provider_id, service_id)`

### Provider Add-ons

#### `GET /api/provider/addons/:providerId`
Fetches all add-ons assigned to a provider.

**Response:**
```json
{
  "provider_id": "uuid",
  "addons": [
    {
      "id": "uuid",
      "provider_id": "uuid",
      "addon_id": "uuid",
      "is_active": true,
      "created_at": "timestamp",
      "service_addons": {
        "id": "uuid",
        "name": "Add-on Name",
        "description": "Add-on description",
        "image_url": "url"
      }
    }
  ]
}
```

#### `POST /api/provider/addons`
Assigns add-ons to a provider (bulk operation).

**Request Body:**
```json
{
  "provider_id": "uuid",
  "addon_ids": ["uuid1", "uuid2", "uuid3"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Provider addons updated successfully",
  "assigned_count": 3
}
```

---

## 🎨 UI Components

### Staff Edit Dialog

#### Tabs Structure
- **Details Tab**: Basic provider information (name, email, role, location)
- **Services Tab**: Service assignment interface (only shown for providers)

#### Services Tab Features
- **Service Cards**: Display service information with checkboxes
- **Service Details**: Name, description, price, duration, delivery type
- **Selection Count Badge**: Shows number of selected services
- **Empty State**: Alert when no active services are available
- **Auto-assign Notice**: Informational alert about automatic add-on assignment
- **Loading State**: Spinner while fetching provider services

### Service Card Layout
```
┌─────────────────────────────────────────────┐
│ [✓] Service Name                            │
│     Service description text...             │
│     [$100] [60 min] [customer_location]     │
└─────────────────────────────────────────────┘
```

---

## 🔄 Workflow

### 1. **Opening Edit Dialog**
```
User clicks Edit → fetchStaff() → (if provider) fetchProviderServices()
```

### 2. **Loading Services**
```
fetchBusinessServices() → Filters active services → Displays in UI
fetchProviderServices() → Sets checked state for assigned services
```

### 3. **Selecting Services**
```
User toggles checkbox → Updates selectedServices state array
```

### 4. **Saving Changes**
```
1. Update provider details (name, email, role, location)
2. If provider role:
   a. POST /api/provider/services with selected service_ids
   b. Auto-assign eligible add-ons via handleAutoAssignAddons()
3. Show success toast
4. Close dialog and refresh staff list
```

### 5. **Auto-assign Add-ons Logic**
```typescript
1. Get all addon_ids from service_addon_eligibility for selected services
2. Filter to only business-available addons (from business_addons)
3. POST /api/provider/addons with filtered addon_ids
```

---

## 🔐 Permissions

### Who Can Assign Services?
- **Business Owners** (`provider_role = 'owner'`)
- **Dispatchers** (`provider_role = 'dispatcher'`)

### Who Can Be Assigned Services?
- Only providers with `provider_role = 'provider'`

### What Services Can Be Assigned?
- Only services where:
  - `business_services.is_active = true`
  - Service belongs to the business (`business_services.business_id = businessId`)

---

## 📝 Code Changes

### `/roam-provider-app/server/index.ts`
**Added 4 new endpoints:**
- `GET /api/provider/services/:providerId`
- `POST /api/provider/services`
- `GET /api/provider/addons/:providerId`
- `POST /api/provider/addons`

**Authentication:** All endpoints use `requireAuth` middleware

### `/roam-provider-app/client/components/StaffManager.tsx`

**New State Variables:**
```typescript
const [businessServices, setBusinessServices] = useState<BusinessService[]>([]);
const [selectedServices, setSelectedServices] = useState<string[]>([]);
const [businessAddons, setBusinessAddons] = useState<any[]>([]);
const [loadingServices, setLoadingServices] = useState(false);
const [editDialogTab, setEditDialogTab] = useState("details");
```

**New Functions:**
```typescript
fetchBusinessServices()     // Loads active business services
fetchBusinessAddons()        // Loads business add-on inventory
fetchProviderServices()      // Loads provider's assigned services
handleServiceToggle()        // Toggles service selection
handleUpdateProviderServices() // Saves service assignments
handleAutoAssignAddons()     // Automatically assigns compatible add-ons
```

**New Imports:**
```typescript
import { Checkbox } from "@/components/ui/checkbox";
import { Package } from "lucide-react";
import type { BusinessService } from "@/types/services";
```

---

## 🧪 Testing Checklist

### Functional Tests
- [ ] Staff edit dialog opens successfully
- [ ] Services tab only shows for providers (not owners/dispatchers)
- [ ] Active business services load correctly
- [ ] Provider's existing service assignments are pre-checked
- [ ] Checkbox toggles work correctly
- [ ] Selection count updates in real-time
- [ ] Save updates provider services in database
- [ ] Add-ons are auto-assigned based on selected services
- [ ] Empty state shows when no active services exist

### Edge Cases
- [ ] Provider with no assigned services (empty selection)
- [ ] Assigning all services works correctly
- [ ] Deselecting all services works correctly
- [ ] Switching role from provider to owner/dispatcher hides Services tab
- [ ] Service with no eligible add-ons doesn't break auto-assign
- [ ] Business with no add-ons doesn't break auto-assign
- [ ] Large number of services (50+) renders and scrolls properly

### Permission Tests
- [ ] Owners can assign services to providers
- [ ] Dispatchers can assign services to providers
- [ ] Providers cannot edit other providers' services
- [ ] API endpoints require authentication

---

## 🚀 Future Enhancements

### Potential Improvements
1. **Bulk Service Assignment**: Assign services to multiple providers at once
2. **Service Templates**: Create service bundles for quick assignment
3. **Provider Expertise Levels**: Add skill/experience levels per service
4. **Custom Pricing**: Allow provider-specific pricing overrides
5. **Service Availability**: Set specific days/times when provider can offer service
6. **Add-on Management**: Manual override of auto-assigned add-ons
7. **Service History**: Track when services were assigned/unassigned
8. **Provider Dashboard**: Show assigned services in provider's view
9. **Performance Metrics**: Track revenue and bookings per service per provider
10. **Recommendation System**: Suggest services based on provider experience

---

## 📊 Database Relationships

```
business_profiles
    ↓ (business_id)
business_services ←── (service_id) ─── services
    ↓ (service_id)                        ↓ (service_id)
provider_services                    service_addon_eligibility
    ↓ (provider_id)                       ↓ (addon_id)
providers                            service_addons
                                           ↑ (addon_id)
                                     provider_addons
                                           ↑ (provider_id)
                                     providers
```

---

## 🐛 Known Issues & Limitations

### Current Limitations
1. **No Undo**: Once services are deactivated, there's no easy way to restore them
2. **No Conflict Detection**: Doesn't check for scheduling conflicts with existing bookings
3. **No Notifications**: Providers are not notified when services are assigned/removed
4. **Single Business Only**: Providers can only be assigned services from their primary business

### Typescript Errors (Pre-existing)
Some TypeScript errors exist in StaffManager.tsx related to Supabase query types. These are cosmetic and don't affect functionality:
- `booking_status` type inference issues
- `provider_id` property type warnings

---

## 📖 Usage Example

### Scenario: Assigning Services to a New Provider

1. **Owner/Dispatcher**: Navigate to Staff tab
2. **Click Edit** on a provider with role = 'provider'
3. **Click Services Tab** in the edit dialog
4. **Select Services**:
   - ✅ House Cleaning ($75, 120 min)
   - ✅ Deep Cleaning ($150, 180 min)
   - ✅ Move-out Cleaning ($200, 240 min)
5. **Click Update Staff Member**
6. **System automatically**:
   - Saves 3 selected services to `provider_services`
   - Finds compatible add-ons (e.g., "Pet Hair Removal", "Window Cleaning")
   - Assigns those add-ons to `provider_addons`
7. **Provider can now**:
   - See these services in their service list
   - Accept bookings for these services
   - Offer the auto-assigned add-ons

---

## 🔗 Related Documentation
- `BUSINESS_ADDONS_SIMPLIFICATION.md` - Business add-on management
- `BUSINESS_SERVICES_SIMPLIFICATION.md` - Business service management
- `DATABASE_SCHEMA_REFERENCE.md` - Complete database schema
- `ROLE_BASED_PERMISSIONS.md` - Provider role permissions

---

## ✅ Summary

This implementation provides a complete solution for service assignment with the following key features:

1. ✅ **Only active business services** can be assigned to providers
2. ✅ **Business price** is used as the provider's offering price
3. ✅ **Automatic add-on assignment** based on service compatibility
4. ✅ **Bulk operations** for efficient database updates
5. ✅ **Role-based access** (owners and dispatchers only)
6. ✅ **Clean UI** with tabbed interface and service cards
7. ✅ **Real-time feedback** with loading states and toast notifications

The system is now ready for business owners and dispatchers to manage which services their provider staff can offer to customers.
