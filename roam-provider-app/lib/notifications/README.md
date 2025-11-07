# Notification System

A comprehensive notification system for sending email and SMS notifications to users based on their preferences.

## Overview

The notification system consists of:

1. **Database Schema** - Stores templates, logs, and user preferences
2. **NotificationService** - Core service to orchestrate notifications
3. **Email & SMS Services** - Integration with Resend and Twilio
4. **API Endpoints** - Trigger notifications from anywhere
5. **UI Components** - User preference management

## Architecture

```
┌─────────────────┐
│ User Action     │ (Booking accepted, completed, etc.)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Trigger         │ (Helper function or API call)
│ Notification    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Notification    │ 1. Load user data
│ Service         │ 2. Check preferences
│                 │ 3. Load template
│                 │ 4. Check quiet hours
│                 │ 5. Send via channels
│                 │ 6. Log result
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│ Email │ │  SMS  │
└───────┘ └───────┘
```

## Database Tables

### `notification_templates`
Stores reusable email and SMS templates with variable placeholders.

### `notification_logs`
Tracks all sent notifications with delivery status and error details.

### `user_settings`
Extended with granular notification preferences for each notification type.

## Usage

### Server-Side (API Routes)

```typescript
import { notificationService } from '@/lib/notifications/notification-service';

// In your API route
await notificationService.send({
  userId: 'user-uuid',
  notificationType: 'customer_booking_accepted',
  templateVariables: {
    customer_name: 'John Doe',
    service_name: 'Massage Therapy',
    provider_name: 'Jane Smith',
    booking_date: 'March 15, 2024',
    booking_time: '2:00 PM',
    booking_location: '123 Main St',
    total_amount: '100.00',
    booking_id: 'booking-uuid',
  },
  metadata: {
    booking_id: 'booking-uuid',
    event_type: 'booking_accepted',
  },
});
```

### Client-Side (Helper Functions)

```typescript
import { notifyBookingAccepted } from '@/lib/notifications/trigger-notification';

// In your component or page
await notifyBookingAccepted({
  customerId: 'user-uuid',
  customerName: 'John Doe',
  serviceName: 'Massage Therapy',
  providerName: 'Jane Smith',
  bookingDate: 'March 15, 2024',
  bookingTime: '2:00 PM',
  bookingLocation: '123 Main St',
  totalAmount: '100.00',
  bookingId: 'booking-uuid',
});
```

### Via API Endpoint

```typescript
const response = await fetch('/api/notifications/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-uuid',
    notificationType: 'provider_new_booking',
    templateVariables: {
      provider_name: 'Jane Smith',
      customer_name: 'John Doe',
      service_name: 'Massage Therapy',
      booking_date: 'March 15, 2024',
      booking_time: '2:00 PM',
      booking_location: '123 Main St',
      provider_earnings: '80.00',
      booking_id: 'booking-uuid',
    },
  }),
});
```

## Notification Types

### Customer Notifications
- `customer_welcome` - Welcome email for new customers
- `customer_booking_accepted` - Booking confirmation
- `customer_booking_reminder` - Day-before reminder
- `customer_booking_completed` - Post-service review request

### Provider Notifications
- `provider_new_booking` - New booking request
- `provider_booking_cancelled` - Customer cancelled
- `provider_booking_rescheduled` - Reschedule request

### Admin Notifications
- `admin_business_verification` - New business needs verification

## Template Variables

Each notification type expects specific variables. Check the template in the database for required variables.

Example for `customer_booking_accepted`:
- `customer_name`
- `service_name`
- `provider_name`
- `booking_date`
- `booking_time`
- `booking_location`
- `total_amount`
- `booking_id`

## User Preferences

Users can control notifications via the `NotificationPreferences` component:

```typescript
import { NotificationPreferences } from '@/components/NotificationPreferences';

// In your settings page
<NotificationPreferences />
```

### Preference Hierarchy

1. **Master Toggle** - Email/SMS enabled for user
2. **Notification Type** - Specific notification enabled
3. **Quiet Hours** - Time range to suppress notifications

Example:
- Email notifications: ON
- Booking reminders (email): ON
- → Email will be sent ✅

- SMS notifications: OFF
- Booking reminders (SMS): ON
- → SMS will NOT be sent ❌

## Environment Variables

Required in `.env` or Vercel:

```bash
# Supabase (for database & user data)
VITE_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Resend (for email)
RESEND_API_KEY=re_your-resend-api-key

# Twilio (for SMS - optional)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

## Integration Examples

### Booking Status Update

```typescript
// api/bookings/status-update.ts
import { notifyBookingAccepted, notifyBookingCompleted } from '@/lib/notifications/trigger-notification';

// After updating booking status
if (newStatus === 'accepted') {
  await notifyBookingAccepted({
    customerId: booking.customer_id,
    customerName: customer.full_name,
    serviceName: service.name,
    providerName: provider.name,
    bookingDate: formatDate(booking.booking_date),
    bookingTime: formatTime(booking.booking_time),
    bookingLocation: booking.location,
    totalAmount: booking.total_amount.toString(),
    bookingId: booking.id,
  });
}

if (newStatus === 'completed') {
  await notifyBookingCompleted({
    customerId: booking.customer_id,
    customerName: customer.full_name,
    serviceName: service.name,
    providerName: provider.name,
    providerId: provider.id,
    bookingId: booking.id,
  });
}
```

### User Registration

```typescript
// api/auth/signup.ts
import { triggerNotification } from '@/lib/notifications/trigger-notification';

// After creating user
await triggerNotification({
  userId: newUser.id,
  notificationType: 'customer_welcome',
  templateVariables: {
    customer_name: newUser.first_name,
  },
});
```

## Logging

All notifications are automatically logged to `notification_logs` table with:
- Delivery status (pending, sent, delivered, failed)
- External IDs (Resend message ID, Twilio SID)
- Error messages (if failed)
- Retry count
- Metadata

## Error Handling

Notifications are **best-effort** - failures are logged but won't break the main flow:

```typescript
try {
  await notificationService.send({ ... });
} catch (error) {
  // Error is logged, but application continues
  console.error('Notification failed:', error);
}
```

## Testing

### Test Notification Sending

```typescript
// Test in API route or component
await notificationService.send({
  userId: 'test-user-id',
  notificationType: 'customer_booking_accepted',
  templateVariables: {
    customer_name: 'Test User',
    service_name: 'Test Service',
    provider_name: 'Test Provider',
    booking_date: 'Tomorrow',
    booking_time: '2:00 PM',
    booking_location: 'Test Location',
    total_amount: '100.00',
    booking_id: 'test-booking-id',
  },
});
```

### Check Logs

Query `notification_logs` table to verify:

```sql
SELECT * FROM notification_logs 
WHERE user_id = 'test-user-id' 
ORDER BY created_at DESC 
LIMIT 10;
```

## Troubleshooting

### Emails Not Sending

1. Check `RESEND_API_KEY` is set correctly
2. Verify email templates exist in database
3. Check `notification_logs` for error messages
4. Verify user has email in their profile
5. Check user's email notification preferences

### SMS Not Sending

1. Check Twilio credentials are set
2. Verify phone number is in E.164 format (+1234567890)
3. Check SMS template exists
4. Verify user has SMS notifications enabled

### Notifications Skipped

1. Check user's master toggles (email_notifications, sms_notifications)
2. Verify specific notification type is enabled in user_settings
3. Check if quiet hours are active
4. Review notification_logs for skip reasons

## Future Enhancements

- [ ] Scheduled notifications (reminders)
- [ ] Batch notification sending
- [ ] Notification history UI for users
- [ ] Webhook endpoints for delivery status updates
- [ ] Push notifications (web/mobile)
- [ ] In-app notifications
- [ ] Template editor UI for admins
- [ ] A/B testing for templates

