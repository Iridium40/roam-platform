# Platform-Wide SMS Notifications Implementation

**Date:** October 6, 2025  
**Status:** Backend Implementation Complete - Pending Integration

## Overview

SMS notifications have been implemented as a shared service across the entire ROAM platform:
- **roam-provider-app**: Provider notifications (bookings, cancellations, reminders)
- **roam-customer-app**: Customer notifications (confirmations, reminders, updates)
- **roam-admin-app**: Admin notifications (system alerts, approvals)

## Architecture

### Shared Service Package
Location: `/packages/notification-service/`

Contains:
- `smsService.ts` - Core SMS functionality using Twilio
- `smsRoutes.ts` - Express route handlers
- `index.ts` - Public API exports

### Features

#### Universal SMS Service
- ✅ Support for providers, customers, and general users
- ✅ Automatic phone number lookup from database
- ✅ SMS preferences check before sending
- ✅ E.164 phone number normalization
- ✅ Comprehensive error handling and logging

#### Message Types
1. **Provider Messages:**
   - New booking alerts
   - Booking cancellations
   - Booking reminders
   
2. **Customer Messages:**
   - Booking confirmations
   - Booking reminders
   - Cancellation notifications

3. **Test Messages:**
   - Configuration testing for all user types

## Files Created

### Shared Package Files
```
packages/notification-service/
├── package.json                     ← NEW: Package configuration
├── src/
    ├── index.ts                     ← NEW: Public exports
    ├── services/
    │   └── smsService.ts            ← NEW: Core SMS service
    └── routes/
        └── smsRoutes.ts             ← NEW: Express routes
```

### App-Specific Files
```
roam-provider-app/
├── server/
    ├── services/
    │   └── smsService.ts            ← LOCAL: Provider-specific (can be removed)
    └── routes/
        └── sms.ts                   ← UPDATED: Uses shared service

roam-admin-app/
└── server/
    └── (SMS routes to be added)

roam-customer-app/
└── server/
    └── (SMS routes to be added)
```

## Implementation Steps

### Step 1: Install Dependencies

```bash
cd /Users/alans/Desktop/ROAM/roam-platform

# Install Twilio in notification-service package
cd packages/notification-service
npm install twilio @supabase/supabase-js express
npm install --save-dev @types/express @types/node typescript

# Install in each app
cd ../../roam-provider-app
npm install @roam/notification-service

cd ../roam-admin-app
npm install @roam/notification-service

cd ../roam-customer-app
npm install @roam/notification-service
```

### Step 2: Update Provider App (Already Done)

The provider app has been updated with:
- ✅ SMS routes registered in `server/index.ts`
- ✅ Route handlers created in `server/routes/sms.ts`
- ⚠️ Needs to use shared service (update import)

### Step 3: Add SMS Routes to Admin App

**File:** `roam-admin-app/server/index.ts`

Add imports:
```typescript
import {
  handleTestSMS,
  handleGetSMSSettings,
  handleProviderBookingNotification,
  handleCustomerBookingConfirmation,
  handleCancellationNotification,
  handleBookingReminder
} from "@roam/notification-service";
```

Add routes:
```typescript
// SMS notification routes
app.post("/api/sms/test", handleTestSMS);
app.get("/api/sms/settings/:type/:id", handleGetSMSSettings);
app.post("/api/sms/booking-notification", handleProviderBookingNotification);
app.post("/api/sms/booking-confirmation", handleCustomerBookingConfirmation);
app.post("/api/sms/cancellation", handleCancellationNotification);
app.post("/api/sms/reminder", handleBookingReminder);
```

### Step 4: Add SMS Routes to Customer App

**File:** `roam-customer-app/server/index.ts`

Add the same imports and routes as Admin App above.

### Step 5: Database Migration (Already Done)

The database has been updated with:
- ✅ `user_settings.sms_notifications` column
- ✅ `providers.notification_phone` column
- ✅ Frontend UI for SMS settings in Provider App

## API Endpoints

### Test SMS
```bash
POST /api/sms/test
Body: { "userId": "...", "providerId": "...", or "customerId": "..." }
```

### Check Settings
```bash
GET /api/sms/settings/:type/:id
Parameters: 
  - type: "user" | "provider" | "customer"
  - id: userId, providerId, or customerId
```

### Provider Booking Notification
```bash
POST /api/sms/booking-notification
Body: {
  "providerId": "uuid",
  "bookingDetails": {
    "customerName": "John Doe",
    "serviceName": "House Cleaning",
    "dateTime": "Oct 15, 2025 2:00 PM",
    "location": "123 Main St"
  }
}
```

### Customer Booking Confirmation
```bash
POST /api/sms/booking-confirmation
Body: {
  "customerId": "uuid",
  "bookingDetails": {
    "serviceName": "House Cleaning",
    "dateTime": "Oct 15, 2025 2:00 PM",
    "location": "123 Main St"
  }
}
```

### Cancellation Notification
```bash
POST /api/sms/cancellation
Body: {
  "recipientId": "uuid",
  "type": "provider" | "customer",
  "bookingDetails": {
    "customerName": "John Doe",
    "serviceName": "House Cleaning",
    "dateTime": "Oct 15, 2025 2:00 PM"
  }
}
```

### Booking Reminder
```bash
POST /api/sms/reminder
Body: {
  "recipientId": "uuid",
  "type": "provider" | "customer",
  "bookingDetails": {
    "customerName": "John Doe",
    "serviceName": "House Cleaning",
    "dateTime": "Tomorrow at 2:00 PM",
    "location": "123 Main St"
  }
}
```

## Integration Examples

### When Creating a Booking

```typescript
// In booking creation endpoint
const booking = await createBooking(bookingData);

// Send SMS to provider
await smsService.sendProviderBookingNotification(booking.provider_id, {
  customerName: booking.customer_name,
  serviceName: booking.service_name,
  dateTime: new Date(booking.scheduled_time).toLocaleString(),
  location: booking.location_name
});

// Send SMS to customer
await smsService.sendCustomerBookingConfirmation(booking.customer_id, {
  customerName: '', // Not needed for customer
  serviceName: booking.service_name,
  dateTime: new Date(booking.scheduled_time).toLocaleString(),
  location: booking.location_name
});
```

### When Cancelling a Booking

```typescript
// In booking cancellation endpoint
await cancelBooking(bookingId);

// Notify provider
await smsService.sendCancellationNotification(
  booking.provider_id,
  {
    customerName: booking.customer_name,
    serviceName: booking.service_name,
    dateTime: new Date(booking.scheduled_time).toLocaleString()
  },
  'provider'
);

// Notify customer
await smsService.sendCancellationNotification(
  booking.customer_id,
  {
    customerName: booking.customer_name,
    serviceName: booking.service_name,
    dateTime: new Date(booking.scheduled_time).toLocaleString()
  },
  'customer'
);
```

### Scheduled Reminders (Cron Job)

```typescript
// Run daily at 9 AM
cron.schedule('0 9 * * *', async () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const upcomingBookings = await getBookingsForDate(tomorrow);
  
  for (const booking of upcomingBookings) {
    // Remind provider
    await smsService.sendBookingReminder(
      booking.provider_id,
      {
        customerName: booking.customer_name,
        serviceName: booking.service_name,
        dateTime: 'Tomorrow at ' + formatTime(booking.scheduled_time),
        location: booking.location_name
      },
      'provider'
    );
    
    // Remind customer
    await smsService.sendBookingReminder(
      booking.customer_id,
      {
        customerName: '',
        serviceName: booking.service_name,
        dateTime: 'Tomorrow at ' + formatTime(booking.scheduled_time),
        location: booking.location_name
      },
      'customer'
    );
  }
});
```

## Testing

### Test Each App

```bash
# Provider App
curl -X POST http://localhost:3002/api/sms/test \
  -H "Content-Type: application/json" \
  -d '{"providerId": "provider-uuid-here"}'

# Admin App (after implementation)
curl -X POST http://localhost:3001/api/sms/test \
  -H "Content-Type: application/json" \
  -d '{"providerId": "provider-uuid-here"}'

# Customer App (after implementation)
curl -X POST http://localhost:3003/api/sms/test \
  -H "Content-Type: application/json" \
  -d '{"customerId": "customer-uuid-here"}'
```

### Check SMS Settings

```bash
# Check provider settings
curl http://localhost:3002/api/sms/settings/provider/provider-uuid-here

# Check customer settings
curl http://localhost:3003/api/sms/settings/customer/customer-uuid-here

# Check user settings
curl http://localhost:3002/api/sms/settings/user/user-uuid-here
```

## Frontend Integration

### Customer App - Add SMS Settings

The customer app needs a similar settings page as the provider app.

**File:** `roam-customer-app/client/pages/settings/NotificationSettings.tsx`

```tsx
import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Smartphone } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function NotificationSettings({ userId, customerId }) {
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [phone, setPhone] = useState('');
  
  // Load settings
  useEffect(() => {
    loadSettings();
  }, []);
  
  const loadSettings = async () => {
    // Load from user_settings
    const { data: settings } = await supabase
      .from('user_settings')
      .select('sms_notifications')
      .eq('user_id', userId)
      .single();
      
    setSmsEnabled(settings?.sms_notifications || false);
    
    // Load phone from customers table
    const { data: customer } = await supabase
      .from('customers')
      .select('phone')
      .eq('id', customerId)
      .single();
      
    setPhone(customer?.phone || '');
  };
  
  const saveSettings = async () => {
    // Save to user_settings
    await supabase
      .from('user_settings')
      .upsert({ user_id: userId, sms_notifications: smsEnabled });
      
    // Save phone to customers
    await supabase
      .from('customers')
      .update({ phone })
      .eq('id', customerId);
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Smartphone className="w-4 h-4" />
          <Label>SMS Notifications</Label>
        </div>
        <Switch
          checked={smsEnabled}
          onCheckedChange={setSmsEnabled}
        />
      </div>
      
      {smsEnabled && (
        <Input
          type="tel"
          placeholder="+1 (555) 123-4567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      )}
      
      <Button onClick={saveSettings}>Save Settings</Button>
    </div>
  );
}
```

## Environment Variables

All three apps need these environment variables (already configured in `.env`):

```env
# Backend SMS (server-side only)
TWILIO_ACCOUNT_SID=AC903bee9e4a9ca6e911de718acbf5385f
TWILIO_AUTH_TOKEN=34b7fbefcb5298dadd73ff66a0740b04
TWILIO_PHONE_NUMBER=+18506088086

# Frontend (if needed for conversations)
VITE_TWILIO_ACCOUNT_SID=AC903bee9e4a9ca6e911de718acbf5385f
VITE_TWILIO_AUTH_TOKEN=34b7fbefcb5298dadd73ff66a0740b04
VITE_TWILIO_PHONE_NUMBER=+18506088086
```

## Deployment Checklist

### Provider App
- [x] Backend SMS service created
- [x] SMS routes added to server
- [x] Frontend settings UI implemented
- [ ] Update imports to use shared package
- [ ] Test all endpoints
- [ ] Deploy to Vercel

### Admin App
- [ ] Install `@roam/notification-service`
- [ ] Add SMS routes to server
- [ ] Create admin notification UI (optional)
- [ ] Test endpoints
- [ ] Deploy to Vercel

### Customer App
- [ ] Install `@roam/notification-service`
- [ ] Add SMS routes to server
- [ ] Create customer notification settings UI
- [ ] Add phone field to customer profile
- [ ] Test endpoints
- [ ] Deploy to Vercel

### Shared Package
- [x] SMS service implemented
- [x] Routes implemented
- [x] Exports configured
- [ ] Install Twilio dependency
- [ ] Test in all apps

## Next Steps

1. **Install Dependencies:**
   ```bash
   cd packages/notification-service && npm install
   ```

2. **Link Shared Package:**
   ```bash
   npm install --workspaces
   ```

3. **Update Provider App Imports:**
   Change `from "../services/smsService"` to `from "@roam/notification-service"`

4. **Implement Admin App SMS Routes:**
   Copy the route setup from provider app

5. **Implement Customer App SMS Routes:**
   Copy the route setup and add customer settings UI

6. **Test All Apps:**
   Test SMS sending from all three applications

7. **Deploy:**
   Deploy all apps with updated code and environment variables

## Support & Documentation

- Main Implementation: `SMS_NOTIFICATIONS_IMPLEMENTATION.md`
- Quick Start Guide: `TWILIO_SMS_QUICKSTART.md`
- This Document: `SMS_PLATFORM_WIDE_IMPLEMENTATION.md`

## Summary

✅ **Completed:**
- Shared SMS service package
- Provider app backend implementation
- Provider app frontend UI
- Database schema updates
- Twilio environment configuration
- Comprehensive API documentation

⏳ **Pending:**
- Install notification-service package in all apps
- Update provider app to use shared service
- Implement Admin app routes
- Implement Customer app routes and UI
- End-to-end testing across all apps
- Production deployment

The SMS infrastructure is ready for platform-wide deployment! 🚀
