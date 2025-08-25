# Environment Variables Documentation

This document defines all environment variables used across the ROAM platform applications. All apps (customer, provider, admin) must use these exact variable names to ensure consistency.

## 🔧 Required Environment Variables

### Supabase Configuration
```bash
VITE_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
VITE_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Stripe Configuration
```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...  # Optional
```

### Twilio Configuration
```bash
VITE_TWILIO_ACCOUNT_SID=AC...
VITE_TWILIO_AUTH_TOKEN=your-auth-token
VITE_TWILIO_CONVERSATIONS_SERVICE_SID=IS...
TWILIO_FROM_NUMBER=+1234567890  # Optional
```

### Email Configuration (Resend)
```bash
RESEND_API_KEY=re_...
```

### JWT Configuration
```bash
JWT_SECRET=your-jwt-secret-key
```

## 🔧 Optional Environment Variables

### Plaid Configuration
```bash
PLAID_CLIENT_ID=your-plaid-client-id
PLAID_SECRET=your-plaid-secret
PLAID_ENV=sandbox  # sandbox, development, production
PLAID_WEBHOOK_URL=https://your-domain.com/api/plaid/webhook
```

### Google Configuration
```bash
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id
```

### App Configuration
```bash
VITE_APP_URL=https://your-app-domain.com
VITE_API_BASE_URL=https://your-api-domain.com
VITE_APP_VERSION=1.0.0
FRONTEND_URL=https://your-frontend-domain.com
```

### Feature Flags
```bash
VITE_ENABLE_REAL_TIME=true
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_DEBUG_MODE=true
VITE_ENABLE_PERFORMANCE_MONITORING=true
```

### Push Notifications
```bash
VITE_VAPID_PUBLIC_KEY=your-vapid-public-key
```

### CDN and External Services
```bash
VITE_CDN_BASE_URL=https://your-cdn-domain.com
VITE_GA_TRACKING_ID=G-XXXXXXXXXX
VITE_SENTRY_DSN=https://your-sentry-dsn
```

### Development Overrides
```bash
VITE_JWT_SECRET=your-dev-jwt-secret
VITE_RESEND_API_KEY=your-dev-resend-key
VITE_SUPABASE_URL=https://your-dev-supabase-url
VITE_SUPABASE_ANON_KEY=your-dev-supabase-key
```

### Test/Development Variables
```bash
PING_MESSAGE=ping
```

## 🚫 Deprecated Variables

The following variables should NOT be used and have been replaced:

- `VITE_SUPABASE_URL` → Use `VITE_PUBLIC_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` → Use `VITE_PUBLIC_SUPABASE_ANON_KEY`

## 📝 Usage Guidelines

### Client-Side (Vite)
For client-side code, use the shared environment configuration:

```typescript
import { env } from '@roam/shared';

// Access environment variables
const supabaseUrl = env.supabase.url;
const stripeKey = env.stripe.publishableKey;
```

### Server-Side (API Routes)
For server-side code, use the server environment configuration:

```typescript
import { serverEnv } from '@roam/shared';

// Access environment variables
const supabaseUrl = serverEnv.supabase.url;
const stripeSecret = serverEnv.stripe.secretKey;
```

### Direct Access (Legacy)
If you need direct access to environment variables:

```typescript
// Client-side
const value = import.meta.env.VITE_VARIABLE_NAME;

// Server-side
const value = process.env.VARIABLE_NAME;
```

## 🔍 Validation

The shared environment configuration automatically validates all required variables on startup. If any required variables are missing, the application will fail to start with a clear error message.

## 📋 Environment File Template

Create a `.env` file in each app directory with this template:

```bash
# Supabase
VITE_PUBLIC_SUPABASE_URL=
VITE_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Twilio
VITE_TWILIO_ACCOUNT_SID=
VITE_TWILIO_AUTH_TOKEN=
VITE_TWILIO_CONVERSATIONS_SERVICE_SID=
TWILIO_FROM_NUMBER=

# Email
RESEND_API_KEY=

# JWT
JWT_SECRET=

# Plaid (Optional)
PLAID_CLIENT_ID=
PLAID_SECRET=
PLAID_ENV=sandbox
PLAID_WEBHOOK_URL=

# Google (Optional)
VITE_GOOGLE_MAPS_API_KEY=
VITE_GOOGLE_CLIENT_ID=

# App (Optional)
VITE_APP_URL=
VITE_API_BASE_URL=
VITE_APP_VERSION=1.0.0
FRONTEND_URL=

# Features (Optional)
VITE_ENABLE_REAL_TIME=false
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG_MODE=false
VITE_ENABLE_PERFORMANCE_MONITORING=false

# Push Notifications (Optional)
VITE_VAPID_PUBLIC_KEY=

# CDN and External Services (Optional)
VITE_CDN_BASE_URL=
VITE_GA_TRACKING_ID=
VITE_SENTRY_DSN=

# Development Overrides (Optional)
VITE_JWT_SECRET=
VITE_RESEND_API_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# Test/Development (Optional)
PING_MESSAGE=ping
```

## ⚠️ Important Notes

1. **All apps must use the same variable names** - No exceptions
2. **Client-side variables must be prefixed with `VITE_`** - This is a Vite requirement
3. **Server-side variables can be accessed directly** - No prefix required
4. **Validation happens at startup** - Missing required variables will cause build failures
5. **Use the shared configuration** - Avoid direct `process.env` or `import.meta.env` access when possible
