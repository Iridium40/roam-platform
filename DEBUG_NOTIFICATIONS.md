# 🔍 Debug: Why Notifications Aren't Being Queued

## Issue
When accepting a booking in provider app:
- ✅ Booking status updates successfully 
- ✅ Frontend receives success response
- ❌ No notifications queued in `notification_logs` table
- ❌ No emails sent to customers

## Diagnosis Steps

### Step 1: Check Vercel Function Logs

Go to Vercel Dashboard and check logs for the booking status update:

1. **Vercel Dashboard** → Provider App → **Deployments**
2. Click latest deployment
3. Click **Functions** tab
4. Look for `api/bookings/status-update`
5. Check logs for messages like:
   - `📧 Queuing notifications for status: confirmed`
   - `📧 Queuing customer_booking_accepted notification for user xxx`
   - `✅ Notification queued successfully`
   - OR error messages

**What to look for:**
- If you see `📧 Queuing` messages → Notification code IS running
- If you DON'T see those messages → Notification code NOT running
- If you see errors → Tells us what's failing

### Step 2: Check Booking Data

The notification code needs customer data. Run this to verify:

```sql
-- Check if customer data is being returned
SELECT 
  b.id,
  b.booking_status,
  cp.user_id as customer_user_id,
  cp.first_name as customer_first_name,
  cp.email as customer_email
FROM bookings b
LEFT JOIN customer_profiles cp ON b.customer_id = cp.id
WHERE b.id = 'a011d8aa-ae19-4dea-a16e-20bafb807e34';
```

**Expected:**
- `customer_user_id` should have a value (UUID)
- `customer_first_name` should have a value
- `customer_email` should have a value

**If any are NULL:** That's why notifications aren't queuing!

### Step 3: Check Notification Code is Executing

The code at line 141-148 in `status-update.ts` should execute:

```typescript
if (notifyCustomer || notifyProvider) {
  console.log('📧 Queuing notifications for status:', newStatus);
  sendStatusNotifications(booking, newStatus, { notifyCustomer, notifyProvider })
    .catch(error => {
      console.error('⚠️ Notification error (non-fatal):', error);
    });
}
```

**This executes when:**
- `notifyCustomer` is `true` (default)
- OR `notifyProvider` is `true` (default)

### Step 4: Check sendStatusNotifications Logic

The notification should queue when status is `'confirmed'`:

```typescript
if ((newStatus === 'confirmed' || newStatus === 'accepted') && 
    options.notifyCustomer && 
    customer?.user_id) {
  // Queue notification
}
```

**Requirements:**
- ✅ `newStatus` is `'confirmed'` or `'accepted'`
- ✅ `options.notifyCustomer` is `true`
- ❓ `customer?.user_id` exists

---

## Most Likely Causes

### Cause 1: Missing customer.user_id
**Symptom:** Customer profile doesn't have a `user_id`  
**Why:** Customer might have been created without linking to auth user  
**Fix:** Ensure customer profiles have `user_id` field populated

### Cause 2: Notification code failing silently
**Symptom:** No logs in Vercel, no errors thrown  
**Why:** Code wrapped in try-catch and doesn't re-throw  
**Fix:** Add more logging or check Vercel logs

### Cause 3: Environment variables missing
**Symptom:** Supabase client creation fails  
**Why:** Missing `VITE_PUBLIC_SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY`  
**Fix:** Verify env vars in Vercel

---

## Quick Test

Run this query to see which bookings CAN receive notifications:

```sql
SELECT 
  b.id as booking_id,
  b.booking_status,
  cp.user_id as customer_user_id,
  cp.email as customer_email,
  CASE 
    WHEN cp.user_id IS NULL THEN '❌ Missing user_id - CANNOT notify'
    WHEN cp.email IS NULL THEN '⚠️ Missing email'
    ELSE '✅ Can notify'
  END as notification_status
FROM bookings b
LEFT JOIN customer_profiles cp ON b.customer_id = cp.id
WHERE b.booking_status IN ('pending', 'confirmed')
ORDER BY b.created_at DESC
LIMIT 10;
```

---

## Next Steps

1. **Check Vercel logs** (most important!)
2. **Run Step 2 query** to verify customer has `user_id`
3. **Run Quick Test query** to see how many bookings can be notified
4. Report back what you find!

