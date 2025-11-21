# 🔔 Notification Templates Testing Plan

## Migration Verification

### Step 1: Verify Templates in Supabase
Run this query in Supabase SQL Editor:

```sql
-- Check all templates
SELECT 
  template_key,
  template_name,
  is_active,
  CASE 
    WHEN email_body_html LIKE '%<img src="https://cdn.builder.io%' THEN '✅ Has Logo'
    ELSE '❌ Missing Logo'
  END as logo_check,
  LENGTH(email_body_html) as html_length,
  LENGTH(sms_body) as sms_length
FROM notification_templates
ORDER BY template_key;
```

### Step 2: Verify Indexes
```sql
-- Check indexes were created
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename IN ('notification_logs', 'notification_templates')
ORDER BY tablename, indexname;
```

---

## Phase 2: Test Already-Integrated Notifications

### ✅ Test #2: Customer Booking Accepted
**Integration**: Already in `/api/bookings/status-update.ts` (status='accepted')

**Test Steps**:
1. Login as a customer
2. Create a booking
3. Login as provider and **accept** the booking
4. Check:
   - ✅ Email sent to customer
   - ✅ Email has ROAM logo
   - ✅ Email includes booking details
   - ✅ SMS sent (if enabled)
   - ✅ Entry in `notification_logs` table

**SQL to verify**:
```sql
SELECT 
  notification_type,
  channel,
  status,
  recipient_email,
  sent_at,
  error_message
FROM notification_logs
WHERE notification_type = 'customer_booking_accepted'
ORDER BY created_at DESC
LIMIT 5;
```

---

### ✅ Test #3: Customer Booking Completed
**Integration**: Already in `/api/bookings/status-update.ts` (status='completed')

**Test Steps**:
1. Login as provider
2. Find an accepted booking
3. **Mark as completed**
4. Check:
   - ✅ Email sent to customer
   - ✅ Email has ROAM logo
   - ✅ Email includes review request
   - ✅ SMS sent (if enabled)
   - ✅ Entry in `notification_logs` table

**SQL to verify**:
```sql
SELECT 
  notification_type,
  channel,
  status,
  recipient_email,
  sent_at,
  error_message
FROM notification_logs
WHERE notification_type = 'customer_booking_completed'
ORDER BY created_at DESC
LIMIT 5;
```

---

### ✅ Test #6: Provider Booking Cancelled
**Integration**: Already in `/api/bookings/status-update.ts` (status='cancelled')

**Test Steps**:
1. Login as customer
2. Find an accepted booking
3. **Cancel** the booking
4. Check:
   - ✅ Email sent to provider
   - ✅ Email has ROAM logo
   - ✅ Email includes cancellation reason
   - ✅ SMS sent (if enabled)
   - ✅ Entry in `notification_logs` table

**SQL to verify**:
```sql
SELECT 
  notification_type,
  channel,
  status,
  recipient_email,
  sent_at,
  error_message
FROM notification_logs
WHERE notification_type = 'provider_booking_cancelled'
ORDER BY created_at DESC
LIMIT 5;
```

---

## Phase 3: Integrate & Test Remaining Notifications

### 🔨 #5: Provider New Booking
**Status**: ⚠️ Needs Integration

**Where to integrate**: 
- `/roam-customer-app/api/bookings/create.ts` or
- `/roam-provider-app/api/bookings/create.ts`

**Integration code**:
```typescript
// After successful booking creation
await notificationService.send({
  userId: provider.user_id,
  notificationType: 'provider_new_booking',
  templateVariables: {
    provider_name: provider.first_name,
    customer_name: customer.first_name + ' ' + customer.last_name,
    service_name: service.name,
    booking_date: formatDate(booking.booking_date),
    booking_time: formatTime(booking.booking_time),
    booking_location: booking.location,
    booking_amount: booking.total_amount,
    booking_id: booking.id,
  },
  metadata: { 
    booking_id: booking.id, 
    event_type: 'booking_created' 
  },
});
```

---

### 🔨 #1: Customer Welcome
**Status**: ⚠️ Needs Integration

**Where to integrate**: 
- `/roam-customer-app/client/pages/CustomerSignup.tsx` or
- Supabase auth trigger function

**Integration code**:
```typescript
// After successful signup
await notificationService.send({
  userId: newUser.id,
  notificationType: 'customer_welcome',
  templateVariables: {
    customer_name: firstName,
  },
  metadata: { 
    event_type: 'customer_signup' 
  },
});
```

---

### 🔨 #7: Provider Booking Rescheduled
**Status**: ⚠️ Needs Integration

**Where to integrate**: 
- `/roam-customer-app/api/bookings/reschedule.ts` or
- `/roam-provider-app/api/bookings/reschedule.ts`

**Integration code**:
```typescript
// After successful reschedule
await notificationService.send({
  userId: provider.user_id,
  notificationType: 'provider_booking_rescheduled',
  templateVariables: {
    provider_name: provider.first_name,
    customer_name: customer.first_name + ' ' + customer.last_name,
    service_name: service.name,
    old_booking_date: formatDate(oldBooking.booking_date),
    old_booking_time: formatTime(oldBooking.booking_time),
    new_booking_date: formatDate(newBooking.booking_date),
    new_booking_time: formatTime(newBooking.booking_time),
    booking_location: booking.location,
    booking_id: booking.id,
  },
  metadata: { 
    booking_id: booking.id, 
    event_type: 'booking_rescheduled' 
  },
});
```

---

### 🔨 #8: Admin Business Verification
**Status**: ⚠️ Needs Integration

**Where to integrate**: 
- `/roam-provider-app/api/onboarding/complete.ts` or
- Business profile creation endpoint

**Integration code**:
```typescript
// After provider completes onboarding
// Send to all admin users
const { data: admins } = await supabase.auth.admin.listUsers();
const adminUsers = admins.users.filter(u => 
  u.user_metadata?.user_type === 'ADMIN' || 
  u.user_metadata?.user_type === 'SUPER_ADMIN'
);

for (const admin of adminUsers) {
  await notificationService.send({
    userId: admin.id,
    notificationType: 'admin_business_verification',
    templateVariables: {
      business_name: business.business_name,
      owner_name: owner.first_name + ' ' + owner.last_name,
      contact_email: business.contact_email,
      contact_phone: business.contact_phone,
      business_category: business.category,
      business_location: business.address,
      submission_date: formatDate(new Date()),
      business_id: business.id,
    },
    metadata: { 
      business_id: business.id, 
      event_type: 'business_verification_required' 
    },
  });
}
```

---

### 📅 #4: Customer Booking Reminder
**Status**: ⚠️ Needs Cron Job

**Implementation**: 
- Create Vercel Cron Job (runs daily at 9 AM)
- File: `/roam-provider-app/api/cron/send-booking-reminders.ts`

**Cron Job Code**:
```typescript
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify cron secret
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = getSupabaseServiceClient();
  
  // Get bookings for tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  
  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, customer_profiles(*), providers(*), services(*)')
    .eq('booking_date', tomorrowStr)
    .in('status', ['confirmed', 'accepted']);
  
  for (const booking of bookings || []) {
    await notificationService.send({
      userId: booking.customer_profiles.user_id,
      notificationType: 'customer_booking_reminder',
      templateVariables: {
        customer_name: booking.customer_profiles.first_name,
        service_name: booking.services.name,
        provider_name: booking.providers.business_name,
        booking_date: formatDate(booking.booking_date),
        booking_time: formatTime(booking.booking_time),
        booking_location: booking.location,
        booking_id: booking.id,
      },
      metadata: { 
        booking_id: booking.id, 
        event_type: 'booking_reminder' 
      },
    });
  }
  
  res.json({ success: true, sent: bookings?.length || 0 });
}
```

**Add to `vercel.json`**:
```json
{
  "crons": [{
    "path": "/api/cron/send-booking-reminders",
    "schedule": "0 9 * * *"
  }]
}
```

---

## Testing Checklist

### Template Verification
- [ ] All 8 templates exist in `notification_templates` table
- [ ] All templates have `is_active = true`
- [ ] All email templates include ROAM logo
- [ ] All SMS templates are ≤ 160 characters

### Email Testing
- [ ] Emails have correct subject line
- [ ] Emails have ROAM logo at top
- [ ] Emails use ROAM brand color (#4F46E5)
- [ ] Emails have proper footer with contact info
- [ ] Variable replacement works correctly
- [ ] Emails are mobile-responsive

### SMS Testing
- [ ] SMS messages are concise (≤160 chars)
- [ ] SMS includes relevant booking info
- [ ] SMS includes short link
- [ ] Variable replacement works

### Logging
- [ ] All notifications logged to `notification_logs`
- [ ] Success/failure status recorded
- [ ] Resend ID / Twilio SID captured
- [ ] Error messages logged for failures

### User Preferences
- [ ] Master email toggle works
- [ ] Master SMS toggle works
- [ ] Granular notification toggles work
- [ ] Quiet hours respected
- [ ] Custom email/phone used when set

---

## Common Issues & Solutions

### Issue: Template not found
**Solution**: Run the migration SQL in Supabase

### Issue: No email received
**Check**:
1. Resend API key configured
2. User has email in `user_settings.notification_email`
3. Check `notification_logs` for errors
4. Check spam folder

### Issue: No SMS received
**Check**:
1. Twilio credentials configured
2. User has phone in `user_settings.notification_phone`
3. Phone number in E.164 format (+1234567890)
4. Check `notification_logs` for errors

### Issue: Variables not replaced
**Check**:
1. Template uses `{{variable_name}}` format
2. Variable passed in `templateVariables` object
3. Variable name matches exactly (case-sensitive)

---

## Quick Test All Templates

Run this to send test notifications:

```typescript
// Test file: /roam-provider-app/api/test-notifications.ts
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { userId, type } = req.body;
  
  const testData: Record<string, any> = {
    customer_welcome: {
      customer_name: 'John Doe',
    },
    customer_booking_accepted: {
      customer_name: 'John Doe',
      provider_name: 'Spa Paradise',
      service_name: 'Swedish Massage',
      booking_date: 'January 25, 2025',
      booking_time: '2:00 PM',
      booking_location: '123 Beach Rd, Seaside, FL',
      total_amount: '120.00',
      booking_id: 'test-123',
    },
    // ... add all 8 types
  };
  
  await notificationService.send({
    userId,
    notificationType: type,
    templateVariables: testData[type],
    metadata: { test: true },
  });
  
  res.json({ success: true });
}
```


