# ROAM Platform - AI Coding Agent Instructions

*Last Updated: October 6, 2025*

## Project Overview

ROAM is a **marketplace platform** connecting service providers (beauty, fitness, therapy, healthcare) with customers. Built as a **Turborepo monorepo** with three apps (Admin, Provider, Customer) sharing a unified service layer.

**Active Focus**: Provider App - Business onboarding, booking management, and service configuration.

## Critical Architecture Patterns

### Monorepo Structure & Dependencies

```
roam-platform/
├── packages/
│   └── shared/                     # @roam/shared - MUST build before apps
├── roam-admin-app/                 # Port 5175, API 3001
├── roam-provider-app/              # Port 5177, API 3002 (Active Development)
└── roam-customer-app/              # Port 5174, API 3004
```

**Build Order Matters**: Always `cd packages/shared && npm run build` before building apps. Apps depend on `@roam/shared` via `"file:../packages/shared"` workspace reference.

**Development Commands**:
- `npm run dev` (root) - Starts all apps via Turbo
- `npm run dev:provider` - Provider app only (client 5177 + server 3002)
- Build: `turbo run build` or per-app `npm run build`

### Database Query Patterns (PostgreSQL via Supabase)

**CRITICAL**: Always check `DATABASE_SCHEMA_REFERENCE.md` before writing queries. Field naming is inconsistent between tables:

```typescript
// ❌ WRONG - Field name mismatches cause runtime errors
customer_locations.address_line1    // Doesn't exist! Use street_address
services.service_name               // Doesn't exist! Use name
business_locations.zip_code         // Doesn't exist! Use postal_code

// ✅ CORRECT - Use confirmed field names
customer_locations.street_address, unit_number, zip_code
business_locations.address_line1, address_line2, postal_code
services.name (NOT service_name)
```

**PostgreSQL Enum Querying** - PostgREST doesn't support enum casting:
```typescript
// ❌ FAILS with 406 error
.eq("service_category_type", "beauty")
.eq("service_category_type::text", "beauty")

// ✅ WORKS - Fetch all, filter client-side
const { data } = await supabase.from("service_categories").select("*");
const beauty = data?.find(cat => cat.service_category_type === "beauty");
```

See `ENUM_TYPES_REFERENCE.md` for complete enum handling guide.

### API Development Standards (Vercel Serverless Functions)

**Use Vercel Serverless Functions** (NOT Edge Runtime). Edge Runtime caused production issues in Oct 2025.

**Standard API Template** (`api/*.ts`):
```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. CORS headers (always required)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  // 2. Initialize Supabase INSIDE handler (not at module level)
  if (!process.env.VITE_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Server configuration error' });
  }
  
  const supabase = createClient(
    process.env.VITE_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY  // Bypasses RLS for admin operations
  );

  // 3. Validate parameters
  const { business_id } = req.query;
  if (!business_id) {
    return res.status(400).json({ error: 'business_id required' });
  }

  try {
    // 4. Execute query with error handling
    const { data, error } = await supabase
      .from('bookings')
      .select('*, customer_profiles(first_name, last_name)')
      .eq('business_id', business_id);

    if (error) {
      console.error('DB Error:', error);
      return res.status(500).json({ error: 'Failed to fetch data', details: error.message });
    }

    return res.status(200).json({ data });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

**Key Points**:
- Always return JSON (never HTML error pages)
- Initialize Supabase client INSIDE handler function
- Use `SUPABASE_SERVICE_ROLE_KEY` for admin operations (bypasses RLS)
- Log errors for debugging: `console.error('Context:', error)`
- See `API_ARCHITECTURE.md` for comprehensive patterns

### Service Hierarchy & Junction Tables

ROAM uses a **4-level service hierarchy** with junction tables for many-to-many relationships:

```
1. Categories (beauty, fitness, therapy)
   └─ business_service_categories (junction)
2. Subcategories (esthetician, personal_trainer, massage_therapy)
   └─ business_service_subcategories (junction)
3. Services (specific offerings with base pricing)
   └─ business_services (junction + business_price override)
4. Add-Ons (CBD Oil, Hot Stones, etc.)
   └─ service_addon_eligibility + business_addons (junctions)
```

**Why Junction Tables?**: Enable relationship metadata (pricing, active status, timestamps) and proper CASCADE deletes. See `BUSINESS_SERVICE_RELATIONSHIPS.md` for complete architecture.

**Common Query Pattern**:
```typescript
// Get business services with full hierarchy
const { data } = await supabase
  .from('business_services')
  .select(`
    id, business_price, is_active, delivery_type,
    services (
      id, name, description, duration_minutes,
      service_subcategories (
        service_subcategory_type,
        service_categories (service_category_type)
      )
    )
  `)
  .eq('business_id', businessId);
```

### User Role Architecture

**All users start in `auth.users`**, then map to role-specific tables:

- **Customer** → `customer_profiles` (role: customer)
- **Admin** → `admin_users` (role: admin)
- **Provider** → `providers` (roles: Owner, Dispatcher, Provider)

**Auth Flow**: `auth.users` (base auth) → Role assignment → Role-specific table created → Role-specific data stored.

Never assume a user_id exists in role tables - always check or handle missing records gracefully.

### Environment Variables

**Client** (VITE_ prefix):
```bash
VITE_PUBLIC_SUPABASE_URL=https://project.supabase.co
VITE_PUBLIC_SUPABASE_ANON_KEY=eyJ...
VITE_STRIPE_PUBLISHABLE_KEY=pk_...
```

**Server** (API routes):
```bash
VITE_PUBLIC_SUPABASE_URL=https://project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Bypasses RLS
STRIPE_SECRET_KEY=sk_...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
```

**Access Pattern**:
- Client: `import.meta.env.VITE_*`
- Server: `process.env.*`
- Shared package: Use `packages/shared/src/config/environment.ts` wrapper

## Common Workflows

### Building After Shared Package Changes

```bash
# 1. Build shared package first
cd packages/shared && npm run build

# 2. Then build/run apps
cd ../../roam-provider-app && npm run dev
```

**Troubleshooting TypeScript Errors**: If you see "Cannot find module '@roam/shared'", rebuild shared package.

### Adding a New API Endpoint

1. Create `api/endpoint-name.ts` (use template above)
2. Add route to `vercel.json`:
   ```json
   {
     "source": "/api/endpoint-name",
     "destination": "/api/endpoint-name.ts"
   }
   ```
3. Always check `DATABASE_SCHEMA_REFERENCE.md` for field names
4. Test locally: `curl http://localhost:5177/api/endpoint-name?param=value`

### Working with Bookings

Bookings are the platform's core entity. **Key relationships**:
```sql
bookings
  ├─ customer_id → customer_profiles
  ├─ provider_id → providers  
  ├─ service_id → services
  ├─ business_id → business_profiles
  ├─ customer_location_id → customer_locations
  ├─ business_location_id → business_locations
  └─ booking_addons → service_addons (many-to-many)
```

**Standard booking query pattern** in `api/bookings.ts`:
```typescript
const { data } = await supabase
  .from('bookings')
  .select(`
    *,
    customer_profiles (id, first_name, last_name, email, phone),
    customer_locations (street_address, city, state, zip_code),
    business_locations (address_line1, city, state, postal_code),
    services (id, name, duration_minutes),
    providers (id, first_name, last_name)
  `)
  .eq('business_id', business_id)
  .order('created_at', { ascending: false });
```

## Testing & Debugging

**Port Configuration**:
- Admin: Client 5175, Server 3001
- Provider: Client 5177, Server 3002
- Customer: Client 5174, Server 3004

**Kill stuck processes**: `pkill -9 node && sleep 2`

**Check API logs**: Vercel Dashboard → Functions → Real-time logs

**Common 406 Errors**: Enum query issue - see "PostgreSQL Enum Querying" above

**Database Inspection**: Use Supabase SQL Editor to test queries before implementing

## Documentation Reference

- `DATABASE_SCHEMA_REFERENCE.md` - **Check FIRST** before any query (60+ tables)
- `API_ARCHITECTURE.md` - Complete API patterns, CORS, error handling
- `BUSINESS_SERVICE_RELATIONSHIPS.md` - Junction table architecture explained
- `ENUM_TYPES_REFERENCE.md` - PostgreSQL enum types and Supabase query workarounds
- `README.md` - Monorepo setup, shared packages, development standards

## Style Conventions

- **React**: Functional components with TypeScript, hooks for state
- **UI**: Radix UI primitives + Tailwind CSS (configured per-app)
- **State**: React Query (@tanstack/react-query) for server state
- **Forms**: React Hook Form + Zod validation (schemas in @roam/shared)
- **Naming**: camelCase for JS/TS, snake_case for database fields
- **Imports**: Use path aliases (`@/` for app code, `@roam/shared` for shared)

## Anti-Patterns to Avoid

❌ **Don't** use Edge Runtime (`export const runtime = 'edge'`)  
❌ **Don't** initialize Supabase at module level in API routes  
❌ **Don't** guess database field names - always check reference docs  
❌ **Don't** use `.eq()` directly on enum columns - fetch and filter client-side  
❌ **Don't** forget CORS headers in API responses  
❌ **Don't** expose SUPABASE_SERVICE_ROLE_KEY to client  
❌ **Don't** build apps without first building `packages/shared`

## Integration Points

**Stripe**: Connect for provider payouts, Checkout for bookings, Identity Verification for onboarding  
**Twilio**: Conversations API for messaging, SMS for notifications  
**Plaid**: Bank account linking for provider payouts  
**Supabase**: PostgreSQL database + Auth + Storage (RLS for security)

All integrations use environment variables - never hardcode keys.

---

*For questions or unclear patterns, reference the comprehensive markdown docs in project root. They contain working code examples and common pitfalls.*
