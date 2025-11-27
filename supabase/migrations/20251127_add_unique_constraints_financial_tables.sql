-- Add unique constraints to financial tables to prevent duplicate transactions
-- This fixes the webhook error: "there is no unique or exclusion constraint matching the ON CONFLICT specification"
-- Error code: 42P10

-- ============================================================================
-- 1. Add unique constraint to financial_transactions.stripe_transaction_id
-- ============================================================================

-- First, check if there are any duplicate stripe_transaction_ids
-- If duplicates exist, we'll keep the first one and delete the rest
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT stripe_transaction_id
    FROM financial_transactions
    WHERE stripe_transaction_id IS NOT NULL
    GROUP BY stripe_transaction_id
    HAVING COUNT(*) > 1
  ) AS duplicates;

  IF duplicate_count > 0 THEN
    RAISE NOTICE 'Found % duplicate stripe_transaction_ids. Cleaning up...', duplicate_count;
    
    -- Keep only the earliest record for each stripe_transaction_id
    DELETE FROM financial_transactions
    WHERE id IN (
      SELECT id
      FROM (
        SELECT 
          id,
          ROW_NUMBER() OVER (
            PARTITION BY stripe_transaction_id 
            ORDER BY created_at ASC
          ) as rn
        FROM financial_transactions
        WHERE stripe_transaction_id IS NOT NULL
      ) AS ranked
      WHERE rn > 1
    );
    
    RAISE NOTICE 'Cleanup complete. Duplicate records removed.';
  ELSE
    RAISE NOTICE 'No duplicate stripe_transaction_ids found. Proceeding with constraint addition.';
  END IF;
END $$;

-- Add the unique constraint
ALTER TABLE financial_transactions 
ADD CONSTRAINT IF NOT EXISTS unique_stripe_transaction_id 
UNIQUE (stripe_transaction_id);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_financial_transactions_stripe_id 
ON financial_transactions(stripe_transaction_id)
WHERE stripe_transaction_id IS NOT NULL;

COMMENT ON CONSTRAINT unique_stripe_transaction_id ON financial_transactions IS 
'Ensures each Stripe payment intent is recorded only once in financial_transactions';

-- ============================================================================
-- 2. Add unique constraint to business_payment_transactions.stripe_payment_intent_id
-- ============================================================================

-- Check for duplicates in business_payment_transactions
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT stripe_payment_intent_id
    FROM business_payment_transactions
    WHERE stripe_payment_intent_id IS NOT NULL
    GROUP BY stripe_payment_intent_id
    HAVING COUNT(*) > 1
  ) AS duplicates;

  IF duplicate_count > 0 THEN
    RAISE NOTICE 'Found % duplicate stripe_payment_intent_ids in business_payment_transactions. Cleaning up...', duplicate_count;
    
    -- Keep only the earliest record for each stripe_payment_intent_id
    DELETE FROM business_payment_transactions
    WHERE id IN (
      SELECT id
      FROM (
        SELECT 
          id,
          ROW_NUMBER() OVER (
            PARTITION BY stripe_payment_intent_id 
            ORDER BY payment_date ASC
          ) as rn
        FROM business_payment_transactions
        WHERE stripe_payment_intent_id IS NOT NULL
      ) AS ranked
      WHERE rn > 1
    );
    
    RAISE NOTICE 'Cleanup complete. Duplicate business payment records removed.';
  ELSE
    RAISE NOTICE 'No duplicate stripe_payment_intent_ids found in business_payment_transactions.';
  END IF;
END $$;

-- Add the unique constraint
ALTER TABLE business_payment_transactions
ADD CONSTRAINT IF NOT EXISTS unique_business_payment_stripe_intent
UNIQUE (stripe_payment_intent_id);

-- Index already exists from previous migration, but ensure it's there
CREATE INDEX IF NOT EXISTS idx_business_payment_transactions_payment_intent 
ON business_payment_transactions(stripe_payment_intent_id)
WHERE stripe_payment_intent_id IS NOT NULL;

COMMENT ON CONSTRAINT unique_business_payment_stripe_intent ON business_payment_transactions IS 
'Ensures each Stripe payment intent is recorded only once in business_payment_transactions';

-- ============================================================================
-- 3. Verification
-- ============================================================================

-- Verify constraints were added
DO $$
BEGIN
  -- Check financial_transactions constraint
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'financial_transactions'
      AND constraint_name = 'unique_stripe_transaction_id'
      AND constraint_type = 'UNIQUE'
  ) THEN
    RAISE NOTICE '✅ Unique constraint added to financial_transactions.stripe_transaction_id';
  ELSE
    RAISE WARNING '⚠️ Failed to add unique constraint to financial_transactions';
  END IF;

  -- Check business_payment_transactions constraint
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'business_payment_transactions'
      AND constraint_name = 'unique_business_payment_stripe_intent'
      AND constraint_type = 'UNIQUE'
  ) THEN
    RAISE NOTICE '✅ Unique constraint added to business_payment_transactions.stripe_payment_intent_id';
  ELSE
    RAISE WARNING '⚠️ Failed to add unique constraint to business_payment_transactions';
  END IF;
END $$;

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- This migration:
-- 1. Cleans up any existing duplicate records (keeps earliest)
-- 2. Adds UNIQUE constraints to prevent future duplicates
-- 3. Adds indexes for performance
-- 4. Fixes webhook error code 42P10
-- 5. Ensures idempotent webhook processing

