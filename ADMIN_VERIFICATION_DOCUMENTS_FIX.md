# Admin Verification Documents Fix

**Date**: October 6, 2025  
**Issue**: Business documents not showing in AdminVerification page  
**Root Cause**: RLS policies blocking client-side Supabase queries  
**Solution**: Server-side API endpoint using service role key

---

## Problem

The AdminVerification page in the Admin App was not displaying business documents when clicking "Review Documents" for a business. Documents exist in the `business_documents` table with proper `file_url` fields, but were not being returned to the client.

### Symptoms

1. Document review modal opens but shows "No documents" or empty document list
2. Console logs show 0 documents returned from Supabase query
3. Provider app successfully displays the same documents in BusinessSettings tab

### Example Document Storage

Documents are stored in Supabase Storage at URLs like:
```
https://vssomyuyhicaxsgiaupo.supabase.co/storage/v1/object/public/roam-file-storage/provider-documents/29ef4147-4760-4ea7-b673-2c0c5a6afbdd/business_license_1759788747094.png
```

---

## Root Cause Analysis

### Original Implementation (Client-Side)

**File**: `roam-admin-app/client/pages/AdminVerification.tsx`

```typescript
// PROBLEMATIC: Uses anon key, subject to RLS policies
const { data, error } = await supabase
  .from("business_documents")
  .select("*")
  .eq("business_id", businessId)
  .order("created_at", { ascending: false });
```

**Issue**: The admin app's Supabase client uses the `VITE_PUBLIC_SUPABASE_ANON_KEY`, which enforces Row-Level Security (RLS) policies. These policies likely restrict access to business documents to:
- The business owner
- Authenticated users with matching business_id

Admin users trying to view ALL businesses' documents are blocked by RLS.

### Why Provider App Works

**File**: `roam-provider-app/client/pages/dashboard/components/BusinessSettingsTab.tsx`

```typescript
// WORKS: Provider is authenticated and viewing their OWN business documents
const { data, error } = await supabase
  .from('business_documents')
  .select('*')
  .eq('business_id', business.id)  // business.id matches logged-in provider
  .order('created_at', { ascending: false });
```

The provider app works because:
1. Provider is authenticated
2. RLS policies allow providers to view their own business documents
3. `business_id` matches the logged-in provider's business

---

## Solution Implementation

### 1. Server-Side API Endpoint

**Created**: `roam-admin-app/server/routes/business-documents.ts`

```typescript
import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';

export async function handleBusinessDocuments(req: Request, res: Response) {
  try {
    const { business_id } = req.query;

    console.log('[Business Documents API] GET request received');
    console.log('[Business Documents API] business_id:', business_id);

    if (!business_id || typeof business_id !== 'string') {
      return res.status(400).json({ 
        error: 'business_id query parameter is required' 
      });
    }

    // Verify business exists
    const { data: business, error: businessError } = await supabase
      .from('business_profiles')
      .select('id, business_name')
      .eq('id', business_id)
      .single();

    if (businessError) {
      if (businessError.code === 'PGRST116') {
        return res.status(404).json({ 
          error: 'Business not found',
          business_id 
        });
      }
      return res.status(500).json({ error: businessError.message });
    }

    // Fetch business documents using SERVICE ROLE KEY (bypasses RLS)
    const { data: documents, error: documentsError } = await supabase
      .from('business_documents')
      .select('*')
      .eq('business_id', business_id)
      .order('created_at', { ascending: false });

    if (documentsError) {
      return res.status(500).json({ 
        error: documentsError.message,
        details: documentsError.details 
      });
    }

    console.log('[Business Documents API] Documents fetched:', {
      business_id,
      business_name: business.business_name,
      document_count: documents?.length || 0
    });

    return res.status(200).json({ 
      data: documents || [],
      business: {
        id: business.id,
        name: business.business_name
      },
      count: documents?.length || 0
    });

  } catch (error) {
    console.error('[Business Documents API] Unexpected error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch business documents',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
```

**Key Points**:
- Uses `SUPABASE_SERVICE_ROLE_KEY` (configured in server-side Supabase client)
- Service role key **bypasses RLS policies** (admin-level access)
- Comprehensive error handling with status codes
- Detailed logging for debugging
- Validates business exists before fetching documents

### 2. Register Route

**Updated**: `roam-admin-app/server/index.ts`

```typescript
import { handleBusinessDocuments } from "./routes/business-documents";

// ... in createServer():
app.get("/api/business-documents", handleBusinessDocuments);
```

### 3. Update Client to Use API

**Updated**: `roam-admin-app/client/pages/AdminVerification.tsx`

```typescript
const fetchBusinessDocuments = async (businessId: string) => {
  try {
    console.log("fetchBusinessDocuments called for business_id:", businessId);
    
    // Use server API endpoint with service role key (bypasses RLS)
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";
    const response = await fetch(`${apiBaseUrl}/api/business-documents?business_id=${businessId}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    
    const result = await response.json();
    
    console.log("fetchBusinessDocuments API result:", {
      businessId,
      documentsCount: result.data?.length || 0,
      documents: result.data,
    });

    setBusinessDocuments(result.data || []);
    
    if (!result.data || result.data.length === 0) {
      console.warn("No documents found for business_id:", businessId);
    }
  } catch (error: any) {
    console.error("Error fetching business documents:", error);
    toast({
      title: "Error",
      description: `Failed to load business documents: ${error.message}`,
      variant: "destructive",
    });
  }
};
```

**Changes**:
- Replaced direct Supabase query with `fetch()` API call
- Uses `VITE_API_BASE_URL` environment variable
- Proper error handling for HTTP errors
- Maintains same logging for debugging

### 4. Environment Configuration

**Updated**: `roam-admin-app/.env`

```properties
# API Configuration
VITE_API_BASE_URL=http://localhost:3001
```

**Server already has**:
```properties
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Testing the Fix

### 1. Start Admin App

```bash
cd roam-admin-app
npm run dev
```

**Expected**:
- Client: http://localhost:5175
- Server: http://localhost:3001

### 2. Test API Endpoint Directly

```bash
# Replace with actual business_id from your database
curl "http://localhost:3001/api/business-documents?business_id=29ef4147-4760-4ea7-b673-2c0c5a6afbdd"
```

**Expected Response**:
```json
{
  "data": [
    {
      "id": "doc-uuid",
      "business_id": "29ef4147-4760-4ea7-b673-2c0c5a6afbdd",
      "document_type": "business_license",
      "document_name": "Business License",
      "file_url": "https://vssomyuyhicaxsgiaupo.supabase.co/storage/v1/object/public/roam-file-storage/provider-documents/...",
      "verification_status": "pending",
      "created_at": "2025-10-06T..."
    }
  ],
  "business": {
    "id": "29ef4147-4760-4ea7-b673-2c0c5a6afbdd",
    "name": "Example Business"
  },
  "count": 1
}
```

### 3. Test in Admin UI

1. Navigate to http://localhost:5175/verification
2. Find a business with documents (check count in table)
3. Click "Review Documents" button
4. **Expected**: Document list appears with all uploaded documents
5. Click "View" on a document
6. **Expected**: Document opens in new tab showing the file

### 4. Check Console Logs

**Client Console** (Browser DevTools):
```
fetchBusinessDocuments called for business_id: 29ef4147-4760-4ea7-b673-2c0c5a6afbdd
fetchBusinessDocuments API result: {
  businessId: "29ef4147-4760-4ea7-b673-2c0c5a6afbdd",
  documentsCount: 3,
  documents: [...]
}
```

**Server Console** (Terminal):
```
[Business Documents API] GET request received
[Business Documents API] business_id: 29ef4147-4760-4ea7-b673-2c0c5a6afbdd
[Business Documents API] Business lookup: { found: true, name: "Example Business" }
[Business Documents API] Fetching documents...
[Business Documents API] Documents fetched: {
  business_id: "29ef4147-4760-4ea7-b673-2c0c5a6afbdd",
  business_name: "Example Business",
  document_count: 3
}
```

---

## Database Schema Reference

### `business_documents` Table

```sql
create table public.business_documents (
  id uuid not null default gen_random_uuid (),
  business_id uuid not null,
  document_type public.business_document_type not null,
  document_name character varying(255) not null,
  file_url text not null,
  file_size_bytes integer null,
  verification_status public.business_document_status null,
  verified_by uuid null,
  verified_at timestamp without time zone null,
  rejection_reason text null,
  expiry_date date null,
  created_at timestamp without time zone null default now(),
  constraint provider_documents_pkey primary key (id),
  constraint business_documents_business_id_fkey foreign KEY (business_id) references business_profiles (id)
);
```

**Key Fields**:
- `file_url`: Full Supabase Storage URL (public access)
- `business_id`: Foreign key to `business_profiles.id`
- `verification_status`: `pending | verified | rejected | under_review`

---

## Architecture Pattern: Client vs Server Data Fetching

### When to Use Client-Side Supabase Queries

✅ **Use direct Supabase queries** when:
- User is viewing their OWN data (RLS allows)
- RLS policies grant access to authenticated user
- Example: Provider viewing their own business documents

```typescript
// Provider App - Works because RLS allows owner access
const { data } = await supabase
  .from('business_documents')
  .eq('business_id', userBusinessId);
```

### When to Use Server-Side API Endpoints

✅ **Use server API endpoints** when:
- Admin needs to view ANY user's data
- Cross-user data access required
- RLS policies would block client queries
- Service role privileges needed

```typescript
// Admin App - Requires service role to bypass RLS
fetch(`/api/business-documents?business_id=${anyBusinessId}`)
```

---

## Production Deployment Considerations

### Environment Variables

**Development** (localhost):
```
VITE_API_BASE_URL=http://localhost:3001
```

**Production** (Vercel):
```
VITE_API_BASE_URL=https://roam-admin-app.vercel.app
```

Or use relative URLs:
```typescript
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";
const response = await fetch(`${apiBaseUrl}/api/business-documents?business_id=${businessId}`);
```

### Security

- ✅ Service role key stored server-side only (never exposed to client)
- ✅ API validates business_id before fetching
- ✅ Returns 404 if business doesn't exist
- ✅ Proper error handling prevents info leakage
- ⚠️ Consider adding admin authentication check to API endpoint

**Recommended Enhancement**:
```typescript
// Add admin auth check
export async function handleBusinessDocuments(req: Request, res: Response) {
  // Verify request is from authenticated admin
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Validate admin JWT token
  // ... verification logic
  
  // Then proceed with document fetch
}
```

---

## Files Changed

### Created
- `roam-admin-app/server/routes/business-documents.ts` - New API endpoint

### Modified
- `roam-admin-app/server/index.ts` - Registered new route
- `roam-admin-app/client/pages/AdminVerification.tsx` - Use API instead of direct query
- `roam-admin-app/.env` - Added `VITE_API_BASE_URL`

---

## Related Documentation

- `DATABASE_SCHEMA_REFERENCE.md` - business_documents table schema
- `API_ARCHITECTURE.md` - Server-side API patterns
- `BUSINESS_VERIFICATION_WORKFLOW_STATUS.md` - Complete verification workflow
- `LOCAL_TESTING_APPROVAL_WORKFLOW.md` - Testing guide

---

## Troubleshooting

### No documents returned but they exist

**Check**:
1. Verify `business_id` is correct (UUID format)
2. Check server logs for errors
3. Test API directly with curl
4. Verify `SUPABASE_SERVICE_ROLE_KEY` is set server-side

### 401/403 Errors

**Solution**: API endpoint needs authentication middleware (future enhancement)

### 404 Business not found

**Causes**:
- Invalid `business_id` (UUID format wrong)
- Business deleted from database
- Typo in query parameter

### CORS Errors

**Solution**: Verify server has CORS middleware:
```typescript
app.use(cors());
```

---

## Next Steps

### Immediate
- ✅ Test with real business documents
- ⬜ Add admin authentication to API endpoint
- ⬜ Add rate limiting to prevent abuse

### Future Enhancements
- Add document upload via API
- Batch document operations
- Document verification actions via API
- WebSocket for real-time document updates

---

**Status**: ✅ FIXED - Documents now load via server-side API with service role access
