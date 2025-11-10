# 📋 Check Vercel Function Logs - Step by Step

## What We Know
- ✅ Booking status updates successfully
- ✅ Customer has `user_id` and `email` 
- ✅ Data structure is correct
- ❌ No notifications being queued
- ❌ No rows in `notification_logs` table

## Root Cause
The notification code in `/api/bookings/status-update` is either:
1. Not executing
2. Failing silently
3. Missing environment variables

---

## How to Check Vercel Logs

### Step 1: Access Provider App Logs

1. Go to: https://vercel.com/dashboard
2. Click on your **roam-provider-app** project
3. Click **Deployments** tab
4. Click on the **latest deployment** (should be green "Ready")
5. Click **Functions** tab on the left
6. Look for `api/bookings/status-update.func`
7. Click on it to view logs

### Step 2: What to Look For

**If notification code IS running, you'll see:**
```
✅ Booking updated successfully: {...}
📝 Creating status history record...
✅ Status history created
📧 Queuing notifications for status: confirmed  ← LOOK FOR THIS
📧 Queuing customer_booking_accepted notification for user xxx  ← AND THIS
✅ Notification queued successfully  ← AND THIS
🎉 Status update completed successfully
```

**If notification code is NOT running, you'll see:**
```
✅ Booking updated successfully: {...}
📝 Creating status history record...
✅ Status history created
🎉 Status update completed successfully
```
(Notice: NO 📧 lines)

**If there's an error, you'll see:**
```
⚠️ Missing customer and provider data, skipping notifications
OR
⚠️ Missing Supabase credentials, skipping notifications  
OR
⚠️ Failed to queue notification: [error details]
OR
⚠️ Notification error (non-fatal): [error details]
```

### Step 3: Filter Logs

To find the specific booking update:
1. In Vercel logs, use the search box
2. Search for: `a011d8aa-ae19-4dea-a16e-20bafb807e34` (the booking ID)
3. OR search for: `Queuing notifications`
4. Look at the timestamp (should be around when you clicked "Confirm")

---

## Alternative: Check All Recent Logs

If you can't find specific booking:
1. In Vercel Functions view for `status-update.func`
2. Click **View Logs** 
3. Sort by most recent
4. Look for ANY instance of `📧 Queuing notifications`
5. If you see NONE → Notification code is not executing

---

## Most Likely Scenarios

### Scenario A: No 📧 logs at all
**Means:** The `if (notifyCustomer || notifyProvider)` condition is false  
**Cause:** The API call from frontend is NOT passing `notifyCustomer: true`  
**Fix:** Check what the frontend is sending in the API request

### Scenario B: See "⚠️ Missing customer and provider data"
**Means:** The booking data structure from Supabase isn't correct  
**Cause:** The `.select()` query isn't returning nested customer/provider data  
**Fix:** Need to debug the Supabase query

### Scenario C: See "⚠️ Missing Supabase credentials"  
**Means:** Environment variables not set in Vercel  
**Cause:** `VITE_PUBLIC_SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` missing  
**Fix:** Add environment variables to Vercel → Redeploy

### Scenario D: See "⚠️ Failed to queue notification"
**Means:** Insert to `notification_logs` table failed  
**Cause:** Database permissions, RLS policy, or schema mismatch  
**Fix:** Check RLS policies on `notification_logs` table

---

## Quick Test: Add More Logging

If you can't access Vercel logs easily, I can add more console.log statements to help debug.

Would you like me to:
1. Add temporary debug logging to track notification execution?
2. Check the frontend code to see what it's sending?
3. Verify Vercel environment variables are set?

---

## Expected Result

After checking Vercel logs, you should be able to tell me one of:
- "I see the 📧 Queuing messages" → Good, means code runs but insert fails
- "I don't see any 📧 messages" → Problem is earlier in the code
- "I see an error message: [paste error]" → I can tell you exactly what's wrong
- "I can't access Vercel logs" → We'll add debug logging instead

Let me know what you find! 🔍

