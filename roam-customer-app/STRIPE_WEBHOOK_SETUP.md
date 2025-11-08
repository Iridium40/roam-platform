# 🎯 Stripe Webhook Setup - Quick Reference Guide

## ⚡ Quick Setup (5 minutes)

### Step 1: Add Webhook Endpoint in Stripe

1. **Go to Stripe Dashboard:**
   - Login at [dashboard.stripe.com](https://dashboard.stripe.com)
   - Navigate to: **Developers** → **Webhooks**

2. **Click "Add endpoint"**

3. **Enter Endpoint URL:**
   ```
   https://roamyourbestlife.com/api/stripe/webhook
   ```

4. **Select Events to Listen For:**

   Click "Select events" and choose these:

   **Payment Events:**
   - ✅ `checkout.session.completed`
   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.payment_failed`
   - ✅ `charge.refunded`
   - ✅ `charge.succeeded`
   
   **Account Events (if using Stripe Connect):**
   - ✅ `account.updated`
   - ✅ `account.external_account.created`

5. **Click "Add endpoint"**

### Step 2: Copy the Signing Secret

1. After creating the endpoint, click on it
2. In the "Signing secret" section, click **"Reveal"**
3. Copy the secret (starts with `whsec_`)

Example:
```
whsec_1234567890abcdefghijklmnopqrstuvwxyz
```

### Step 3: Add Secret to Vercel

1. **Go to Vercel Dashboard:**
   - Login at [vercel.com/dashboard](https://vercel.com/dashboard)
   - Select your `roam-customer-app` project

2. **Navigate to Settings:**
   - Click **Settings** tab
   - Click **Environment Variables** in sidebar

3. **Add New Variable:**
   - **Key:** `STRIPE_WEBHOOK_SECRET`
   - **Value:** `whsec_xxxxxxxxxxxxx` (paste the signing secret)
   - **Environments:** Select all (Production, Preview, Development)
   - Click **Save**

4. **Redeploy:**
   - Go to **Deployments** tab
   - Click **⋯** on latest deployment
   - Click **Redeploy**
   - ✅ This is required for the new environment variable to take effect

---

## ✅ Verify Setup

### Test 1: Check Webhook is Listed

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. You should see:
   ```
   https://roamyourbestlife.com/api/stripe/webhook
   Status: Active
   Events: 7 selected
   ```

### Test 2: Send Test Event

1. In Stripe Dashboard, click on your webhook endpoint
2. Click **"Send test webhook"** button
3. Select `checkout.session.completed`
4. Click **"Send test webhook"**

**Expected Results:**
- ✅ Status: `200 OK`
- ✅ Response shows success message
- ❌ If you get `500` or `400`, check Vercel logs

### Test 3: Make Real Payment

1. **Create a test booking in customer app**
2. **Complete payment** (use Stripe test card: `4242 4242 4242 4242`)
3. **Check webhook delivery:**
   - Go to Stripe Dashboard → Webhooks → Your endpoint
   - Click **"Recent deliveries"** tab
   - Should show `200 OK` for recent events

4. **Check database:**
   ```sql
   -- Check financial_transactions table
   SELECT * FROM financial_transactions 
   ORDER BY created_at DESC 
   LIMIT 5;
   
   -- Check payment_transactions table
   SELECT * FROM payment_transactions 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```

5. **Check customer app:**
   - Login as customer
   - Go to **Transaction History**
   - Should see the payment transaction

---

## 🔍 Troubleshooting

### Webhook Returns 500 Error

**Check Vercel Function Logs:**
1. Go to Vercel Dashboard → Your Project → Deployments
2. Click on latest deployment
3. Click **Functions** tab
4. Click on `api/stripe/webhook`
5. Check logs for errors

**Common Issues:**
- ❌ Missing `STRIPE_WEBHOOK_SECRET` environment variable
- ❌ Incorrect webhook secret value
- ❌ Database connection error (check Supabase credentials)

### Webhook Returns 400 Error

**Causes:**
- Webhook signature verification failed
- Wrong `STRIPE_WEBHOOK_SECRET` value

**Fix:**
1. Go to Stripe Dashboard → Webhooks → Your endpoint
2. Reveal the signing secret again
3. Copy it exactly (no extra spaces)
4. Update in Vercel environment variables
5. Redeploy

### Transactions Not Recording

**Check webhook is receiving events:**
1. Stripe Dashboard → Webhooks → Recent deliveries
2. Look for `checkout.session.completed` and `payment_intent.succeeded`
3. If missing, events aren't being sent

**Check webhook handler logic:**
1. Look at Vercel function logs
2. Search for these log messages:
   - `🔔 Webhook received: POST`
   - `✅ Webhook signature verified`
   - `💵 Recording financial transaction`
   - `✅ Financial transaction recorded`

---

## 📊 What Happens When Webhook Fires

### Event: `checkout.session.completed`

1. **Webhook receives event** from Stripe
2. **Verifies signature** using `STRIPE_WEBHOOK_SECRET`
3. **Retrieves booking ID** from metadata
4. **Updates booking** status to `confirmed`
5. **Records in `financial_transactions` table:**
   ```typescript
   {
     booking_id: 'uuid',
     amount: 100.00,
     transaction_type: 'service_payment',
     status: 'completed',
     stripe_transaction_id: 'pi_xxxxx'
   }
   ```
6. **Creates payment splits** in `payment_transactions` table:
   - Platform fee (12%) → `roam_platform`
   - Provider payment (88%) → `provider_connected`
7. **Sends confirmation email** to customer
8. **Returns 200 OK** to Stripe

### Event: `payment_intent.succeeded`

1. Additional verification that payment was successful
2. Updates payment status if needed
3. Triggers notification to provider

---

## 🎯 Success Checklist

Before considering setup complete, verify:

- ✅ Webhook endpoint added in Stripe Dashboard
- ✅ Events selected: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`
- ✅ Webhook signing secret copied
- ✅ `STRIPE_WEBHOOK_SECRET` added to Vercel environment variables (all environments)
- ✅ Customer app redeployed after adding environment variable
- ✅ Test webhook shows `200 OK` response
- ✅ Real payment test creates records in database
- ✅ Transaction History page shows payment transactions
- ✅ Customer receives confirmation email after payment

---

## 📝 Important Notes

### Development vs Production

- **Production:** Use live Stripe keys and webhook
- **Development:** Use test Stripe keys and separate webhook endpoint

### Webhook Security

- The signing secret authenticates webhook events
- Never expose your signing secret in client-side code
- Always verify webhook signatures before processing events

### Event Ordering

- Stripe doesn't guarantee event order
- Handle events idempotently (safe to process multiple times)
- Our webhook handler uses `stripe_payment_intent_id` to prevent duplicates

---

## 🆘 Need Help?

### Check Logs

**Vercel Logs:**
```
Vercel Dashboard → Project → Deployments → Latest → Functions → api/stripe/webhook
```

**Stripe Webhook Logs:**
```
Stripe Dashboard → Developers → Webhooks → Your endpoint → Recent deliveries
```

### Common Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| `No signatures found` | Missing or invalid secret | Update `STRIPE_WEBHOOK_SECRET` |
| `Unable to extract timestamp` | Malformed webhook event | Check Stripe is sending correct format |
| `Webhook signature verification failed` | Wrong secret | Copy secret again from Stripe |
| `Database error` | Supabase connection issue | Check Supabase credentials in Vercel |

---

**Status:** 📋 Ready to configure  
**Estimated Time:** 5 minutes  
**Difficulty:** Easy

