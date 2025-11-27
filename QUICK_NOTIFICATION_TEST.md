# 🚀 Quick Notification Test

## What Was Fixed

The booking creation API (`roam-customer-app/api/bookings/create.ts`) was **NOT sending notifications** to business users. This has been fixed!

---

## ⚡ Quick Test (5 minutes)

### Step 1: Restart Dev Server (if needed)

Since we modified the API, restart the customer app:

```bash
cd /Users/alans/Desktop/ROAM/roam-platform
# The server should auto-reload, but if not:
# npm run dev
```

### Step 2: Create a Test Booking

1. **Open Customer App**: http://localhost:3000 (or check terminal for port)
2. **Find a Service**: Browse or search for any service
3. **Complete Booking**: 
   - Fill in date/time
   - Select or skip provider selection  
   - Add any delivery details
   - Proceed to checkout
4. **Complete Payment**: Use test card `4242 4242 4242 4242`
5. **Note the Booking ID** from the confirmation page

### Step 3: Check Terminal Logs

In the terminal where dev server is running, you should see:

```
✅ Booking created successfully: [BOOKING_ID]
✅ Successfully loaded notify-providers-new-booking from: [PATH]
📋 Booking assigned to provider [ID] / Booking not assigned, notifying owners...
📧 Notifying X provider(s) about new booking [BOOKING_ID]
📤 Calling notification API for provider [ID]: https://...
✅ Notification sent to provider [ID] (owner/dispatcher)
✅ Notification sent for booking: [BOOKING_ID]
```

### Step 4: Check Provider Email

**Within 1-2 minutes**, the provider should receive:

- **Subject**: "New Booking Received - [Service Name]"
- **From**: ROAM notifications
- **Content**: Customer name, service, date/time, amount, link to dashboard

### Step 5: Check Provider Dashboard

1. Login to provider app
2. Go to Bookings tab  
3. New booking should appear

---

## 🔍 What to Look For

### ✅ Success Indicators

- Terminal shows "✅ Notification sent"
- No errors in terminal
- Provider receives email within 2 minutes
- Booking appears in provider dashboard

### ❌ Problem Indicators

If you see in terminal:
- `⚠️ Could not load notify-providers-new-booking module`
- `❌ Failed to notify provider`
- `❌ Notification API error`

**Then**: Check the [BOOKING_NOTIFICATIONS_FIX.md](./BOOKING_NOTIFICATIONS_FIX.md) troubleshooting section.

---

## 📋 Pre-Test Checklist

Before testing, verify:

- [ ] Dev server is running
- [ ] You have a provider account with:
  - [ ] Valid email address
  - [ ] `is_active = true`
  - [ ] Linked to a business
  - [ ] Role: owner or dispatcher
- [ ] Provider can login to provider app
- [ ] At least one service exists to book
- [ ] Customer account exists (or can sign up)

---

## 🔧 Quick Verification Queries

### Check if Provider Exists and is Active

```sql
SELECT 
  p.id,
  p.first_name || ' ' || p.last_name as name,
  p.email,
  p.provider_role,
  p.is_active,
  p.business_id,
  u.email as auth_email
FROM providers p
LEFT JOIN auth.users u ON p.user_id = u.id
WHERE p.email = 'YOUR_PROVIDER_EMAIL@example.com';
```

**Expected**: 
- `is_active` = true
- `auth_email` is not NULL
- `provider_role` = 'owner' or 'dispatcher'

### Check Notification Settings

```sql
SELECT 
  email_notifications,
  provider_new_booking_email,
  notification_email
FROM user_settings
WHERE user_id = (
  SELECT user_id FROM providers WHERE email = 'YOUR_PROVIDER_EMAIL@example.com'
);
```

**Expected**:
- `email_notifications` = true (or NULL, defaults to true)
- `provider_new_booking_email` = true (or NULL, defaults to true)
- `notification_email` = valid email address (or NULL, uses auth.users email)

---

## 🎯 Expected Notification Email

**Subject**: New Booking Received - [Service Name]

**Body**:
```
Hi [Provider Name],

You have received a new booking request!

Booking Details:
- Customer: [Customer Name]
- Service: [Service Name]
- Date: [Booking Date]
- Time: [Booking Time]
- Location: [Service Location]
- Amount: $[Total Amount]

Special Instructions:
[Instructions or "None"]

View and manage this booking in your dashboard:
[Link to Provider Dashboard]

Best regards,
ROAM Team
```

---

## 🚨 Common Issues

### Issue: "Could not load notify-providers-new-booking module"

**Cause**: TypeScript files not compiled for serverless environment

**Fix**:
```bash
cd roam-customer-app
npm run build
# Restart dev server
```

### Issue: "No providers found to notify"

**Cause**: No active owners or dispatchers for the business

**Fix**: Ensure at least one provider with role 'owner' or 'dispatcher' exists and `is_active = true`

### Issue: Email not received

**Check**:
1. Spam folder
2. Provider email address is correct
3. `RESEND_API_KEY` environment variable is set
4. User hasn't disabled email notifications

---

## 📞 Need Help?

If notifications still aren't working after testing:

1. **Share terminal logs** (copy/paste the notification-related lines)
2. **Check database** (run verification queries above)
3. **Test notification API directly** (see BOOKING_NOTIFICATIONS_FIX.md)
4. **Verify environment variables** (RESEND_API_KEY, PROVIDER_APP_API_URL)

---

**Ready to test?** Create a booking and watch the terminal! 🎉

