# 🔧 Webhook Error Fix - Code 42P10

**Date**: November 27, 2025  
**Error**: `there is no unique or exclusion constraint matching the ON CONFLICT specification`  
**Location**: Stripe webhook handler (`payment_intent.succeeded`)  
**Code**: PostgreSQL error 42P10

---

## 🐛 Problem

When a booking is created and payment succeeds, the Stripe webhook fires but encounters a PostgreSQL error:

```
code: '42P10',
message: 'there is no unique or exclusion constraint matching the ON CONFLICT specification'
```

**Impact**:
- ✅ Booking IS created successfully
- ✅ Payment IS processed successfully  
- ❌ Webhook error prevents notifications from being sent
- ❌ Financial records may not be created

---

## 🔍 Root Cause

This error (42P10) occurs when code tries to use `ON CONFLICT` in an INSERT/UPDATE statement, but the target column doesn't have a UNIQUE constraint.

**Likely scenarios**:
1. Race condition between `checkout.session.completed` and `payment_intent.succeeded` webhooks
2. Attempt to insert duplicate records without proper constraint checking
3. Missing UNIQUE constraint on `financial_transactions.stripe_transaction_id`

---

## ✅ Solution

We need to add proper UNIQUE constraints and improve the webhook's idempotency handling.

### Step 1: Add UNIQUE Constraint to Database

Run this migration in Supabase:

```sql
-- Add unique constraint to prevent duplicate transactions
ALTER TABLE financial_transactions 
ADD CONSTRAINT unique_stripe_transaction_id 
UNIQUE (stripe_transaction_id);

-- Add unique constraint to business payment transactions  
ALTER TABLE business_payment_transactions
ADD CONSTRAINT unique_business_payment_stripe_intent
UNIQUE (stripe_payment_intent_id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_financial_transactions_stripe_id 
ON financial_transactions(stripe_transaction_id);
```

### Step 2: Update Webhook Handler (if needed)

The existing code already checks for duplicates before inserting (lines 682-698), but we can make it more robust.

---

## 🧪 Testing Steps

### Test 1: Verify Constraint Added

```sql
-- Check if constraint exists
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'financial_transactions'
  AND constraint_type = 'UNIQUE';
```

Expected: Shows `unique_stripe_transaction_id`

### Test 2: Create New Booking

1. Create a booking through customer app
2. Complete payment with test card
3. Check webhook logs - should succeed without error

### Test 3: Verify Financial Records

```sql
-- Check financial transaction was created
SELECT * FROM financial_transactions
WHERE stripe_transaction_id = 'PAYMENT_INTENT_ID';

-- Check business payment transaction was created
SELECT * FROM business_payment_transactions
WHERE stripe_payment_intent_id = 'PAYMENT_INTENT_ID';
```

---

## 🚨 Immediate Workaround (if can't add constraint immediately)

If you can't add the database constraint right now, the webhook is already handling duplicates gracefully with the existing checks (lines 682-698). The error is non-fatal - bookings still work.

**Current behavior**:
- Booking created ✅
- Payment processed ✅
- Webhook logs error ⚠️ (but booking still works)
- Notifications may not send ❌

**To manually check affected bookings**:

```sql
-- Find bookings with successful payments but no financial transaction
SELECT 
  b.id,
  b.booking_reference,
  b.payment_status,
  pt.stripe_payment_intent_id
FROM bookings b
LEFT JOIN payment_transactions pt ON b.id = pt.booking_id
WHERE b.payment_status = 'paid'
  AND pt.id IS NULL
  AND b.created_at > NOW() - INTERVAL '24 hours';
```

---

## 📊 Impact Assessment

**Before Fix**:
- Webhook errors logged
- Possible duplicate transaction attempts
- Financial records might not be created consistently

**After Fix**:
- Webhook handles duplicates gracefully
- Database prevents duplicate financial records
- Consistent financial tracking

---

## 🔄 Related Issues

This error might also indicate:

1. **Multiple webhook deliveries** - Stripe sometimes sends the same webhook multiple times
2. **Race conditions** - Both `checkout.session.completed` and `payment_intent.succeeded` fire simultaneously
3. **Retry logic** - Webhook retries on failure, causing duplicate attempts

All of these are handled by:
- Adding UNIQUE constraints (prevents duplicates at DB level)
- Checking for existing records before insert (application level)
- Using idempotent operations

---

## 📝 Next Steps

1. **Add the database constraints** (SQL above)
2. **Test with a new booking**
3. **Monitor webhook logs** for any remaining errors
4. **Verify financial records** are being created

Once constraints are added, the error should disappear and webhooks will process cleanly.

---

**Status**: Solution Identified - Needs Database Migration  
**Priority**: Medium (bookings work, but financial tracking may be incomplete)  
**ETA**: 5 minutes to apply migration


