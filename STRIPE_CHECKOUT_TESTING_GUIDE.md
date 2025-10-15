# 🔒 Stripe Checkout Testing & Validation Guide

**Date**: October 15, 2025  
**Status**: 🚨 **CRITICAL ISSUE IDENTIFIED**

---

## 🚨 Critical Issue Summary

### Problem Identified

Recent analysis reveals that **Stripe checkout integration is NOT functioning**:

✅ **What We Found**:
1. **5 recent bookings** (Oct 15, 2025) all have `stripe_checkout_session_id: null`
2. **0 bookings** in database have successful checkout sessions
3. **Checkout API exists** and looks properly configured (`/api/stripe/create-checkout-session.ts`)
4. **Webhook handler exists** and properly handles `checkout.session.completed`
5. **5 successful payment intents** exist in Stripe (all $9.95 subscriptions, not bookings)

❌ **The Problem**:
- Bookings are being created WITHOUT going through Stripe checkout
- Payment status remains `pending` for all bookings
- Customers may be booking services without actually paying

---

## 📊 Current State Analysis

### Database Status (Verified via Supabase MCP)

```sql
-- Recent bookings (all have null checkout sessions)
SELECT id, booking_reference, stripe_checkout_session_id, payment_status 
FROM bookings 
ORDER BY created_at DESC 
LIMIT 5;

Result:
┌─────────────────────────────────────┬──────────────────┬───────────────────────────────┬────────────────┐
│ id                                  │ booking_ref      │ stripe_checkout_session_id    │ payment_status │
├─────────────────────────────────────┼──────────────────┼───────────────────────────────┼────────────────┤
│ 1a4d5096-6d05-4eca-a396-243e5d62... │ BK25DTPA0001     │ null                          │ pending        │
│ f607dea4-b865-43c3-81d9-6ee866ec... │ BK25QJX20001     │ null                          │ pending        │
│ 2c8bc84b-2abb-491e-89ea-0fd556a2... │ BK25WZ5B0001     │ null                          │ pending        │
│ eb2a69f4-6ab3-4fc6-85a5-944881aa... │ BK25642A0001     │ null                          │ pending        │
│ 0283a470-3905-46af-9fa5-84c4c212... │ BK25XK5D0001     │ null                          │ pending        │
└─────────────────────────────────────┴──────────────────┴───────────────────────────────┴────────────────┘

-- Bookings with successful checkout sessions
SELECT COUNT(*) 
FROM bookings 
WHERE stripe_checkout_session_id IS NOT NULL;

Result: 0 bookings
```

### Stripe Status (Verified via Stripe MCP)

```javascript
// Account Info
{
  "account_id": "acct_1NaIY9EQcuaqWZMK",
  "display_name": "ROAM"
}

// Recent Payment Intents
[
  {
    "id": "pi_3SFWIEEQcuaqWZMK1uVK48mX",
    "amount": 995,    // $9.95 - subscription payment
    "status": "succeeded",
    "customer": "cus_QJfOTz7QBUTejT"
  },
  // ... 4 more subscription payments (all $9.95)
]

// No checkout sessions found for bookings
```

---

## 🔍 Root Cause Analysis

### Checkout Flow Investigation

**Expected Flow**:
1. Customer books a service
2. Frontend calls `/api/stripe/create-checkout-session`
3. Stripe checkout session created
4. Customer redirected to Stripe checkout
5. Customer completes payment
6. Webhook receives `checkout.session.completed`
7. Booking updated with payment info

**Actual Flow** (suspected):
1. Customer books a service
2. ❌ Checkout session creation fails OR is bypassed
3. ❌ Booking created with `payment_status: pending`
4. ❌ No payment ever collected

### Potential Causes

1. **Frontend Issue**: 
   - Checkout button not calling API
   - API call failing silently
   - Error handling suppressing failures

2. **API Issue**:
   - Environment variables missing
   - API route not deployed
   - CORS preventing API access

3. **Flow Issue**:
   - Alternative booking flow bypassing payment
   - Test mode allowing bookings without payment
   - Payment step being skipped

---

## 🧪 Testing Protocol

### Phase 1: API Endpoint Verification

#### Test 1.1: Verify API Endpoint Exists

```bash
# Production Test
curl -I https://roamservices.app/api/stripe/create-checkout-session

# Expected: 200 OK or 405 Method Not Allowed (POST only)
# Bad: 404 Not Found
```

#### Test 1.2: Test Checkout Session Creation

```bash
# Create test checkout session
curl -X POST https://roamservices.app/api/stripe/create-checkout-session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "serviceId": "7fe8830c-cd9b-4d1e-b0a9-fa6ca743171a",
    "businessId": "BUSINESS_ID",
    "customerId": "94a39c73-e33e-45fd-82ea-de9595da3a07",
    "totalAmount": 160,
    "serviceName": "Test Massage",
    "businessName": "Test Business",
    "bookingDate": "2025-10-20",
    "startTime": "10:00:00",
    "deliveryType": "business_location"
  }'

# Expected Response:
# {
#   "sessionId": "cs_test_...",
#   "url": "https://checkout.stripe.com/c/pay/cs_test_...",
#   "amount": 160
# }
```

### Phase 2: Stripe MCP Testing

Use Stripe MCP to create and verify checkout sessions:

```typescript
// Test 2.1: Search for recent checkout sessions (if any exist)
mcp_stripe_search_stripe_resources({
  query: "checkout.sessions: created>2025-10-01"
})

// Test 2.2: Check customer payment history
mcp_stripe_list_customers({
  email: "customer@roamservices.app"
})

// Test 2.3: Verify payment intents for bookings
mcp_stripe_list_payment_intents({
  customer: "cus_...",
  limit: 10
})
```

### Phase 3: Supabase MCP Database Testing

```sql
-- Test 3.1: Check if any bookings have payment records
SELECT 
  b.id,
  b.booking_reference,
  b.payment_status,
  b.stripe_checkout_session_id,
  pt.stripe_payment_intent_id,
  pt.status as transaction_status
FROM bookings b
LEFT JOIN payment_transactions pt ON b.id = pt.booking_id
ORDER BY b.created_at DESC
LIMIT 10;

-- Test 3.2: Check customer Stripe profiles
SELECT 
  user_id,
  stripe_customer_id,
  stripe_email,
  created_at
FROM customer_stripe_profiles;

-- Test 3.3: Check if financial transactions exist
SELECT COUNT(*) 
FROM financial_transactions 
WHERE created_at > '2025-10-01';
```

### Phase 4: End-to-End Booking Test

**Manual Test Steps**:

1. **Open Customer App**: https://roamservices.app
2. **Select a Service**: Browse and choose a service
3. **Fill Booking Details**:
   - Date: Tomorrow
   - Time: 10:00 AM
   - Location: Customer location
4. **Proceed to Checkout**: Click "Book Now"
5. **Monitor Network Tab**:
   - Look for `/api/stripe/create-checkout-session` call
   - Check response status and body
   - Note any errors
6. **Check Redirect**:
   - Should redirect to Stripe checkout
   - URL should start with `https://checkout.stripe.com`
7. **Complete Test Payment**:
   - Use test card: `4242 4242 4242 4242`
   - Any future expiry
   - Any CVC
8. **Verify Success**:
   - Should redirect to booking success page
   - Check database for updated booking
   - Verify payment_status is `paid`

### Phase 5: Webhook Testing

```bash
# Test webhook endpoint
curl -X POST https://roamservices.app/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -H "stripe-signature: test" \
  -d '{
    "type": "checkout.session.completed",
    "data": {
      "object": {
        "id": "cs_test_123",
        "payment_intent": "pi_test_123",
        "customer": "cus_test_123",
        "metadata": {
          "customer_id": "94a39c73-e33e-45fd-82ea-de9595da3a07",
          "service_id": "7fe8830c-cd9b-4d1e-b0a9-fa6ca743171a",
          "business_id": "test",
          "total_amount": "160",
          "booking_date": "2025-10-20",
          "start_time": "10:00:00"
        }
      }
    }
  }'
```

---

## 🔧 Debugging Steps

### Step 1: Check Environment Variables

```bash
# In roam-customer-app directory
cat .env.production

# Required variables:
# STRIPE_SECRET_KEY=sk_live_...
# STRIPE_PUBLISHABLE_KEY=pk_live_...
# STRIPE_WEBHOOK_SIGNING_SECRET=whsec_...
# VITE_PUBLIC_SUPABASE_URL=https://...
# SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Step 2: Check Frontend Console

```javascript
// In Browser Console (https://roamservices.app)
// Check if Stripe is loaded
console.log(window.Stripe);

// Check if environment variables are available
console.log(import.meta.env.VITE_PUBLIC_STRIPE_PUBLISHABLE_KEY);

// Monitor API calls
// Open Network tab
// Filter by "stripe"
// Look for 404, 500, or CORS errors
```

### Step 3: Check Vercel Deployment

```bash
# Check if API route is deployed
vercel list roam-customer-app

# Check function logs
vercel logs --app=roam-customer-app --since=1h | grep stripe

# Check recent deployments
vercel inspect roam-customer-app
```

### Step 4: Check BookService.tsx Implementation

Key file: `/roam-customer-app/client/pages/BookService.tsx`

Look for:
```typescript
// Line ~1205
const response = await fetch('/api/stripe/create-checkout-session', {
  method: 'POST',
  headers,
  body: JSON.stringify(stripePayload),
});

// Check if error handling is present
if (!response.ok) {
  // Should show error to user
  throw new Error('Checkout creation failed');
}

// Check if redirect happens
const { url } = await response.json();
window.location.href = url; // Should redirect to Stripe
```

---

## ✅ Testing Checklist

### Pre-Deployment Checks

- [ ] Environment variables set in Vercel
- [ ] Stripe API keys are LIVE keys (not test)
- [ ] Webhook endpoint configured in Stripe Dashboard
- [ ] Webhook signing secret matches environment variable
- [ ] API routes are included in Vercel deployment
- [ ] CORS headers allow customer app domain

### Post-Deployment Checks

- [ ] API endpoint returns 200/405 (not 404)
- [ ] Test checkout session can be created
- [ ] Stripe checkout URL is generated
- [ ] Webhook endpoint responds to Stripe events
- [ ] Database updates after webhook events
- [ ] Payment status changes from pending to paid

### End-to-End Validation

- [ ] Customer can select a service
- [ ] Booking form accepts all required fields
- [ ] "Book Now" button calls checkout API
- [ ] Checkout session created successfully
- [ ] Customer redirected to Stripe checkout
- [ ] Test payment completes successfully
- [ ] Customer redirected to success page
- [ ] Booking appears in database with status "paid"
- [ ] Payment transaction recorded
- [ ] Financial transaction recorded
- [ ] Business payment transaction recorded

---

## 🎯 Priority Action Items

### Immediate (Do Now)

1. **Verify API Route Deployment**
   ```bash
   curl -I https://roamservices.app/api/stripe/create-checkout-session
   ```

2. **Check Environment Variables**
   - Vercel Dashboard → roam-customer-app → Settings → Environment Variables
   - Verify `STRIPE_SECRET_KEY` exists
   - Verify `STRIPE_WEBHOOK_SIGNING_SECRET` exists

3. **Test Checkout Creation**
   - Use curl or Postman to test API directly
   - Verify it returns a valid session URL

### Short Term (This Week)

1. **Fix Booking Flow**
   - Ensure checkout is called before booking creation
   - Add error handling for failed checkout creation
   - Show user-friendly errors

2. **Add Monitoring**
   - Log all checkout API calls
   - Alert on checkout failures
   - Track checkout→payment conversion rate

3. **Update Existing Bookings**
   - Identify unpaid bookings
   - Contact customers for payment
   - Consider canceling very old unpaid bookings

### Long Term (This Month)

1. **Implement Payment Retry Logic**
   - Allow customers to retry failed payments
   - Send payment reminder emails
   - Auto-cancel after X days

2. **Add Payment Analytics**
   - Track successful vs failed payments
   - Monitor checkout abandonment rate
   - Identify common payment issues

3. **Enhance Testing**
   - Add automated E2E tests for checkout
   - Test in staging before production
   - Monitor production checkout health

---

## 📝 Test Results Log

### Test Run: [Date]

**Tester**: _______________________  
**Environment**: Production / Staging / Local

| Test | Status | Notes |
|------|--------|-------|
| API endpoint exists | ⬜ Pass / ⬜ Fail | |
| Checkout session creation | ⬜ Pass / ⬜ Fail | |
| Stripe redirect works | ⬜ Pass / ⬜ Fail | |
| Payment completes | ⬜ Pass / ⬜ Fail | |
| Webhook processes event | ⬜ Pass / ⬜ Fail | |
| Database updates | ⬜ Pass / ⬜ Fail | |
| Customer sees success | ⬜ Pass / ⬜ Fail | |

**Issues Found**:
```
[List any issues discovered during testing]
```

**Actions Taken**:
```
[List any fixes or changes made]
```

---

## 🔗 Resources

### Documentation
- [Stripe Checkout Sessions](https://docs.stripe.com/payments/checkout)
- [Stripe Webhooks](https://docs.stripe.com/webhooks)
- [Stripe Testing](https://docs.stripe.com/testing)

### Code Files
- Frontend: `/roam-customer-app/client/pages/BookService.tsx`
- API: `/roam-customer-app/api/stripe/create-checkout-session.ts`
- Webhook: `/roam-customer-app/api/stripe/webhook.ts`

### Stripe Dashboard
- [Payments](https://dashboard.stripe.com/payments)
- [Checkout Sessions](https://dashboard.stripe.com/checkout/sessions)
- [Webhooks](https://dashboard.stripe.com/webhooks)
- [API Logs](https://dashboard.stripe.com/logs)

### Testing
- **Test Card**: 4242 4242 4242 4242
- **Test Email**: test@example.com
- **Webhook Testing**: [Stripe CLI](https://stripe.com/docs/stripe-cli)

---

## 🎓 MCP Testing Commands

### Stripe MCP Commands

```bash
# List recent payment intents
mcp_stripe_list_payment_intents({ limit: 10 })

# List customers
mcp_stripe_list_customers({ limit: 10 })

# Search for specific transactions
mcp_stripe_search_stripe_resources({
  query: "payment_intents: amount>10000"
})

# Get account info
mcp_stripe_get_stripe_account_info()
```

### Supabase MCP Commands

```bash
# List tables
mcp_supabase_list_tables({ project_id: "vssomyuyhicaxsgiaupo" })

# Execute SQL query
mcp_supabase_execute_sql({
  project_id: "vssomyuyhicaxsgiaupo",
  query: "SELECT * FROM bookings WHERE payment_status = 'pending' LIMIT 10"
})
```

---

## 📞 Support

If you encounter issues during testing:

1. **Check Stripe Dashboard** for error details
2. **Check Vercel Logs** for API errors
3. **Check Browser Console** for frontend errors
4. **Contact Support** with:
   - Test date/time
   - Booking reference
   - Error messages
   - Screenshots

---

**Last Updated**: October 15, 2025  
**Next Review**: Weekly until issue resolved  
**Status**: 🚨 CRITICAL - Requires immediate attention

