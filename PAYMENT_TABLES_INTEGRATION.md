# Payment Tables Integration Guide

## Overview

This document explains how the three payment-related tables are updated during the booking payment flow:

1. **`financial_transactions`** - Customer payment tracking
2. **`booking_payment_schedules`** - Scheduled payment tracking
3. **`business_payment_transactions`** - Business payment tracking (for tax reporting)

## Payment Flow

### 1. Booking Accepted (Immediate Processing)

**When:** Business accepts a booking

**Location:** `roam-provider-app/api/bookings/payment-processor.ts` → `processBookingAcceptance()`

#### Service Fee (Charged Immediately)

**`financial_transactions` table:**
```typescript
{
  booking_id: bookingId,
  amount: serviceFeeAmount,
  stripe_transaction_id: serviceFeePaymentIntent.id,
  transaction_type: 'booking_payment',
  status: 'completed',
  processed_at: NOW(),
  metadata: { payment_type: 'service_fee', charged_immediately: true }
}
```

**`booking_payment_schedules` table:**
```typescript
{
  booking_id: bookingId,
  payment_type: 'service_fee',
  scheduled_at: NOW(), // Already processed
  amount: serviceFeeAmount,
  status: 'processed',
  stripe_payment_intent_id: serviceFeePaymentIntent.id,
  processed_at: NOW()
}
```

#### Service Amount (Business Service Fee)

**Charged Immediately Upon Acceptance (All Bookings):**

**`financial_transactions` table:**
```typescript
{
  booking_id: bookingId,
  amount: serviceAmount,
  stripe_transaction_id: serviceAmountPaymentIntent.id,
  transaction_type: 'booking_payment',
  status: 'completed',
  processed_at: NOW(),
  metadata: { payment_type: 'service_amount', charged_immediately: true }
}
```

**`business_payment_transactions` table:**
```typescript
{
  booking_id: bookingId,
  business_id: businessId,
  payment_date: TODAY,
  gross_payment_amount: totalAmount,
  platform_fee: serviceFeeAmount,
  net_payment_amount: serviceAmount,
  tax_year: CURRENT_YEAR,
  stripe_payment_intent_id: serviceAmountPaymentIntent.id,
  stripe_connect_account_id: stripeConnectAccountId,
  booking_reference: bookingReference,
  transaction_type: 'initial_booking'
}
```

**Note:** Both service fees (platform fees) and business service fees are charged immediately upon booking acceptance, regardless of booking date/time. There is no delayed charging or authorization for future capture.

---

### 2. Additional Service Payments (Add More Service)

**When:** Customer adds additional services to an existing booking

**Location:** `roam-customer-app/api/stripe/webhook.ts` → `handlePaymentIntentSucceeded()`

**`financial_transactions` table:**
```typescript
{
  booking_id: bookingId,
  amount: additionalServiceAmount,
  stripe_transaction_id: paymentIntent.id,
  transaction_type: 'booking_payment',
  status: 'completed',
  processed_at: NOW(),
  metadata: { payment_type: 'additional_service' }
}
```

**`business_payment_transactions` table:**
```typescript
{
  booking_id: bookingId,
  business_id: businessId,
  payment_date: TODAY,
  gross_payment_amount: additionalServiceAmount,
  platform_fee: platformFeeOnAdditionalService,
  net_payment_amount: netAdditionalServiceAmount,
  tax_year: CURRENT_YEAR,
  stripe_payment_intent_id: paymentIntent.id,
  stripe_connect_account_id: stripeConnectAccountId,
  booking_reference: bookingReference,
  transaction_type: 'additional_service' // Distinguishes from initial booking
}
```

**Note:** Each "add more service" payment creates a separate `business_payment_transactions` record to maintain audit trail. Multiple records per booking are allowed.

---

### 3. Tip Payments

**When:** Customer tips provider after service completion

**Location:** `roam-customer-app/api/stripe/webhook.ts` → `handleTipPaymentIntent()`

**`financial_transactions` table:**
```typescript
{
  booking_id: bookingId,
  amount: tipAmount,
  stripe_transaction_id: paymentIntent.id,
  transaction_type: 'tip',
  status: 'completed',
  processed_at: NOW(),
  metadata: { tip_amount, provider_id, business_id }
}
```

**`business_payment_transactions` table:** *NOT created* - Tips go directly to providers, not through businesses

---

## Table Relationships

```
bookings (1) ──┬──> financial_transactions (many)
               │
               └──> business_payment_transactions (many) - one per payment type
```

**Note:** `business_payment_transactions` can have multiple records per booking:
- One for initial booking payment (`transaction_type: 'initial_booking'`)
- One or more for additional service payments (`transaction_type: 'additional_service'`)

## Key Points

1. **Service Fee (Platform Fee)**: Always charged immediately when booking is accepted (non-refundable)
2. **Business Service Fee (Service Amount)**: Always charged immediately when booking is accepted
3. **Both fees charged immediately**: No delayed charging or authorization - all money is taken at acceptance
4. **`business_payment_transactions`**: 
   - Created immediately when booking is accepted (`transaction_type: 'initial_booking'`)
   - Additional records created for "add more service" payments (`transaction_type: 'additional_service'`)
   - Multiple records per booking allowed (unique constraint removed)
5. **Tips**: Do NOT create `business_payment_transactions` records (tips go directly to providers)

## Query Examples

### Check payment status for a booking
```sql
-- Financial transactions
SELECT * FROM financial_transactions 
WHERE booking_id = 'xxx' 
ORDER BY created_at;

-- Payment schedules
SELECT * FROM booking_payment_schedules 
WHERE booking_id = 'xxx' 
ORDER BY scheduled_at;

-- Business payment transaction
SELECT * FROM business_payment_transactions 
WHERE booking_id = 'xxx';
```

### Find all payments for a booking (including add more service)
```sql
SELECT * FROM business_payment_transactions 
WHERE booking_id = 'xxx'
ORDER BY created_at;
```

### Business payment summary
```sql
SELECT 
  business_id,
  COUNT(*) as transaction_count,
  SUM(net_payment_amount) as total_earnings,
  SUM(platform_fee) as total_platform_fees
FROM business_payment_transactions
WHERE tax_year = 2025
GROUP BY business_id;
```

