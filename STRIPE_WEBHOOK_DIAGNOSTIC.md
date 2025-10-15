# 🚨 Stripe Webhook Diagnostic - Booking Not Created

## Issue Summary
After successful Stripe checkout (`session_id=cs_test_a18dYP6zQjiMH0oUSufKs35KDJazl7T2sO0Cf9BAhqnorguEw4JdgZenVQ`):
- ❌ **Booking does NOT exist in database**
- ❌ **BookingSuccess page shows 406 errors** (because no booking exists)
- ✅ **Webhook endpoint is accessible** at `https://roamservices.app/api/stripe/webhook`

## Root Cause
The Stripe webhook is either:
1. **Not registered** in Stripe Dashboard
2. **Not being sent** by Stripe
3. **Failing** (signature verification or booking creation error)
4. **Environment variables missing** in Vercel

---

## 🔍 Step 1: Check if Webhook is Registered in Stripe

### Go to Stripe Dashboard
1. Log in to https://dashboard.stripe.com/test/webhooks
2. Look for a webhook with endpoint: `https://roamservices.app/api/stripe/webhook`

### If Webhook Does NOT Exist
**You need to create it:**

```bash
# Option A: Using Stripe CLI (recommended for testing)
stripe listen --forward-to https://roamservices.app/api/stripe/webhook

# Option B: Create via Stripe Dashboard
# 1. Go to https://dashboard.stripe.com/test/webhooks
# 2. Click "Add endpoint"
# 3. Enter: https://roamservices.app/api/stripe/webhook
# 4. Select event: checkout.session.completed
# 5. Copy the signing secret (starts with whsec_)
```

---

## 🔍 Step 2: Verify Environment Variables in Vercel

The webhook needs these environment variables set in Vercel:

### Required Variables:
1. `STRIPE_SECRET_KEY` - Your Stripe secret key
2. `STRIPE_WEBHOOK_SIGNING_SECRET` - The webhook signing secret from Stripe
3. `VITE_PUBLIC_SUPABASE_URL` - Your Supabase URL
4. `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for bypassing RLS)

### How to Check/Set in Vercel:
1. Go to https://vercel.com/roam-5720c218/roam-customer-app/settings/environment-variables
2. Verify all 4 variables are set for **Production** environment
3. If `STRIPE_WEBHOOK_SIGNING_SECRET` is missing or wrong:
   - Get it from Stripe Dashboard → Webhooks → Your endpoint → Signing secret
   - Add it to Vercel
   - **Redeploy** (changes take effect on next deployment)

---

## 🔍 Step 3: Check Webhook Delivery Status in Stripe

### View Recent Webhook Events:
1. Go to https://dashboard.stripe.com/test/webhooks
2. Click on your webhook endpoint
3. Click "Events" tab
4. Look for recent `checkout.session.completed` events

### Check for Failures:
- **Green checkmark** = Success ✅
- **Red X** = Failed ❌
- Click on any failed event to see error details

### Common Failure Reasons:
- `401/400 error`: Wrong or missing signing secret
- `500 error`: Code error (check Vercel logs)
- `Timeout`: Webhook took too long (Stripe limit: 5 seconds)

---

## 🔍 Step 4: Test Webhook Manually

### Send a Test Event:
1. Go to https://dashboard.stripe.com/test/webhooks
2. Click your webhook endpoint
3. Click "Send test webhook"
4. Select event type: `checkout.session.completed`
5. Click "Send test webhook"
6. Check if booking was created in database

---

## 🔍 Step 5: Check Vercel Function Logs

### View Real-Time Logs:
```bash
# Option A: Vercel CLI
vercel logs roam-customer-app --follow

# Option B: Vercel Dashboard
# Go to: https://vercel.com/roam-5720c218/roam-customer-app/logs
```

### Look for:
- ✅ `Processing webhook event: checkout.session.completed`
- ✅ `💾 Creating booking from checkout session: BK25ABC10001`
- ✅ `✅ Booking created successfully: <uuid>`
- ❌ `Webhook signature verification failed`
- ❌ `❌ Error creating booking:`

---

## 🐛 Code Issue Found

**File:** `roam-customer-app/api/stripe/webhook.ts`  
**Lines:** 119-121

There's a **duplicate variable declaration** that could cause issues:

```typescript
// Line 60-62 (first declaration)
const totalAmount = parseFloat(metadata.total_amount);
const platformFee = parseFloat(metadata.platform_fee || '0');
const discountApplied = parseFloat(metadata.discount_applied || '0');

// Line 119-121 (DUPLICATE - causes shadowing)
const platformFee = parseFloat(metadata.platform_fee || '0');
const totalAmount = parseFloat(metadata.total_amount);
const businessAmount = totalAmount - platformFee;
```

**Fix:** Remove duplicate declarations (lines 119-120)

---

## 🔧 Quick Fix Steps

### 1. Fix Code Issue
```bash
# We'll fix the duplicate variable declarations
```

### 2. Register Webhook (if not done)
```bash
# Use Stripe CLI for testing
stripe listen --forward-to https://roamservices.app/api/stripe/webhook

# OR register in Stripe Dashboard
```

### 3. Verify Environment Variables in Vercel
- Ensure `STRIPE_WEBHOOK_SIGNING_SECRET` is set
- Redeploy if you add/change it

### 4. Test Again
- Make a test booking
- Monitor Vercel logs
- Check if booking is created

---

## 📊 Database Check

To verify if webhook is working, check recent bookings:

```sql
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
LIMIT 5;
```

---

## 🎯 Next Steps

1. **Immediate**: Check Stripe Dashboard for webhook registration
2. **Fix Code**: Remove duplicate variable declarations
3. **Verify**: Check Vercel environment variables
4. **Test**: Send test webhook from Stripe Dashboard
5. **Monitor**: Watch Vercel logs during next booking attempt

---

## 📝 Notes

- The 406 error on BookingSuccess page is a **symptom**, not the root cause
- The real issue is that the booking doesn't exist (webhook didn't create it)
- Once webhook is working, the 406 error will disappear

