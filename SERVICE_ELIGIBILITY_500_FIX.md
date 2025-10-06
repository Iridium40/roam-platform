# Service Eligibility 500 Error - Server Not Running

**Date:** October 6, 2025  
**Status:** ✅ Solution Identified

## Error

```
GET http://localhost:5177/api/business/service-eligibility?business_id=... 
net::ERR_ABORTED 500 (Internal Server Error)

Error loading service eligibility: Error: Failed to load service eligibility: Internal Server Error
```

## Root Cause

The **server is not running** on port 3002. 

### Evidence:
1. Client makes request to `http://localhost:5177/api/business/service-eligibility`
2. Vite proxy forwards to `http://localhost:3002/api/business/service-eligibility`
3. Server on port 3002 is not running (last exit code: 1)
4. Request fails with 500 error

### Vite Proxy Configuration (Correct):
```typescript
// vite.config.ts
server: {
  port: 5177,
  proxy: {
    '/api': {
      target: 'http://localhost:3002',
      changeOrigin: true,
    },
  },
}
```

## Solution

### Step 1: Start the Backend Server

Open a new terminal and run:

```bash
cd /Users/alans/Desktop/ROAM/roam-platform/roam-provider-app
npm run dev:server
```

**Expected Output:**
```
Provider app server running on port 3002
Server is ready to accept connections
```

### Step 2: Verify Server is Running

In another terminal, test the endpoint directly:

```bash
curl "http://localhost:3002/api/business/service-eligibility?business_id=a3b483e5-b375-4a83-8c1e-223452f23397"
```

**Expected Response:**
```json
{
  "business_id": "...",
  "approved_categories": [...],
  "approved_subcategories": [...],
  "stats": { ... }
}
```

### Step 3: Start the Frontend Client

In another terminal:

```bash
cd /Users/alans/Desktop/ROAM/roam-platform
npm run dev:client
```

**Expected Output:**
```
VITE v4.x.x  ready in xxx ms

➜  Local:   http://localhost:5177/
```

### Step 4: Test in Browser

Navigate to:
```
http://localhost:5177/owner/business-settings
```

Click on the **Services** tab - should now load categories successfully!

## How the Request Flow Works

```
Browser                    Vite Dev Server         Express Server
  │                             │                        │
  ├─── GET /api/business/... ──>│                        │
  │                             │                        │
  │                             ├─ Proxy forwards ──────>│
  │                             │                        │
  │                             │           ┌────────────┤
  │                             │           │ requireAuth (dev bypass)
  │                             │           │            │
  │                             │           │ getServiceEligibility()
  │                             │           │            │
  │                             │           │ Query Supabase
  │                             │           │            │
  │                             │<─── Response ──────────┤
  │<──── JSON data ─────────────┤                        │
  │                             │                        │
```

### Port Summary:
- **5177**: Vite dev server (frontend)
- **3002**: Express server (backend API)
- Vite proxies `/api/*` requests to Express server

## Common Issues & Solutions

### Issue 1: "npm run dev:server" fails

**Check for:**
- Missing `.env` file
- Missing environment variables
- Port 3002 already in use

**Solution:**
```bash
# Check if port 3002 is in use
lsof -i :3002

# Kill process if needed
kill -9 <PID>

# Check .env file exists
ls -la /Users/alans/Desktop/ROAM/roam-platform/roam-provider-app/.env

# Verify environment variables
cat .env | grep -E "VITE_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY"
```

### Issue 2: Server starts but requests still fail

**Check for:**
- Firewall blocking localhost
- Server crashed after startup
- Wrong port in vite.config.ts

**Solution:**
```bash
# Test server directly (bypass Vite)
curl http://localhost:3002/ping

# Should return: "pong"
```

### Issue 3: Documents endpoint also fails

Both endpoints (service-eligibility and documents) need the server running.

**After starting server, both should work:**
- ✅ `/api/business/service-eligibility`  
- ✅ `/api/business/documents`
- ✅ `/api/business/hours`

## Development Workflow

### Recommended: Run both servers in separate terminals

**Terminal 1 - Backend:**
```bash
cd roam-provider-app
npm run dev:server
```

**Terminal 2 - Frontend:**
```bash
cd roam-platform
npm run dev:client
```

### Alternative: Use tmux or screen

```bash
# Start backend in background
cd roam-provider-app && npm run dev:server &

# Start frontend
cd .. && npm run dev:client
```

## Verification Checklist

After starting both servers:

- [ ] Server shows "Provider app server running on port 3002"
- [ ] Client shows "Local: http://localhost:5177/"
- [ ] Navigate to http://localhost:5177
- [ ] Login works
- [ ] Navigate to /owner/business-settings
- [ ] Services tab loads (no 500 error)
- [ ] Documents tab loads (no 500 error)
- [ ] Hours tab works
- [ ] Can make edits and save

## Quick Fix Commands

```bash
# Kill all dev processes
pkill -f "npm run dev" || true
pkill -f "vite" || true
pkill -f "tsx" || true

# Start fresh
cd /Users/alans/Desktop/ROAM/roam-platform/roam-provider-app
npm run dev:server &

cd /Users/alans/Desktop/ROAM/roam-platform
npm run dev:client
```

## Summary

The 500 error is caused by the backend server not running. Once you start the server on port 3002, all API requests will work correctly:

1. ✅ Service eligibility will load
2. ✅ Documents will load
3. ✅ All other API endpoints will work

The Vite proxy configuration is correct and doesn't need changes. Just ensure both servers are running!
