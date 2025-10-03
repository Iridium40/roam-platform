# Stripe Checkout Error Fixes

## Date: January 30, 2025

## Issues Fixed

### 1. **Module Loading Error: "Cannot find module './en'"**
**Root Cause:** Using beta Stripe API version `2025-08-27.basil` which had bugs with locale file loading in hosted checkout pages.

**Solution:** 
- Downgraded to stable API version `2024-11-20.acacia`
- Updated in 3 files:
  - `api/stripe/create-checkout-session.ts`
  - `api/stripe/webhook.ts`
  - `server/lib/stripe-server.ts`

### 2. **Post-Checkout Error: 406 Not Acceptable / PGRST116**
**Root Cause:** Multiple issues with booking creation flow:
1. Field name mismatch: Webhook used `stripe_session_id` but success page queried `stripe_checkout_session_id`
2. Metadata format mismatch: Session metadata used camelCase but webhook expected snake_case
3. Missing required fields in webhook booking creation

**Solution:**

#### Updated Webhook Handler (`api/stripe/webhook.ts`)
- Changed field name: `stripe_session_id` → `stripe_checkout_session_id`
- Added proper type casting: `session.payment_intent as string`
- Fixed nullable fields: `provider_id: metadata.provider_id || null`
- Handled missing service_price: Uses `total_amount` as fallback

#### Updated Checkout Session Metadata (`api/stripe/create-checkout-session.ts`)
Changed metadata format from camelCase to snake_case:
```typescript
// Before
metadata: {
  bookingId: bookingId || '',
  customerId,
  serviceId,
  businessId,
  totalAmount: totalAmount.toString(),
  platformFee: (platformFee / 100).toString(),
  // ...
}

// After
metadata: {
  booking_id: bookingId || '',
  customer_id: customerId,
  service_id: serviceId,
  business_id: businessId,
  total_amount: totalAmount.toString(),
  platform_fee: (platformFee / 100).toString(),
  // ...
}
```

## Payment Flow

### Current Flow (After Fix)
1. **User completes booking form** → Selects service, business, provider, date, time
2. **Frontend calls** `POST /api/stripe/create-checkout-session` with booking details
3. **Backend creates Stripe checkout session** with all booking data in metadata
4. **User redirected to Stripe hosted checkout page** (now loads properly with stable API version)
5. **User completes payment** → Stripe processes payment
6. **Stripe sends webhook** `checkout.session.completed` to `/api/stripe/webhook`
7. **Webhook creates booking** in database with all details from session metadata
8. **User redirected to success page** → Queries booking by `stripe_checkout_session_id`
9. **Success page displays booking confirmation** with all details

### Key Improvements
- ✅ Stable Stripe API version (no locale loading errors)
- ✅ Consistent field naming (snake_case throughout)
- ✅ Proper type handling (nullable fields, string casting)
- ✅ Booking created via webhook (single source of truth)
- ✅ Success page can fetch booking immediately after redirect

## Testing Checklist

- [ ] Complete booking flow with test card (4242 4242 4242 4242)
- [ ] Verify Stripe checkout page loads without errors
- [ ] Confirm payment succeeds in Stripe dashboard
- [ ] Check webhook receives `checkout.session.completed` event
- [ ] Verify booking created in database with correct fields:
  - `stripe_checkout_session_id` matches session ID
  - `payment_status` = 'paid'
  - `booking_status` = 'confirmed'
  - All booking details populated correctly
- [ ] Confirm success page displays booking details
- [ ] Test cancellation flow returns to booking page

## Environment Variables Required

```env
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SIGNING_SECRET=whsec_...

# App URL (for redirect URLs)
VITE_APP_URL=http://localhost:5174

# Supabase
VITE_PUBLIC_SUPABASE_URL=https://...supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
```

## Webhook Setup

Ensure Stripe webhook is configured:
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-domain.com/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
4. Copy webhook signing secret to `STRIPE_WEBHOOK_SIGNING_SECRET`

## Files Modified

1. `/roam-customer-app/api/stripe/create-checkout-session.ts`
   - API version: `2025-08-27.basil` → `2024-11-20.acacia`
   - Metadata: camelCase → snake_case

2. `/roam-customer-app/api/stripe/webhook.ts`
   - API version: `2025-08-27.basil` → `2024-11-20.acacia`
   - Field: `stripe_session_id` → `stripe_checkout_session_id`
   - Type casting: Added `as string` for payment_intent
   - Nullable handling: Added fallbacks for missing fields

3. `/roam-customer-app/server/lib/stripe-server.ts`
   - API version: `2025-08-27.basil` → `2024-11-20.acacia`

## Notes

- The booking is created **by the webhook**, not by the checkout session creation
- If webhook is delayed, success page may show "Payment successful - processing booking details"
- Success page has retry logic (React.StrictMode causes double fetch in dev)
- Platform fee calculation: 2.9% of total + $0.30 processing fee

## Related Documentation

- [Stripe Checkout Documentation](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
- [Stripe API Versions](https://stripe.com/docs/api/versioning)
