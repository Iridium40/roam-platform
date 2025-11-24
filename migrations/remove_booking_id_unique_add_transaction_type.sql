-- Migration: Remove unique constraint on booking_id and add transaction_type column
-- Purpose: Allow multiple business_payment_transactions per booking (for "add more service")
-- Date: 2025-01-XX

-- Step 1: Remove unique constraint on booking_id
ALTER TABLE business_payment_transactions 
DROP CONSTRAINT IF EXISTS business_payment_transactions_booking_id_key;

-- Step 2: Create enum type for transaction types
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'business_payment_transaction_type') THEN
        CREATE TYPE business_payment_transaction_type AS ENUM (
            'initial_booking',
            'additional_service'
        );
    END IF;
END $$;

-- Step 3: Add transaction_type column with default value
ALTER TABLE business_payment_transactions 
ADD COLUMN IF NOT EXISTS transaction_type business_payment_transaction_type NOT NULL DEFAULT 'initial_booking';

-- Step 4: Update existing records to 'initial_booking' (they're all initial bookings)
UPDATE business_payment_transactions 
SET transaction_type = 'initial_booking' 
WHERE transaction_type IS NULL;

-- Step 5: Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_business_payment_transactions_type 
ON business_payment_transactions(booking_id, transaction_type);

-- Step 6: Add comment for documentation
COMMENT ON COLUMN business_payment_transactions.transaction_type IS 
    'Type of transaction: initial_booking (first payment) or additional_service (add more service)';

COMMENT ON COLUMN business_payment_transactions.stripe_transfer_id IS 
    'Stripe Connect transfer ID - only populated when transfer is made to business account (not on initial payment)';

COMMENT ON COLUMN business_payment_transactions.stripe_payment_intent_id IS 
    'Customer payment intent ID - links to the customer payment';

-- Verification queries (run these to verify migration):
-- SELECT COUNT(*) FROM business_payment_transactions WHERE transaction_type = 'initial_booking';
-- SELECT booking_id, COUNT(*) FROM business_payment_transactions GROUP BY booking_id HAVING COUNT(*) > 1;

