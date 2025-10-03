# 🚀 Testing Stripe Checkout Locally - Quick Start

## Current Issue
❌ **Booking not found after checkout** because webhooks can't reach localhost

## ✅ Solution: Use Stripe CLI

---

## 📋 **Step-by-Step Instructions**

### **Terminal 1: Start Stripe Webhook Forwarding**

```bash
# Login to Stripe (one-time setup)
stripe login

# Start webhook forwarding (KEEP THIS RUNNING)
stripe listen --forward-to localhost:3004/api/stripe/webhook
```

**Expected Output:**
```
> Ready! Your webhook signing secret is whsec_abc123xyz...
> 2025-01-30 12:00:00   --> checkout.session.completed [evt_...]
```

**⚠️ IMPORTANT:** Leave this terminal running! It forwards webhooks to your local server.

---

### **Terminal 2: Run Your Dev Server**

```bash
cd /Users/alans/Desktop/ROAM/roam-platform/roam-customer-app
npm run dev
```

**Expected Output:**
```
🚀 Development API server running on http://localhost:3004
  ➜  Local:   http://localhost:5174/
```

---

### **Browser: Test the Booking Flow**

1. **Go to:** http://localhost:5174
2. **Create booking:**
   - Select a service (e.g., "Car Wash")
   - Choose business
   - Select provider
   - Pick date & time
   - Click "Proceed to Checkout"

3. **Complete checkout:**
   - Use test card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., `12/26`)
   - CVC: Any 3 digits (e.g., `123`)
   - ZIP: Any 5 digits (e.g., `12345`)

4. **Watch Terminal 1:**
   You should see:
   ```
   --> checkout.session.completed [evt_...]
   --> payment_intent.succeeded [evt_...]
   ```

5. **Check Terminal 2:**
   You should see:
   ```
   Processing webhook event: checkout.session.completed
   ✅ Booking created successfully: [booking-id]
   ```

6. **Success Page:**
   Should now display your booking details!

---

## 🔍 **Verification Checklist**

After completing a test booking:

### ✅ **Terminal 1 (Stripe CLI) Shows:**
- `checkout.session.completed` event received
- `payment_intent.succeeded` event received

### ✅ **Terminal 2 (Dev Server) Shows:**
- "Processing webhook event: checkout.session.completed"
- "✅ Booking created successfully: [booking-id]"
- No errors in webhook processing

### ✅ **Success Page Shows:**
- Booking reference (e.g., "BK-2025-001234")
- Service name
- Business name
- Date and time
- Total amount
- Payment status: "Paid"

### ✅ **Database Has Records:**
Run this in your Supabase SQL Editor:
```sql
-- Check last booking created
SELECT 
  b.id, 
  b.booking_reference, 
  b.payment_status,
  b.provider_id,
  pt.status as payment_transaction_status,
  ft.amount as financial_amount,
  bpt.net_amount as business_net
FROM bookings b
LEFT JOIN payment_transactions pt ON pt.booking_id = b.id
LEFT JOIN financial_transactions ft ON ft.booking_id = b.id
LEFT JOIN business_payment_transactions bpt ON bpt.booking_id = b.id
ORDER BY b.created_at DESC
LIMIT 1;
```

**Expected Result:** 
- 1 row with all transaction records populated
- `payment_status` = 'paid'
- `provider_id` is not null
- All transaction amounts match

---

## 🐛 **Troubleshooting**

### **Issue: "stripe: command not found"**
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Verify installation
stripe version
```

### **Issue: "Webhook signature verification failed"**
**Cause:** The webhook secret doesn't match

**Fix:** 
1. Check Terminal 1 output for the `whsec_...` secret
2. Update `.env` file:
   ```env
   STRIPE_WEBHOOK_SIGNING_SECRET=whsec_[your-secret-here]
   ```
3. Restart dev server (Terminal 2)

### **Issue: Webhook events not showing in Terminal 1**
**Fix:**
1. Make sure Stripe CLI is still running (`stripe listen...`)
2. Check the URL is correct: `localhost:3004/api/stripe/webhook`
3. Restart Stripe CLI if needed

### **Issue: Dev server not receiving webhooks**
**Fix:**
1. Check dev server is running on port 3004
2. Test webhook endpoint:
   ```bash
   curl -X POST http://localhost:3004/api/stripe/webhook
   ```
   Should return: `{"error":"Missing Stripe signature"}`

### **Issue: Booking still not created**
**Check dev server logs for errors:**
1. Look for "Error creating booking:" messages
2. Check for database constraint violations
3. Verify all required fields in metadata

### **Issue: Success page shows "Payment successful - processing booking details"**
**Cause:** Webhook is delayed or failed

**Fix:**
1. Check Terminal 1 for webhook events
2. Check Terminal 2 for webhook errors
3. Wait a few seconds and refresh the page

---

## 📊 **What's Happening Behind the Scenes**

### **Without Stripe CLI (Broken):**
```
1. User completes checkout on Stripe
2. Stripe tries to send webhook to localhost:3004
3. ❌ Can't reach localhost (not publicly accessible)
4. ❌ Webhook never arrives
5. ❌ Booking never created
6. ❌ Success page: "Error: 0 rows"
```

### **With Stripe CLI (Working):**
```
1. User completes checkout on Stripe
2. Stripe sends webhook to Stripe servers
3. ✅ Stripe CLI intercepts webhook
4. ✅ Forwards to localhost:3004
5. ✅ Webhook creates booking + transactions
6. ✅ Success page: Shows booking details
```

---

## 🎯 **Expected Database State After Successful Test**

### **Tables Populated:**
1. ✅ `bookings` - 1 new record
2. ✅ `payment_transactions` - 1 new record
3. ✅ `financial_transactions` - 1 new record
4. ✅ `business_payment_transactions` - 1 new record
5. ✅ `customer_stripe_profiles` - Updated/created

### **Booking Fields:**
- `booking_reference`: "BK-2025-XXXXXX"
- `customer_id`: [customer-id]
- `provider_id`: [provider-id] ✅ Now populated!
- `service_id`: [service-id]
- `business_id`: [business-id]
- `stripe_checkout_session_id`: "cs_test_..."
- `stripe_payment_intent_id`: "pi_..."
- `payment_status`: "paid"
- `booking_status`: "confirmed"

---

## 🔄 **Quick Restart Commands**

If something goes wrong, restart everything:

```bash
# Kill all processes
pkill -f "stripe listen"
pkill -f "npm run dev"

# Terminal 1: Restart Stripe CLI
stripe listen --forward-to localhost:3004/api/stripe/webhook

# Terminal 2: Restart dev server
cd /Users/alans/Desktop/ROAM/roam-platform/roam-customer-app
npm run dev

# Test again!
```

---

## 🚀 **Ready to Test!**

You now have:
- ✅ Stripe CLI installed
- ✅ Correct environment variable name
- ✅ All database fixes applied
- ✅ Complete transaction tracking

**Next:** Follow the steps above to test the complete booking flow!

---

## 📞 **Need Help?**

If you see errors:
1. Check Terminal 1 (Stripe CLI) for webhook events
2. Check Terminal 2 (dev server) for processing logs
3. Check browser console for errors
4. Share the error messages for debugging

---

**Good luck with testing! 🎉**
