# Stripe Webhook Secret Update Required

## New Test Mode Webhook Created

**Webhook Secret (Test Mode)**: `whsec_FREt2kmzvNbwxo9c36CSCoqJ252oJLJf`
**Endpoint URL**: `https://roamservices.app/api/stripe/webhook`

## Action Required

You need to update the `STRIPE_WEBHOOK_SECRET` environment variable in Vercel:

### Steps:

1. **Go to Vercel Dashboard**:
   - Visit: https://vercel.com/dashboard
   - Select your ROAM customer app project

2. **Update Environment Variable**:
   - Go to: Settings → Environment Variables
   - Find: `STRIPE_WEBHOOK_SECRET`
   - Update the value to: `whsec_FREt2kmzvNbwxo9c36CSCoqJ252oJLJf`
   - Make sure it's set for: **Production, Preview, and Development**

3. **Redeploy**:
   - After saving the new value, Vercel will ask you to redeploy
   - Click "Redeploy" or push a new commit to trigger deployment

## What Events Should Be Selected in Stripe?

Make sure these events are selected in your Stripe webhook (Test Mode):

- ✅ `checkout.session.completed` (REQUIRED - creates bookings)
- `checkout.session.async_payment_succeeded` (for async payments)
- `checkout.session.async_payment_failed` (for failed async payments)
- `payment_intent.succeeded` (optional - for payment confirmations)
- `payment_intent.payment_failed` (optional - for failed payments)

The most critical one is **`checkout.session.completed`** - this is what triggers booking creation.

## After Update

Once you've updated the environment variable and redeployed:

1. Test a new booking through Stripe checkout
2. The webhook should now receive the event
3. A booking should be automatically created in Supabase
4. Your booking success page should load correctly

---

**Current Status**: 
- ✅ Webhook endpoint is working
- ✅ Webhook code is correct
- ✅ New test webhook created in Stripe
- ⏳ Waiting for Vercel env var update

