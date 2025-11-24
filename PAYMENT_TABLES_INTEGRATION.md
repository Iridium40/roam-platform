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

#### Service Amount

**If ≤24 hours away (Charged Immediately):**

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

**`booking_payment_schedules` table:**
```typescript
{
  booking_id: bookingId,
  payment_type: 'remaining_balance',
  scheduled_at: NOW(),
  amount: serviceAmount,
  status: 'processed',
  stripe_payment_intent_id: serviceAmountPaymentIntent.id,
  processed_at: NOW()
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
  booking_reference: bookingReference
}
```

**If >24 hours away (Authorized, Scheduled for Capture):**

**`financial_transactions` table:**
```typescript
{
  booking_id: bookingId,
  amount: serviceAmount,
  stripe_transaction_id: serviceAmountPaymentIntent.id,
  transaction_type: 'booking_payment',
  status: 'pending', // Not charged yet
  processed_at: null,
  metadata: { payment_type: 'service_amount', charged_immediately: false, capture_at_24h: true }
}
```

**`booking_payment_schedules` table:**
```typescript
{
  booking_id: bookingId,
  payment_type: 'remaining_balance',
  scheduled_at: bookingDateTime - 24 hours,
  amount: serviceAmount,
  status: 'scheduled',
  stripe_payment_intent_id: serviceAmountPaymentIntent.id,
  processed_at: null
}
```

**`business_payment_transactions` table:** *Not created yet* (will be created when payment is captured)

---

### 2. Scheduled Capture (24 Hours Before Booking)

**When:** Cron job runs (every hour) and finds payments due

**Location:** `roam-provider-app/api/bookings/capture-service-amount.ts`

**Process:**
1. Query `booking_payment_schedules` for `status = 'scheduled'` and `scheduled_at <= NOW()`
2. Capture payment intent via Stripe
3. Update all three tables

**Updates:**

**`booking_payment_schedules` table:**
```typescript
UPDATE booking_payment_schedules
SET 
  status = 'processed',
  processed_at = NOW()
WHERE id = schedule_id;
```

**`financial_transactions` table:**
```typescript
UPDATE financial_transactions
SET 
  status = 'completed',
  processed_at = NOW()
WHERE stripe_transaction_id = paymentIntentId;
```

**`business_payment_transactions` table:**
```typescript
INSERT INTO business_payment_transactions {
  booking_id: bookingId,
  business_id: businessId,
  payment_date: TODAY,
  gross_payment_amount: totalAmount,
  platform_fee: serviceFeeAmount,
  net_payment_amount: serviceAmount,
  tax_year: CURRENT_YEAR,
  stripe_payment_intent_id: paymentIntentId,
  stripe_connect_account_id: stripeConnectAccountId,
  booking_reference: bookingReference
}
```

---

## Table Relationships

```
bookings (1) ──┬──> financial_transactions (many)
               │
               ├──> booking_payment_schedules (many)
               │
               └──> business_payment_transactions (1)
```

## Key Points

1. **Service Fee**: Always charged immediately when booking is accepted
2. **Service Amount**: 
   - Charged immediately if booking ≤24h away
   - Authorized and scheduled if booking >24h away
3. **`business_payment_transactions`**: Created when service amount is actually charged (either immediately or via cron)
4. **All tables are updated atomically** - if one fails, the transaction is rolled back

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

### Find scheduled payments due for capture
```sql
SELECT * FROM booking_payment_schedules 
WHERE status = 'scheduled' 
  AND scheduled_at <= NOW()
ORDER BY scheduled_at;
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

