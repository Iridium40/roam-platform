# Admin Notification Email & Phone Implementation

**Date**: October 6, 2025
**Status**: ✅ COMPLETE

## Overview

Added `notification_email` and `notification_phone` columns to the `admin_users` table and integrated them into the admin settings UI. This brings the admin app to feature parity with the provider app for notification preferences.

---

## Database Schema Updates

### Updated Table: `admin_users`

```sql
create table public.admin_users (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  email character varying(255) not null,
  permissions jsonb null default '[]'::jsonb,
  is_active boolean null default true,
  created_at timestamp without time zone null default now(),
  image_url text null,
  first_name text null,
  last_name text null,
  role public.user_role not null,
  notification_email text null,    -- NEW
  notification_phone text null,    -- NEW (previously added)
  constraint admin_users_pkey primary key (id),
  constraint admin_users_user_id_fkey foreign KEY (user_id) 
    references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;
```

### New Columns

| Column | Type | Nullable | Purpose |
|--------|------|----------|---------|
| `notification_email` | text | Yes | Email address for admin notifications |
| `notification_phone` | text | Yes | Phone number for SMS notifications |

**Note**: Both columns were added in previous migrations:
- `notification_phone` - Added via `add_admin_notification_phone.sql`
- `notification_email` - Schema already updated by user

---

## Frontend Changes

### File: `/roam-admin-app/client/pages/AdminSettings.tsx`

#### 1. State Management

**Added State**:
```typescript
const [notificationEmail, setNotificationEmail] = useState<string>("");
// notificationPhone already existed
```

#### 2. Data Loading

**Updated Fetch Logic**:
```typescript
// Fetch admin user info for notification phone and email
const { data: adminData } = await supabase
  .from("admin_users")
  .select("id, notification_phone, notification_email")
  .eq("user_id", user.id)
  .single();

if (adminData) {
  setAdminUserId(adminData.id);
  setNotificationPhone(adminData.notification_phone || "");
  setNotificationEmail(adminData.notification_email || "");  // NEW
}
```

#### 3. Data Saving

**Updated Save Logic**:
```typescript
// Save notification phone and email to admin_users
if (adminUserId) {
  const { error: notificationError } = await supabase
    .from("admin_users")
    .update({ 
      notification_phone: notificationPhone?.trim() || null,
      notification_email: notificationEmail?.trim() || null  // NEW
    })
    .eq("id", adminUserId);

  if (notificationError) {
    console.error("Error updating notification settings:", notificationError);
  }
}
```

#### 4. UI Updates

**Added Conditional Email Input**:
```tsx
{/* Email Notifications */}
<div className="space-y-4">
  <div className="flex items-center justify-between">
    <div className="space-y-0.5">
      <Label>Email Notifications</Label>
      <p className="text-sm text-muted-foreground">
        Receive notifications via email
      </p>
    </div>
    <Switch ... />
  </div>

  {/* Conditional Email Input */}
  {editForm.email_notifications && (
    <div className="space-y-2 pl-6">
      <Label>Notification Email Address</Label>
      <Input
        type="email"
        placeholder="notifications@example.com"
        value={notificationEmail}
        onChange={(e) => {
          setNotificationEmail(e.target.value);
          setUnsavedChanges(true);
        }}
      />
      <p className="text-xs text-muted-foreground">
        Enter the email address where you want to receive notifications 
        (optional, defaults to account email)
      </p>
    </div>
  )}
</div>
```

---

## Visual Layout

### Admin Settings - Notifications Section

```
┌─────────────────────────────────────────────────┐
│ Notifications                                   │
├─────────────────────────────────────────────────┤
│ Email Notifications              [Toggle ON]   │
│ Receive notifications via email                │
│                                                 │
│   ┌───────────────────────────────────────┐    │
│   │ Notification Email Address            │    │
│   │ [notifications@example.com]           │    │
│   │ Optional, defaults to account email   │    │
│   └───────────────────────────────────────┘    │
│                                                 │
├─────────────────────────────────────────────────┤
│ Push Notifications               [Toggle ON]   │
│ Receive push notifications in your browser     │
├─────────────────────────────────────────────────┤
│ 🔊 Notification Sounds           [Toggle ON]   │
│ Play sound when notifications arrive           │
├─────────────────────────────────────────────────┤
│ 📱 SMS Notifications             [Toggle ON]   │
│ Receive notifications via text message         │
│                                                 │
│   ┌───────────────────────────────────────┐    │
│   │ Notification Phone Number             │    │
│   │ [+1 (555) 123-4567]                   │    │
│   │ Phone number for SMS notifications    │    │
│   └───────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

---

## Platform Consistency

### Admin vs Provider Settings - Now Identical

| Feature | Provider App | Admin App | Status |
|---------|-------------|-----------|--------|
| **Email Toggle** | ✅ | ✅ | ✅ Match |
| **Notification Email** | ✅ `providers.notification_email` | ✅ `admin_users.notification_email` | ✅ Match |
| **SMS Toggle** | ✅ | ✅ | ✅ Match |
| **Notification Phone** | ✅ `providers.notification_phone` | ✅ `admin_users.notification_phone` | ✅ Match |
| **Conditional Inputs** | ✅ | ✅ | ✅ Match |
| **UI Layout** | ✅ Separators + Icons | ✅ Separators + Icons | ✅ Match |
| **Save Behavior** | ✅ | ✅ | ✅ Match |

---

## Data Storage Pattern

### All User Types Now Support Custom Notification Contacts

| User Type | Settings Table | Email Column | Phone Column |
|-----------|---------------|--------------|--------------|
| **Admin** | `user_settings` | `admin_users.notification_email` | `admin_users.notification_phone` |
| **Provider** | `user_settings` | `providers.notification_email` | `providers.notification_phone` |
| **Customer** | `customer_profiles` | `customer_profiles.email` | `customer_profiles.phone` |

### Key Differences

**Admins & Providers**:
- Settings stored in `user_settings` table
- Separate notification email/phone in their respective tables
- Both fields are optional (fall back to account credentials)

**Customers**:
- Settings stored directly in `customer_profiles` table
- Use single `email` and `phone` fields (no separate notification fields)
- Simpler model for end users

---

## Use Cases for Admin Users

### 1. Team Email Distribution
```
Login Email: admin@company.com (personal)
Notification Email: alerts@company.com (team inbox)
→ All admins see notifications
```

### 2. On-Call Rotation
```
Login Email: john.doe@company.com
Notification Phone: +1-555-ONCALL (rotates weekly)
→ Current on-call person receives SMS
```

### 3. Department Routing
```
Login Email: finance.admin@company.com
Notification Email: finance-notifications@company.com
→ Entire finance department receives alerts
```

### 4. Personal Preference
```
Login Email: admin@work.com
Notification Email: alerts@personal.com
→ Receive work notifications on personal email
```

---

## Backend Integration Example

### Sending Admin Notifications

```typescript
import { supabase } from '@/lib/supabase';

async function notifyAdmin(adminUserId: string, subject: string, body: string) {
  // Get admin's notification preferences
  const { data: admin } = await supabase
    .from('admin_users')
    .select('email, notification_email, notification_phone')
    .eq('id', adminUserId)
    .single();
  
  // Get notification settings
  const { data: settings } = await supabase
    .from('user_settings')
    .select('email_notifications, sms_notifications')
    .eq('user_id', admin.user_id)
    .single();
  
  // Send email notification if enabled
  if (settings.email_notifications) {
    const emailAddress = admin.notification_email || admin.email;
    await emailService.send({
      to: emailAddress,
      subject,
      body
    });
  }
  
  // Send SMS notification if enabled
  if (settings.sms_notifications && admin.notification_phone) {
    await smsService.sendSMS(admin.notification_phone, body);
  }
}

// Usage
await notifyAdmin(
  "admin-uuid-123",
  "Critical Alert",
  "Database backup failed at 2:00 AM"
);
```

---

## Feature Parity Achieved

### Before This Update

| Feature | Provider | Admin | Customer |
|---------|----------|-------|----------|
| Email Toggle | ✅ | ✅ | ✅ |
| Custom Email | ✅ | ❌ | ❌ |
| SMS Toggle | ✅ | ✅ | ✅ |
| Custom Phone | ✅ | ✅ | ❌ |

### After This Update

| Feature | Provider | Admin | Customer |
|---------|----------|-------|----------|
| Email Toggle | ✅ | ✅ | ✅ |
| Custom Email | ✅ | ✅ | ❌* |
| SMS Toggle | ✅ | ✅ | ✅ |
| Custom Phone | ✅ | ✅ | ❌* |

*Customer design intentionally simpler (single email/phone)

---

## Testing Checklist

### Database
- [ ] Verify `notification_email` column exists in `admin_users`
- [ ] Verify `notification_phone` column exists in `admin_users`
- [ ] Check that both columns are nullable
- [ ] Confirm existing admin users have NULL (not breaking)

### UI - Email
- [ ] Load settings - email input hidden by default
- [ ] Enable email notifications - input appears
- [ ] Enter email address - unsaved changes detected
- [ ] Save settings - email persists to database
- [ ] Disable email notifications - input hidden (value retained)
- [ ] Reload page - notification_email loads correctly

### UI - Phone
- [ ] Load settings - phone input hidden by default
- [ ] Enable SMS notifications - input appears
- [ ] Enter phone number - unsaved changes detected
- [ ] Save settings - phone persists to database
- [ ] Disable SMS notifications - input hidden (value retained)
- [ ] Reload page - notification_phone loads correctly

### Validation
- [ ] Email field validates format (browser validation)
- [ ] Empty email saves as NULL
- [ ] Whitespace-only email saves as NULL
- [ ] Valid email saves correctly
- [ ] Phone field accepts various formats
- [ ] Empty phone saves as NULL

### Integration
- [ ] Both fields save together correctly
- [ ] Changing one field doesn't affect the other
- [ ] Save button appears when either field changes
- [ ] Success message shows after save
- [ ] Fields remain editable after save

### Cross-Platform
- [ ] Admin settings match provider settings layout
- [ ] Both use same conditional display pattern
- [ ] Both use same validation approach
- [ ] Both use same save behavior

---

## Migration Requirements

### Already Applied
1. ✅ `add_admin_notification_phone.sql` - Added notification_phone
2. ✅ Schema updated with notification_email column

### Verification SQL
```sql
-- Check both columns exist
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'admin_users'
  AND column_name IN ('notification_email', 'notification_phone');

-- Expected result:
-- notification_email | text | YES
-- notification_phone | text | YES
```

---

## Security Considerations

### Email Address Privacy
- Stored as plain text (standard for email addresses)
- RLS policies control access
- Only admin user can read/write their own notification settings
- Optional field (NULL is valid)

### Phone Number Privacy
- Stored as plain text
- Same RLS policies as email
- Only admin user can read/write their own notification settings
- Optional field (NULL is valid)

### Required RLS Policies
```sql
-- Admins can read their own notification settings
CREATE POLICY "Admins can read own notification settings"
  ON admin_users FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can update their own notification settings
CREATE POLICY "Admins can update own notification settings"
  ON admin_users FOR UPDATE
  USING (auth.uid() = user_id);
```

---

## Notification Service Integration

### When to Use notification_email vs email

```typescript
// Email Service Logic
async function getAdminEmailAddress(adminUserId: string): Promise<string> {
  const { data } = await supabase
    .from('admin_users')
    .select('email, notification_email')
    .eq('id', adminUserId)
    .single();
  
  // Use notification_email if set, otherwise fall back to account email
  return data.notification_email || data.email;
}
```

### When to Use notification_phone

```typescript
// SMS Service Logic
async function getAdminPhoneNumber(adminUserId: string): Promise<string | null> {
  const { data } = await supabase
    .from('admin_users')
    .select('notification_phone')
    .eq('id', adminUserId)
    .single();
  
  // Return notification_phone if set, otherwise null (no SMS)
  return data.notification_phone || null;
}
```

---

## Future Enhancements

### Phase 1 (Current Implementation)
- ✅ Add notification_email and notification_phone columns
- ✅ Conditional inputs in settings UI
- ✅ Save to database
- ✅ Feature parity with provider app

### Phase 2 (Recommended)
- [ ] Email verification (send confirmation to new email)
- [ ] Phone verification (SMS verification code)
- [ ] "Send Test" buttons for both email and SMS
- [ ] Show preview of where notifications will go

### Phase 3 (Advanced)
- [ ] Multiple notification contacts per admin
- [ ] Notification routing rules
- [ ] Escalation policies (email first, then SMS if critical)
- [ ] Notification preferences per alert type
- [ ] Time-based routing (business hours vs. after hours)

---

## Related Files

### Modified
- `/roam-admin-app/client/pages/AdminSettings.tsx`

### Related
- `/roam-provider-app/client/pages/dashboard/components/UserSettingsSection.tsx` (pattern reference)
- `add_admin_notification_phone.sql` (previous migration)
- `DATABASE_SCHEMA_REFERENCE.md` (needs update)

---

## Documentation Updates Needed

### Files to Update

1. **DATABASE_SCHEMA_REFERENCE.md**
   - Update `admin_users` table schema
   - Add notification_email column
   - Document both notification fields

2. **ADMIN_SMS_INTEGRATION_COMPLETE.md**
   - Update with notification_email information
   - Show both fields in examples

3. **SMS_PLATFORM_WIDE_IMPLEMENTATION.md**
   - Update admin section to include email
   - Show complete notification setup

---

## Summary

✅ **Database Schema**: `notification_email` and `notification_phone` columns in `admin_users` table  
✅ **Frontend State**: Added `notificationEmail` state variable  
✅ **Data Loading**: Fetches both notification_email and notification_phone  
✅ **Data Saving**: Saves both fields together  
✅ **UI Layout**: Conditional email input (matches SMS phone pattern)  
✅ **Validation**: Browser email validation  
✅ **Feature Parity**: Admin settings now match provider settings  
✅ **Platform Consistency**: All three apps have appropriate notification fields

Admin users can now specify both a custom email address and phone number for notifications, providing maximum flexibility for team management, on-call rotations, and personal preferences. The implementation matches the provider app pattern for consistency across the platform.
