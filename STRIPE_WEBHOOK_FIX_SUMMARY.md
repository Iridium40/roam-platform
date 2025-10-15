# 🚨 Stripe Checkout Issue - Root Cause & Fix

## Problem
After successful Stripe checkout, the booking is **NOT being created** in the database.

## Root Cause Analysis

### ❌ What's Happening:
1. User completes Stripe checkout successfully
2. Stripe redirects to BookingSuccess page with `session_id`
3. BookingSuccess page queries database for booking
4. **Booking doesn't exist** → 406 error (because `.single()` expects 1 result, gets 0)
5. Page retries 10 times, fails each time

### 🔍 Why Booking Doesn't Exist:
The **Stripe webhook** (`checkout.session.completed`) is supposed to create the booking, but it's either:
- Not registered in Stripe Dashboard
- Not being sent by Stripe  
- Failing (signature verification or code error)
- Missing environment variables in Vercel

---

## ✅ Fixes Applied

### 1. Fixed Code Issue ✅
**File:** `roam-customer-app/api/stripe/webhook.ts`

**Removed duplicate variable declarations:**
```typescript
// BEFORE (had duplicates - lines 119-120)
const platformFee = parseFloat(metadata.platform_fee || '0'); // duplicate!
const totalAmount = parseFloat(metadata.total_amount); // duplicate!
const businessAmount = totalAmount - platformFee;

// AFTER (fixed)
const businessAmount = totalAmount - platformFee;
```

---

## 🔧 What You Need To Do

### Step 1: Check Webhook Registration in Stripe 🎯 **CRITICAL**

1. Go to: https://dashboard.stripe.com/test/webhooks
2. **Look for a webhook with this URL:**
   ```
   https://roamservices.app/api/stripe/webhook
   ```

#### If Webhook DOES NOT Exist:
**Create it now:**
1. Click "Add endpoint"
2. Endpoint URL: `https://roamservices.app/api/stripe/webhook`
3. Events to send: Select `checkout.session.completed`
4. Click "Add endpoint"
5. **Copy the signing secret** (starts with `whsec_...`)
6. Go to Step 2 to add it to Vercel

#### If Webhook EXISTS:
1. Click on it
2. Check "Events" tab for recent deliveries
3. Look for failures (red X icons)
4. Click failed events to see error details

---

### Step 2: Verify Vercel Environment Variables 🎯 **CRITICAL**

1. Go to: https://vercel.com/roam-5720c218/roam-customer-app/settings/environment-variables

2. **Verify these variables exist for PRODUCTION:**
   - ✅ `STRIPE_SECRET_KEY` (starts with `sk_test_...`)
   - ✅ `STRIPE_WEBHOOK_SIGNING_SECRET` (starts with `whsec_...`) ← **Most likely missing!**
   - ✅ `VITE_PUBLIC_SUPABASE_URL`
   - ✅ `SUPABASE_SERVICE_ROLE_KEY`

3. **If `STRIPE_WEBHOOK_SIGNING_SECRET` is missing or wrong:**
   - Get it from: Stripe Dashboard → Webhooks → Your endpoint → "Signing secret"
   - Add it to Vercel environment variables
   - Set for: **Production** environment
   - **Important:** Redeploy after adding (changes take effect on next deployment)

---

### Step 3: Deploy the Code Fix

```bash
# Commit and push the webhook fix
git add roam-customer-app/api/stripe/webhook.ts
git commit -m "fix: remove duplicate variable declarations in Stripe webhook handler"
git push origin main
```

Wait ~8 minutes for Vercel deployment to complete.

---

### Step 4: Test the Webhook

#### Option A: Send Test Event from Stripe Dashboard
1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click your webhook endpoint
3. Click "Send test webhook"
4. Select: `checkout.session.completed`
5. Click "Send test webhook"
6. Check if booking appears in database

#### Option B: Make a Real Test Booking
1. Go to https://roamservices.app
2. Select a service and complete booking flow
3. Use test card: `4242 4242 4242 4242`
4. Monitor Vercel logs for webhook activity

---

### Step 5: Monitor Webhook Delivery

#### Check Vercel Logs:
```bash
# Real-time logs
vercel logs roam-customer-app --follow

# Or view in dashboard
https://vercel.com/roam-5720c218/roam-customer-app/logs
```

#### Look for these log messages:
- ✅ `Processing webhook event: checkout.session.completed`
- ✅ `💾 Creating booking from checkout session: BK25ABC10001`
- ✅ `✅ Booking created successfully: <uuid>`
- ❌ `Webhook signature verification failed` → Wrong signing secret
- ❌ `❌ Error creating booking:` → Database/RLS issue

#### Check Stripe Dashboard:
1. Go to webhook events
2. Recent events should show **green checkmarks** ✅
3. Red X = failure (click to see error)

---

## 🎯 Quick Checklist

- [ ] Webhook registered in Stripe Dashboard
- [ ] `STRIPE_WEBHOOK_SIGNING_SECRET` set in Vercel
- [ ] Code fix committed and deployed
- [ ] Test webhook sent from Stripe Dashboard
- [ ] Booking created in database
- [ ] BookingSuccess page works (no 406 errors)

---

## 🔍 Verify Booking Was Created

```sql
-- Run this in Supabase SQL editor
SELECT 
  id, 
  booking_reference, 
  stripe_checkout_session_id, 
  payment_status,
  booking_status,
  total_amount,
  created_at
FROM bookings
WHERE stripe_checkout_session_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
```

Expected result:
- `payment_status` = `'paid'`
- `booking_status` = `'confirmed'`
- `stripe_checkout_session_id` = your session ID

---

## 📚 Documentation

- Full diagnostic: `STRIPE_WEBHOOK_DIAGNOSTIC.md`
- Implementation summary: `STRIPE_CHECKOUT_FIX_COMPLETE.md`
- Testing guide: `STRIPE_CHECKOUT_TESTING_GUIDE.md`

---

## 💡 Why This Happened

The payment-first architecture (Option 1) requires the webhook to create bookings after successful payment. The webhook must be:
1. ✅ Registered in Stripe
2. ✅ Configured with correct signing secret
3. ✅ Have access to Supabase (service role key)
4. ✅ Working code (no errors)

Without all 4, bookings won't be created even though payment succeeds.

---

## 🆘 Still Not Working?

If after following all steps the booking still doesn't exist:

1. **Check Vercel logs** for error messages
2. **Check Stripe webhook delivery status** for failures
3. **Verify RLS policies** on `bookings` table (service role key should bypass)
4. **Check Supabase logs** for database errors
5. Share error messages for further debugging

