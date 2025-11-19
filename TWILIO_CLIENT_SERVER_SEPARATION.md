# Twilio Conversations: Client/Server Code Separation

## Problem Statement

**Error**: `TypeError: Failed to resolve module specifier "twilio". Relative references must start with either "/", "./", or "../".`

**Root Cause**: Server-side Twilio service classes (which depend on the `twilio` Node.js package) were being exported from the main `@roam/shared` index, causing them to be bundled into client-side code.

## Solution Applied

### 1. Removed Server-Side Exports from Main Index

**File**: `packages/shared/src/index.ts`

**Before** (❌ Caused browser errors):
```typescript
// These server-side classes were exported from main index
export {
  ConversationService,
  ParticipantService,
  MessageService,
  TwilioConversationsService,
  createTwilioConversationsService,
  // ... etc
} from './services/twilio/index';
```

**After** (✅ Fixed):
```typescript
// ⚠️ SERVER-SIDE ONLY: Twilio service classes (contain Node.js dependencies)
// DO NOT export these from main index - they should only be imported in API routes
// Available at: @roam/shared/dist/services/twilio/* for server-side use

// Export Twilio TYPES only (safe for client-side)
export type {
  TwilioConfig,
  CreateConversationData,
  ConversationData,
  // ... all types are fine
} from './services/twilio/types';

// Client-safe exports
export * from './services/conversations';
export * from './services/booking-conversations-client';
```

### 2. Updated API Handler Imports

**File**: `packages/shared/src/api/twilio-conversations-handler.ts`

**Changed**:
```typescript
// Import server-side services directly (not from main index)
import { createTwilioConversationsService } from "../services/twilio/TwilioConversationsService.js";
import { ConversationService } from "../services/twilio/ConversationService.js";
import { ParticipantService } from "../services/twilio/ParticipantService.js";
import { MessageService } from "../services/twilio/MessageService.js";
```

## Architecture Overview

### Client-Side (Browser)
```
Customer/Provider App (Client)
  ↓ imports
@roam/shared
  ↓ exports
✅ BookingConversationsClient (client-safe, uses fetch)
✅ Types (type-only, safe)
✅ Hooks (useConversations, etc.)
❌ NO Twilio services (Node.js only)
```

### Server-Side (API Routes)
```
API Route Handler
  ↓ imports
@roam/shared/dist/api/twilio-conversations-handler
  ↓ imports
@roam/shared/dist/services/twilio/TwilioConversationsService
  ↓ imports
twilio (Node.js package) ✅ Only on server
```

## File Structure

### Client-Safe (Can be imported by browser code)
- ✅ `@roam/shared` - Main index exports
  - `BookingConversationsClient` - Uses `fetch()` to call APIs
  - All TypeScript types
  - React hooks
  - Utility functions

### Server-Only (API routes only)
- ⚠️ `@roam/shared/dist/services/twilio/*` - Direct file imports
  - `ConversationService.js`
  - `ParticipantService.js`
  - `MessageService.js`
  - `TwilioConversationsService.js`
- ⚠️ `@roam/shared/dist/api/twilio-conversations-handler` - API handler

## Usage Examples

### ✅ Correct: Client-Side Component

```typescript
// roam-customer-app/client/components/EnhancedConversationChat.tsx
import {
  createBookingConversationsClient,  // ✅ Client-safe
  type BookingConversationData,       // ✅ Type-only
  type ConversationMessageWithAuthor, // ✅ Type-only
} from '@roam/shared';

const client = createBookingConversationsClient({ accessToken });
await client.sendMessage(conversationId, message, userId, userType);
```

### ✅ Correct: API Route (Server-Side)

```typescript
// roam-provider-app/api/twilio-conversations.ts
// roam-customer-app/api/twilio-conversations.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import twilioConversationsHandler from "@roam/shared/dist/api/twilio-conversations-handler.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return twilioConversationsHandler(req, res);
}
```

### ❌ Incorrect: Don't Do This

```typescript
// ❌ WRONG: Importing server-side services in client code
import { TwilioConversationsService } from '@roam/shared';
// This would cause: "Failed to resolve module specifier 'twilio'"
```

## Build Configuration

### Vite Configuration (Client Apps)

The build process automatically:
1. Tree-shakes unused exports
2. Only bundles client-safe code
3. Excludes Node.js-specific modules

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "isolatedModules": true
  }
}
```

## Testing Checklist

- [x] Customer app builds without errors
- [x] Provider app builds without errors
- [x] No "twilio" module resolution errors in browser
- [x] API handlers can import server-side services
- [x] Client components can use BookingConversationsClient
- [x] All TypeScript types are available

## Related Files

### Modified
1. ✅ `packages/shared/src/index.ts` - Removed ALL server-side exports
2. ✅ `packages/shared/src/api/twilio-conversations-handler.ts` - Direct imports
3. ✅ `roam-customer-app/api/twilio-conversations.ts` - Uses shared handler via dist import
4. ✅ `roam-provider-app/api/twilio-conversations.ts` - Uses shared handler via dist import

### Client-Side Components (No changes needed)
- `roam-customer-app/client/components/EnhancedConversationChat.tsx`
- `roam-customer-app/client/components/ConversationChat.tsx`
- `roam-provider-app/client/components/ConversationChat.tsx`

## Key Takeaways

1. **Never export Node.js packages from main index** - They will be bundled into client code
2. **Use type-only exports** - `export type` is safe for all code
3. **Client uses fetch API** - `BookingConversationsClient` calls server endpoints
4. **Server imports directly** - API routes import from `dist/services/twilio/*`
5. **Clear separation** - Client and server code are properly isolated

## Future Considerations

### Option 1: Separate Packages (Recommended for scale)
```
@roam/shared-client  - Client-safe exports only
@roam/shared-server  - Server-side services
@roam/shared-types   - Shared TypeScript types
```

### Option 2: Export Maps (Current approach)
```json
{
  "exports": {
    ".": "./dist/index.js",              // Client-safe
    "./server": "./dist/services/twilio/*" // Server-only
  }
}
```

## Debugging Tips

If you see "Failed to resolve module specifier" errors:

1. Check what's being imported from `@roam/shared`
2. Verify it doesn't use Node.js packages (twilio, fs, path, etc.)
3. Move server-side code to direct imports: `@roam/shared/dist/...`
4. Ensure `export type` for all TypeScript types
5. Rebuild the shared package: `npm run build` in `packages/shared`

---

**Status**: ✅ Fixed and deployed  
**Last Updated**: 2025-11-18  
**Related Docs**: 
- [TWILIO_CONVERSATIONS_ROLE_DISPLAY.md](./TWILIO_CONVERSATIONS_ROLE_DISPLAY.md)
- [TWILIO_CONVERSATIONS_SHARED_SERVICE.md](./TWILIO_CONVERSATIONS_SHARED_SERVICE.md)

