# ✅ Webhook Configuration Checklist

## Step-by-Step Verification

### ✅ Step 1: Verify Stripe Dashboard Setup

- [ ] Webhook endpoint added: `https://roamyourbestlife.com/api/stripe/webhook`
- [ ] Status shows: **Active** or **Enabled**
- [ ] Events selected:
  - [ ] `checkout.session.completed`
  - [ ] `payment_intent.succeeded`
  - [ ] `payment_intent.payment_failed`
  - [ ] `charge.refunded`
- [ ] Signing secret revealed and copied

### ✅ Step 2: Verify Vercel Environment Variables

- [ ] Logged into Vercel Dashboard
- [ ] Selected `roam-customer-app` project
- [ ] Navigated to Settings → Environment Variables
- [ ] Added `STRIPE_WEBHOOK_SECRET`
- [ ] Value: `whsec_uqxB2yGWn1TQUtTwdINPTnXJRLz1rIYs`
- [ ] Applied to: Production, Preview, Development
- [ ] Clicked **Save**

### ✅ Step 3: Redeploy Application

**CRITICAL:** Environment variables only take effect after redeployment!

- [ ] Go to Vercel Dashboard → Deployments
- [ ] Click ⋯ menu on latest deployment
- [ ] Click **Redeploy**
- [ ] Wait for deployment to complete (usually 1-2 minutes)
- [ ] Check deployment status is **Ready**

### ✅ Step 4: Send Test Webhook from Stripe

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click on your webhook endpoint
3. Click **"Send test webhook"** button
4. Select event: `checkout.session.completed`
5. Click **"Send test webhook"**

**Expected Result:**
- [ ] Response status: `200 OK`
- [ ] Response body shows success message
- [ ] "Recent deliveries" tab shows successful delivery

**If you get an error:**
- ❌ `500` - Check Vercel function logs
- ❌ `400` - Webhook signature verification failed (wrong secret)
- ❌ `404` - Endpoint not deployed (redeploy needed)

### ✅ Step 5: Check Vercel Function Logs

1. Go to Vercel Dashboard → Your Project
2. Click **Deployments** → Latest deployment
3. Click **Functions** tab
4. Look for `api/stripe/webhook.func`
5. Click to view logs

**Look for these log messages:**
- [ ] `🔔 Webhook received: POST`
- [ ] `✅ Webhook signature verified`
- [ ] No error messages

### ✅ Step 6: Test with Real Payment

1. **Make a test booking:**
   - Go to customer app
   - Create a booking
   - Complete payment using test card: `4242 4242 4242 4242`

2. **Check Stripe webhook deliveries:**
   - Go to Stripe Dashboard → Webhooks → Your endpoint
   - Click **"Recent deliveries"** tab
   - Should show 2 events:
     - [ ] `checkout.session.completed` - Status: 200
     - [ ] `payment_intent.succeeded` - Status: 200

3. **Check database records:**
   ```sql
   -- Should show new transaction
   SELECT * FROM financial_transactions 
   ORDER BY created_at DESC 
   LIMIT 1;
   
   -- Should show 2 payment splits
   SELECT * FROM payment_transactions 
   ORDER BY created_at DESC 
   LIMIT 2;
   ```

4. **Check customer app:**
   - [ ] Login as the customer who made payment
   - [ ] Navigate to **Transaction History**
   - [ ] Transaction should appear with:
     - Correct amount
     - Booking details
     - Payment date
     - Status: Completed

---

## 🚨 Troubleshooting

### Issue: Test webhook returns 400

**Cause:** Webhook signature verification failed

**Fix:**
1. Double-check the signing secret in Vercel matches Stripe exactly
2. No extra spaces or characters
3. Starts with `whsec_`
4. Redeploy after any changes

### Issue: Test webhook returns 500

**Cause:** Server error in webhook handler

**Check Vercel logs:**
1. Vercel Dashboard → Deployments → Latest → Functions → webhook
2. Look for error messages
3. Common causes:
   - Missing Supabase credentials
   - Database connection error
   - Missing required environment variables

### Issue: Test webhook succeeds, but real payments don't create transactions

**Possible causes:**
1. **Metadata missing from checkout session**
   - Check that `booking_id` is included in Stripe checkout session metadata

2. **Database RLS policies blocking inserts**
   - Check Supabase RLS policies on `financial_transactions` and `payment_transactions`

3. **Booking not found**
   - Check webhook logs for booking lookup errors

**Debug steps:**
1. Check Vercel function logs for the actual payment webhook
2. Look for these specific log messages:
   - `💰 Processing checkout.session.completed`
   - `📦 Booking ID from metadata: [uuid]`
   - `💵 Recording financial transaction: $X.XX`
   - `✅ Financial transaction recorded`
   - `💸 Recording payment splits`
   - `✅ Payment splits recorded`

---

## ✅ Success Criteria

**All checks must pass:**

- ✅ Stripe webhook endpoint is Active
- ✅ `STRIPE_WEBHOOK_SECRET` added to Vercel
- ✅ Application redeployed after adding secret
- ✅ Test webhook from Stripe returns 200 OK
- ✅ Real payment creates webhook events with 200 OK
- ✅ Database records created in `financial_transactions`
- ✅ Database records created in `payment_transactions`
- ✅ Transaction History page displays transactions
- ✅ No errors in Vercel function logs
- ✅ Customer receives confirmation email

---

## 📊 Expected Database Records After Payment

### financial_transactions (1 record)
```sql
booking_id: [booking-uuid]
amount: 100.00
transaction_type: 'service_payment'
status: 'completed'
stripe_transaction_id: 'pi_xxxxx'
created_at: [timestamp]
```

### payment_transactions (2 records)

**Record 1 - Platform Fee (12%)**
```sql
booking_id: [booking-uuid]
transaction_type: 'service_fee'
amount: 12.00
destination_account: 'roam_platform'
status: 'completed'
```

**Record 2 - Provider Payment (88%)**
```sql
booking_id: [booking-uuid]
transaction_type: 'remaining_balance'
amount: 88.00
destination_account: 'provider_connected'
status: 'pending'
```

---

**Status:** Ready to test  
**Next Action:** Add secret to Vercel → Redeploy → Test webhook

