# Role-Based Permissions in ROAM Provider App

## Overview
The ROAM Provider App implements a three-tier role-based access control system for providers associated with a business.

## Provider Roles

### 1. **Owner** (`provider_role = 'owner'`)
**Full Business Control**

Owners have complete access to all business operations:

✅ **Business Settings**
- View/edit business profile
- Manage business hours
- Upload/manage business documents
- Configure locations
- View/manage service eligibility
- Add/remove service categories and subcategories
- Configure business services and pricing

✅ **Staff Management**
- View all staff members
- Add new staff (owners, dispatchers, providers)
- Edit staff roles and permissions
- Deactivate/remove staff
- Manage staff availability

✅ **Services Management**
- View eligible services
- Add/configure business services
- Set service pricing
- Enable/disable services
- Manage service delivery types

✅ **Bookings**
- View all business bookings
- Assign bookings to providers
- Cancel/modify bookings
- View booking history

✅ **Financials**
- View revenue reports
- Access transaction history
- Manage payment settings
- View analytics

✅ **Messaging**
- Message with all customers
- View all business conversations

---

### 2. **Dispatcher** (`provider_role = 'dispatcher'`)
**Operational Management**

Dispatchers can manage day-to-day operations but cannot modify business settings:

✅ **Allowed:**
- View business profile (read-only)
- View business hours
- View service eligibility
- View available services
- **Manage bookings** (view, assign, cancel)
- **Assign providers** to bookings
- View all staff members
- View staff availability
- Message with customers
- View booking analytics

❌ **Restricted:**
- Edit business profile
- Modify business hours
- Add/remove service categories
- Configure service pricing
- Add/remove staff members
- Edit staff roles
- Access financial settings
- Upload business documents

---

### 3. **Provider** (`provider_role = 'provider'`)
**Service Delivery**

Providers focus on delivering services and managing their own work:

✅ **Allowed:**
- View their own profile
- Edit their own profile
- View their assigned bookings
- Update booking status (start, complete, cancel)
- Message with their assigned customers
- View their own schedule
- Manage their own availability

❌ **Restricted:**
- View other providers' bookings
- Assign bookings to others
- Access business settings
- View business financials
- Manage staff
- Configure services
- View all business bookings
- Access business-wide analytics

---

## Role Hierarchy

The system implements a hierarchical permission model:

```
Owner
  ↓ (inherits all permissions)
Dispatcher
  ↓ (inherits all permissions)
Provider
```

**In Code:**
```typescript
const isOwner = provider?.provider_role === "owner";
const isDispatcher = provider?.provider_role === "dispatcher" || isOwner;
const isProvider = provider?.provider_role === "provider" || isDispatcher;
```

This means:
- **Owners** can do everything dispatchers and providers can do
- **Dispatchers** can do everything providers can do
- **Providers** have the most limited access

---

## API Authorization

### Authentication Flow

1. **User logs in** → Gets JWT token
2. **Token sent** in `Authorization: Bearer <token>` header
3. **API verifies token** → Gets user_id
4. **API queries providers table:**
   ```sql
   SELECT id, user_id, business_id, provider_role
   FROM providers
   WHERE user_id = '<user_id>' AND is_active = true
   ```
5. **API checks:**
   - User has active provider record
   - Provider belongs to requested business_id
   - Provider role has permission for the operation

### Permission Checks in APIs

All business-related API endpoints should verify:

```typescript
// 1. Authentication
const authHeader = req.headers.authorization;
if (!authHeader) {
  return res.status(401).json({ error: 'Authentication required' });
}

// 2. Get user from token
const { data: { user }, error: userError } = await supabase.auth.getUser(token);
if (userError || !user) {
  return res.status(401).json({ error: 'Invalid token' });
}

// 3. Get provider record
const { data: providerData } = await supabase
  .from('providers')
  .select('id, user_id, business_id, provider_role')
  .eq('user_id', user.id)
  .eq('is_active', true)
  .maybeSingle();

if (!providerData) {
  return res.status(403).json({ error: 'Provider profile not found' });
}

// 4. Verify business access
if (providerData.business_id !== requested_business_id) {
  return res.status(403).json({ error: 'Access denied' });
}

// 5. Check role permissions (for write operations)
if (operation === 'write' && providerData.provider_role !== 'owner') {
  return res.status(403).json({ error: 'Only owners can modify business settings' });
}
```

---

## Database Schema

### providers table
```sql
CREATE TABLE providers (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  business_id UUID REFERENCES business_profiles(id),
  provider_role TEXT CHECK (provider_role IN ('owner', 'dispatcher', 'provider')),
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  is_active BOOLEAN DEFAULT true,
  -- ... other fields
);
```

### Key Relationships
```
auth.users (Supabase Auth)
    ↓ user_id
providers
    ↓ business_id
business_profiles
    ↓ id
business_service_categories
business_service_subcategories
business_locations
business_services
```

---

## Frontend Permission Checks

### Using the Auth Context

```typescript
import { useProviderAuth } from "@/contexts/auth/ProviderAuthContext";

function MyComponent() {
  const { provider, isOwner, isDispatcher, isProvider } = useProviderAuth();

  return (
    <>
      {/* Only owners can see this */}
      {isOwner && (
        <Button onClick={handleEditBusiness}>Edit Business</Button>
      )}

      {/* Dispatchers and owners can see this */}
      {isDispatcher && (
        <Button onClick={handleAssignBooking}>Assign Booking</Button>
      )}

      {/* All roles can see this */}
      {isProvider && (
        <Button onClick={handleViewProfile}>View Profile</Button>
      )}
    </>
  );
}
```

### Tab/Section Restrictions

In the dashboard navigation:

```typescript
// Only show business settings to owners
{isOwner && (
  <NavItem to="/owner/business-settings">Business Settings</NavItem>
)}

// Show staff management to owners and dispatchers
{isDispatcher && (
  <NavItem to="/staff">Staff Management</NavItem>
)}

// Everyone sees their own bookings
<NavItem to="/bookings">My Bookings</NavItem>
```

---

## Security Best Practices

### 1. **Always Verify on Backend**
Never trust frontend permission checks. Always verify on the API:
```typescript
// ❌ BAD - Frontend only check
if (isOwner) {
  await updateBusinessSettings();
}

// ✅ GOOD - Backend verification
// API will check role and return 403 if not owner
```

### 2. **Use Service Role Key for Admin Operations**
```typescript
const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Admin access
);
```

### 3. **Validate Business Ownership**
```typescript
// Always check provider.business_id matches requested business_id
if (providerData.business_id !== business_id) {
  return res.status(403).json({ error: 'Access denied' });
}
```

### 4. **Log Permission Denials**
```typescript
console.error('🔒 Permission denied:', {
  user_id: user.id,
  provider_role: providerData.provider_role,
  attempted_operation: 'edit_business',
  business_id: business_id
});
```

---

## Common Scenarios

### Scenario 1: Owner Views Business Settings
```
✅ Flow:
1. Owner logs in → Gets token
2. Provider record: role='owner', business_id='abc-123'
3. Requests: GET /api/business/service-eligibility?business_id=abc-123
4. API checks: ✅ Token valid, ✅ Provider found, ✅ Business matches, ✅ Role allows
5. Returns: Service eligibility data
```

### Scenario 2: Provider Tries to Edit Business
```
❌ Flow:
1. Provider logs in → Gets token
2. Provider record: role='provider', business_id='abc-123'
3. Requests: PUT /api/business/profile?business_id=abc-123
4. API checks: ✅ Token valid, ✅ Provider found, ✅ Business matches, ❌ Role 'provider' cannot edit
5. Returns: 403 Forbidden
```

### Scenario 3: Dispatcher Assigns Booking
```
✅ Flow:
1. Dispatcher logs in → Gets token
2. Provider record: role='dispatcher', business_id='abc-123'
3. Requests: PUT /api/bookings/assign?booking_id=xyz-789
4. API checks: ✅ Token valid, ✅ Provider found, ✅ Booking belongs to business, ✅ Role allows
5. Returns: Booking assigned successfully
```

### Scenario 4: User from Different Business
```
❌ Flow:
1. Owner logs in → Gets token
2. Provider record: role='owner', business_id='abc-123'
3. Requests: GET /api/business/services?business_id='def-456'
4. API checks: ✅ Token valid, ✅ Provider found, ❌ Business mismatch
5. Returns: 403 Forbidden - "You do not have permission to access this business"
```

---

## API Endpoints Permission Matrix

| Endpoint | Owner | Dispatcher | Provider | Notes |
|----------|-------|------------|----------|-------|
| **GET** `/api/business/profile` | ✅ | ✅ | ✅ | All can view |
| **PUT** `/api/business/profile` | ✅ | ❌ | ❌ | Only owner can edit |
| **GET** `/api/business/service-eligibility` | ✅ | ✅ | ✅ | All can view |
| **GET** `/api/business-eligible-services` | ✅ | ✅ | ✅ | All can view |
| **POST** `/api/business/services` | ✅ | ❌ | ❌ | Only owner can add |
| **PUT** `/api/business/services` | ✅ | ❌ | ❌ | Only owner can edit |
| **DELETE** `/api/business/services` | ✅ | ❌ | ❌ | Only owner can delete |
| **GET** `/api/business/bookings` | ✅ | ✅ | ❌ | Owner/dispatcher see all |
| **GET** `/api/provider/bookings` | ✅ | ✅ | ✅ | Provider sees only theirs |
| **PUT** `/api/bookings/assign` | ✅ | ✅ | ❌ | Owner/dispatcher can assign |
| **POST** `/api/staff` | ✅ | ❌ | ❌ | Only owner can add staff |
| **PUT** `/api/staff` | ✅ | ❌ | ❌ | Only owner can edit staff |
| **GET** `/api/business/financials` | ✅ | ❌ | ❌ | Only owner can view |

---

## Implementation Checklist

When adding a new API endpoint:

- [ ] Add role permission documentation in header comment
- [ ] Verify `Authorization` header exists
- [ ] Get user from token using `supabase.auth.getUser()`
- [ ] Query `providers` table for provider record
- [ ] Check `provider.business_id` matches requested `business_id`
- [ ] Check `provider.provider_role` has permission for operation
- [ ] Return appropriate error codes (401 for auth, 403 for permissions)
- [ ] Log permission checks for debugging
- [ ] Test with all three role types
- [ ] Test with user from different business
- [ ] Test with expired/invalid token

---

## Troubleshooting

### Issue: "Provider profile not found"
**Cause:** User doesn't have a record in the `providers` table  
**Solution:** Create a provider record with correct `user_id` and `business_id`

### Issue: "Access denied" even though user is logged in
**Cause:** Provider's `business_id` doesn't match requested `business_id`  
**Solution:** Verify the provider record has the correct `business_id`

### Issue: Owner can't edit business settings
**Cause:** API not checking role correctly, or using wrong business_id  
**Solution:** Check API logs, verify business_id in request matches provider.business_id

### Issue: Services tab shows nothing
**Causes:**
1. No categories/subcategories assigned to business
2. Provider missing `business_id`  
3. Wrong `business_id` being queried

**Debug:**
```sql
-- Check provider record
SELECT * FROM providers WHERE user_id = '<user_id>';

-- Check categories
SELECT * FROM business_service_categories WHERE business_id = '<business_id>';

-- Check subcategories
SELECT * FROM business_service_subcategories WHERE business_id = '<business_id>';
```

---

## Related Documentation

- `DEBUGGING_BUSINESS_SERVICES.md` - Troubleshooting business ID chain
- `API_ERROR_FIXES_SUMMARY.md` - Common API errors and solutions
- `DATABASE_CLEANUP_SUMMARY.md` - Data integrity and cleanup
