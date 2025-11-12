# Testing Booking Completion SMS

This guide explains how to test the SMS functionality for booking completion.

## Prerequisites

1. **Twilio Configuration**
   - `TWILIO_ACCOUNT_SID` must be set
   - `TWILIO_AUTH_TOKEN` must be set
   - `TWILIO_PHONE_NUMBER` or `TWILIO_FROM_NUMBER` must be set

2. **Customer Requirements**
   - Customer must have SMS notifications enabled in `user_settings`
   - Customer must have a phone number (`customer_profiles.phone` or `bookings.guest_phone`)
   - Optionally: `customer_booking_completed_sms` can be enabled for granular control

## SMS Message Template

When a booking is completed, the customer receives:
```
ROAM: Thank you! Your {service_name} with {provider_name} on {booking_date} is complete. We hope you enjoyed your service! Reply STOP to opt out.
```

## Testing Methods

### Method 1: Direct SMS Test (Quick Test)

Test the SMS sending functionality directly without updating a booking:

```bash
cd roam-provider-app
npx tsx scripts/test-booking-completion-sms.ts [phone_number]
```

Example:
```bash
npx tsx scripts/test-booking-completion-sms.ts 5044171014
```

This will:
- ✅ Verify Twilio configuration
- ✅ Send a test SMS with the booking completion message format
- ✅ Show SMS delivery status

### Method 2: Full Flow Test (End-to-End)

Test the complete booking completion flow:

```bash
cd roam-provider-app
npx tsx scripts/test-booking-completion-sms.ts [phone_number] [booking_id]
```

Example:
```bash
npx tsx scripts/test-booking-completion-sms.ts 5044171014 abc123-booking-id
```

This will:
- ✅ Fetch booking details
- ✅ Check customer phone number
- ✅ Check SMS notification settings
- ✅ Update booking status to "completed"
- ✅ Trigger SMS sending (via API endpoint)

### Method 3: Via API Endpoint (Production-like)

Update a booking status via the API endpoint:

```bash
curl -X POST https://your-api-domain.com/api/bookings/status-update \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": "your-booking-id",
    "newStatus": "completed",
    "updatedBy": "user-id-who-is-updating",
    "notifyCustomer": true
  }'
```

## Enabling SMS for a Test Customer

### Option 1: Via SQL (Supabase)

```sql
-- Enable SMS notifications for a customer
UPDATE user_settings
SET 
  sms_notifications = true,
  customer_booking_completed_sms = true
WHERE user_id = 'customer-user-id';

-- Ensure customer has a phone number
UPDATE customer_profiles
SET phone = '+15044171014'
WHERE user_id = 'customer-user-id';
```

### Option 2: Via UI

1. Log in as the customer
2. Go to Settings → Notification Preferences
3. Enable "SMS Notifications"
4. Enable "Booking Completion SMS"
5. Add/verify phone number

## Verification Steps

### 1. Check SMS Was Sent

Check the API logs for:
```
📱 Sending customer_booking_completed SMS to +15044171014
✅ customer_booking_completed SMS sent successfully
```

### 2. Check Notification Logs

Query the `notification_logs` table:

```sql
SELECT 
  id,
  user_id,
  notification_type,
  channel,
  status,
  created_at,
  metadata->>'phone_to' as phone_to,
  metadata->>'sms_sid' as sms_sid
FROM notification_logs
WHERE notification_type = 'customer_booking_completed'
  AND channel = 'sms'
ORDER BY created_at DESC
LIMIT 10;
```

Expected result:
- `channel`: `'sms'`
- `status`: `'sent'` (or `'failed'` if there was an error)
- `metadata->>'sms_sid'`: Twilio message SID
- `metadata->>'phone_to'`: Customer phone number

### 3. Check Twilio Console

1. Log into Twilio Console
2. Go to Monitor → Logs → Messaging
3. Look for the SMS sent to the customer's phone number
4. Verify status is "delivered"

### 4. Verify Customer Received SMS

Check the customer's phone for the SMS message.

## Troubleshooting

### SMS Not Sending

**Check 1: Twilio Configuration**
```bash
# Verify environment variables are set
echo $TWILIO_ACCOUNT_SID
echo $TWILIO_AUTH_TOKEN
echo $TWILIO_PHONE_NUMBER
```

**Check 2: Customer Settings**
```sql
SELECT 
  user_id,
  sms_notifications,
  customer_booking_completed_sms,
  notification_phone
FROM user_settings
WHERE user_id = 'customer-user-id';
```

**Check 3: Customer Phone Number**
```sql
SELECT 
  cp.user_id,
  cp.phone as customer_phone,
  b.guest_phone as booking_guest_phone,
  us.notification_phone as settings_phone
FROM customer_profiles cp
LEFT JOIN bookings b ON b.customer_id = cp.id
LEFT JOIN user_settings us ON us.user_id = cp.user_id
WHERE cp.user_id = 'customer-user-id'
LIMIT 1;
```

**Check 4: API Logs**
Look for these log messages:
- `⚠️ SMS notifications enabled but Twilio credentials are missing` → Twilio not configured
- `ℹ️ SMS notifications requested for booking updates` → SMS enabled but not configured
- `❌ Failed to send SMS notification` → Error sending SMS

### Common Issues

1. **"SMS notifications enabled but Twilio credentials are missing"**
   - Solution: Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_PHONE_NUMBER` environment variables

2. **"No phone number found for customer"**
   - Solution: Add phone number to `customer_profiles.phone` or `bookings.guest_phone`

3. **"SMS notifications disabled for user"**
   - Solution: Enable `sms_notifications` in `user_settings` for the customer

4. **Twilio Error: "The number +1XXX is unverified"**
   - Solution: For Twilio trial accounts, verify the phone number in Twilio Console

## Code Location

- **SMS Sending Logic**: `roam-provider-app/api/bookings/status-update.ts` (lines 657-724)
- **SMS Service**: `roam-provider-app/lib/notifications/sms-service.ts`
- **Test Script**: `roam-provider-app/scripts/test-booking-completion-sms.ts`

## Related Files

- Email completion notification: Same file, different notification type
- SMS confirmation notification: Same file, `customer_booking_accepted` type
- Notification preferences UI: `roam-customer-app/client/components/NotificationPreferences.tsx`

