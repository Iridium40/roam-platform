# Environment Variables Centralization Migration Guide

## Overview

This guide outlines the migration from scattered environment variables across multiple apps to a centralized, validated configuration system for the ROAM Platform.

## 🎯 Goals

- **Single Source of Truth**: All environment variables defined in one place
- **Type Safety**: Zod validation for all environment variables
- **Consistent Naming**: Standardized variable names across all apps
- **Better Error Handling**: Clear error messages for missing/invalid variables
- **Development Fallbacks**: Automatic fallbacks for development environments
- **Security**: Proper separation of client-side vs server-side variables

## 📋 Current State Analysis

### ❌ Problems Identified:

1. **Inconsistent Variable Names**:
   - Provider app: `VITE_PUBLIC_SUPABASE_URL`
   - Admin app: `VITE_SUPABASE_URL`
   - Customer app: `VITE_PUBLIC_SUPABASE_URL`

2. **Scattered Configuration**:
   - Environment variables in 50+ files
   - No centralized validation
   - Inconsistent error handling

3. **Security Issues**:
   - Some server-side secrets exposed to client
   - No clear separation of concerns

4. **Development Pain**:
   - Multiple `.env` files to maintain
   - No clear documentation of required variables
   - Inconsistent fallback values

## ✅ Solution: Centralized Environment Management

### New Architecture:

```
packages/shared/src/config/
├── environment.ts          # Main configuration class
└── env.example            # Template file

.env.example               # Root template (copy to .env)
```

### Key Features:

1. **Zod Validation**: All variables validated at startup
2. **Singleton Pattern**: Single instance across all apps
3. **Type Safety**: Full TypeScript support
4. **Development Fallbacks**: Automatic fallbacks for dev environment
5. **Clear Error Messages**: Helpful error messages for missing variables

## 🔧 Migration Steps

### Step 1: Update Shared Package Dependencies

```bash
cd packages/shared
npm install zod
```

### Step 2: Create Centralized Configuration

The centralized configuration is already created in:
- `packages/shared/src/config/environment.ts`
- `packages/shared/env.example`

### Step 3: Update Application Code

#### 3.1 Update Shared Services

All shared services now use the centralized configuration:

```typescript
// Before
const apiKey = process.env.RESEND_API_KEY || '';

// After
import { env } from '@roam/shared';
const apiKey = env.email.resendApiKey;
```

#### 3.2 Update Application Config Files

Replace individual config files with centralized imports:

```typescript
// Before (roam-provider-app/client/lib/config.ts)
export const config = {
  supabase: {
    url: import.meta.env.VITE_PUBLIC_SUPABASE_URL,
    anonKey: import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY,
    serviceRoleKey: import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  // ... more config
};

// After
import { env } from '@roam/shared';
export const config = {
  supabase: env.supabase,
  stripe: env.stripe,
  twilio: env.twilio,
  email: env.email,
  // ... more config
};
```

### Step 4: Update Environment Files

#### 4.1 Root Level `.env`

Create a root-level `.env` file using the template:

```bash
cp packages/shared/env.example .env
```

#### 4.2 Application-Specific Overrides

Each app can still have app-specific overrides in their own `.env` files, but they should extend the root configuration.

### Step 5: Update Deployment Configuration

#### 5.1 Vercel Environment Variables

Update Vercel project settings to use the standardized variable names:

```env
# Required Variables
VITE_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
VITE_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable-key
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
VITE_TWILIO_ACCOUNT_SID=AC_your-twilio-account-sid
VITE_TWILIO_AUTH_TOKEN=your-twilio-auth-token
VITE_TWILIO_CONVERSATIONS_SERVICE_SID=IS_your-conversations-service-sid
RESEND_API_KEY=re_your-resend-api-key
JWT_SECRET=your-jwt-secret-key

# Optional Variables
STRIPE_WEBHOOK_SECRET=whsec_your-stripe-webhook-secret
TWILIO_FROM_NUMBER=+1234567890
PLAID_CLIENT_ID=your-plaid-client-id
PLAID_SECRET=your-plaid-secret
PLAID_ENV=sandbox
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
VITE_GOOGLE_CLIENT_ID=your-google-client-id
VITE_APP_URL=https://your-app-domain.com
VITE_API_BASE_URL=https://api.your-app-domain.com
VITE_APP_VERSION=1.0.0
```

## 📝 Required Environment Variables

### 🔴 Required (All Environments)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://your-project.supabase.co` |
| `VITE_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | `pk_test_...` |
| `STRIPE_SECRET_KEY` | Stripe secret key | `sk_test_...` |
| `VITE_TWILIO_ACCOUNT_SID` | Twilio account SID | `AC...` |
| `VITE_TWILIO_AUTH_TOKEN` | Twilio auth token | `...` |
| `VITE_TWILIO_CONVERSATIONS_SERVICE_SID` | Twilio conversations service SID | `IS...` |
| `RESEND_API_KEY` | Resend API key | `re_...` |
| `JWT_SECRET` | JWT signing secret | `your-secret-key` |

### 🟡 Optional (Development/Production)

| Variable | Description | Default |
|----------|-------------|---------|
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | `undefined` |
| `TWILIO_FROM_NUMBER` | Twilio SMS from number | `undefined` |
| `PLAID_CLIENT_ID` | Plaid client ID | `undefined` |
| `PLAID_SECRET` | Plaid secret | `undefined` |
| `PLAID_ENV` | Plaid environment | `sandbox` |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps API key | `undefined` |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID | `undefined` |
| `VITE_APP_URL` | App URL for redirects | `undefined` |
| `VITE_API_BASE_URL` | API base URL | `https://api.roamyourbestlife.com` |
| `VITE_APP_VERSION` | App version | `1.0.0` |

### 🟢 Feature Flags

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_ENABLE_REAL_TIME` | Enable real-time features | `false` |
| `VITE_ENABLE_ANALYTICS` | Enable analytics | `false` |
| `VITE_ENABLE_DEBUG_MODE` | Enable debug mode | `false` |
| `VITE_ENABLE_PERFORMANCE_MONITORING` | Enable performance monitoring | `false` |

## 🔄 Migration Checklist

### Phase 1: Shared Package Updates ✅
- [x] Create centralized environment configuration
- [x] Update shared services to use centralized config
- [x] Create environment template file
- [x] Add Zod validation

### Phase 2: Application Updates
- [ ] Update `roam-admin-app` to use centralized config
- [ ] Update `roam-provider-app` to use centralized config
- [ ] Update `roam-customer-app` to use centralized config
- [ ] Remove duplicate environment handling code

### Phase 3: Deployment Updates
- [ ] Update Vercel environment variables
- [ ] Test deployment with new configuration
- [ ] Update deployment documentation

### Phase 4: Testing & Validation
- [ ] Test all applications with centralized config
- [ ] Validate environment variable validation
- [ ] Test development fallbacks
- [ ] Test production deployment

## 🚀 Usage Examples

### Basic Usage

```typescript
import { env } from '@roam/shared';

// Access configuration
const supabaseUrl = env.supabase.url;
const stripeKey = env.stripe.publishableKey;
const twilioSid = env.twilio.accountSid;

// Check environment
if (env.isDevelopment()) {
  console.log('Running in development mode');
}

// Validate specific services
if (env.validateSupabaseConfig()) {
  console.log('Supabase is properly configured');
}
```

### Error Handling

```typescript
import { env, validateEnvironment } from '@roam/shared';

// Validate all environment variables
if (!validateEnvironment()) {
  console.error('Environment validation failed');
  process.exit(1);
}

// The centralized config will throw helpful errors:
// ❌ Environment validation failed:
//   - VITE_PUBLIC_SUPABASE_URL: Invalid Supabase URL
//   - STRIPE_SECRET_KEY: Stripe secret key is required
// 
// 🔧 Please check your .env file and ensure all required variables are set.
// 📋 See packages/shared/src/config/environment.ts for the complete list of required variables.
```

## 🔒 Security Considerations

### Client-Side vs Server-Side Variables

- **Client-Side** (prefixed with `VITE_`): Safe to expose in browser
- **Server-Side**: Never exposed to client, only available in API routes

### Sensitive Variables

These should never be exposed to the client:
- `STRIPE_SECRET_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_TWILIO_AUTH_TOKEN`
- `RESEND_API_KEY`
- `JWT_SECRET`
- `PLAID_SECRET`

## 🐛 Troubleshooting

### Common Issues

1. **"Environment validation failed"**
   - Check that all required variables are set in your `.env` file
   - Ensure variable names match exactly (case-sensitive)

2. **"Cannot find module '@roam/shared'"**
   - Ensure the shared package is properly linked
   - Run `npm install` in the root directory

3. **"Zod validation error"**
   - Check that variable values match expected formats
   - URLs should be valid URLs
   - Boolean values should be 'true' or 'false' strings

### Debug Mode

Enable debug mode to see detailed environment information:

```typescript
import { env } from '@roam/shared';

if (env.features.enableDebugMode) {
  console.log('Environment config:', env.getAllConfig());
}
```

## 📚 Additional Resources

- [Zod Documentation](https://zod.dev/)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)

## 🎉 Benefits After Migration

1. **Consistency**: All apps use the same environment variable names
2. **Type Safety**: Full TypeScript support with validation
3. **Error Prevention**: Clear error messages for missing/invalid variables
4. **Maintainability**: Single place to manage all environment configuration
5. **Security**: Clear separation of client-side vs server-side variables
6. **Development Experience**: Better error messages and fallbacks
7. **Deployment**: Simplified deployment configuration

---

**Next Steps**: Complete the application updates and test the centralized environment configuration across all apps.
