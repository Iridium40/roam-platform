-- Migration: Backfill bank_connected from stripe_connect_accounts
-- This fixes businesses that completed Stripe onboarding but didn't have bank_connected set to true
-- because the webhook/API handlers weren't updating this field.

-- Backfill bank_connected for businesses that have a successful Stripe Connect account
-- A successful account has charges_enabled = true AND payouts_enabled = true
UPDATE business_profiles bp
SET 
  bank_connected = true,
  bank_connected_at = COALESCE(bp.bank_connected_at, sca.updated_at, NOW()),
  setup_completed = true
FROM stripe_connect_accounts sca
WHERE 
  bp.id = sca.business_id
  AND sca.charges_enabled = true
  AND sca.payouts_enabled = true
  AND (bp.bank_connected IS NULL OR bp.bank_connected = false);

-- Log how many records were updated
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % business_profiles with bank_connected = true', updated_count;
END $$;

-- Also ensure stripe_account_id is populated from stripe_connect_accounts
UPDATE business_profiles bp
SET stripe_account_id = sca.account_id
FROM stripe_connect_accounts sca
WHERE 
  bp.id = sca.business_id
  AND (bp.stripe_account_id IS NULL OR bp.stripe_account_id = '')
  AND sca.account_id IS NOT NULL;

-- Verify the fix - show businesses that should now be eligible
-- (This is just for verification, can be removed in production)
-- SELECT 
--   bp.id,
--   bp.business_name,
--   bp.is_active,
--   bp.verification_status,
--   bp.bank_connected,
--   bp.stripe_account_id,
--   sca.charges_enabled,
--   sca.payouts_enabled
-- FROM business_profiles bp
-- LEFT JOIN stripe_connect_accounts sca ON bp.id = sca.business_id
-- WHERE bp.is_featured = true OR bp.verification_status = 'approved';
