# 🚨 Stripe Webhook Still Not Working - Troubleshooting Guide

## Current Status
- ✅ **Code Fixed**: Variable name corrected (`STRIPE_WEBHOOK_SECRET`)
- ✅ **Deployment Live**: Latest code is deployed and running
- ✅ **Webhook Endpoint Accessible**: `https://roamservices.app/api/stripe/webhook` responds
- ❌ **Bookings Not Created**: Webhook is not creating bookings after successful payments

## Root Cause Analysis

The webhook is **not being called by Stripe**. This means either:
1. **Webhook not registered** in Stripe Dashboard
2. **Webhook registered but not configured** for the right events
3. **Webhook failing** (but we'd see it in Stripe Dashboard)
4. **Environment issues** (but endpoint is accessible)

---

## 🔍 Step 1: Check Webhook Registration in Stripe Dashboard

### Go to Stripe Dashboard
1. **Login**: https://dashboard.stripe.com/test/webhooks
2. **Look for**: `https://roamservices.app/api/stripe/webhook`

### If NO Webhook Found:
**Create it now:**
1. Click **"Add endpoint"**
2. **Endpoint URL**: `https://roamservices.app/api/stripe/webhook`
3. **Events to send**: 
   - ✅ `checkout.session.completed`
   - ✅ `payment_intent.succeeded` (optional)
4. Click **"Add endpoint"**
5. **Copy the signing secret** (starts with `whsec_...`)
6. **Verify in Vercel** that `STRIPE_WEBHOOK_SECRET` matches this value

### If Webhook EXISTS:
1. **Click on it**
2. **Check "Events" tab** - look for recent deliveries
3. **Look for failures** (red X icons)
4. **Click failed events** to see error details
5. **Verify endpoint URL** is exactly: `https://roamservices.app/api/stripe/webhook`

---

## 🔍 Step 2: Test Webhook from Stripe Dashboard

### Send Test Event:
1. Go to your webhook endpoint in Stripe Dashboard
2. Click **"Send test webhook"**
3. Select: `checkout.session.completed`
4. Click **"Send test webhook"**
5. **Check Vercel logs** for webhook activity
6. **Check database** for booking creation

### Expected Results:
- ✅ **Stripe Dashboard**: Green checkmark (success)
- ✅ **Vercel Logs**: Webhook processing messages
- ✅ **Database**: New booking record created

---

## 🔍 Step 3: Check Vercel Logs

### View Real-Time Logs:
```bash
# Option A: Vercel CLI
vercel logs roam-customer-app --follow

# Option B: Vercel Dashboard
https://vercel.com/roam-5720c218/roam-customer-app/logs
```

### Look for These Messages:
- ✅ `Processing webhook event: checkout.session.completed`
- ✅ `💾 Creating booking from checkout session: BK25ABC10001`
- ✅ `✅ Booking created successfully: <uuid>`
- ❌ `Webhook signature verification failed` → Wrong signing secret
- ❌ `❌ Error creating booking:` → Database/RLS issue

---

## 🔍 Step 4: Verify Environment Variables

### Check Vercel Environment Variables:
1. Go to: https://vercel.com/roam-5720c218/roam-customer-app/settings/environment-variables
2. **Verify for PRODUCTION environment**:
   - ✅ `STRIPE_SECRET_KEY` (starts with `sk_test_...`)
   - ✅ `STRIPE_WEBHOOK_SECRET` (starts with `whsec_...`) ← **CRITICAL**
   - ✅ `VITE_PUBLIC_SUPABASE_URL`
   - ✅ `SUPABASE_SERVICE_ROLE_KEY`

### If `STRIPE_WEBHOOK_SECRET` is Wrong:
1. **Get correct value** from Stripe Dashboard → Webhooks → Your endpoint → "Signing secret"
2. **Update in Vercel** environment variables
3. **Redeploy** (changes take effect on next deployment)

---

## 🔍 Step 5: Test Complete Flow

### Make a Real Test Booking:
1. Go to https://roamservices.app
2. Select a service and complete booking flow
3. Use test card: `4242 4242 4242 4242`
4. **Monitor these in real-time**:
   - Vercel logs (for webhook activity)
   - Stripe Dashboard webhook events
   - Database for new booking

### Expected Flow:
1. ✅ Checkout session created
2. ✅ Payment completed
3. ✅ Stripe sends webhook
4. ✅ Webhook creates booking
5. ✅ BookingSuccess page finds booking

---

## 🔍 Step 6: Check Stripe Webhook Delivery Status

### In Stripe Dashboard:
1. Go to your webhook endpoint
2. Click **"Events" tab**
3. **Look for recent events** (should show `checkout.session.completed`)
4. **Check delivery status**:
   - ✅ **Green checkmark** = Success
   - ❌ **Red X** = Failed (click to see error)

### Common Failure Reasons:
- **401/400 error**: Wrong or missing signing secret
- **500 error**: Code error (check Vercel logs)
- **Timeout**: Webhook took too long (Stripe limit: 5 seconds)

---

## 🔍 Step 7: Database Verification

### Check if Any Bookings Exist:
```sql
-- Run in Supabase SQL editor
SELECT 
  id, 
  booking_reference, 
  stripe_checkout_session_id, 
  payment_status,
  booking_status,
  created_at
FROM bookings
WHERE stripe_checkout_session_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
```

### Expected Result:
- Should show bookings with `payment_status = 'paid'`
- Should show bookings with `booking_status = 'confirmed'`

---

## 🚨 Most Likely Issues

### Issue 1: Webhook Not Registered (90% likely)
**Solution**: Create webhook in Stripe Dashboard with correct URL and events

### Issue 2: Wrong Signing Secret (5% likely)
**Solution**: Update `STRIPE_WEBHOOK_SECRET` in Vercel to match Stripe Dashboard

### Issue 3: Webhook Failing (5% likely)
**Solution**: Check Vercel logs for error messages

---

## 🎯 Quick Fix Steps

### Step 1: Register Webhook (if not done)
1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click "Add endpoint"
3. URL: `https://roamservices.app/api/stripe/webhook`
4. Events: `checkout.session.completed`
5. Copy signing secret

### Step 2: Update Environment Variables
1. Go to: https://vercel.com/roam-5720c218/roam-customer-app/settings/environment-variables
2. Ensure `STRIPE_WEBHOOK_SECRET` is set for Production
3. Redeploy if you change it

### Step 3: Test
1. Send test webhook from Stripe Dashboard
2. Check Vercel logs
3. Verify booking creation

---

## 📞 Still Not Working?

If after following all steps the webhook still doesn't work:

1. **Share Stripe Dashboard screenshot** of webhook configuration
2. **Share Vercel logs** showing webhook activity (or lack thereof)
3. **Share environment variables** (without sensitive values)
4. **Test with Stripe CLI** if available

---

## 📝 Notes

- The 406 error on BookingSuccess page is a **symptom**
- The **root cause** is that webhooks aren't creating bookings
- Once webhook works, the 406 error will disappear
- Webhook registration is the **most common issue**

---

## 🔗 Useful Links

- **Stripe Webhooks**: https://dashboard.stripe.com/test/webhooks
- **Vercel Logs**: https://vercel.com/roam-5720c218/roam-customer-app/logs
- **Vercel Environment Variables**: https://vercel.com/roam-5720c218/roam-customer-app/settings/environment-variables
- **Supabase SQL Editor**: https://supabase.com/dashboard/project/vssomyuyhicaxsgiaupo/sql

