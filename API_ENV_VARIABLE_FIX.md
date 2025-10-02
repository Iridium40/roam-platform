# API Environment Variable Fix

## Issue

The `/api/business/service-eligibility` endpoint was returning a 500 Internal Server Error on production:

```
GET https://www.roamprovider.app/api/business/service-eligibility?business_id=... 500 (Internal Server Error)
Error loading service eligibility: Failed to load service eligibility
```

## Root Cause

Multiple API endpoints were using the incorrect environment variable name:

**Incorrect:** `VITE_SUPABASE_URL`  
**Correct:** `VITE_PUBLIC_SUPABASE_URL`

Additionally, some endpoints were initializing the Supabase client outside the handler function, which could cause issues with environment variable availability at initialization time.

## Files Fixed

### 1. `/api/business/service-eligibility.ts`
- ❌ Was using `VITE_SUPABASE_URL`
- ❌ Supabase client initialized outside handler
- ✅ Now uses `VITE_PUBLIC_SUPABASE_URL`
- ✅ Supabase client initialized inside handler with proper error handling

### 2. `/api/business/hours.ts`
- ❌ Was using `VITE_SUPABASE_URL`
- ✅ Now uses `VITE_PUBLIC_SUPABASE_URL`

### 3. `/api/business/documents.ts`
- ❌ Was using `VITE_SUPABASE_URL`
- ✅ Now uses `VITE_PUBLIC_SUPABASE_URL`

## Changes Made

### Before
```typescript
// ❌ Wrong - initialized outside handler
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ...
}
```

### After
```typescript
// ✅ Correct - initialized inside handler with validation
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!process.env.VITE_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing environment variables');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const supabase = createClient(
      process.env.VITE_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // ...
  }
}
```

## Verification

All other API endpoints were checked and confirmed to be using the correct variable:

✅ `/api/business/services.ts` - Already correct  
✅ `/api/business-eligible-services.ts` - Already correct  
✅ `/api/bookings.ts` - Already correct  
✅ `/api/onboarding/*` - Already correct  
✅ `/api/stripe/*` - Already correct  

## Environment Variables

The project uses these Supabase-related environment variables:

| Variable | Purpose | Location |
|----------|---------|----------|
| `VITE_PUBLIC_SUPABASE_URL` | Public Supabase project URL | `.env` |
| `VITE_PUBLIC_SUPABASE_ANON_KEY` | Public anonymous key for client | `.env` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for API endpoints | `.env` (server-side only) |

**Note:** The `VITE_PUBLIC_` prefix is used by Vite to expose environment variables to the client-side code.

## Impact

- ✅ Service eligibility endpoint now works correctly
- ✅ Business hours API properly configured
- ✅ Business documents API properly configured
- ✅ All endpoints follow consistent pattern
- ✅ Proper error handling for missing environment variables

## Testing

To verify the fix:

1. **Service Eligibility:**
   ```bash
   curl "https://www.roamprovider.app/api/business/service-eligibility?business_id=YOUR_BUSINESS_ID"
   ```
   Should return 200 with approved categories/subcategories

2. **Business Hours:**
   ```bash
   curl "https://www.roamprovider.app/api/business/hours?business_id=YOUR_BUSINESS_ID"
   ```
   Should return 200 with business hours

3. **Business Documents:**
   ```bash
   curl "https://www.roamprovider.app/api/business/documents?business_id=YOUR_BUSINESS_ID"
   ```
   Should return 200 with documents list

## Deployment

**Commit:** `856ac95` - "Fix environment variable names in API endpoints"

Changes deployed to production via Vercel. No additional configuration needed as the correct environment variable (`VITE_PUBLIC_SUPABASE_URL`) already exists in the project's `.env` file and Vercel environment variables.

## Prevention

To prevent this issue in the future:

1. ✅ Always initialize Supabase client inside handler functions
2. ✅ Always validate environment variables before use
3. ✅ Use consistent environment variable names across all APIs
4. ✅ Refer to existing working endpoints as templates
5. ✅ Test APIs locally before deploying

## Related Documentation

- [API Architecture Guide](./API_ARCHITECTURE.md)
- [Business Hours Implementation](./BUSINESS_HOURS_IMPLEMENTATION.md)
- [Business Locations Integration](./BUSINESS_LOCATIONS_INTEGRATION.md)
