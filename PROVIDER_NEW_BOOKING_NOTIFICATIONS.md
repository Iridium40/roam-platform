# Provider New Booking Notifications Implementation

## Overview
Implemented provider notifications when a new booking is received by a business. Notifications are sent based on provider roles and booking assignment.

## Notification Logic

### Scenario 1: Booking Assigned to Specific Provider
- **When**: `booking.provider_id` is set
- **Who Gets Notified**: The assigned provider only
- **Example**: Customer selects a specific provider during booking

### Scenario 2: Booking Not Assigned
- **When**: `booking.provider_id` is null
- **Who Gets Notified**: All active providers with `provider_role = 'owner'` or `provider_role = 'dispatcher'` for that business
- **Example**: Customer books a service without selecting a specific provider

## Implementation Details

### Files Created/Modified

1. **`roam-customer-app/lib/notifications/notify-providers-new-booking.ts`**
   - Helper function to determine which providers to notify
   - Calls provider app's notification API
   - Handles both assigned and unassigned booking scenarios

2. **`roam-customer-app/api/stripe/webhook.ts`**
   - Integrated notification call after payment succeeds
   - Triggers notifications when booking status changes to 'confirmed'
   - Non-blocking (doesn't fail webhook if notifications fail)

3. **`roam-provider-app/lib/notifications/notify-providers-new-booking.ts`**
   - Alternative implementation using provider app's notification service directly
   - Can be used for direct integration if needed

### Notification Flow

```
1. Customer completes payment
   ↓
2. Stripe webhook receives payment_intent.succeeded event
   ↓
3. Booking status updated to 'confirmed'
   ↓
4. notifyProvidersNewBooking() called
   ↓
5. Determine providers to notify:
   - If provider_id set → notify that provider
   - If provider_id null → notify all owners/dispatchers
   ↓
6. For each provider:
   - Call /api/notifications/send endpoint
   - Notification service checks user preferences
   - Sends email/SMS based on preferences
   ↓
7. Log notifications in notification_logs table
```

## Notification Content

### Template Variables
- `provider_name`: Role name (Owner/Dispatcher/Provider)
- `customer_name`: Customer's full name
- `service_name`: Service name
- `booking_date`: Formatted date (e.g., "Monday, January 15, 2024")
- `booking_time`: Formatted time (e.g., "2:30 PM")
- `booking_location`: Business address or "Location TBD"
- `total_amount`: Booking total (formatted as currency)
- `booking_id`: Booking ID
- `business_name`: Business name
- `special_instructions`: Special instructions or "None"

### Notification Channels
Notifications respect user preferences:
- **Email**: If `provider_new_booking_email` is enabled
- **SMS**: If `provider_new_booking_sms` is enabled and SMS is configured

## Configuration

### Environment Variables
Set in Vercel for customer app:
- `PROVIDER_APP_API_URL`: Provider app API URL (optional, defaults to `https://provider.roamyourbestlife.com`)

### User Preferences
Providers can enable/disable notifications in:
- Settings → Notification Preferences
- Toggle "New Booking" email/SMS notifications

## Testing

### Test Scenario 1: Unassigned Booking
1. Create a booking without selecting a provider
2. Complete payment
3. **Expected**: Owners and dispatchers for that business receive notifications

### Test Scenario 2: Assigned Booking
1. Create a booking with a specific provider selected
2. Complete payment
3. **Expected**: Only the assigned provider receives notification

### Verification
Check logs for:
```
📋 Booking not assigned, notifying owners and dispatchers for business {business_id}
📧 Notifying {count} provider(s) about new booking {booking_id}
✅ Notification sent to provider {provider_id} ({role})
```

Check `notification_logs` table:
```sql
SELECT 
  user_id,
  notification_type,
  channel,
  status,
  created_at
FROM notification_logs
WHERE notification_type = 'provider_new_booking'
ORDER BY created_at DESC
LIMIT 10;
```

## Error Handling

- Notifications are **non-blocking** - webhook continues even if notifications fail
- Individual provider notification failures don't stop other providers from being notified
- Errors are logged but don't affect booking confirmation

## Future Enhancements

1. **Push Notifications**: Add push notification support
2. **Batch Notifications**: Optimize for businesses with many owners/dispatchers
3. **Notification Preferences**: Allow providers to set quiet hours for new booking notifications
4. **Assignment Notifications**: Notify when a booking is assigned to a provider after creation

