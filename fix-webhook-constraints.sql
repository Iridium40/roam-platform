-- Fix webhook error: Add unique constraints to financial tables
-- Error code: 42P10 - "there is no unique or exclusion constraint matching the ON CONFLICT specification"
-- 
-- This script adds unique constraints to prevent duplicate transactions
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- 1. Add unique constraint to financial_transactions.stripe_transaction_id
-- ============================================================================

-- Check if constraint already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'financial_transactions'
      AND constraint_name = 'unique_stripe_transaction_id'
      AND constraint_type = 'UNIQUE'
  ) THEN
    -- Clean up any existing duplicates first
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
    
    RAISE NOTICE '✅ Added unique constraint to financial_transactions.stripe_transaction_id';
  ELSE
    RAISE NOTICE 'ℹ️ Constraint unique_stripe_transaction_id already exists on financial_transactions';
  END IF;
END $$;

-- ============================================================================
-- 2. Add unique constraint to business_payment_transactions.stripe_payment_intent_id
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'business_payment_transactions'
      AND constraint_name = 'unique_business_payment_stripe_intent'
      AND constraint_type = 'UNIQUE'
  ) THEN
    -- Clean up any existing duplicates first
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
    
    RAISE NOTICE '✅ Added unique constraint to business_payment_transactions.stripe_payment_intent_id';
  ELSE
    RAISE NOTICE 'ℹ️ Constraint unique_business_payment_stripe_intent already exists on business_payment_transactions';
  END IF;
END $$;

-- ============================================================================
-- 3. Verify constraints were added
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'financial_transactions'
      AND constraint_name = 'unique_stripe_transaction_id'
      AND constraint_type = 'UNIQUE'
  ) THEN
    RAISE NOTICE '✅ Verified: unique_stripe_transaction_id constraint exists';
  ELSE
    RAISE WARNING '⚠️ Constraint unique_stripe_transaction_id is missing!';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'business_payment_transactions'
      AND constraint_name = 'unique_business_payment_stripe_intent'
      AND constraint_type = 'UNIQUE'
  ) THEN
    RAISE NOTICE '✅ Verified: unique_business_payment_stripe_intent constraint exists';
  ELSE
    RAISE WARNING '⚠️ Constraint unique_business_payment_stripe_intent is missing!';
  END IF;
END $$;

