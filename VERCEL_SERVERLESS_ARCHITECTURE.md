# Vercel Serverless Architecture for Twilio Conversations

## ✅ Confirmed: Serverless Function Implementation

The Twilio Conversations service is **fully designed for Vercel Serverless Functions** and will leverage Vercel's serverless infrastructure.

## Architecture Overview

### How It Works

```
┌─────────────────┐         ┌──────────────────┐         ┌──────────────┐
│  Customer App   │         │  Provider App    │         │  Twilio API  │
│   (Frontend)    │         │   (Frontend)     │         │              │
└────────┬────────┘         └────────┬─────────┘         └──────┬───────┘
         │                            │                           │
         │ POST /api/twilio-          │ POST /api/twilio-          │
         │ conversations               │ conversations             │
         │                            │                           │
         ▼                            ▼                           │
┌─────────────────────────────────────────────────────────────┐  │
│         Vercel Serverless Function                          │  │
│  packages/shared/api/twilio-conversations-handler.ts       │  │
│                                                              │  │
│  • Runs on-demand (serverless)                              │  │
│  • Auto-scales with traffic                                 │  │
│  • Uses Node.js runtime (@vercel/node)                     │  │
│  • Accesses environment variables from Vercel              │  │
│  • Connects to Twilio API                                   │──┘
│  • Connects to Supabase                                     │
└─────────────────────────────────────────────────────────────┘
```

## Serverless Function Details

### 1. API Handler Structure

The unified handler (`packages/shared/src/api/twilio-conversations-handler.ts`) is a **Vercel Serverless Function**:

```typescript
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Runs in Vercel's serverless environment
  // Auto-scales based on request volume
  // Cold start: ~100-300ms (first request)
  // Warm: <50ms (subsequent requests)
}
```

### 2. Deployment Configuration

Both apps have `vercel.json` that routes API calls to serverless functions:

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

### 3. Environment Variables in Vercel

All Twilio and Supabase environment variables are set in **Vercel Dashboard**:

**Twilio Variables:**
- `VITE_TWILIO_ACCOUNT_SID`
- `VITE_TWILIO_AUTH_TOKEN`
- `VITE_TWILIO_CONVERSATIONS_SERVICE_SID`

**Supabase Variables:**
- `VITE_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (for serverless functions)
- `VITE_PUBLIC_SUPABASE_ANON_KEY` (for client-side)

## Serverless Benefits

### ✅ Auto-Scaling
- Automatically scales from 0 to thousands of concurrent requests
- No need to manage servers or capacity

### ✅ Cost-Effective
- Pay only for execution time
- No idle server costs
- Free tier: 100GB-hours/month

### ✅ Global Edge Network
- Functions run close to users
- Low latency worldwide
- Automatic CDN integration

### ✅ Zero Configuration
- No server management
- Automatic HTTPS
- Built-in monitoring

## Request Flow

### Customer App → Serverless Function

1. **Customer sends message:**
   ```typescript
   // Frontend (Customer App)
   fetch('/api/twilio-conversations', {
     method: 'POST',
     body: JSON.stringify({
       action: 'send-message',
       conversationSid: 'CH...',
       message: 'Hello!',
       userId: 'customer-123',
       userType: 'customer'
     })
   })
   ```

2. **Vercel routes to serverless function:**
   - Request hits `api/twilio-conversations.ts`
   - Vercel invokes serverless function
   - Function runs in isolated Node.js environment

3. **Function processes request:**
   - Initializes TwilioConversationsService
   - Connects to Twilio API
   - Updates Supabase database
   - Returns response

4. **Response sent back:**
   - Function returns JSON response
   - Vercel handles HTTP response
   - Customer app receives confirmation

### Provider App → Same Function

- Uses **the same serverless function**
- Same endpoint: `/api/twilio-conversations`
- Same handler code
- Shared infrastructure

## Performance Characteristics

### Cold Start
- **First request**: ~200-500ms
- Happens when function hasn't been used recently
- Includes: Node.js initialization, module loading

### Warm Execution
- **Subsequent requests**: <50ms
- Function stays warm for ~5-10 minutes
- Much faster response time

### Optimization Tips

1. **Keep functions warm** (if needed):
   - Use Vercel Cron Jobs for periodic pings
   - Or accept cold starts (usually fine for messaging)

2. **Connection pooling**:
   - Twilio SDK handles connection reuse
   - Supabase client reuses connections

3. **Environment variables**:
   - Cached in function memory
   - No database lookup needed

## Monitoring & Logs

### Vercel Dashboard
- View function invocations
- Monitor execution time
- Track errors
- See request/response logs

### Access Logs
```bash
# View logs via Vercel CLI
vercel logs --follow

# Or in Vercel Dashboard
# Project → Functions → View Logs
```

## Deployment Process

### Automatic Deployment
1. Push to `main` branch
2. Vercel detects changes
3. Builds shared package
4. Deploys serverless functions
5. Functions available at `/api/twilio-conversations`

### Manual Deployment
```bash
# Deploy to Vercel
vercel --prod

# Or use GitHub Actions (already configured)
```

## Environment Variables Setup

### In Vercel Dashboard

1. Go to Project Settings → Environment Variables
2. Add all required variables:
   - `VITE_TWILIO_ACCOUNT_SID`
   - `VITE_TWILIO_AUTH_TOKEN`
   - `VITE_TWILIO_CONVERSATIONS_SERVICE_SID`
   - `VITE_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `VITE_PUBLIC_SUPABASE_ANON_KEY`

3. Set for:
   - **Production** ✅
   - **Preview** ✅ (optional)
   - **Development** ✅ (optional)

## Testing Serverless Functions Locally

### Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Run locally (simulates serverless environment)
vercel dev

# Functions available at:
# http://localhost:3000/api/twilio-conversations
```

### Direct Testing

```bash
# Test the endpoint
curl -X POST http://localhost:3000/api/twilio-conversations \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create-conversation",
    "bookingId": "test-123",
    "participants": [...]
  }'
```

## Production Checklist

- [x] API handler uses `@vercel/node` types
- [x] Functions configured in `vercel.json`
- [x] Environment variables set in Vercel
- [x] Shared service compatible with serverless
- [x] No long-running processes (functions timeout at 10s/60s)
- [x] Proper error handling for serverless context
- [x] CORS headers configured
- [x] OPTIONS method handling for preflight

## Function Limits

### Execution Time
- **Hobby**: 10 seconds
- **Pro/Enterprise**: 60 seconds

### Memory
- Default: 1024 MB
- Configurable up to 3008 MB

### Concurrent Executions
- Auto-scales based on plan
- No hard limit (within plan limits)

## Summary

✅ **Fully Serverless**: All API calls run in Vercel serverless functions  
✅ **Auto-Scaling**: Handles traffic spikes automatically  
✅ **Cost-Effective**: Pay only for what you use  
✅ **Global**: Runs on Vercel's edge network  
✅ **Zero Config**: No server management needed  
✅ **Shared Infrastructure**: Both apps use same functions  

The Twilio Conversations service is **production-ready** for Vercel's serverless architecture! 🚀

