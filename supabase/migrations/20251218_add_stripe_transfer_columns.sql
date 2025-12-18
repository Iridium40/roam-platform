-- Migration: Add Stripe Connect transfer tracking columns
-- This migration adds columns needed for tracking Stripe Connect transfers

-- Add stripe_transfer_id to tips table for tip transfers
ALTER TABLE tips
ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT;

-- Add transfer tracking columns to business_payment_transactions if not present
ALTER TABLE business_payment_transactions 
ADD COLUMN IF NOT EXISTS transfer_created_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS transfer_reversed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS transfer_reversed_at TIMESTAMP WITH TIME ZONE;

-- Create index on stripe_transfer_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_tips_stripe_transfer_id 
ON tips(stripe_transfer_id) 
WHERE stripe_transfer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_business_payment_transactions_stripe_transfer_id 
ON business_payment_transactions(stripe_transfer_id) 
WHERE stripe_transfer_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN tips.stripe_transfer_id IS 'Stripe Transfer ID for tip payment transferred to connected account';
COMMENT ON COLUMN business_payment_transactions.transfer_created_at IS 'Timestamp when Stripe transfer was created';
COMMENT ON COLUMN business_payment_transactions.transfer_reversed IS 'Whether the transfer has been reversed (refund)';
COMMENT ON COLUMN business_payment_transactions.transfer_reversed_at IS 'Timestamp when transfer was reversed';
