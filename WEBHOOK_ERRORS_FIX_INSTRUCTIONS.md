# Webhook Errors Fix Instructions

## Overview
This document explains how to fix the two webhook errors that occurred when testing "Add More Services" functionality.

---

## Errors Identified

### Error 1: Code 42P10
```
❌ Error handling payment intent succeeded: {
  code: '42P10',
  message: 'there is no unique or exclusion constraint matching the ON CONFLICT specification'
}
```

**Root Cause**: The database is missing unique constraints on:
- `financial_transactions.stripe_transaction_id`
- `business_payment_transactions.stripe_payment_intent_id`

Without these constraints, the webhook code cannot properly handle idempotent inserts (preventing duplicates).

---

### Error 2: Code 23503
```
❌ Error creating booking change record: {
  code: '23503',
  details: 'Key (changed_by)=(94a39c73-e33e-45fd-82ea-de9595da3a07) is not present in table "users".',
  message: 'insert or update on table "booking_changes" violates foreign key constraint "booking_changes_changed_by_fkey"'
}
```

**Root Cause**: The application code was passing `customer_id` (from `customer_profiles` table) to the `changed_by` field, but that field has a foreign key constraint to the `users` table. It needs `user_id` instead.

---

## Solution

### Step 1: Apply SQL Fix (YOU NEED TO DO THIS)

**Open your Supabase SQL Editor** and run the SQL script located at:
```
/Users/alans/Desktop/ROAM/roam-platform/fix-webhook-errors.sql
```

Or copy and paste the SQL from that file into your Supabase SQL Editor.

**What this SQL does:**
1. Adds unique constraint to `financial_transactions.stripe_transaction_id`
2. Adds unique constraint to `business_payment_transactions.stripe_payment_intent_id`
3. Cleans up any existing duplicate records (keeps the earliest one)
4. Creates indexes for performance
5. Verifies the constraints were added successfully

**You need to run this SQL on BOTH databases:**
- ✅ Production database
- ✅ Development/Staging database (if you have one)

---

### Step 2: Application Code Fix (ALREADY DONE)

The application code has been updated to:
1. Fetch `customer_profiles.user_id` when querying bookings
2. Pass `user_id` (not `customer_id`) to `booking_changes.changed_by`
3. Make `booking_changes` record creation non-fatal (continues even if it fails)

**Files Updated:**
- `roam-customer-app/api/bookings/add-additional-service.ts`

**Changes Committed:**
- Commit: `f8af4eb` - "Fix webhook errors for add additional service"
- Already pushed to GitHub

---

## Verification

After applying the SQL script, you should see these messages in your Supabase SQL Editor:

```
✅ Added unique constraint to financial_transactions.stripe_transaction_id
✅ Added unique constraint to business_payment_transactions.stripe_payment_intent_id
✅ SUCCESS: All unique constraints are in place
✅ Webhook error 42P10 is now fixed
✅ Foreign key constraint exists on booking_changes.changed_by
```

---

## Testing

After applying the SQL fix, test the "Add More Services" functionality again:

1. Go to a confirmed booking in the customer app
2. Click "Add More Services"
3. Add a service and complete payment
4. Check webhook logs - should see NO errors
5. Verify:
   - ✅ Payment processed successfully
   - ✅ `financial_transactions` record created
   - ✅ `business_payment_transactions` record created
   - ✅ `booking_changes` record created (audit trail)
   - ✅ `bookings.remaining_balance` updated

---

## Summary

**What you need to do:**
1. ✅ Open Supabase SQL Editor
2. ✅ Run the SQL from `fix-webhook-errors.sql`
3. ✅ Verify success messages
4. ✅ Test "Add More Services" again
5. ✅ Confirm no webhook errors

**What's already done:**
- ✅ Application code updated
- ✅ Changes committed to GitHub
- ✅ SQL script prepared

---

## Files Created/Modified

### New Files:
- `fix-webhook-errors.sql` - SQL script to apply to database

### Modified Files:
- `roam-customer-app/api/bookings/add-additional-service.ts` - Fixed to use user_id

---

## Expected Outcome

After applying the SQL fix, the "Add More Services" feature will work without errors:
- ✅ Payments will process correctly
- ✅ Webhooks will complete without errors
- ✅ All database records will be created properly
- ✅ Audit trail will be maintained in `booking_changes`

