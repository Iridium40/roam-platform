-- Fix booking_status enum comparison in get_provider_bookings_paginated function
-- The p_status parameter is TEXT but booking_status column is an enum type
-- PostgreSQL requires explicit casting for enum comparisons

-- ============================================================================
-- 1. Update get_provider_bookings_paginated function with proper enum casting
-- ============================================================================

CREATE OR REPLACE FUNCTION get_provider_bookings_paginated(
  p_business_id UUID,
  p_provider_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,  -- 'present', 'future', 'past', or NULL for all
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 25,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  -- Booking data
  booking JSONB,
  -- Pagination info
  total_count BIGINT,
  -- Stats for the filtered set
  stats JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_count BIGINT;
  v_stats JSONB;
BEGIN
  -- First, calculate total count and stats for the filtered set
  WITH filtered AS (
    SELECT 
      b.*,
      CASE 
        WHEN b.booking_status IN ('completed', 'cancelled', 'declined', 'no_show') THEN 'past'
        WHEN b.booking_date > CURRENT_DATE THEN 'future'
        ELSE 'present'
      END AS category
    FROM bookings b
    LEFT JOIN customer_profiles cp ON b.customer_id = cp.id
    LEFT JOIN services s ON b.service_id = s.id
    WHERE b.business_id = p_business_id
      AND (p_provider_id IS NULL OR b.provider_id = p_provider_id)
      -- Cast TEXT to booking_status enum for comparison
      AND (p_status IS NULL OR b.booking_status = p_status::booking_status)
      AND (p_date_from IS NULL OR b.booking_date >= p_date_from)
      AND (p_date_to IS NULL OR b.booking_date <= p_date_to)
      AND (p_search IS NULL OR p_search = '' OR (
        cp.first_name ILIKE '%' || p_search || '%' OR
        cp.last_name ILIKE '%' || p_search || '%' OR
        s.name ILIKE '%' || p_search || '%' OR
        b.booking_reference ILIKE '%' || p_search || '%'
      ))
  )
  SELECT 
    COUNT(*),
    jsonb_build_object(
      'total_bookings', COUNT(*),
      'pending_bookings', COUNT(*) FILTER (WHERE booking_status = 'pending'),
      'confirmed_bookings', COUNT(*) FILTER (WHERE booking_status = 'confirmed'),
      'completed_bookings', COUNT(*) FILTER (WHERE booking_status = 'completed'),
      'cancelled_bookings', COUNT(*) FILTER (WHERE booking_status = 'cancelled'),
      'in_progress_bookings', COUNT(*) FILTER (WHERE booking_status = 'in_progress'),
      'present_count', COUNT(*) FILTER (WHERE category = 'present'),
      'future_count', COUNT(*) FILTER (WHERE category = 'future'),
      'past_count', COUNT(*) FILTER (WHERE category = 'past'),
      'total_revenue', COALESCE(SUM(total_amount) FILTER (WHERE booking_status = 'completed'), 0),
      'pending_revenue', COALESCE(SUM(total_amount) FILTER (WHERE booking_status IN ('pending', 'confirmed')), 0)
    )
  INTO v_total_count, v_stats
  FROM filtered
  WHERE p_category IS NULL OR category = p_category;

  -- Return paginated results with stats
  RETURN QUERY
  SELECT 
    to_jsonb(pbe.*) AS booking,
    v_total_count AS total_count,
    v_stats AS stats
  FROM provider_bookings_enriched pbe
  WHERE pbe.business_id = p_business_id
    AND (p_provider_id IS NULL OR pbe.provider_id = p_provider_id)
    -- Cast TEXT to booking_status enum for comparison
    AND (p_status IS NULL OR pbe.booking_status = p_status::booking_status)
    AND (p_category IS NULL OR pbe.booking_category = p_category)
    AND (p_date_from IS NULL OR pbe.booking_date >= p_date_from)
    AND (p_date_to IS NULL OR pbe.booking_date <= p_date_to)
    AND (p_search IS NULL OR p_search = '' OR (
      pbe.customer_first_name ILIKE '%' || p_search || '%' OR
      pbe.customer_last_name ILIKE '%' || p_search || '%' OR
      pbe.service_name ILIKE '%' || p_search || '%' OR
      pbe.booking_reference ILIKE '%' || p_search || '%'
    ))
  ORDER BY pbe.booking_date DESC, pbe.start_time DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_provider_bookings_paginated TO authenticated;
GRANT EXECUTE ON FUNCTION get_provider_bookings_paginated TO service_role;

COMMENT ON FUNCTION get_provider_bookings_paginated IS 
'Returns paginated bookings with server-side filtering and pre-computed stats.
Supports filtering by provider, status, category, date range, and search.
Much more efficient than fetching all bookings and filtering client-side.
Fixed: Added explicit enum cast for booking_status comparisons.';
