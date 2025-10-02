# API Error Fixes - Summary

## Issues Identified

### 1. Business Eligible Services API - UUID Parsing Error ✅ FIXED

**Error:**
```
Error fetching eligible services: {
  code: '22P02',
  details: null,
  hint: null,
  message: 'invalid input syntax for type uuid: "null"'
}
```

**Root Cause:**
- The `business_service_subcategories` table contains invalid `subcategory_id` values
- Some records have the string `"null"` instead of actual NULL or valid UUIDs
- PostgreSQL cannot parse `"null"` string as a UUID type

**Fix Applied:**
- Added UUID validation in `/api/business-eligible-services.ts`
- Filters out invalid UUIDs before querying the services table
- Uses regex pattern to validate UUID format: `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`
- Returns empty result with message if no valid subcategories found

**Code Change:**
```typescript
// Filter out any null or invalid UUIDs from validSubcategoryIds
const cleanSubcategoryIds = validSubcategoryIds.filter(id => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return id && typeof id === 'string' && uuidRegex.test(id);
});
```

**Status:** ✅ Deployed (Commit: 2e67594)

---

### 2. Delete Service Error - "Business service not found"

**Error:**
```javascript
Error deleting service: Error: Business service not found
    at Object.p [as deleteService]
```

**Root Cause:**
- Frontend tries to delete a service that doesn't exist in local state
- The `deleteService` function looks for the service in `businessServices` array
- If service was already deleted or state is out of sync, lookup fails

**Current Code:**
```typescript
const businessService = businessServices.find(s => s.service_id === serviceId);
if (!businessService) {
  throw new Error('Business service not found');
}
```

**Recommended Fix:**
Two approaches:

**Option A: Graceful Handling (Recommended)**
```typescript
const deleteService = async (serviceId: string): Promise<void> => {
  try {
    // Try to find business service, but don't fail if not found locally
    const businessService = businessServices.find(s => s.service_id === serviceId);
    
    // If not found in local state, we might still have business_id from context
    const businessId = businessService?.business_id || currentBusinessId;
    
    if (!businessId) {
      throw new Error('Cannot delete service: business ID not found');
    }

    const response = await fetch(`/api/business/services?business_id=${businessId}&service_id=${serviceId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      // If API returns 404, service might already be deleted
      if (response.status === 404) {
        console.warn('Service already deleted from database');
      } else {
        let errorMessage = 'Failed to delete service';
        try {
          const errorData = await safeJsonParse(response, 'delete service error');
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          console.warn('Could not parse error response');
        }
        throw new Error(errorMessage);
      }
    }

    // Update local state
    setBusinessServices(prev => prev.filter(s => s.service_id !== serviceId));

  } catch (error) {
    console.error('Error deleting service:', error);
    throw error;
  }
};
```

**Option B: Reload Services Before Delete**
```typescript
const deleteService = async (serviceId: string): Promise<void> => {
  try {
    // Refresh services list first to ensure we have latest data
    await loadServices();
    
    const businessService = businessServices.find(s => s.service_id === serviceId);
    if (!businessService) {
      throw new Error('Service not found. Please refresh the page.');
    }
    
    // ... rest of delete logic
  } catch (error) {
    console.error('Error deleting service:', error);
    throw error;
  }
};
```

**Status:** ⏳ Pending - Needs frontend fix

---

### 3. Auth Token Error - 400 Bad Request

**Error:**
```
vssomyuyhicaxsgiaupo.supabase.co/auth/v1/token?grant_type=password:1  
Failed to load resource: the server responded with a status of 400 ()
```

**Possible Causes:**
1. Invalid credentials being sent
2. Session expired
3. Missing required auth fields
4. CORS issue with auth endpoint

**Recommended Investigation:**
1. Check if user session is valid
2. Verify auth credentials format
3. Check Supabase auth logs
4. Ensure auth token refresh is working

**Status:** ⏳ Needs investigation

---

## Data Quality Issues

### Invalid Subcategory IDs in Database

**Problem:**
The `business_service_subcategories` table contains invalid data:
- String value `"null"` instead of NULL or valid UUIDs
- Possibly orphaned records (subcategory_id doesn't exist in service_subcategories)

**Cleanup Required:**
Run the SQL script: `fix_invalid_subcategory_ids.sql`

**Steps:**
1. Identify invalid records:
```sql
SELECT * FROM business_service_subcategories
WHERE subcategory_id IS NULL 
   OR subcategory_id::text = 'null'
   OR NOT (subcategory_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');
```

2. **Recommended:** Set to inactive (safer than deleting):
```sql
UPDATE business_service_subcategories
SET is_active = false
WHERE (subcategory_id IS NULL 
    OR subcategory_id::text = 'null'
    OR NOT (subcategory_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'))
AND is_active = true;
```

3. Verify cleanup:
```sql
SELECT COUNT(*) FROM business_service_subcategories
WHERE is_active = true
  AND (subcategory_id IS NULL 
    OR subcategory_id::text = 'null');
-- Should return 0
```

---

## Testing Checklist

After deploying fixes:

- [x] Business eligible services API returns 200 (with UUID validation)
- [ ] Invalid subcategory IDs cleaned up in database
- [ ] Delete service function handles missing services gracefully
- [ ] Auth token errors resolved
- [ ] No more 500 errors on services page
- [ ] Delete service works without errors

---

## Files Modified

1. **roam-provider-app/api/business-eligible-services.ts**
   - Added UUID validation before database query
   - Enhanced error logging
   - Handles invalid subcategory IDs gracefully

2. **fix_invalid_subcategory_ids.sql** (NEW)
   - SQL script to clean up invalid data
   - Multiple cleanup strategies
   - Verification queries

---

## Deployment

**Commit:** 2e67594  
**Status:** ✅ Deployed to production  
**Time:** Just now

**Remaining Work:**
1. Run database cleanup script
2. Fix delete service error handling (frontend)
3. Investigate auth token 400 errors

---

## Prevention

To prevent similar issues in the future:

1. **Database Constraints:**
```sql
-- Add CHECK constraint to ensure valid UUIDs
ALTER TABLE business_service_subcategories
ADD CONSTRAINT valid_subcategory_id 
CHECK (
  subcategory_id IS NULL 
  OR subcategory_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
);

-- Add foreign key constraint (if not exists)
ALTER TABLE business_service_subcategories
ADD CONSTRAINT fk_subcategory
FOREIGN KEY (subcategory_id) 
REFERENCES service_subcategories(id)
ON DELETE CASCADE;
```

2. **Frontend Validation:**
   - Validate UUIDs before inserting
   - Add better error handling
   - Refresh data before critical operations

3. **API Validation:**
   - Always validate UUID format in API endpoints
   - Return meaningful error messages
   - Log detailed errors for debugging

---

## Support

If issues persist:
1. Check Vercel deployment logs
2. Check Supabase logs
3. Run database verification queries
4. Check browser console for detailed errors
5. Verify environment variables are set correctly
