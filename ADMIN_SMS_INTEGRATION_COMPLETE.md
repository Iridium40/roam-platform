# SMS Notifications - Admin App Integration Summary

**Date**: October 6, 2025
**Status**: ✅ COMPLETE

## Overview

Added SMS notifications functionality to the **roam-admin-app**, allowing admin users to receive text message alerts for critical events. Admin users store their settings in the `user_settings` table and their notification phone in the `admin_users` table.

---

## Changes Made

### 1. Database Schema Updates

#### Migration File: `add_admin_notification_phone.sql`
- **Table**: `admin_users`
- **Column Added**: `notification_phone` (text, nullable)
- **Purpose**: Store dedicated phone number for SMS notifications
- **Format**: E.164 format recommended (e.g., +1234567890)

```sql
ALTER TABLE public.admin_users
ADD COLUMN IF NOT EXISTS notification_phone text NULL;
```

### 2. Backend Routes (Already Complete)

#### SMS Routes: `/roam-admin-app/server/routes/sms.ts`
- **Status**: ✅ Created
- **Imports**: Shared handlers from `@roam/notification-service`

```typescript
import { handleTestSMS, handleGetSMSSettings } from "@roam/notification-service";
export { handleTestSMS, handleGetSMSSettings };
```

#### Server Registration: `/roam-admin-app/server/index.ts`
- **Status**: ✅ Routes registered
- **Endpoints**:
  - `POST /api/sms/test` - Send test SMS
  - `GET /api/sms/settings/:id` - Get SMS settings

### 3. Frontend Updates

#### Updated File: `/roam-admin-app/client/pages/AdminSettings.tsx`

**Interface Updates:**
```typescript
interface UserSettings {
  // ... existing fields
  sms_notifications: boolean;  // NEW
}
```

**New State Variables:**
```typescript
const [notificationPhone, setNotificationPhone] = useState<string>("");
const [adminUserId, setAdminUserId] = useState<string | null>(null);
```

**Features Added:**
1. **SMS Notifications Toggle**
   - Switch to enable/disable SMS notifications
   - Stored in `user_settings.sms_notifications`

2. **Notification Phone Input**
   - Conditionally shown when SMS is enabled
   - Accepts phone numbers in any format
   - Placeholder: "+1 (555) 123-4567"
   - Saved to `admin_users.notification_phone`

3. **Data Persistence**
   - Settings saved to `user_settings` table
   - Phone number saved to `admin_users` table
   - Fetches admin user ID on load
   - Updates both tables on save

**Load Logic:**
```typescript
// Fetch admin user info for notification phone
const { data: adminData } = await supabase
  .from("admin_users")
  .select("id, notification_phone")
  .eq("user_id", user.id)
  .single();

if (adminData) {
  setAdminUserId(adminData.id);
  setNotificationPhone(adminData.notification_phone || "");
}
```

**Save Logic:**
```typescript
// Save notification phone to admin_users
if (adminUserId && notificationPhone !== undefined) {
  await supabase
    .from("admin_users")
    .update({ notification_phone: notificationPhone || null })
    .eq("id", adminUserId);
}
```

---

## Data Storage Architecture

### Admin Users vs Providers vs Customers

| User Type | Settings Table | Phone Number Column | Phone Location |
|-----------|---------------|---------------------|----------------|
| **Admin** | `user_settings` | `sms_notifications` | `admin_users.notification_phone` |
| **Provider** | `user_settings` | `sms_notifications` | `providers.notification_phone` |
| **Customer** | `customer_profiles` | `sms_notifications` | `customer_profiles.phone` |

**Why Different?**
- **Admins & Providers**: Use `user_settings` for all preferences (consistent with other admin settings like theme, timezone)
- **Admins & Providers**: Have separate `notification_phone` field (may differ from business/personal phone)
- **Customers**: Simpler model - settings stored directly in `customer_profiles` table, use single `phone` field

---

## SMS Service Integration

### Shared Service Package
- **Package**: `@roam/notification-service`
- **Location**: `/packages/notification-service/`

### Available Methods for Admin Users
```typescript
// Check if SMS is enabled
await smsService.isSMSEnabledForAdmin(adminUserId);

// Get admin notification phone
await smsService.getAdminPhone(adminUserId);

// Send test SMS
await smsService.sendTestSMS(adminUserId, false); // false = not provider

// Send generic notification
await smsService.sendSMS(phone, message, { adminUserId });
```

**Note**: The shared service currently has methods for providers and customers. You may need to add `isSMSEnabledForAdmin()` and `getAdminPhone()` methods if you want admin-specific functionality.

---

## UI/UX Design

### Settings Page Layout
```
┌─────────────────────────────────────┐
│ Notifications                       │
├─────────────────────────────────────┤
│ ☑ Email notifications               │
│   Receive email alerts              │
│                                     │
│ ☑ Push notifications                │
│   Browser notifications             │
│                                     │
│ ☑ SMS notifications          [NEW] │
│   Text messages for alerts          │
│                                     │
│   [Notification Phone Input]  [NEW] │
│   Phone number for SMS (E.164)      │
│                                     │
│ ☑ Sound alerts                      │
│   Play sounds for notifications     │
└─────────────────────────────────────┘
```

### Conditional Display
- Phone input only shown when `sms_notifications` is enabled
- Input validates on blur (future enhancement)
- Saves automatically when "Save Changes" clicked

---

## Testing Checklist

### Database Migration
- [ ] Run `add_admin_notification_phone.sql` migration
- [ ] Verify column added: `SELECT notification_phone FROM admin_users LIMIT 1;`

### Backend Testing
- [ ] Test `POST /api/sms/test` with admin user ID
- [ ] Test `GET /api/sms/settings/:adminUserId`
- [ ] Verify environment variables loaded (TWILIO_*)

### Frontend Testing
- [ ] Load settings page - SMS toggle visible
- [ ] Enable SMS - phone input appears
- [ ] Enter phone number - saves to database
- [ ] Disable SMS - phone input hidden (but value retained)
- [ ] Reload page - settings persist

### Integration Testing
- [ ] Enable SMS in settings with valid phone
- [ ] Click test SMS button (if implemented)
- [ ] Verify SMS received via Twilio logs
- [ ] Test with invalid phone - proper error handling

---

## API Endpoints

### Test SMS
```http
POST /api/sms/test
Content-Type: application/json

{
  "adminUserId": "uuid",
  "message": "Test message" // optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Test SMS sent to +1234567890"
}
```

### Get Settings
```http
GET /api/sms/settings/:adminUserId
```

**Response:**
```json
{
  "sms_enabled": true,
  "notification_phone": "+1234567890"
}
```

---

## Environment Variables

Required in `.env` and Vercel:
```bash
# Backend SMS (NOT exposed to frontend)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

---

## Future Enhancements

### Phase 1 (Current)
- ✅ Enable/disable SMS notifications
- ✅ Store notification phone number
- ✅ Basic settings UI

### Phase 2 (Recommended)
- [ ] Add "Send Test SMS" button to settings page
- [ ] Phone number validation (E.164 format)
- [ ] Phone number formatting on input
- [ ] SMS delivery status tracking

### Phase 3 (Advanced)
- [ ] Admin-specific notification types
  - System alerts
  - Security events
  - Critical errors
  - User reports
- [ ] SMS notification history
- [ ] Multiple phone numbers per admin
- [ ] Notification scheduling (quiet hours)

---

## Code Examples

### Sending Admin Notification (Backend)
```typescript
import { smsService } from "@roam/notification-service";

// Send critical alert to admin
async function notifyAdmin(adminUserId: string, message: string) {
  const isEnabled = await smsService.isSMSEnabledForProvider(adminUserId);
  
  if (isEnabled) {
    const phone = await smsService.getProviderPhone(adminUserId);
    
    if (phone) {
      await smsService.sendSMS(phone, `[ROAM ADMIN] ${message}`, {
        adminUserId,
        priority: 'high'
      });
    }
  }
}

// Usage
await notifyAdmin(
  "admin-uuid-123",
  "Critical: Database backup failed at 2:00 AM"
);
```

### Fetching Settings (Frontend)
```typescript
// In component
const loadAdminSettings = async () => {
  // Get SMS settings
  const settingsResponse = await fetch(`/api/sms/settings/${adminUserId}`);
  const { sms_enabled, notification_phone } = await settingsResponse.json();
  
  // Get full user settings
  const { data } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .single();
    
  setSettings({ ...data, sms_enabled, notification_phone });
};
```

---

## Related Documentation

- **Platform-Wide Implementation**: `SMS_PLATFORM_WIDE_IMPLEMENTATION.md`
- **Twilio Quick Start**: `TWILIO_SMS_QUICKSTART.md`
- **SMS Implementation Guide**: `SMS_NOTIFICATIONS_IMPLEMENTATION.md`
- **Database Schema**: `DATABASE_SCHEMA_REFERENCE.md`

---

## Deployment Steps

1. **Database Migration**
   ```sql
   -- Run in Supabase SQL Editor
   \i add_admin_notification_phone.sql
   ```

2. **Install Dependencies**
   ```bash
   cd /packages/notification-service
   npm install
   cd ../..
   npm install --workspaces
   ```

3. **Environment Variables**
   - Add to Vercel project: roam-admin-app
   - Variables: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER

4. **Deploy**
   ```bash
   # Deploy all apps
   git add .
   git commit -m "feat: Add SMS notifications to admin app"
   git push origin main
   ```

5. **Verify**
   - Login to admin app
   - Navigate to Settings
   - Enable SMS notifications
   - Add phone number
   - Save settings
   - Check database for saved values

---

## Summary

✅ **Backend Routes**: SMS routes added and registered  
✅ **Frontend UI**: SMS toggle and phone input added to settings  
✅ **Database Schema**: Migration created for `notification_phone` column  
✅ **Integration**: Uses shared `@roam/notification-service` package  
✅ **Data Flow**: Settings → `user_settings`, Phone → `admin_users`

**Next Steps**:
1. Run database migration
2. Test settings page functionality
3. Test SMS delivery
4. Consider adding "Send Test SMS" button for admins
5. Document admin-specific SMS use cases
