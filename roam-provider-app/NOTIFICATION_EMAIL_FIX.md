# 🔧 Booking Confirmation Email Fix

## Issue
When provider accepts/confirms a booking, no email is sent to the customer.

## Root Cause
The Supabase query in `/api/bookings/status-update.ts` was **missing `user_id`** from the `customer_profiles` selection.

The notification code requires `customer.user_id` to queue notifications:
```typescript
if ((newStatus === 'confirmed' || newStatus === 'accepted') && 
    options.notifyCustomer && 
    customer?.user_id) {  // ← This was undefined!
```

Without `user_id`, the condition fails and no notification is queued.

---

## Fix Applied

**File:** `/roam-provider-app/api/bookings/status-update.ts`

**Changed line 67-73:**

**Before:**
```typescript
customer_profiles (
  id,
  first_name,
  last_name,
  email,
  phone
  // ❌ Missing user_id
)
```

**After:**
```typescript
customer_profiles (
  id,
  first_name,
  last_name,
  email,
  phone,
  user_id  // ✅ Added
)
```

---

## What Will Happen After Deploy

### 1. Notification Queued
When provider confirms a booking:
```sql
INSERT INTO notification_logs (
  user_id,
  notification_type,
  channel,
  status,
  body
) VALUES (
  'customer-user-id',
  'customer_booking_accepted',
  'email',
  'pending',
  '{"customer_name": "Alan", "service_name": "Hydration", ...}'
);
```

### 2. Notification Variables Included
- Customer name
- Service name
- Provider name
- Booking date & time
- Location
- Total amount
- Booking ID

---

## ⚠️ Important: Notifications Are QUEUED, Not Sent

**Current Behavior:**
- ✅ Notification is queued in `notification_logs` table
- ✅ Status set to `'pending'`
- ❌ Email is NOT automatically sent

**Why?**
The system queues notifications but there's no worker process to actually send them via email.

### To Actually Send Emails

You have two options:

#### Option A: Build a Notification Worker (Recommended)
Create a background job that:
1. Reads `notification_logs` WHERE `status = 'pending'`
2. Sends email via Resend
3. Updates status to `'sent'` or `'failed'`

#### Option B: Send Email Directly (Quick Fix)
Instead of queuing, send the email immediately when booking is confirmed.

Would you like me to implement **Option B** (direct email sending) so customers get immediate emails?

---

## Testing After Deploy

### Step 1: Deploy Changes

```bash
cd /Users/alans/Desktop/ROAM/roam-platform/roam-provider-app
git add api/bookings/status-update.ts
git commit -m "Fix: Add user_id to customer_profiles query for notifications"
git push
```

### Step 2: Accept a Booking

1. Go to provider app
2. Find a pending booking
3. Click "Confirm" or "Accept"
4. Status updates successfully

### Step 3: Check Notification Was Queued

```sql
SELECT 
  id,
  user_id,
  notification_type,
  channel,
  status,
  created_at,
  body
FROM notification_logs 
WHERE status = 'pending'
ORDER BY created_at DESC 
LIMIT 5;
```

**Expected Result:**
- ✅ Should see 1 row
- ✅ `notification_type`: `'customer_booking_accepted'`
- ✅ `channel`: `'email'`
- ✅ `status`: `'pending'`
- ✅ `user_id`: Customer's user_id (not null)
- ✅ `body`: JSON with booking details

### Step 4: Check Vercel Logs

Look for these messages:
```
📧 Queuing notifications for status: confirmed
📧 Queuing customer_booking_accepted notification for user xxx
✅ Notification queued successfully
```

---

## Summary

**Problem:** Customer `user_id` not included in API response  
**Fix:** Added `user_id` to `customer_profiles` query  
**Result:** Notifications will now be queued  
**Next Step:** Need to build email sender OR implement direct sending  

**Status:** ✅ Fix complete, ready to deploy

