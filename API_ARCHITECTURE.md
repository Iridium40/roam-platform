# ROAM Platform API Architecture

## Overview

The ROAM Platform uses **Vercel Serverless Functions** for all API endpoints across the admin, provider, and customer applications. This document outlines the API architecture, implementation patterns, and best practices.

---

## Architecture Decision

### Why Vercel Serverless Functions?

After encountering production issues with Edge Runtime APIs, we standardized on **Vercel Serverless Functions** (Node.js runtime) for the following reasons:

1. **Compatibility**: Works seamlessly with our existing stack without requiring Next.js
2. **Reliability**: Proven track record in production environments
3. **Simplicity**: Standard Express-style request/response handling
4. **Flexibility**: Full Node.js API support for database connections and external services
5. **Performance**: Automatic caching and optimization by Vercel

### Previous Issues (Resolved)

❌ **Edge Runtime Problems** (October 2025):
- Used `NextRequest`/`NextResponse` without Next.js configuration
- Resulted in 500 errors and HTML responses instead of JSON
- JSON parsing errors: `"A server e"... is not valid JSON`
- APIs returning error pages instead of proper error responses

✅ **Current Solution**:
- Converted to standard Vercel Serverless Functions
- Uses `VercelRequest`/`VercelResponse` types
- Proper JSON responses in all scenarios
- Comprehensive error handling

---

## API Structure

### Directory Layout

```
roam-provider-app/
├── api/
│   ├── bookings.ts                      # Bookings management API
│   ├── business-eligible-services.ts    # Service eligibility lookup
│   ├── business/
│   │   ├── services.ts                  # Business services CRUD
│   │   └── upload-documents.ts          # Document upload
│   ├── onboarding/
│   │   ├── business-info.ts             # Business onboarding
│   │   └── submit-application.ts        # Application submission
│   └── stripe/
│       ├── create-connect-account.ts    # Stripe Connect
│       └── create-verification-session.ts
└── vercel.json                          # API routing configuration
```

### Routing Configuration

API routes are defined in `vercel.json`:

```json
{
  "rewrites": [
    {
      "source": "/api/bookings",
      "destination": "/api/bookings.ts"
    },
    {
      "source": "/api/business/services",
      "destination": "/api/business/services.ts"
    },
    {
      "source": "/api/business-eligible-services",
      "destination": "/api/business-eligible-services.ts"
    }
  ]
}
```

---

## Implementation Patterns

### 1. Standard API Handler Template

All APIs follow this standard pattern:

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

  // 2. Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 3. Validate HTTP method
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 4. Main handler logic
  try {
    // Validate environment variables
    if (!process.env.VITE_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing env vars');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.VITE_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Validate request parameters
    const { business_id } = req.query;
    if (!business_id) {
      return res.status(400).json({ error: 'business_id parameter is required' });
    }

    // Execute database queries
    const { data, error } = await supabase
      .from('table_name')
      .select('*')
      .eq('business_id', business_id);

    if (error) {
      console.error('DB Error:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch data', 
        details: error.message 
      });
    }

    // Return success response
    return res.status(200).json({ data });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
```

### 2. CORS Configuration

All APIs include proper CORS headers:

```typescript
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
```

**CORS Preflight Handling:**
```typescript
if (req.method === 'OPTIONS') {
  return res.status(200).end();
}
```

### 3. Error Handling

Comprehensive error handling at multiple levels:

```typescript
// Environment validation
if (!process.env.REQUIRED_VAR) {
  console.error('Missing env vars');
  return res.status(500).json({ error: 'Server configuration error' });
}

// Parameter validation
if (!required_param) {
  return res.status(400).json({ error: 'required_param is required' });
}

// Database error handling
if (dbError) {
  console.error('DB Error:', dbError);
  return res.status(500).json({ 
    error: 'Failed to fetch data', 
    details: dbError.message 
  });
}

// Global error catch
catch (error) {
  console.error('API Error:', error);
  return res.status(500).json({ 
    error: 'Internal server error', 
    details: error instanceof Error ? error.message : 'Unknown error'
  });
}
```

### 4. Request Parameter Handling

**Query Parameters (GET requests):**
```typescript
const { business_id, page, limit, status } = req.query;

// Type checking
if (!business_id || typeof business_id !== 'string') {
  return res.status(400).json({ error: 'Invalid business_id' });
}

// Parsing with defaults
const pageNum = Math.max(parseInt(page as string, 10) || 1, 1);
const limitNum = Math.min(Math.max(parseInt(limit as string, 10) || 25, 1), 100);
```

**Body Parameters (POST/PUT requests):**
```typescript
const { business_id, service_id, business_price } = req.body;

// Validation
if (!business_id || !service_id || business_price === undefined) {
  return res.status(400).json({ 
    error: 'business_id, service_id, and business_price are required' 
  });
}
```

### 5. Database Query Patterns

**Using DATABASE_SCHEMA_REFERENCE.md:**

Always reference the confirmed schema before writing queries:

```typescript
// ✅ CORRECT: Using confirmed schema fields
const { data: bookings, error } = await supabase
  .from('bookings')
  .select(`
    *,
    customer_profiles (id, first_name, last_name, email, phone),
    customer_locations (id, location_name, street_address, city, state, zip_code),
    business_locations (id, location_name, address_line1, city, state, postal_code),
    services (id, name, description, duration_minutes, min_price),
    providers (id, first_name, last_name)
  `)
  .eq('business_id', business_id);

// ❌ INCORRECT: Guessing field names
const { data } = await supabase
  .from('bookings')
  .select('*, customer:customer_id(name, email)'); // Wrong relationship name
```

**Pagination Pattern:**
```typescript
const from = (pageNum - 1) * limitNum;
const to = from + limitNum - 1;

const { data, error, count } = await supabase
  .from('table_name')
  .select('*', { count: 'exact' })
  .range(from, to)
  .order('created_at', { ascending: false });
```

**Conditional Filtering:**
```typescript
let query = supabase
  .from('business_services')
  .select('*')
  .eq('business_id', business_id);

if (status === 'active') query = query.eq('is_active', true);
if (status === 'inactive') query = query.eq('is_active', false);

const { data, error } = await query;
```

### 6. Response Formats

**Success Response:**
```typescript
return res.status(200).json({
  data: results,
  stats: {
    total: count,
    active: activeCount
  },
  pagination: {
    page: pageNum,
    limit: limitNum,
    total: count
  }
});
```

**Error Response:**
```typescript
return res.status(400).json({
  error: 'Validation failed',
  details: 'business_id parameter is required',
  field: 'business_id'
});
```

**Consistent Error Format:**
```json
{
  "error": "Human-readable error message",
  "details": "Technical details or error message",
  "field": "Field that caused the error (optional)",
  "code": "ERROR_CODE (optional)"
}
```

---

## Key APIs Documentation

### 1. Bookings API

**Endpoint:** `GET /api/bookings`

**Purpose:** Fetch bookings for a business with comprehensive related data

**Parameters:**
- `business_id` (required) - Business UUID
- `provider_id` (optional) - Filter by provider
- `status` (optional) - Filter by booking status
- `limit` (optional) - Results per page (default: 50, max: 1000)
- `offset` (optional) - Pagination offset

**Response:**
```json
{
  "bookings": [...],
  "stats": {
    "totalBookings": 150,
    "pendingBookings": 10,
    "confirmedBookings": 30,
    "completedBookings": 100,
    "totalRevenue": 15000.00,
    "averageBookingValue": 150.00
  },
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 150
  }
}
```

**Implementation:** `/api/bookings.ts`

### 2. Business Services API

**Endpoint:** `GET /api/business/services`

**Purpose:** Manage business services (CRUD operations)

**GET Parameters:**
- `business_id` (required) - Business UUID
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Results per page (default: 25, max: 100)
- `status` (optional) - Filter by active/inactive

**Response:**
```json
{
  "business_id": "uuid",
  "services": [
    {
      "id": "uuid",
      "service_id": "uuid",
      "business_price": 100.00,
      "is_active": true,
      "delivery_type": "customer_location",
      "services": {
        "id": "uuid",
        "name": "Lawn Mowing",
        "description": "Professional lawn mowing service",
        "min_price": 50.00,
        "duration_minutes": 60,
        "image_url": "https://..."
      }
    }
  ],
  "stats": {
    "total_services": 25,
    "active_services": 20,
    "total_revenue": 0,
    "avg_price": 85.50
  },
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 25
  }
}
```

**Implementation:** `/api/business/services.ts`

### 3. Business Eligible Services API

**Endpoint:** `GET /api/business-eligible-services`

**Purpose:** Get all services a business is eligible to offer based on their subcategories

**Parameters:**
- `business_id` (required) - Business UUID

**Response:**
```json
{
  "business_id": "uuid",
  "service_count": 45,
  "eligible_services": [
    {
      "id": "uuid",
      "name": "Lawn Mowing",
      "description": "Professional lawn mowing service",
      "min_price": 50.00,
      "duration_minutes": 60,
      "is_configured": true,
      "business_price": 75.00,
      "business_is_active": true
    }
  ]
}
```

**Implementation:** `/api/business-eligible-services.ts`

---

## Environment Variables

### Required for All APIs

```bash
# Supabase Configuration
VITE_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# API Configuration (if needed)
API_SECRET_KEY=your-api-secret
```

### Vercel Environment Variables

Set in Vercel dashboard under:
- **Settings → Environment Variables**
- Add for: Production, Preview, Development

**Important:** All environment variables are confirmed to be properly configured in Vercel.

---

## Testing APIs

### Local Testing

```bash
# Start development server
npm run dev:client  # Client on port 5177
npm run dev:server  # Server on port 3002

# Test API endpoint
curl "http://localhost:5177/api/bookings?business_id=uuid"
curl "http://localhost:5177/api/business/services?business_id=uuid&page=1&limit=25"
```

### Production Testing

```bash
# Test production endpoint
curl "https://www.roamprovider.app/api/bookings?business_id=uuid"
curl "https://www.roamprovider.app/api/business/services?business_id=uuid"
```

### Testing Checklist

- ✅ CORS headers present in response
- ✅ Proper JSON response format
- ✅ Error responses are JSON (not HTML)
- ✅ Status codes are appropriate (200, 400, 404, 500)
- ✅ Required parameters validated
- ✅ Database queries use confirmed schema
- ✅ Pagination works correctly
- ✅ Filtering works as expected

---

## Common Patterns

### Multi-Method Handler

```typescript
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Route to method handler
    if (req.method === 'GET') {
      return await handleGET(req, res);
    } else if (req.method === 'POST') {
      return await handlePOST(req, res);
    } else if (req.method === 'PUT') {
      return await handlePUT(req, res);
    } else if (req.method === 'DELETE') {
      return await handleDELETE(req, res);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Handler error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

### Supabase Client Initialization

```typescript
function getSupabaseClient() {
  if (!process.env.VITE_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase configuration');
  }
  
  return createClient(
    process.env.VITE_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}
```

### Safe Number Parsing

```typescript
// Parse with validation and bounds
const pageNum = Math.max(parseInt(page as string, 10) || 1, 1);
const limitNum = Math.min(Math.max(parseInt(limit as string, 10) || 25, 1), 100);

// Parse price with validation
const price = parseFloat(business_price);
if (isNaN(price) || price <= 0) {
  return res.status(400).json({ error: 'Invalid price' });
}
```

---

## Migration from Edge Runtime

### Before (Edge Runtime - ❌ Deprecated)

```typescript
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  // ... handler logic
  return NextResponse.json({ data });
}
```

### After (Vercel Serverless - ✅ Current)

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { param } = req.query;
  // ... handler logic
  return res.status(200).json({ data });
}
```

### Key Differences

| Aspect | Edge Runtime | Vercel Serverless |
|--------|-------------|-------------------|
| Import | `NextRequest/NextResponse` | `VercelRequest/VercelResponse` |
| Export | Named functions (GET, POST) | Default handler function |
| Method routing | Separate exports | Single handler with method check |
| Configuration | `export const runtime = 'edge'` | No configuration needed |
| Compatibility | Requires Next.js | Works standalone |
| Query params | `new URL(request.url).searchParams` | `req.query` |
| Body parsing | `await request.json()` | `req.body` |
| Headers | `NextResponse.json(data, { headers })` | `res.setHeader()` then `res.json()` |

---

## Best Practices

### ✅ Do's

1. **Always set CORS headers** for all API endpoints
2. **Handle OPTIONS requests** for CORS preflight
3. **Validate all input parameters** before processing
4. **Use try-catch blocks** for comprehensive error handling
5. **Log errors with console.error** for debugging
6. **Return consistent error formats** across all APIs
7. **Reference DATABASE_SCHEMA_REFERENCE.md** for all queries
8. **Use typed responses** with proper status codes
9. **Implement pagination** for large datasets
10. **Validate environment variables** at handler start

### ❌ Don'ts

1. **Don't use Edge Runtime** (`export const runtime = 'edge'`)
2. **Don't guess database field names** - always check schema
3. **Don't return HTML error pages** - always return JSON
4. **Don't skip parameter validation** - validate early
5. **Don't expose sensitive data** in error messages
6. **Don't forget to handle OPTIONS** requests
7. **Don't use NextRequest/NextResponse** - use Vercel types
8. **Don't skip error logging** - always log for debugging
9. **Don't hardcode limits** - use configurable pagination
10. **Don't skip CORS headers** - required for frontend

---

## Troubleshooting

### Common Issues

**Issue: 500 Internal Server Error**
- Check Vercel logs for error details
- Verify environment variables are set
- Confirm database query syntax
- Check Supabase connection

**Issue: JSON Parsing Error**
- Ensure API returns JSON, not HTML
- Check for proper error handling
- Verify CORS headers are set
- Use VercelRequest/VercelResponse (not NextRequest/NextResponse)

**Issue: CORS Errors**
- Add CORS headers to all responses
- Handle OPTIONS preflight requests
- Check header names are correct
- Verify wildcard origin is set

**Issue: 404 Not Found**
- Check vercel.json rewrites configuration
- Verify file path matches destination
- Confirm file exists at specified path
- Check for typos in source path

### Debugging Steps

1. **Check Vercel Function Logs**
   - Go to Vercel Dashboard → Project → Functions
   - View real-time logs for your API

2. **Test Locally First**
   ```bash
   npm run dev:client
   curl "http://localhost:5177/api/endpoint"
   ```

3. **Verify Environment Variables**
   ```bash
   # In Vercel dashboard
   Settings → Environment Variables
   # Ensure all required vars are set
   ```

4. **Check Database Queries**
   - Reference DATABASE_SCHEMA_REFERENCE.md
   - Test query in Supabase SQL editor
   - Verify relationships exist

5. **Monitor Network Tab**
   - Open browser DevTools → Network
   - Check request/response details
   - Verify headers and status codes

---

## Performance Optimization

### Caching Strategy

```typescript
// Add cache control headers
res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
```

### Query Optimization

```typescript
// Fetch only needed fields
const { data } = await supabase
  .from('bookings')
  .select('id, booking_date, total_amount')  // Don't use *
  .eq('business_id', business_id);

// Use pagination for large datasets
.range(from, to)
.limit(limitNum);
```

### Batch Operations

```typescript
// Fetch related data in parallel
const [bookings, stats] = await Promise.all([
  supabase.from('bookings').select('*'),
  supabase.from('bookings').select('booking_status, total_amount')
]);
```

---

## Security Considerations

### Input Validation

```typescript
// Validate UUIDs
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!uuidRegex.test(business_id)) {
  return res.status(400).json({ error: 'Invalid business_id format' });
}
```

### Rate Limiting

Consider implementing rate limiting for production APIs:

```typescript
// Example using Vercel KV
import { ratelimit } from '@vercel/kv';

const limiter = ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});

const { success } = await limiter.limit(req.headers['x-forwarded-for'] || 'anonymous');
if (!success) {
  return res.status(429).json({ error: 'Rate limit exceeded' });
}
```

### Authentication

```typescript
// Verify JWT token
const token = req.headers.authorization?.replace('Bearer ', '');
if (!token) {
  return res.status(401).json({ error: 'Unauthorized' });
}

// Validate with Supabase
const { data: { user }, error } = await supabase.auth.getUser(token);
if (error || !user) {
  return res.status(401).json({ error: 'Invalid token' });
}
```

---

## Future Improvements

### Planned Enhancements

1. **API Versioning** - Add `/v1/` prefix to all routes
2. **GraphQL Layer** - Consider GraphQL for complex queries
3. **Webhook Support** - Add webhook endpoints for external integrations
4. **API Documentation** - Generate OpenAPI/Swagger docs
5. **Request Validation** - Use Zod schemas for all inputs
6. **Response Caching** - Implement Redis caching layer
7. **Monitoring** - Add performance monitoring and alerts

---

## Related Documentation

- **[README.md](./README.md)** - Platform overview and setup
- **[DATABASE_SCHEMA_REFERENCE.md](./DATABASE_SCHEMA_REFERENCE.md)** - Database schema reference
- **[PROVIDER_APP_INTEGRATION_PROGRESS.md](./PROVIDER_APP_INTEGRATION_PROGRESS.md)** - Current integration status

---

## Change Log

### October 2, 2025
- ✅ Converted all Edge Runtime APIs to Vercel Serverless Functions
- ✅ Fixed JSON parsing errors in production
- ✅ Standardized error handling across all endpoints
- ✅ Added comprehensive CORS support
- ✅ Implemented consistent response formats

### Previous Issues Resolved
- ❌ Edge Runtime 500 errors → ✅ Stable serverless functions
- ❌ HTML error pages → ✅ JSON error responses
- ❌ Inconsistent error handling → ✅ Standardized patterns
- ❌ CORS issues → ✅ Proper CORS configuration

---

**Last Updated:** October 2, 2025  
**Status:** Production-ready ✅
