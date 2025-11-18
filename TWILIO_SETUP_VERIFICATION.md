# Twilio Conversations Setup Verification

Since all Twilio environment variables are set, use this guide to verify the setup is working correctly.

## Quick Verification

### 1. Check Environment Variables

The service expects these environment variables:

**Twilio:**
- `VITE_TWILIO_ACCOUNT_SID` or `TWILIO_ACCOUNT_SID`
- `VITE_TWILIO_AUTH_TOKEN` or `TWILIO_AUTH_TOKEN`
- `VITE_TWILIO_CONVERSATIONS_SERVICE_SID` or `TWILIO_CONVERSATIONS_SERVICE_SID`

**Supabase:**
- `VITE_PUBLIC_SUPABASE_URL` or `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (for server-side)
- `VITE_PUBLIC_SUPABASE_ANON_KEY` (for client-side)

### 2. Verify in Code

```typescript
import { 
  verifyCompleteSetup, 
  testTwilioConnection,
  testServiceInitialization,
  printSetupStatus 
} from '@roam/shared/services/twilio/verify-setup';

// Print status to console
printSetupStatus();

// Verify configuration
const setup = verifyCompleteSetup();
if (setup.allValid) {
  console.log('✅ All configuration valid!');
} else {
  console.error('❌ Missing configuration:', {
    twilio: setup.twilio.missing,
    supabase: setup.supabase.missing,
  });
}

// Test Twilio connection
const twilioTest = await testTwilioConnection();
if (twilioTest.success) {
  console.log('✅ Twilio connection successful!');
} else {
  console.error('❌ Twilio connection failed:', twilioTest.error);
}

// Test service initialization
const serviceTest = await testServiceInitialization();
if (serviceTest.success) {
  console.log('✅ Service can be initialized!');
} else {
  console.error('❌ Service initialization failed:', serviceTest.error);
}
```

### 3. Test Creating a Conversation

```typescript
import { createTwilioConversationsService } from '@roam/shared';

const service = createTwilioConversationsService();

if (!service) {
  console.error('Failed to create service - check environment variables');
} else {
  // Test creating a conversation
  try {
    const result = await service.createBookingConversation(
      'test-booking-id',
      [
        { userId: 'test-customer-id', userType: 'customer', userName: 'Test Customer' },
        { userId: 'test-provider-id', userType: 'provider', userName: 'Test Provider' }
      ],
      'booking_chat'
    );
    
    console.log('✅ Conversation created:', result.conversationSid);
  } catch (error) {
    console.error('❌ Failed to create conversation:', error);
  }
}
```

## API Endpoint Testing

### Test the Unified API Handler

```bash
# Test creating a conversation
curl -X POST http://localhost:3000/api/twilio-conversations \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create-conversation",
    "bookingId": "test-booking-id",
    "participants": [
      {
        "userId": "test-customer-id",
        "userType": "customer",
        "userName": "Test Customer"
      },
      {
        "userId": "test-provider-id",
        "userType": "provider",
        "userName": "Test Provider"
      }
    ]
  }'
```

### Test Sending a Message

```bash
curl -X POST http://localhost:3000/api/twilio-conversations \
  -H "Content-Type: application/json" \
  -d '{
    "action": "send-message",
    "conversationSid": "CH...",
    "message": "Hello, this is a test message",
    "userId": "test-user-id",
    "userType": "customer",
    "bookingId": "test-booking-id"
  }'
```

### Test Getting Messages

```bash
curl -X POST http://localhost:3000/api/twilio-conversations \
  -H "Content-Type: application/json" \
  -d '{
    "action": "get-messages",
    "conversationSid": "CH..."
  }'
```

## Common Issues

### Issue: "Twilio credentials not configured"

**Solution:** Ensure environment variables are set in your deployment platform (Vercel, etc.) and match the expected names.

### Issue: "Failed to create Twilio conversation"

**Possible causes:**
1. Invalid Conversations Service SID
2. Twilio account doesn't have Conversations API enabled
3. Insufficient permissions

**Solution:** 
- Verify the Conversations Service SID in Twilio Console
- Ensure Conversations API is enabled for your account
- Check Twilio account permissions

### Issue: "Missing Supabase configuration"

**Solution:** 
- For server-side: Use `SUPABASE_SERVICE_ROLE_KEY`
- For client-side: Use `VITE_PUBLIC_SUPABASE_ANON_KEY`
- Ensure `VITE_PUBLIC_SUPABASE_URL` is set

## Next Steps

Once verification passes:

1. ✅ Update Customer App to use shared service
2. ✅ Update Provider App Messages Tab to use `getConversationsForUser()`
3. ✅ Test end-to-end messaging flow
4. ✅ Deploy and monitor

## Production Checklist

- [ ] All environment variables set in Vercel/production
- [ ] Twilio Conversations Service created and SID configured
- [ ] Supabase tables exist (`conversation_metadata`, `conversation_participants`, `message_notifications`)
- [ ] RLS policies configured for conversation tables
- [ ] API endpoints deployed and accessible
- [ ] Test conversation creation works
- [ ] Test message sending works
- [ ] Test bidirectional messaging between customer and provider

