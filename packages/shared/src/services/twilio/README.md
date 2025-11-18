# Twilio Conversations Shared Service

## Bidirectional Messaging Flow

This service enables **bidirectional messaging** between Customer App and Provider App for booking-related conversations.

### Customer App Flow

1. **Customer opens booking conversation:**
   ```typescript
   const service = createTwilioConversationsService();
   const result = await service.createBookingConversation(
     bookingId,
     [
       { userId: customerId, userType: 'customer', userName: 'John Doe' },
       { userId: providerId, userType: 'provider', userName: 'Jane Smith' }
     ],
     'booking_chat'
   );
   ```

2. **Customer sends message:**
   ```typescript
   await service.sendMessage(
     result.conversationSid,
     'Hello, I have a question about my booking',
     customerId,
     'customer',
     bookingId
   );
   ```

3. **Customer views messages:**
   ```typescript
   const messages = await service.getMessages(result.conversationSid);
   ```

### Provider App Flow

1. **Provider views conversations in Messages Tab:**
   ```typescript
   const service = createTwilioConversationsService();
   const conversations = await service.getConversationsForUser(
     providerId,
     'provider'
   );
   // Returns all conversations where provider is a participant
   // Includes booking details, last message time, etc.
   ```

2. **Provider opens conversation:**
   ```typescript
   // Get messages for the selected conversation
   const messages = await service.getMessages(conversationSid);
   ```

3. **Provider responds:**
   ```typescript
   await service.sendMessage(
     conversationSid,
     'Thanks for reaching out! How can I help?',
     providerId,
     'provider',
     bookingId
   );
   ```

### Shared Conversation Thread

- **Same Conversation ID**: Both apps use the same `twilio_conversation_sid`
- **Real-time Updates**: Both see new messages as they're sent
- **Message History**: Complete message history visible to both participants
- **Read Receipts**: `markAsRead()` updates read status for both users
- **Notifications**: Unread message counts tracked via `message_notifications` table

### Database Integration

The service automatically:
- Creates `conversation_metadata` entry linking booking to Twilio conversation
- Adds participants to `conversation_participants` table
- Creates `message_notifications` for unread messages
- Updates `last_message_at` timestamp
- Tracks read receipts via `last_read_at` in `conversation_participants`

### Example: Complete Flow

```typescript
// 1. Customer initiates conversation
const service = createTwilioConversationsService();
const { conversationSid } = await service.createBookingConversation(
  'booking-123',
  [
    { userId: 'customer-456', userType: 'customer' },
    { userId: 'provider-789', userType: 'provider' }
  ]
);

// 2. Customer sends message
await service.sendMessage(
  conversationSid,
  'When will you arrive?',
  'customer-456',
  'customer',
  'booking-123'
);

// 3. Provider sees conversation in Messages Tab
const providerConversations = await service.getConversationsForUser(
  'provider-789',
  'provider'
);
// Returns conversation with booking details

// 4. Provider opens conversation and sees customer's message
const messages = await service.getMessages(conversationSid);
// Shows: "When will you arrive?" from customer

// 5. Provider responds
await service.sendMessage(
  conversationSid,
  'I\'ll be there at 2 PM',
  'provider-789',
  'provider',
  'booking-123'
);

// 6. Customer sees provider's response
// (Same getMessages() call shows both messages)
```

### Key Features

✅ **Bidirectional**: Both customer and provider can send/receive messages  
✅ **Booking-Linked**: All conversations tied to specific bookings  
✅ **Real-time**: Messages visible to both parties immediately  
✅ **Persistent**: Message history stored in Twilio  
✅ **Notifications**: Unread counts tracked per user  
✅ **Read Receipts**: Track when messages are read  

