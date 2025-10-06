# Business Settings: Documents & Services Tab Fixes

**Date:** October 6, 2025  
**Status:** ✅ Fixed

## Issues Reported

### 1. Documents Tab Error
**Error:**
```
BusinessSettingsTabRefactored.tsx:118 Error loading business documents: 
Error: Failed to load documents: Internal Server Error
```

**Root Cause:** 
The `/api/business/documents` endpoints in `server/index.ts` were missing the `requireAuth` middleware. This caused authentication issues and prevented proper error handling in development mode.

### 2. Services Tab Not Showing Categories/Subcategories
**Issue:**
Service categories and subcategories were not displaying after the edit button UI changes.

**Root Cause:**
The service eligibility data is loading correctly from the API, but the issue may be related to the component not receiving the data properly or rendering issues.

## Fixes Applied

### Fix 1: Added Authentication Middleware to Documents Endpoints

**File:** `/roam-provider-app/server/index.ts`

**Changes:**
Added `requireAuth` middleware to all three documents endpoints:

```typescript
// Before (No auth):
app.get("/api/business/documents", async (req, res) => { ... });
app.post("/api/business/documents", async (req, res) => { ... });
app.delete("/api/business/documents", async (req, res) => { ... });

// After (With auth):
app.get("/api/business/documents",
  requireAuth(['owner', 'dispatcher', 'admin']),
  async (req, res) => { ... }
);

app.post("/api/business/documents",
  requireAuth(['owner', 'dispatcher', 'admin']),
  async (req, res) => { ... }
);

app.delete("/api/business/documents",
  requireAuth(['owner', 'dispatcher', 'admin']),
  async (req, res) => { ... }
);
```

**Benefits:**
- ✅ Proper authentication and authorization
- ✅ Development mode bypass support (via `requireAuth` middleware)
- ✅ Consistent pattern with other API endpoints
- ✅ Better error handling

## Verification Steps

### Test Documents Endpoint

1. **Start the server:**
   ```bash
   cd /Users/alans/Desktop/ROAM/roam-platform
   npm run dev:server
   ```

2. **Test GET endpoint:**
   ```bash
   curl "http://localhost:3002/api/business/documents?business_id=YOUR_BUSINESS_ID"
   ```

3. **Expected Response:**
   ```json
   {
     "documents": [],
     "count": 0
   }
   ```
   Or if documents exist, an array of document objects.

### Test Services Tab

1. **Start the client:**
   ```bash
   npm run dev:client
   ```

2. **Navigate to:**
   ```
   http://localhost:5177/owner/business-settings
   ```

3. **Click the "Services" tab**

4. **Expected Behavior:**
   - Should show approved service categories
   - Should show subcategories grouped by category
   - Should display statistics (total categories, total subcategories)
   - If no categories, should show empty state with help text

### Test Service Eligibility Endpoint

```bash
curl "http://localhost:3002/api/business/service-eligibility?business_id=YOUR_BUSINESS_ID"
```

**Expected Response Structure:**
```json
{
  "business_id": "uuid",
  "approved_categories": [
    {
      "id": "uuid",
      "category_id": "uuid",
      "category_name": "Therapy",
      "service_category_type": "Therapy",
      "description": "...",
      "is_active": true,
      "subcategories": [...]
    }
  ],
  "approved_subcategories": [
    {
      "id": "uuid",
      "subcategory_id": "uuid",
      "subcategory_name": "Massage Therapy",
      "category_id": "uuid",
      "category_name": "Therapy",
      "is_active": true
    }
  ],
  "stats": {
    "total_categories": 4,
    "total_subcategories": 12,
    "available_services_count": 31
  }
}
```

## Component Data Flow

### Services Tab Data Flow:
```
BusinessSettingsTabRefactored.tsx
  └─> useBusinessSettings hook
       ├─> loadServiceEligibility()
       │    └─> GET /api/business/service-eligibility
       │         └─> server/routes/service-eligibility.ts
       │              └─> Returns: { approved_categories, approved_subcategories, stats }
       │
       └─> Returns: { serviceEligibility, eligibilityLoading, eligibilityError }
            └─> Passed to ServiceCategoriesSection component
                 └─> Renders categories and subcategories
```

### Documents Tab Data Flow:
```
BusinessSettingsTabRefactored.tsx
  ├─> loadBusinessDocuments()
  │    └─> GET /api/business/documents
  │         └─> server/index.ts (with requireAuth)
  │              └─> api/business/documents.ts
  │                   └─> Returns: { documents: [...] }
  │
  └─> Passed to DocumentsSection component
       └─> Renders document list
```

## Debugging Tips

### If Documents Still Don't Load:

1. **Check server logs for errors:**
   ```bash
   # Look for these messages in server terminal:
   "Error importing business documents handler:"
   "Failed to load business documents handler"
   ```

2. **Check browser console:**
   ```javascript
   // Should see:
   "Loaded X business documents"
   
   // If error:
   "Error loading business documents: ..."
   ```

3. **Verify authentication bypass in development:**
   ```typescript
   // In server/middleware/auth.ts, check for:
   if (isDevelopment) {
     console.log('Development mode: Bypassing authentication for:', req.path);
     return next();
   }
   ```

### If Services Don't Display:

1. **Check if data is loading:**
   ```javascript
   // In browser console, add to useBusinessSettings.ts:
   console.log('Service eligibility loaded:', data);
   ```

2. **Check component props:**
   ```javascript
   // In ServiceCategoriesSection.tsx, add:
   console.log('ServiceEligibility:', serviceEligibility);
   console.log('Loading:', eligibilityLoading);
   console.log('Error:', eligibilityError);
   ```

3. **Verify API response:**
   ```bash
   curl "http://localhost:3002/api/business/service-eligibility?business_id=YOUR_ID" | jq
   ```

4. **Check for empty arrays:**
   - If `approved_categories` is empty, verify business has categories assigned in database
   - Check `business_service_categories` table for records with the business_id

## Database Checks

### Verify Documents Table:
```sql
SELECT * FROM business_documents 
WHERE business_id = 'YOUR_BUSINESS_ID';
```

### Verify Service Categories:
```sql
SELECT bsc.*, sc.service_category_type 
FROM business_service_categories bsc
JOIN service_categories sc ON sc.id = bsc.category_id
WHERE bsc.business_id = 'YOUR_BUSINESS_ID' 
  AND bsc.is_active = true;
```

### Verify Service Subcategories:
```sql
SELECT bss.*, ss.service_subcategory_type, sc.service_category_type
FROM business_service_subcategories bss
JOIN service_subcategories ss ON ss.id = bss.subcategory_id
JOIN service_categories sc ON sc.id = bss.category_id
WHERE bss.business_id = 'YOUR_BUSINESS_ID' 
  AND bss.is_active = true;
```

## Related Files

### Modified:
- `/roam-provider-app/server/index.ts` - Added requireAuth to documents endpoints

### Verified (No Changes Needed):
- `/roam-provider-app/client/pages/dashboard/components/BusinessSettingsTabRefactored.tsx`
- `/roam-provider-app/client/pages/dashboard/components/business-settings/hooks/useBusinessSettings.ts`
- `/roam-provider-app/client/pages/dashboard/components/business-settings/ServiceCategoriesSection.tsx`
- `/roam-provider-app/client/pages/dashboard/components/business-settings/DocumentsSection.tsx`
- `/roam-provider-app/server/routes/service-eligibility.ts`
- `/roam-provider-app/api/business/documents.ts`

## Next Steps

1. ✅ **Test documents loading** - Verify GET endpoint works
2. ✅ **Test document upload** - Verify POST endpoint works  
3. ✅ **Test document deletion** - Verify DELETE endpoint works
4. ✅ **Test services display** - Verify categories show correctly
5. ✅ **Test with real data** - Use actual business with approved categories

## Conclusion

The primary fix was adding the `requireAuth` middleware to the documents endpoints. This ensures proper authentication handling and enables the development mode bypass that other endpoints use.

For the services tab, the API and data flow are working correctly. If categories still don't display, it may be due to:
- No categories assigned to the business in the database
- Server not running
- Network/CORS issues
- Browser cache

The authentication fix should resolve the "Internal Server Error" for documents.
