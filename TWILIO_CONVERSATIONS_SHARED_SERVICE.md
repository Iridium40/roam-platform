# Twilio Conversations Shared Service Implementation

## Overview

The Twilio Conversations implementation has been consolidated into a **shared service** located in `packages/shared/src/services/twilio/`. This unified service provides messaging functionality for both the Customer App and Provider App.

## Architecture

### Shared Services Structure

```
packages/shared/src/services/twilio/
├── types.ts                          # TypeScript types and interfaces
├── ConversationService.ts            # Twilio conversation management
├── ParticipantService.ts             # Participant management
├── MessageService.ts                 # Message operations
├── TwilioConversationsService.ts     # Unified service with Supabase integration
└── index.ts                          # Exports
```

### Database Schema

The service integrates with the following Supabase tables:

1. **`conversation_metadata`**
   - Stores Twilio conversation SIDs and booking associations
   - Tracks conversation type, participant count, and last message timestamp
   - Fields: `id`, `booking_id`, `twilio_conversation_sid`, `conversation_type`, `participant_count`, `is_active`, `last_message_at`

2. **`conversation_participants`**
   - Maps users to conversations
   - Tracks participant status and read receipts
   - Fields: `id`, `conversation_id`, `user_id`, `user_type`, `twilio_participant_sid`, `is_active`, `joined_at`, `left_at`, `last_read_at`

3. **`message_notifications`**
   - Tracks unread messages for users
   - Fields: `id`, `conversation_id`, `user_id`, `message_sid`, `notification_type`, `is_read`, `read_at`

4. **`message_analytics`**
   - Stores conversation analytics
   - Fields: `id`, `conversation_id`, `booking_id`, `message_count`, `participant_count`, `first_message_at`, `last_message_at`, `average_response_time_minutes`

## Key Features

### 1. Unified TwilioConversationsService

The main service class (`TwilioConversationsService`) provides:

- **Booking Conversation Management**
  - `createBookingConversation()` - Creates or retrieves existing conversation for a booking
  - `getConversationByBookingId()` - Finds conversation by booking ID
  - Automatic participant management

- **Message Operations**
  - `sendMessage()` - Sends messages with automatic notification creation
  - `getMessages()` - Retrieves messages from Twilio
  - `markAsRead()` - Marks messages as read for a user

- **User Operations**
  - `getConversationsForUser()` - Lists all conversations for a user
  - `getUnreadCount()` - Gets unread message count

### 2. Individual Service Classes

For advanced operations, individual services are available:

- **ConversationService** - Conversation CRUD operations
- **ParticipantService** - Participant management
- **MessageService** - Message operations

### 3. Unified API Handler

A shared API handler (`packages/shared/src/api/twilio-conversations-handler.ts`) can be used by both apps:

```typescript
import twilioConversationsHandler from '@roam/shared/api/twilio-conversations-handler';
```

## Usage

### In Customer App or Provider App

```typescript
import { createTwilioConversationsService } from '@roam/shared';

// Initialize service
const conversationsService = createTwilioConversationsService();

// Create conversation for a booking
const result = await conversationsService.createBookingConversation(
  bookingId,
  [
    { userId: customerId, userType: 'customer', userName: 'John Doe' },
    { userId: providerId, userType: 'provider', userName: 'Jane Smith' }
  ],
  'booking_chat'
);

// Send a message
await conversationsService.sendMessage(
  result.conversationSid,
  'Hello!',
  userId,
  'customer',
  bookingId
);

// Get messages
const messages = await conversationsService.getMessages(result.conversationSid);

// Mark as read
await conversationsService.markAsRead(result.conversationMetadataId, userId);
```

### API Endpoint Usage

Both apps can use the unified handler:

**Customer App** (`roam-customer-app/api/twilio-conversations.ts`):
```typescript
import twilioConversationsHandler from '@roam/shared/api/twilio-conversations-handler';
export default twilioConversationsHandler;
```

**Provider App** (`roam-provider-app/api/twilio-conversations.ts`):
```typescript
import twilioConversationsHandler from '@roam/shared/api/twilio-conversations-handler';
export default twilioConversationsHandler;
```

## Supported Actions

### Booking-Specific Actions (Legacy Support)

- `create-conversation` - Create/get conversation for booking
- `send-message` - Send message to conversation
- `get-messages` - Retrieve messages
- `mark-as-read` - Mark messages as read

### General Twilio Actions

- `create_conversation` - Create conversation
- `get_conversation` - Get conversation details
- `list_conversations` - List conversations
- `add_participant` - Add participant
- `remove_participant` - Remove participant
- `list_participants` - List participants
- `send_message` - Send message
- `list_messages` - List messages
- And many more...

## Environment Variables

Required environment variables:

```bash
# Twilio Configuration
VITE_TWILIO_ACCOUNT_SID=AC...
VITE_TWILIO_AUTH_TOKEN=...
VITE_TWILIO_CONVERSATIONS_SERVICE_SID=IS...

# Supabase Configuration
VITE_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...  # For server-side
VITE_PUBLIC_SUPABASE_ANON_KEY=...  # For client-side
```

## Migration Notes

### From Provider App Services

The provider app previously had services in:
- `roam-provider-app/api/twilio/services/conversationService.ts`
- `roam-provider-app/api/twilio/services/participantService.ts`
- `roam-provider-app/api/twilio/services/messageService.ts`

These have been moved to `packages/shared/src/services/twilio/` and can be removed from the provider app.

### From Customer App API

The customer app had a monolithic API handler in:
- `roam-customer-app/api/twilio-conversations.ts`

This can now use the shared handler or the unified service directly.

## Benefits

1. **Code Reusability** - Single implementation for both apps
2. **Consistency** - Same behavior across customer and provider apps
3. **Maintainability** - Changes in one place affect both apps
4. **Type Safety** - Shared TypeScript types ensure consistency
5. **Database Integration** - Proper Supabase integration with all conversation tables

## Next Steps

1. Update customer app to use shared service
2. Update provider app to use shared service
3. Remove duplicate code from both apps
4. Update API endpoints to use unified handler
5. Test messaging flow in both apps

