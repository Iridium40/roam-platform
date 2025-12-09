-- ============================================================================
-- Fix Webhook Errors - Complete Solution
-- ============================================================================
-- This script fixes two webhook errors:
-- 1. Error 42P10: "there is no unique or exclusion constraint matching the ON CONFLICT specification"
-- 2. Error 23503: Foreign key constraint violation on booking_changes.changed_by
--
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- PART 1: Add unique constraints to financial tables (fixes error 42P10)
-- ============================================================================

-- 1.1 Add unique constraint to financial_transactions.stripe_transaction_id
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'financial_transactions'
      AND constraint_name = 'unique_stripe_transaction_id'
      AND constraint_type = 'UNIQUE'
  ) THEN
    RAISE NOTICE 'Adding unique constraint to financial_transactions.stripe_transaction_id...';
    
    -- Clean up any existing duplicates first (keep earliest)
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
    
    -- Add the unique constraint
    ALTER TABLE financial_transactions 
    ADD CONSTRAINT unique_stripe_transaction_id 
    UNIQUE (stripe_transaction_id);
    
    -- Add index for performance
    CREATE INDEX IF NOT EXISTS idx_financial_transactions_stripe_id 
    ON financial_transactions(stripe_transaction_id)
    WHERE stripe_transaction_id IS NOT NULL;
    
    RAISE NOTICE '✅ Added unique constraint to financial_transactions.stripe_transaction_id';
  ELSE
    RAISE NOTICE 'ℹ️  Constraint unique_stripe_transaction_id already exists';
  END IF;
END $$;

-- 1.2 Add unique constraint to business_payment_transactions.stripe_payment_intent_id
-- ------------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'business_payment_transactions'
      AND constraint_name = 'unique_business_payment_stripe_intent'
      AND constraint_type = 'UNIQUE'
  ) THEN
    RAISE NOTICE 'Adding unique constraint to business_payment_transactions.stripe_payment_intent_id...';
    
    -- Clean up any existing duplicates first (keep earliest)
    DELETE FROM business_payment_transactions
    WHERE id IN (
      SELECT id
      FROM (
        SELECT 
          id,
          ROW_NUMBER() OVER (
            PARTITION BY stripe_payment_intent_id 
            ORDER BY created_at ASC
          ) as rn
        FROM business_payment_transactions
        WHERE stripe_payment_intent_id IS NOT NULL
      ) AS ranked
      WHERE rn > 1
    );
    
    -- Add the unique constraint
    ALTER TABLE business_payment_transactions
    ADD CONSTRAINT unique_business_payment_stripe_intent
    UNIQUE (stripe_payment_intent_id);
    
    -- Add index for performance
    CREATE INDEX IF NOT EXISTS idx_business_payment_transactions_payment_intent 
    ON business_payment_transactions(stripe_payment_intent_id)
    WHERE stripe_payment_intent_id IS NOT NULL;
    
    RAISE NOTICE '✅ Added unique constraint to business_payment_transactions.stripe_payment_intent_id';
  ELSE
    RAISE NOTICE 'ℹ️  Constraint unique_business_payment_stripe_intent already exists';
  END IF;
END $$;

-- ============================================================================
-- PART 2: Verify constraints (fixes error 42P10)
-- ============================================================================
DO $$
DECLARE
  ft_constraint_exists BOOLEAN;
  bpt_constraint_exists BOOLEAN;
BEGIN
  -- Check financial_transactions constraint
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'financial_transactions'
      AND constraint_name = 'unique_stripe_transaction_id'
      AND constraint_type = 'UNIQUE'
  ) INTO ft_constraint_exists;

  -- Check business_payment_transactions constraint
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'business_payment_transactions'
      AND constraint_name = 'unique_business_payment_stripe_intent'
      AND constraint_type = 'UNIQUE'
  ) INTO bpt_constraint_exists;

  IF ft_constraint_exists AND bpt_constraint_exists THEN
    RAISE NOTICE '✅ SUCCESS: All unique constraints are in place';
    RAISE NOTICE '✅ Webhook error 42P10 is now fixed';
  ELSE
    IF NOT ft_constraint_exists THEN
      RAISE WARNING '⚠️  FAILED: unique_stripe_transaction_id constraint is missing';
    END IF;
    IF NOT bpt_constraint_exists THEN
      RAISE WARNING '⚠️  FAILED: unique_business_payment_stripe_intent constraint is missing';
    END IF;
  END IF;
END $$;

-- ============================================================================
-- PART 3: Check booking_changes foreign key constraint (error 23503)
-- ============================================================================
-- The booking_changes.changed_by field references the users table, NOT customer_profiles
-- This is working as designed - the application code needs to pass user_id, not customer_id
-- 
-- To verify the constraint:
DO $$
BEGIN
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Checking booking_changes.changed_by foreign key constraint...';
  RAISE NOTICE '============================================================================';
  
  -- Display the foreign key constraint details
  PERFORM 1 FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
  WHERE tc.table_name = 'booking_changes'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'changed_by';
  
  IF FOUND THEN
    RAISE NOTICE '✅ Foreign key constraint exists on booking_changes.changed_by';
    RAISE NOTICE 'ℹ️  This constraint requires changed_by to reference users.id (not customer_profiles.id)';
    RAISE NOTICE 'ℹ️  Application code has been updated to pass user_id instead of customer_id';
  ELSE
    RAISE WARNING '⚠️  No foreign key constraint found on booking_changes.changed_by';
  END IF;
  
  RAISE NOTICE '============================================================================';
END $$;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- After running this script:
-- 1. ✅ financial_transactions.stripe_transaction_id has unique constraint
-- 2. ✅ business_payment_transactions.stripe_payment_intent_id has unique constraint  
-- 3. ✅ Webhook error 42P10 (ON CONFLICT) is fixed
-- 4. ℹ️  Webhook error 23503 (foreign key) requires application code fix (already done)
-- 
-- The application code has been updated to:
-- - Pass user_id (from customer_profiles.user_id) instead of customer_id
-- - Make booking_changes record creation non-fatal (continues even if it fails)
-- ============================================================================

