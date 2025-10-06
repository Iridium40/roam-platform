# Twilio SMS Integration Quick Start Guide

**Date:** October 6, 2025  
**Feature:** SMS Notifications for Provider App

## Prerequisites

- ✅ Frontend SMS settings UI implemented
- ✅ Database schema updated with `sms_notifications` column
- ✅ Twilio account with verified phone number (+18506088086)
- ✅ Twilio credentials already in `.env` file
- ⏳ Backend SMS service implementation

## Setup Steps

### 1. Twilio Account Setup

✅ **Already Completed!** Your Twilio credentials are configured:
- Account SID: `AC903bee9e4a9ca6e911de718acbf5385f`
- Phone Number: `+18506088086`
- Conversations Service SID: `IS5069b5cf49b04c40a9174548f5b1470e`

### 2. Environment Configuration

✅ **Already Completed!** Your `.env` file now has:

```env
# Frontend (Conversations)
VITE_TWILIO_ACCOUNT_SID=AC903bee9e4a9ca6e911de718acbf5385f
VITE_TWILIO_AUTH_TOKEN=34b7fbefcb5298dadd73ff66a0740b04
VITE_TWILIO_CONVERSATIONS_SERVICE_SID=IS5069b5cf49b04c40a9174548f5b1470e
VITE_TWILIO_PHONE_NUMBER=+18506088086

# Backend (SMS Notifications - Server-side only)
TWILIO_ACCOUNT_SID=AC903bee9e4a9ca6e911de718acbf5385f
TWILIO_AUTH_TOKEN=34b7fbefcb5298dadd73ff66a0740b04
TWILIO_PHONE_NUMBER=+18506088086
```

**Note:** The backend variables (without `VITE_` prefix) are for server-side SMS sending only and won't be exposed to the frontend.

### 3. Install Dependencies

```bash
cd roam-platform
npm install twilio
```

### 4. Create SMS Service

Create `server/services/smsService.ts` with the code from `SMS_NOTIFICATIONS_IMPLEMENTATION.md`

Key methods:
- `isSMSEnabledForProvider(providerId)` - Check if SMS is enabled
- `getProviderPhone(providerId)` - Get phone number
- `sendSMS({ to, message, providerId })` - Send SMS
- `sendBookingNotification(providerId, details)` - Send booking alert
- `sendTestSMS(providerId)` - Test SMS functionality

### 5. Create SMS Routes

Create `server/routes/sms.ts`:

```typescript
import express from 'express';
import { smsService } from '../services/smsService';

const router = express.Router();

// Test SMS
router.post('/test', async (req, res) => {
  const { providerId } = req.body;
  const success = await smsService.sendTestSMS(providerId);
  
  if (success) {
    res.json({ message: 'Test SMS sent successfully' });
  } else {
    res.status(400).json({ error: 'Failed to send SMS' });
  }
});

export default router;
```

### 6. Register Routes

In `server/index.ts`:

```typescript
import smsRoutes from './routes/sms';

app.use('/api/sms', smsRoutes);
```

## Testing

### Test from Command Line

```bash
# Test SMS endpoint
curl -X POST http://localhost:3002/api/sms/test \
  -H "Content-Type: application/json" \
  -d '{"providerId": "your-provider-uuid"}'
```

### Test from Frontend

1. Navigate to: `http://localhost:5177/owner/profile`
2. Click **Settings** tab
3. Toggle **SMS Notifications** ON
4. Enter your phone number: `+1 (555) 123-4567`
5. Click **Save Changes**
6. Use the test endpoint to verify

### Verify in Twilio Console

1. Go to Twilio Console → Messaging → Logs
2. Check for message delivery status
3. View any errors or failures

## Integration Example

### Send SMS on New Booking

In your booking creation endpoint:

```typescript
// After booking is created
if (newBooking) {
  await smsService.sendBookingNotification(booking.provider_id, {
    customerName: booking.customer_name,
    serviceName: booking.service_name,
    dateTime: new Date(booking.scheduled_time).toLocaleString(),
    location: booking.location_name,
  });
}
```

## Phone Number Format

Twilio requires E.164 format: `+[country code][number]`

Examples:
- US: `+11234567890`
- UK: `+441234567890`

Helper function:

```typescript
function normalizePhone(phone: string): string {
  // Remove formatting
  let clean = phone.replace(/[^\d+]/g, '');
  
  // Add US country code if missing
  if (!clean.startsWith('+')) {
    clean = '+1' + clean;
  }
  
  return clean;
}
```

## Message Templates

### Booking Notification
```
New Booking Alert!
Customer: John Doe
Service: House Cleaning
Time: Oct 15, 2025 2:00 PM
Location: 123 Main St

View details in your ROAM dashboard.
```

### Cancellation
```
Booking Cancelled
Customer: John Doe
Service: House Cleaning
Time: Oct 15, 2025 2:00 PM

Check your ROAM dashboard for details.
```

### Reminder (24h before)
```
Booking Reminder
Customer: John Doe
Service: House Cleaning
Time: Tomorrow at 2:00 PM
Location: 123 Main St

See you soon!
```

## Cost Optimization

1. **Keep messages short** (under 160 chars to avoid multi-part)
2. **Batch notifications** when possible
3. **Only send if enabled** (check settings first)
4. **Limit frequency** (rate limiting)

Approximate costs:
- US/Canada: $0.0079 per message
- Messages over 160 chars count as multiple messages

## Security Checklist

- [ ] Twilio credentials in `.env` (not in code)
- [ ] `.env` file in `.gitignore`
- [ ] Validate provider ownership before sending
- [ ] Rate limiting on SMS endpoints
- [ ] Input sanitization on phone numbers
- [ ] Logging all SMS activity

## Troubleshooting

### "SMS not sending"
1. Check Twilio credentials are correct
2. Verify phone number is verified in Twilio (for trial accounts)
3. Check SMS is enabled in user_settings
4. Verify notification_phone is set in providers table
5. Check Twilio Console logs for errors

### "Invalid phone number"
- Must be in E.164 format: `+[country][number]`
- US numbers: `+1` + 10 digits
- Use normalizePhone helper function

### "Rate limited"
- Twilio has default rate limits
- Check your Twilio account limits
- Implement application-level rate limiting

## Next Steps

1. ✅ Run database migration
2. ✅ Test frontend settings UI
3. ⏳ Implement SMS service backend
4. ⏳ Add SMS routes
5. ⏳ Test with Twilio
6. ⏳ Integrate with booking system
7. ⏳ Set up monitoring/logging
8. ⏳ Configure Twilio webhooks for delivery status

## Additional Resources

- Twilio SMS API Docs: https://www.twilio.com/docs/sms
- Twilio Node.js SDK: https://www.twilio.com/docs/libraries/node
- E.164 Phone Format: https://www.twilio.com/docs/glossary/what-e164
- Message Pricing: https://www.twilio.com/sms/pricing

## Support

For Twilio-specific issues:
- Twilio Support: https://support.twilio.com
- Twilio Status: https://status.twilio.com

For ROAM platform issues:
- Check `SMS_NOTIFICATIONS_IMPLEMENTATION.md` for detailed implementation
