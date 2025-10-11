# Twilio Conversations Frontend Testing Checklist

*Last Updated: October 11, 2025*

## Overview

This document provides a comprehensive testing checklist for the Twilio Conversations implementation across all ROAM platform applications. Each section includes detailed test scenarios, expected behaviors, and component examples.

## 🧪 **Customer App Testing**

### Chat Icon & Availability
- [ ] **Chat icon appears on confirmed bookings only**
  - ✅ Confirmed bookings show chat icon
  - ❌ Pending/cancelled bookings hide chat icon
  - ✅ Icon is visually distinct and accessible
  - ✅ Icon has proper hover states

- [ ] **Chat icon positioning and visibility**
  - ✅ Icon appears in booking card/list view
  - ✅ Icon appears in booking detail view
  - ✅ Mobile responsive positioning
  - ✅ Icon disabled state for non-messageable bookings

### Modal & Conversation Interface
- [ ] **Modal opens with correct booking details**
  - ✅ Service name displays correctly
  - ✅ Provider name displays correctly
  - ✅ Booking date/time shows accurately
  - ✅ Service location information present
  - ✅ Modal can be closed via X button or ESC key

- [ ] **Conversation interface loads properly**
  - ✅ Message history loads on modal open
  - ✅ Loading state shows while fetching messages
  - ✅ Empty state shows for new conversations
  - ✅ Error state handles API failures gracefully

### Real-time Messaging
- [ ] **Can send messages successfully**
  - ✅ Text messages send without errors
  - ✅ Message appears immediately in UI (optimistic update)
  - ✅ Send button disabled while sending
  - ✅ Character count/limits enforced
  - ✅ Empty messages prevented

- [ ] **Can receive messages in real-time**
  - ✅ Provider messages appear instantly
  - ✅ Proper message threading/ordering
  - ✅ Visual distinction between sent/received messages
  - ✅ Timestamp displays correctly
  - ✅ Auto-scroll to new messages

### Participant Display
- [ ] **Participants display correctly**
  - ✅ Customer name shows as "You"
  - ✅ Provider name displays correctly
  - ✅ Owner/dispatcher names show when present
  - ✅ Role badges display appropriately
  - ✅ Online/offline status (if implemented)

### Unread Counts & Notifications
- [ ] **Unread counts update accurately**
  - ✅ Badge shows on chat icon for unread messages
  - ✅ Count increments with new messages
  - ✅ Count resets when conversation opened
  - ✅ Persistent across app navigation

- [ ] **Message notifications work**
  - ✅ Browser notifications for new messages (if enabled)
  - ✅ Sound notifications (if enabled)
  - ✅ Notification preferences respected

### Message History
- [ ] **Message history loads correctly**
  - ✅ Previous messages load on conversation open
  - ✅ Pagination works for long histories
  - ✅ Load more messages on scroll up
  - ✅ Message timestamps in correct timezone
  - ✅ Message status indicators (sent/delivered/read)

---

## 🏪 **Provider App Testing**

### Messaging Hub
- [ ] **Messaging hub displays all assigned conversations**
  - ✅ Only shows conversations for provider's assigned bookings
  - ✅ Conversations ordered by most recent activity
  - ✅ Search functionality works across conversations
  - ✅ Filter by booking status/date ranges
  - ✅ Empty state for no conversations

### Access Control & Security  
- [ ] **Provider CANNOT see non-assigned bookings**
  - ❌ Conversations for other providers hidden
  - ❌ Direct URL access to other conversations blocked
  - ✅ Only assigned bookings appear in list
  - ✅ Proper 403/404 errors for unauthorized access

### Messaging Functionality
- [ ] **Can send and receive messages**
  - ✅ Messages send successfully to customers
  - ✅ Real-time updates from customers
  - ✅ Message composition interface intuitive
  - ✅ Can handle multiple concurrent conversations
  - ✅ Message history preserves context

### Unread Badge System
- [ ] **Unread badge updates correctly**
  - ✅ Badge count shows total unread across all conversations
  - ✅ Individual conversation unread counts
  - ✅ Badge clears when conversation viewed
  - ✅ Persistent across page refreshes

### Search & Navigation
- [ ] **Search works correctly**
  - ✅ Search by customer name
  - ✅ Search by booking details
  - ✅ Search within message content
  - ✅ Search results highlight matches
  - ✅ Real-time search filtering

---

## 👥 **Owner/Dispatcher App Testing**

### Administrative Access
- [ ] **Can see ALL business conversations**
  - ✅ All conversations for business visible
  - ✅ Conversations from all providers shown
  - ✅ Filter by provider/service/date
  - ✅ Bulk actions available (if implemented)

### Conversation Participation
- [ ] **Can participate in any conversation**
  - ✅ Can send messages in any conversation
  - ✅ Can join existing conversations
  - ✅ Can initiate new conversations
  - ✅ Message attribution shows correct sender

### Role Display & Permissions
- [ ] **Proper role badges display**
  - ✅ "Owner" badge for business owners
  - ✅ "Dispatcher" badge for dispatch role
  - ✅ "Provider" badge for service providers
  - ✅ "Customer" identification clear
  - ✅ Role-based message styling/colors

---

## 🔧 **Technical Testing**

### Performance
- [ ] **Load times acceptable**
  - ✅ Initial conversation load < 2 seconds
  - ✅ Message sending latency < 500ms
  - ✅ Real-time updates < 1 second delay
  - ✅ Large message histories paginate efficiently

### Error Handling
- [ ] **Graceful error handling**
  - ✅ Network errors show user-friendly messages
  - ✅ Failed messages show retry option
  - ✅ API timeouts handled appropriately
  - ✅ Invalid conversation access blocked

### Browser Compatibility
- [ ] **Cross-browser functionality**
  - ✅ Chrome/Chromium browsers
  - ✅ Firefox compatibility
  - ✅ Safari compatibility
  - ✅ Mobile browser support

### Responsive Design
- [ ] **Mobile responsiveness**
  - ✅ Chat interface works on mobile
  - ✅ Touch-friendly interface elements
  - ✅ Virtual keyboard doesn't break layout
  - ✅ Proper text scaling

---

## 📱 **Component Test Examples**

### Customer Chat Button Component
```tsx
// Test that chat button only appears for confirmed bookings
describe('CustomerChatButton', () => {
  it('shows chat icon for confirmed bookings', () => {
    const booking = { status: 'confirmed', id: '123' };
    render(<CustomerChatButton booking={booking} />);
    expect(screen.getByTestId('chat-icon')).toBeInTheDocument();
  });

  it('hides chat icon for pending bookings', () => {
    const booking = { status: 'pending', id: '123' };
    render(<CustomerChatButton booking={booking} />);
    expect(screen.queryByTestId('chat-icon')).not.toBeInTheDocument();
  });
});
```

### Provider Messaging Hub Component
```tsx
// Test that providers only see assigned conversations
describe('ProviderMessagingHub', () => {
  it('displays only assigned conversations', async () => {
    const providerId = 'provider-123';
    render(<ProviderMessagingHub providerId={providerId} />);
    
    await waitFor(() => {
      const conversations = screen.getAllByTestId('conversation-item');
      conversations.forEach(conv => {
        expect(conv).toHaveAttribute('data-provider-id', providerId);
      });
    });
  });
});
```

### Owner Conversation Access Component
```tsx
// Test that owners can see all business conversations
describe('OwnerConversationList', () => {
  it('displays all business conversations', async () => {
    const businessId = 'business-456';
    render(<OwnerConversationList businessId={businessId} />);
    
    await waitFor(() => {
      expect(screen.getByText('All Conversations')).toBeInTheDocument();
      expect(screen.getAllByTestId('conversation-item').length).toBeGreaterThan(0);
    });
  });
});
```

---

## 🚀 **Testing Setup & Scripts**

### Environment Setup
```bash
# Start all apps for cross-app testing
npm run dev:all

# Individual app testing
npm run dev:customer  # Port 5174
npm run dev:provider  # Port 5177  
npm run dev:admin     # Port 5175
```

### Test Data Setup
```sql
-- Create test conversations in database
INSERT INTO conversation_metadata (booking_id, twilio_conversation_sid, participant_count)
VALUES ('test-booking-123', 'CH1234567890', 2);

INSERT INTO conversation_participants (conversation_id, user_id, user_type, twilio_participant_sid)
VALUES 
  (conversation_id, 'customer-123', 'customer', 'MB1234567890'),
  (conversation_id, 'provider-456', 'provider', 'MB0987654321');
```

### Manual Testing Scripts
```javascript
// Browser console testing for real-time functionality
const testRealTimeMessaging = async () => {
  // Send test message
  const service = createTwilioConversationsWithDBFromEnv();
  const result = await service.sendMessage('CH1234567890', {
    body: 'Test message for real-time verification',
    attributes: { testMessage: true }
  });
  console.log('Message sent:', result);
};
```

---

## 📋 **Testing Checklist Summary**

### Before Release
- [ ] All customer app chat features tested ✅
- [ ] Provider app security and access control verified ✅
- [ ] Owner/dispatcher administrative access confirmed ✅
- [ ] Cross-browser compatibility checked ✅
- [ ] Mobile responsiveness validated ✅
- [ ] Performance benchmarks met ✅
- [ ] Error scenarios handled gracefully ✅

### Post-Release Monitoring
- [ ] Real-time message delivery rates
- [ ] User engagement with messaging features
- [ ] Error rates and failure scenarios
- [ ] Performance metrics under load
- [ ] User feedback and support tickets

---

## 🔍 **Debugging Tools**

### Browser DevTools Checks
```javascript
// Check Twilio connection status
window.twilioConversations?.connectionState

// Monitor WebSocket connections
console.table(performance.getEntriesByType('resource'))

// Check for conversation service availability
import { createTwilioConversationsWithDBFromEnv } from '@roam/shared';
const service = createTwilioConversationsWithDBFromEnv();
console.log('Service available:', !!service);
```

### Network Tab Monitoring
- Monitor WebSocket connections to Twilio
- Check API call response times
- Verify authentication headers
- Monitor real-time event delivery

This comprehensive testing checklist ensures that the Twilio Conversations implementation meets all functional requirements across the ROAM platform while maintaining security, performance, and user experience standards.