-- Migration: Add Stripe Identity Verification fields to business_profiles
-- Date: November 5, 2025
-- Description: Split Phase 1 identity verification from business document upload
--              Identity (driver's license, proof of address) now verified via Stripe Identity

-- Add identity verification fields to business_profiles
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS identity_verification_session_id TEXT,
ADD COLUMN IF NOT EXISTS identity_verification_status TEXT CHECK (identity_verification_status IN ('pending', 'verified', 'failed', 'requires_input', 'processing')),
ADD COLUMN IF NOT EXISTS identity_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS identity_verification_data JSONB;

-- Create index for faster lookups by session ID
CREATE INDEX IF NOT EXISTS idx_business_profiles_identity_session 
ON business_profiles(identity_verification_session_id);

-- Create index for filtering by verification status
CREATE INDEX IF NOT EXISTS idx_business_profiles_identity_status 
ON business_profiles(identity_verification_status);

-- Add comments to document the fields
COMMENT ON COLUMN business_profiles.identity_verification_session_id IS 
'Stripe Identity verification session ID - links to Stripe Identity VerificationSession';

COMMENT ON COLUMN business_profiles.identity_verification_status IS 
'Current status of Stripe Identity verification - matches Stripe VerificationSession status';

COMMENT ON COLUMN business_profiles.identity_verified_at IS 
'Timestamp when identity verification was successfully completed';

COMMENT ON COLUMN business_profiles.identity_verification_data IS 
'Verified identity data from Stripe (name, DOB, address, document info)';

-- Note: The stripe_identity_verifications table may already exist from previous migrations
-- If it doesn't exist, create it now
CREATE TABLE IF NOT EXISTS stripe_identity_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('requires_input', 'processing', 'verified', 'canceled')),
  type TEXT NOT NULL CHECK (type IN ('document', 'id_number')),
  client_secret TEXT,
  verification_report_id TEXT,
  verified_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_business_verification UNIQUE(user_id, business_id)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_stripe_identity_verifications_user 
ON stripe_identity_verifications(user_id);

CREATE INDEX IF NOT EXISTS idx_stripe_identity_verifications_business 
ON stripe_identity_verifications(business_id);

CREATE INDEX IF NOT EXISTS idx_stripe_identity_verifications_session 
ON stripe_identity_verifications(session_id);

CREATE INDEX IF NOT EXISTS idx_stripe_identity_verifications_status 
ON stripe_identity_verifications(status);

-- Add RLS policies for stripe_identity_verifications
ALTER TABLE stripe_identity_verifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own verifications
CREATE POLICY IF NOT EXISTS "Users can view own identity verifications"
ON stripe_identity_verifications
FOR SELECT
USING (auth.uid() = user_id);

-- Service role can do everything
CREATE POLICY IF NOT EXISTS "Service role can manage identity verifications"
ON stripe_identity_verifications
FOR ALL
USING (auth.role() = 'service_role');

-- Add a function to update business_profiles when verification completes
CREATE OR REPLACE FUNCTION update_business_identity_verification()
RETURNS TRIGGER AS $$
BEGIN
  -- When verification status changes to 'verified', update business_profiles
  IF NEW.status = 'verified' AND (OLD.status IS NULL OR OLD.status != 'verified') THEN
    UPDATE business_profiles
    SET 
      identity_verification_session_id = NEW.session_id,
      identity_verification_status = 'verified',
      identity_verified_at = NOW(),
      identity_verification_data = NEW.verified_data
    WHERE id = NEW.business_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically update business_profiles
DROP TRIGGER IF EXISTS trigger_update_business_identity ON stripe_identity_verifications;
CREATE TRIGGER trigger_update_business_identity
AFTER INSERT OR UPDATE ON stripe_identity_verifications
FOR EACH ROW
EXECUTE FUNCTION update_business_identity_verification();

-- Migration complete
COMMENT ON TABLE stripe_identity_verifications IS 
'Stores Stripe Identity verification sessions and results for provider onboarding';

