# Provider Notifications for Cancellation and Rescheduling

## Overview
Implemented provider notifications following the same pattern as new booking notifications:
- **Always notify**: Owners and dispatchers (email and SMS)
- **Also notify**: Assigned provider (if `provider_id` is set)

## Notification Pattern

### For Cancellation:
1. **Always notify** all active providers with `provider_role = 'owner'` or `'dispatcher'` for the business
2. **Also notify** the assigned provider (if `provider_id` is set and they're not already an owner/dispatcher)

### For Rescheduling:
1. **Always notify** all active providers with `provider_role = 'owner'` or `'dispatcher'` for the business
2. **Also notify** the assigned provider (if `provider_id` is set and they're not already an owner/dispatcher)

## Implementation Details

### Files Created

1. **`roam-customer-app/lib/notifications/notify-providers-booking-cancelled.ts`**
   - Helper function for customer app
   - Calls provider app's notification API
   - Handles owner/dispatcher + assigned provider logic

2. **`roam-customer-app/lib/notifications/notify-providers-booking-rescheduled.ts`**
   - Helper function for customer app
   - Calls provider app's notification API
   - Handles owner/dispatcher + assigned provider logic

3. **`roam-provider-app/lib/notifications/notify-providers-booking-cancelled.ts`**
   - Helper function for provider app
   - Uses notification service directly
   - Handles owner/dispatcher + assigned provider logic

4. **`roam-provider-app/lib/notifications/notify-providers-booking-rescheduled.ts`**
   - Helper function for provider app
   - Uses notification service directly
   - Handles owner/dispatcher + assigned provider logic

5. **`roam-customer-app/api/bookings/cancel.ts`**
   - API endpoint for booking cancellation
   - Updates booking status
   - Triggers provider notifications

6. **`roam-customer-app/api/bookings/reschedule.ts`**
   - API endpoint for booking rescheduling
   - Updates booking dates/times
   - Triggers provider notifications

### Files Modified

1. **`roam-provider-app/api/bookings/status-update.ts`**
   - Updated cancellation notification to use new helper function
   - Added rescheduling detection and notification
   - Now follows the pattern: owners/dispatchers always + assigned provider if set

2. **`roam-customer-app/client/pages/MyBookings/hooks/useBookingActions.ts`**
   - Updated to use `/api/bookings/cancel` endpoint
   - Updated to use `/api/bookings/reschedule` endpoint
   - Ensures notifications are always sent

3. **`roam-customer-app/client/components/BookingCard.tsx`**
   - Updated cancellation handler to use `/api/bookings/cancel` endpoint
   - Ensures notifications are always sent

## Notification Triggers

### Cancellation Notifications Sent When:
1. Customer cancels booking via My Bookings page
2. Provider/admin cancels booking via BookingCard component
3. Booking status updated to 'cancelled' via status-update API

### Rescheduling Notifications Sent When:
1. Customer reschedules booking via My Bookings page
2. Booking updated with reschedule fields via reschedule API
3. Booking status updated and reschedule fields detected in status-update API

## Notification Content

### Cancellation Template Variables:
- `provider_name`: Role name (Owner/Dispatcher/Provider)
- `customer_name`: Customer's full name
- `service_name`: Service name
- `booking_date`: Original booking date
- `booking_time`: Original booking time
- `booking_location`: Business address
- `cancellation_reason`: Reason for cancellation
- `booking_id`: Booking ID
- `business_name`: Business name

### Rescheduling Template Variables:
- `provider_name`: Role name (Owner/Dispatcher/Provider)
- `customer_name`: Customer's full name
- `service_name`: Service name
- `booking_date`: Original booking date
- `booking_time`: Original booking time
- `new_booking_date`: New booking date
- `new_booking_time`: New booking time
- `booking_location`: Business address
- `reschedule_reason`: Reason for rescheduling
- `booking_id`: Booking ID
- `business_name`: Business name

## Notification Channels

Notifications respect user preferences:
- **Email**: If `provider_booking_cancelled_email` / `provider_booking_rescheduled_email` is enabled
- **SMS**: If `provider_booking_cancelled_sms` / `provider_booking_rescheduled_sms` is enabled and SMS is configured

## Testing

### Test Cancellation:
1. Cancel a booking without assigned provider
   - **Expected**: Owners and dispatchers receive notifications
2. Cancel a booking with assigned provider
   - **Expected**: Owners, dispatchers, AND assigned provider receive notifications

### Test Rescheduling:
1. Reschedule a booking without assigned provider
   - **Expected**: Owners and dispatchers receive notifications
2. Reschedule a booking with assigned provider
   - **Expected**: Owners, dispatchers, AND assigned provider receive notifications

### Verification:
Check logs for:
```
📋 Booking cancelled/rescheduled, notifying owners and dispatchers for business {business_id}
📋 Also notifying assigned provider {provider_id}
📧 Notifying {count} provider(s) about cancelled/rescheduled booking {booking_id}
✅ Cancellation/Reschedule notification sent to provider {provider_id} ({role})
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
WHERE notification_type IN ('provider_booking_cancelled', 'provider_booking_rescheduled')
ORDER BY created_at DESC
LIMIT 20;
```

## Error Handling

- Notifications are **non-blocking** - cancellation/rescheduling continues even if notifications fail
- Individual provider notification failures don't stop other providers from being notified
- Errors are logged but don't affect the booking operation

## Consistency

All three notification types (new booking, cancellation, rescheduling) now follow the same pattern:
- ✅ Owners and dispatchers always notified
- ✅ Assigned provider notified only if `provider_id` is set
- ✅ Respects user notification preferences (email/SMS)
- ✅ Non-blocking error handling

