# 🚀 ROAM Platform Implementation Guide

*A comprehensive reference for developers working on the ROAM platform*

---

## 📋 Table of Contents

1. [Platform Architecture](#platform-architecture)
2. [Database Schema Reference](#database-schema-reference)
3. [API Patterns & Best Practices](#api-patterns--best-practices)
4. [Frontend Components & Hooks](#frontend-components--hooks)
5. [Authentication & Authorization](#authentication--authorization)
6. [File Structure & Organization](#file-structure--organization)
7. [Deployment & Environment Setup](#deployment--environment-setup)
8. [Common Issues & Solutions](#common-issues--solutions)
9. [Testing Strategies](#testing-strategies)
10. [Performance Optimizations](#performance-optimizations)

---

## 🏗 Platform Architecture

### App Structure
The ROAM platform consists of multiple applications within a monorepo:

```
roam-platform/
├── roam-admin-app/          # Admin dashboard (React/Vite + Express)
├── roam-provider-app/       # Provider dashboard (React/Vite + Express)
├── roam-customer-app/       # Customer interface (React/Vite + Express)
├── packages/
│   ├── shared/              # Shared utilities, types, and APIs
│   ├── auth-service/        # Authentication microservice
│   ├── notification-service/# Notification microservice
│   └── payment-service/     # Payment processing microservice
└── quickstart/              # Development quickstart templates
```

### Technology Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Express.js + TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Deployment**: Vercel (Frontend + Serverless Functions)
- **Styling**: Tailwind CSS + shadcn/ui components

### Deployment Architecture
- **Development**: Local Express servers + Supabase
- **Production**: Vercel serverless functions + Supabase
- **API Format**: Next.js App Router format for Vercel compatibility

---

## 🗄 Database Schema Reference

⚠️ **CRITICAL**: Always check the dedicated [DATABASE_SCHEMA_REFERENCE.md](./DATABASE_SCHEMA_REFERENCE.md) file before implementing any database queries.

### Quick Schema Reminders

#### `customer_locations`
✅ **CONFIRMED WORKING SCHEMA**
```sql
create table public.customer_locations (
  id uuid not null default gen_random_uuid (),
  customer_id uuid not null,
  location_name character varying(255) not null,
  street_address text not null,              -- ⚠️ NOT address_line1
  unit_number character varying(50) null,    -- ⚠️ NOT address_line2
  city character varying(100) not null,
  state character varying(50) not null,
  zip_code character varying(10) not null,   -- ⚠️ NOT postal_code
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

#### `business_locations`
✅ **CONFIRMED WORKING SCHEMA**
```sql
-- Uses different naming convention than customer_locations
address_line1 text not null,      -- Different from customer_locations
address_line2 text null,          -- Different from customer_locations  
postal_code varchar(10) not null, -- Different from customer_locations
```

#### `services`
✅ **CONFIRMED WORKING SCHEMA**
```sql
create table public.services (
  id uuid not null default gen_random_uuid (),
  subcategory_id uuid not null,
  name text not null,                    -- ⚠️ NOT service_name
  description text null,
  min_price numeric not null,
  duration_minutes integer not null,
  image_url text null,
  is_active boolean null default true,
  created_at timestamp with time zone null default now(),
  is_featured boolean null default false,
  is_popular boolean null default false,
  constraint services_pkey primary key (id),
  constraint services_subcategory_id_fkey foreign KEY (subcategory_id) references service_subcategories (id)
);
```

### Schema Naming Conventions
| Table | Address Field 1 | Address Field 2 | Postal Code | Service Name Field |
|-------|----------------|----------------|-------------|-------------------|
| `customer_locations` | `street_address` | `unit_number` | `zip_code` | N/A |
| `business_locations` | `address_line1` | `address_line2` | `postal_code` | N/A |
| `services` | N/A | N/A | N/A | `name` (not `service_name`) |

⚠️ **CRITICAL**: Always use the correct field names for each table to avoid database errors.

---

## 🔌 API Patterns & Best Practices

### Vercel Serverless Functions
✅ **CONFIRMED WORKING PATTERN**

#### File Structure
```
api/
├── business/
│   ├── services.ts          # CRUD operations for business services
│   └── eligible-services.ts # Get eligible services for business
└── [other-endpoints].ts
```

#### Function Template
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// ✅ SAFE INITIALIZATION PATTERN
let supabaseAdmin: any;
try {
  if (!process.env.VITE_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing required environment variables');
    throw new Error('Missing required environment variables');
  }
  
  supabaseAdmin = createClient(
    process.env.VITE_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
} catch (error) {
  console.error('Failed to initialize Supabase client:', error);
}

export async function GET(request: NextRequest) {
  try {
    // ✅ ALWAYS CHECK CLIENT INITIALIZATION
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error', details: 'Database connection failed' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Your logic here...
    
    return NextResponse.json(data, { headers: corsHeaders });
  } catch (error) {
    console.error('Error in API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// ✅ ALWAYS INCLUDE OPTIONS FOR CORS
export async function OPTIONS() {
  return new NextResponse('ok', { headers: corsHeaders });
}
```

### Environment Variables
✅ **CONFIRMED WORKING CONFIG**
```bash
# Required for all Vercel functions
VITE_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Error Handling Best Practices
```typescript
// ✅ GOOD: Return JSON errors, not HTML
return NextResponse.json(
  { error: 'Specific error message', details: 'Additional context' },
  { status: 500, headers: corsHeaders }
);

// ❌ BAD: Throwing unhandled errors returns HTML
throw new Error('This returns HTML in production');
```

---

## ⚛️ Frontend Components & Hooks

### React Hook Patterns

#### Supabase Query Hook Pattern
✅ **CONFIRMED WORKING PATTERN**
```typescript
// useBookings.ts example
export function useBookings(providerData: any, business: any) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);

  const loadData = async () => {
    if (!business?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          customer_locations (
            id,
            street_address,    -- ✅ Correct field name
            unit_number,       -- ✅ Correct field name
            city,
            state,
            zip_code          -- ✅ Correct field name
          )
        `)
        .eq("business_id", business.id);

      if (error) throw error;
      setData(data || []);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [business?.id]);

  return { data, loading, loadData };
}
```

### Component Organization
```
components/
├── dashboard/
│   ├── components/          # Page-specific components
│   │   ├── BookingsTab.tsx
│   │   ├── ServicesTab.tsx
│   │   └── bookings/
│   │       └── hooks/       # Component-specific hooks
│   │           └── useBookings.ts
│   └── pages/              # Route components
└── shared/                 # Reusable components
    ├── ui/                 # shadcn/ui components
    └── forms/              # Form components
```

---

## 🔐 Authentication & Authorization

### Supabase Auth Integration
```typescript
// Auth context pattern
const { data: session } = await supabase.auth.getSession();
const user = session?.user;

// RLS (Row Level Security) queries
const { data } = await supabase
  .from('user_specific_table')
  .select('*')
  .eq('user_id', user.id);  // Automatically filtered by RLS
```

---

## 📁 File Structure & Organization

### App-Specific Structure
```
roam-provider-app/
├── api/                    # Vercel serverless functions
│   └── business/
├── client/                 # Frontend React app
│   ├── components/
│   ├── hooks/
│   ├── lib/               # Utilities (supabase client, etc.)
│   ├── pages/
│   └── utils/
├── public/                # Static assets
├── server/                # Express server (development only)
├── package.json
├── vite.config.ts         # Client build config
├── vite.config.server.ts  # Server build config
└── vercel.json           # Vercel deployment config
```

### Shared Package Structure
```
packages/shared/
├── src/
│   ├── api/               # Unified API classes
│   ├── types/             # TypeScript type definitions
│   ├── hooks/             # Reusable React hooks
│   └── utils/             # Utility functions
├── package.json
└── tsconfig.json
```

---

## 🚀 Deployment & Environment Setup

### Build Process
✅ **CONFIRMED WORKING BUILD**
```bash
# Provider app build
npm run build
# Runs: clean → shared build → client build → server build
```

### Vercel Configuration
```json
{
  "functions": {
    "api/**/*.ts": {
      "runtime": "@vercel/node"
    }
  },
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    }
  ]
}
```

### Environment Variables Setup
- **Development**: `.env.local` files
- **Production**: Vercel dashboard environment variables
- **Required vars**: `VITE_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

---

## 🐛 Common Issues & Solutions

### Database Schema Mismatches
❌ **ISSUE**: Column does not exist errors
✅ **SOLUTION**: Always reference the correct table schemas

```typescript
// ❌ Wrong - will cause "column does not exist" error
customer_locations.address_line1

// ✅ Correct - matches actual database schema  
customer_locations.street_address
```

### Vercel Function Crashes
❌ **ISSUE**: Functions return HTML error pages instead of JSON
✅ **SOLUTION**: Always initialize Supabase client safely

```typescript
// ✅ Safe initialization prevents crashes
let supabaseAdmin: any;
try {
  if (!process.env.VITE_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing environment variables');
  }
  supabaseAdmin = createClient(/* ... */);
} catch (error) {
  console.error('Failed to initialize Supabase client:', error);
}

// ✅ Always check before using
if (!supabaseAdmin) {
  return NextResponse.json(
    { error: 'Database connection failed' },
    { status: 500, headers: corsHeaders }
  );
}
```

### CORS Issues
❌ **ISSUE**: Cross-origin request blocked
✅ **SOLUTION**: Always include CORS headers and OPTIONS handler

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

export async function OPTIONS() {
  return new NextResponse('ok', { headers: corsHeaders });
}
```

---

## 🧪 Testing Strategies

### Manual Testing Checklist
- [ ] Build completes without errors
- [ ] API endpoints return JSON (not HTML)
- [ ] Database queries use correct column names
- [ ] Environment variables are properly configured
- [ ] CORS headers are included

### Error Monitoring
```typescript
// Always log errors with context
console.error('Error details:', {
  message: error.message,
  endpoint: '/api/business/services',
  timestamp: new Date().toISOString(),
  environment: process.env.NODE_ENV
});
```

---

## ⚡ Performance Optimizations

### Database Query Optimization
```typescript
// ✅ Efficient: Select only needed fields
.select('id, name, price, created_at')

// ✅ Efficient: Use pagination for large datasets  
.range(offset, offset + limit - 1)

// ✅ Efficient: Avoid deep joins when possible
// Fetch related data separately if needed
```

### React Performance
```typescript
// ✅ Memoize expensive calculations
const expensiveValue = useMemo(() => {
  return heavyCalculation(data);
}, [data]);

// ✅ Debounce search inputs
const debouncedSearch = useDebounce(searchTerm, 300);
```

---

## 📝 Implementation Tracking

### ✅ Confirmed Working Features

#### API Endpoints
- [x] `/api/business/services` - CRUD operations for business services
- [x] `/api/business-eligible-services` - Get eligible services
- [x] Environment variable validation in serverless functions
- [x] CORS handling in Vercel functions

#### Database Operations
- [x] `customer_locations` table queries with correct schema
- [x] Supabase client initialization with error handling
- [x] Business services queries with pagination

#### Frontend Components
- [x] `useBookings` hook with proper database schema
- [x] BookingsTab component with location display
- [x] Services management with proper validation

### 🚧 Known Issues to Watch For
- [ ] Schema mismatches between customer_locations and business_locations
- [ ] Serverless function environment variable failures
- [ ] CORS configuration in new API endpoints

---

## 🔄 Change Log

### 2025-10-01
- ✅ Fixed bookings database schema mismatch (customer_locations)
- ✅ Implemented safe Supabase client initialization pattern
- ✅ Added comprehensive error handling to API functions
- ✅ Documented working database schemas and API patterns

---

## 📞 Quick Reference Commands

```bash
# Build all apps
npm run build

# Run development server
npm run dev

# Clean build artifacts
npm run clean

# Build shared packages
cd packages/shared && npm run build
```

---

*This guide is a living document. Update it whenever you confirm a working implementation or discover a solution to a common problem.*