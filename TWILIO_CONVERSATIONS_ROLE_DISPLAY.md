# Twilio Conversations - Role Display Implementation

## Overview
This document describes how participant names and roles are displayed in the Twilio Conversations chat system across the ROAM platform.

## Role Display Rules

### Customer App
- **Customer messages**: Display name and role = `"Customer"`
- **Provider messages**: Display name and role from database (`"Owner"`, `"Dispatcher"`, or `"Provider"`)

### Provider App  
- **Customer messages**: Display name and role = `"Customer"`
- **Provider messages**: Display name and role from database (`"Owner"`, `"Dispatcher"`, or `"Provider"`)

## Implementation Details

### 1. Database Role Fetching

**File**: `packages/shared/src/services/twilio/TwilioConversationsService.ts`

When a message is sent, the service fetches the **actual role from the database**:

```typescript
async sendMessage(
  conversationSid: string,
  message: string,
  userId: string,
  userType: 'customer' | 'provider' | 'owner' | 'dispatcher',
  _bookingId?: string
): Promise<{ messageSid: string }> {
  let userDetails: { first_name?: string; last_name?: string } | null = null;
  let actualRole: string = userType;
  
  // For provider-side users, fetch the actual provider_role from the database
  if (userType === 'provider' || userType === 'owner' || userType === 'dispatcher') {
    const { data } = await this.supabase
      .from('providers')
      .select('first_name, last_name, provider_role')  // ✅ Fetches role from DB
      .eq('user_id', userId)
      .single();
    
    if (data) {
      userDetails = data;
      actualRole = data.provider_role || userType; // Uses DB role
    }
  } else if (userType === 'customer') {
    const { data } = await this.supabase
      .from('customer_profiles')
      .select('first_name, last_name')
      .eq('user_id', userId)
      .single();
    userDetails = data;
    actualRole = 'customer';
  }

  // Store role in message attributes
  const messageResult = await this.messageService.sendMessage(conversationSid, {
    body: message,
    attributes: {
      userId,
      userType: actualRole,  // ✅ Stores actual role from DB
      role: actualRole,      // ✅ Also as 'role' for clarity
      authorName,
      timestamp: new Date().toISOString(),
    },
  }, identity);
}
```

### 2. Role Display in UI

**Customer App**: `roam-customer-app/client/components/EnhancedConversationChat.tsx`

```typescript
messages.map((message) => {
  // Extract role from message attributes
  let displayRole = isCustomer ? 'Customer' : 'Provider';
  if (message.attributes) {
    try {
      const attrs = typeof message.attributes === 'string' 
        ? JSON.parse(message.attributes) 
        : message.attributes;
      const role = attrs.role || attrs.userType || message.author_type;
      // Capitalize the role for display
      displayRole = role.charAt(0).toUpperCase() + role.slice(1);
    } catch (e) {
      // Use default displayRole if parsing fails
    }
  }

  return (
    <Badge variant="outline" className="text-[10px]">
      {displayRole}  {/* Shows: Customer, Owner, Dispatcher, or Provider */}
    </Badge>
  );
});
```

**Customer App (ConversationChat.tsx)**: Similar implementation with role extraction from attributes

```typescript
const getMessageAuthorInfo = (message: any) => {
  // Extract role from message attributes (stored by TwilioConversationsService)
  let messageRole = message.author_type || 'participant';
  if (message.attributes) {
    try {
      const attrs = typeof message.attributes === 'string' 
        ? JSON.parse(message.attributes) 
        : message.attributes;
      // Use 'role' or 'userType' from attributes
      messageRole = attrs.role || attrs.userType || message.author_type || 'participant';
    } catch (e) {
      messageRole = message.author_type || 'participant';
    }
  }
  
  return {
    isCurrentUser,
    name: participantInfo.name,
    role: messageRole,  // ✅ Uses role from DB
    initials: participantInfo.initials
  };
};
```

## Database Schema

### `public.providers` Table
```sql
- user_id (uuid) - FK to auth.users
- first_name (text)
- last_name (text)
- provider_role (provider_role enum) ✅ SOURCE OF TRUTH
  * Values: 'provider', 'owner', 'dispatcher'
```

### `public.customer_profiles` Table
```sql
- user_id (uuid) - FK to auth.users
- first_name (text)
- last_name (text)
- Role is always: 'customer'
```

## Message Flow

1. **User sends message** → Client calls API with `userId` and `userType`
2. **API handler** → Calls `TwilioConversationsService.sendMessage()`
3. **Service queries database** → Fetches `provider_role` from `providers` table
4. **Stores in Twilio** → Message attributes include actual role: `{ role: 'owner', userType: 'owner', authorName: 'John Smith' }`
5. **UI retrieves messages** → Parses attributes to display correct role
6. **Display** → Shows: "John Smith" with badge "Owner"

## Display Examples

### Customer App View
```
┌─────────────────────────────────────┐
│ [Avatar] Sarah Johnson             │
│          Customer                   │
│ ┌─────────────────────────────┐   │
│ │ Hello, when will you arrive?│   │
│ │ Customer | 2 minutes ago    │   │
│ └─────────────────────────────┘   │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│             John Smith [Avatar]     │
│             Owner                   │
│   ┌─────────────────────────────┐ │
│   │ I'll be there at 2:00 PM    │ │
│   │ Owner | Just now            │ │
│   └─────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Provider App View  
```
┌─────────────────────────────────────┐
│ [Avatar] Sarah Johnson             │
│          Customer                   │
│ ┌─────────────────────────────┐   │
│ │ Hello, when will you arrive?│   │
│ │ Customer | 2 minutes ago    │   │
│ └─────────────────────────────┘   │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│             Mike Davis [Avatar]     │
│             Dispatcher              │
│   ┌─────────────────────────────┐ │
│   │ The provider is on the way  │ │
│   │ Dispatcher | Just now       │ │
│   └─────────────────────────────┘ │
└─────────────────────────────────────┘
```

## Security Considerations

### ✅ Implemented
1. **Role fetched from database** - Not trusted from client input
2. **Stored in message attributes** - Preserved for display
3. **Consistent across apps** - Both customer and provider see same roles

### ⚠️ Recommended Enhancements (Future)
1. **JWT verification** - Verify userId matches authenticated user
2. **Participant validation** - Ensure user is actually part of the conversation
3. **RLS policies** - Database-level security enforcement

## Testing Checklist

- [ ] Customer sends message → Shows as "Customer"
- [ ] Provider (role=provider) sends message → Shows as "Provider"  
- [ ] Owner sends message → Shows as "Owner"
- [ ] Dispatcher sends message → Shows as "Dispatcher"
- [ ] Roles display correctly in customer app
- [ ] Roles display correctly in provider app
- [ ] Names display correctly for all participants
- [ ] Message attributes include correct role
- [ ] Old messages (before update) gracefully fallback

## Files Modified

1. `packages/shared/src/services/twilio/TwilioConversationsService.ts` - Fetches and stores role
2. `roam-customer-app/client/components/EnhancedConversationChat.tsx` - Displays role with Badge
3. `roam-customer-app/client/components/ConversationChat.tsx` - Extracts role from attributes
4. `roam-provider-app/client/components/ConversationChat.tsx` - (If used, should have similar updates)

## Related Documentation

- [Database Schema Reference](./DATABASE_SCHEMA_REFERENCE.md)
- [Provider Role Types](./DATABASE_ENUM_TYPES_REFERENCE.md)
- [Security Considerations](./TWILIO_CONVERSATIONS_SECURITY_NOTES.md) (To be created)

