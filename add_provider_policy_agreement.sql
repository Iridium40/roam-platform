-- Provider Policy Agreement Database Schema
-- Created: October 9, 2025
-- Description: Tables for managing legal documents and policy acceptances

-- Create policy_acceptances table for tracking provider agreement acceptances
CREATE TABLE IF NOT EXISTS policy_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('provider_policy', 'customer_terms', 'privacy_policy', 'cancellation_policy')),
  document_version TEXT NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  acceptance_method TEXT CHECK (acceptance_method IN ('digital_signature', 'checkbox', 'click_accept')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, document_type, document_version)
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_policy_acceptances_user_id ON policy_acceptances(user_id);
CREATE INDEX IF NOT EXISTS idx_policy_acceptances_document_type ON policy_acceptances(document_type);
CREATE INDEX IF NOT EXISTS idx_policy_acceptances_accepted_at ON policy_acceptances(accepted_at DESC);

-- Enable RLS
ALTER TABLE policy_acceptances ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own acceptances
CREATE POLICY "Users can view their own policy acceptances" ON policy_acceptances
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own acceptances
CREATE POLICY "Users can insert their own policy acceptances" ON policy_acceptances
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can view all acceptances
CREATE POLICY "Admins can view all policy acceptances" ON policy_acceptances
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
    )
  );

-- Add policy acceptance tracking to providers table
ALTER TABLE providers 
ADD COLUMN IF NOT EXISTS policy_accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS policy_version TEXT;

-- Comment on tables and columns
COMMENT ON TABLE policy_acceptances IS 'Tracks legal document acceptances by users';
COMMENT ON COLUMN policy_acceptances.user_id IS 'Reference to auth.users who accepted the policy';
COMMENT ON COLUMN policy_acceptances.document_type IS 'Type of document accepted (provider_policy, customer_terms, etc.)';
COMMENT ON COLUMN policy_acceptances.document_version IS 'Version of the document that was accepted';
COMMENT ON COLUMN policy_acceptances.ip_address IS 'IP address from which the policy was accepted';
COMMENT ON COLUMN policy_acceptances.user_agent IS 'Browser user agent string for audit trail';
COMMENT ON COLUMN policy_acceptances.acceptance_method IS 'How the policy was accepted (checkbox, digital signature, etc.)';
