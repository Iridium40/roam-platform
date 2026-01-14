-- Keep providers.active_for_bookings in sync with provider_services assignments.
-- This allows public-facing apps (customer app) to filter bookable providers/businesses
-- without needing to query provider_services directly (which may be restricted by RLS).

-- 1) Backfill current state
UPDATE providers p
SET active_for_bookings = EXISTS (
  SELECT 1
  FROM provider_services ps
  WHERE ps.provider_id = p.id
    AND ps.is_active = true
)
WHERE p.provider_role IN ('owner', 'provider');

-- 2) Trigger function to update the flag for a single provider
CREATE OR REPLACE FUNCTION public.sync_provider_active_for_bookings(p_provider_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE providers p
  SET active_for_bookings = EXISTS (
    SELECT 1
    FROM provider_services ps
    WHERE ps.provider_id = p_provider_id
      AND ps.is_active = true
  )
  WHERE p.id = p_provider_id
    AND p.provider_role IN ('owner', 'provider');
END;
$$;

-- 3) Trigger on provider_services mutations
CREATE OR REPLACE FUNCTION public.trg_provider_services_sync_active_for_bookings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM public.sync_provider_active_for_bookings(NEW.provider_id);
  END IF;

  IF TG_OP = 'DELETE' THEN
    PERFORM public.sync_provider_active_for_bookings(OLD.provider_id);
  ELSIF TG_OP = 'UPDATE' AND (OLD.provider_id IS DISTINCT FROM NEW.provider_id) THEN
    -- Handle reassignment edge-case
    PERFORM public.sync_provider_active_for_bookings(OLD.provider_id);
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS provider_services_sync_active_for_bookings ON public.provider_services;
CREATE TRIGGER provider_services_sync_active_for_bookings
AFTER INSERT OR UPDATE OR DELETE ON public.provider_services
FOR EACH ROW
EXECUTE FUNCTION public.trg_provider_services_sync_active_for_bookings();

