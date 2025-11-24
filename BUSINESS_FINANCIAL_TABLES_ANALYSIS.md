# Business Financial Tables Analysis & Recommendations

## Issues Identified

### 1. **business_payment_transactions** - Critical Issues

#### Problem 1: Unique Constraint on `booking_id`
- **Current**: `constraint business_payment_transactions_booking_id_key unique (booking_id)`
- **Issue**: Prevents multiple records for the same booking (e.g., "add more service" payments)
- **Impact**: Current code updates existing records instead of creating new ones, losing audit trail
- **Fix**: Remove unique constraint, add `transaction_type` column to distinguish payment types

#### Problem 2: Column Misalignment
- **`stripe_transfer_id`**: Currently NULL for all records
  - **Should be**: Only populated when Stripe Connect transfer is made to business
  - **Current usage**: Not being populated anywhere
  - **Fix**: Populate when transfer is created, leave NULL for initial payment records

- **`stripe_payment_intent_id`**: Currently populated correctly
  - **Purpose**: Links to customer's payment intent
  - **Status**: ✅ Correct

- **Tax-related fields** (`stripe_tax_transaction_id`, `stripe_tax_reported`, etc.):
  - **Should be**: Only populated when tax reporting happens
  - **Current**: Not being populated
  - **Status**: ✅ Correct (will be populated later when tax reporting is implemented)

#### Problem 3: Missing Transaction Type
- **Issue**: No way to distinguish between:
  - Initial booking payment
  - Add more service payment
- **Fix**: Add `transaction_type` column (enum: `'initial_booking'`, `'additional_service'`)

### 2. **Tips** - Correct Behavior ✅
- Tips do NOT create `business_payment_transactions` records
- This is correct - tips go directly to providers, not through businesses
- Tips are tracked in `financial_transactions` with `transaction_type: 'tip'`

### 3. **Webhook Code Issues**

#### Current Behavior:
- **Booking payments**: Creates `business_payment_transactions` record ✅
- **Add more service**: Updates existing record ❌ (should create new record)
- **Tips**: No record created ✅ (correct)

#### Required Changes:
1. Remove unique constraint on `booking_id`
2. Add `transaction_type` column
3. Update webhook to create separate records for "add more service" instead of updating
4. Ensure `stripe_transfer_id` is only populated when transfer is made

## Recommended Schema Changes

### 1. Remove Unique Constraint
```sql
ALTER TABLE business_payment_transactions 
DROP CONSTRAINT business_payment_transactions_booking_id_key;
```

### 2. Add Transaction Type Column
```sql
-- Create enum type
CREATE TYPE business_payment_transaction_type AS ENUM (
  'initial_booking',
  'additional_service'
);

-- Add column
ALTER TABLE business_payment_transactions 
ADD COLUMN transaction_type business_payment_transaction_type NOT NULL DEFAULT 'initial_booking';

-- Add index for better query performance
CREATE INDEX idx_business_payment_transactions_type 
ON business_payment_transactions(booking_id, transaction_type);
```

### 3. Update Column Comments
```sql
COMMENT ON COLUMN business_payment_transactions.stripe_transfer_id IS 
  'Stripe Connect transfer ID - only populated when transfer is made to business account';

COMMENT ON COLUMN business_payment_transactions.stripe_payment_intent_id IS 
  'Customer payment intent ID - links to the customer payment';

COMMENT ON COLUMN business_payment_transactions.transaction_type IS 
  'Type of transaction: initial_booking (first payment) or additional_service (add more service)';
```

## Code Changes Required

### 1. Webhook Handler (`roam-customer-app/api/stripe/webhook.ts`)

**Current (lines 890-953)**: Updates existing record for "add more service"
**Change to**: Create new record with `transaction_type: 'additional_service'`

```typescript
// Remove the update logic, always create new records
const businessPaymentTransactionData = {
  booking_id: bookingId,
  business_id: booking.business_id,
  payment_date: paymentDate,
  gross_payment_amount: totalAmount,
  platform_fee: platformFee,
  net_payment_amount: netPaymentAmount,
  tax_year: taxYear,
  stripe_payment_intent_id: paymentIntent.id,
  stripe_connect_account_id: businessProfile?.stripe_connect_account_id || null,
  transaction_description: 'Platform service payment',
  booking_reference: booking.booking_reference || null,
  transaction_type: existingBusinessTransaction ? 'additional_service' : 'initial_booking',
};

await supabase
  .from('business_payment_transactions')
  .insert(businessPaymentTransactionData);
```

### 2. Payment Processor (`roam-provider-app/api/bookings/payment-processor.ts`)

**Current (line 307)**: Creates record without `transaction_type`
**Change to**: Add `transaction_type: 'initial_booking'`

```typescript
await supabase.from('business_payment_transactions').insert({
  booking_id: bookingId,
  business_id: businessId,
  payment_date: paymentDate,
  gross_payment_amount: totalAmount,
  platform_fee: serviceFeeAmount,
  net_payment_amount: serviceAmount,
  tax_year: currentYear,
  stripe_payment_intent_id: serviceAmountPaymentIntent.id,
  stripe_connect_account_id: stripeConnectAccountId,
  booking_reference: booking.booking_reference || null,
  transaction_description: `Service payment for booking ${booking.booking_reference || bookingId}`,
  transaction_type: 'initial_booking', // Add this
});
```

### 3. Stripe Transfer Creation (Future)

When creating Stripe Connect transfers, update the record:
```typescript
// After creating transfer
await supabase
  .from('business_payment_transactions')
  .update({
    stripe_transfer_id: transfer.id,
    // Note: stripe_tax_transaction_id will be populated when tax reporting happens
  })
  .eq('booking_id', bookingId)
  .eq('transaction_type', 'initial_booking'); // Update the initial booking record
```

## Summary of Changes

### Database Schema:
1. ✅ Remove unique constraint on `booking_id`
2. ✅ Add `transaction_type` enum column
3. ✅ Add index on `(booking_id, transaction_type)`

### Code Changes:
1. ✅ Update webhook to create separate records for "add more service"
2. ✅ Add `transaction_type` to all inserts
3. ✅ Remove update logic for "add more service" payments
4. ✅ Ensure `stripe_transfer_id` is only populated when transfer is made (future)

### Columns That Are Correct:
- ✅ `stripe_payment_intent_id` - Correctly populated
- ✅ `stripe_connect_account_id` - Correctly populated from business profile
- ✅ Tax-related fields - Correctly left NULL until tax reporting happens
- ✅ Tips don't create business_payment_transactions - Correct behavior

## Testing Checklist

After implementing changes:
- [ ] Initial booking payment creates record with `transaction_type: 'initial_booking'`
- [ ] "Add more service" creates new record with `transaction_type: 'additional_service'`
- [ ] Multiple "add more service" payments create multiple records
- [ ] Tips do NOT create business_payment_transactions records
- [ ] Querying by `booking_id` returns all related transactions
- [ ] `stripe_transfer_id` remains NULL until transfer is created

