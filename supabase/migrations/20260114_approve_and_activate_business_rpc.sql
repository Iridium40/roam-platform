-- Approve + activate a business in one atomic transaction
-- Also activates the single onboarding-created owner provider (provider_role='owner')
-- Enforces invariant: exactly 1 owner provider row must exist for the business.

CREATE OR REPLACE FUNCTION public.approve_and_activate_business(
  p_business_id uuid,
  p_admin_user_id uuid,
  p_approval_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_count int;
  v_owner_provider_id uuid;
  v_business_is_active boolean;
BEGIN
  -- Ensure business exists (and capture current active state for response)
  SELECT bp.is_active
  INTO v_business_is_active
  FROM business_profiles bp
  WHERE bp.id = p_business_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      USING
        MESSAGE = 'Business profile not found',
        DETAIL = 'No business_profiles row found for the provided business_id.',
        ERRCODE = 'P0001';
  END IF;

  -- Enforce exactly one owner provider row
  SELECT COUNT(*), MIN(p.id)
  INTO v_owner_count, v_owner_provider_id
  FROM providers p
  WHERE p.business_id = p_business_id
    AND p.provider_role = 'owner';

  IF v_owner_count = 0 THEN
    RAISE EXCEPTION
      USING
        MESSAGE = 'Missing owner provider',
        DETAIL = 'Cannot approve business. Expected exactly 1 providers row with provider_role=''owner''.',
        ERRCODE = 'P0001';
  ELSIF v_owner_count > 1 THEN
    RAISE EXCEPTION
      USING
        MESSAGE = 'Multiple owner providers',
        DETAIL = 'Cannot approve business. Expected exactly 1 providers row with provider_role=''owner'', found more than 1.',
        ERRCODE = 'P0001';
  END IF;

  -- Approve + activate business
  UPDATE business_profiles
  SET
    verification_status = 'approved',
    approved_at = NOW(),
    approved_by = p_admin_user_id,
    approval_notes = p_approval_notes,
    is_active = TRUE
  WHERE id = p_business_id;

  -- Approve + activate owner provider
  UPDATE providers
  SET
    verification_status = 'approved',
    background_check_status = 'approved',
    is_active = TRUE
  WHERE id = v_owner_provider_id;

  RETURN jsonb_build_object(
    'businessId', p_business_id,
    'businessWasActive', v_business_is_active,
    'businessIsActive', TRUE,
    'ownerProviderId', v_owner_provider_id,
    'ownerProviderIsActive', TRUE
  );
END;
$$;

