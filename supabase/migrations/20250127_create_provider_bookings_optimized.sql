-- Provider Bookings Optimization
-- Creates optimized view and function for efficient bookings queries

-- ============================================================================
-- 1. Create optimized bookings view with pre-joined data
-- ============================================================================

CREATE OR REPLACE VIEW provider_bookings_enriched AS
SELECT 
  b.id,
  b.booking_reference,
  b.business_id,
  b.provider_id,
  b.customer_id,
  b.service_id,
  b.booking_date,
  b.start_time,
  b.booking_status,
  b.payment_status,
  b.total_amount,
  b.service_fee,
  b.remaining_balance,
  b.tip_amount,
  b.cancellation_reason,
  b.cancelled_by,
  b.cancelled_at,
  b.admin_notes,
  b.special_instructions,
  b.delivery_type,
  b.guest_name,
  b.guest_email,
  b.guest_phone,
  b.created_at,
  
  -- Customer info (flattened)
  cp.first_name AS customer_first_name,
  cp.last_name AS customer_last_name,
  cp.email AS customer_email,
  cp.phone AS customer_phone,
  cp.image_url AS customer_image_url,
  
  -- Service info (flattened)
  s.name AS service_name,
  s.description AS service_description,
  s.duration_minutes AS service_duration,
  s.min_price AS service_min_price,
  
  -- Provider info (flattened)
  p.first_name AS provider_first_name,
  p.last_name AS provider_last_name,
  p.image_url AS provider_image_url,
  
  -- Customer location
  cl.location_name AS customer_location_name,
  cl.street_address AS customer_street_address,
  cl.city AS customer_city,
  cl.state AS customer_state,
  cl.zip_code AS customer_zip_code,
  
  -- Business location
  bl.location_name AS business_location_name,
  bl.address_line1 AS business_address,
  bl.city AS business_city,
  bl.state AS business_state,
  bl.postal_code AS business_postal_code,
  
  -- Computed fields for categorization
  CASE 
    WHEN b.booking_status IN ('completed', 'cancelled', 'declined', 'no_show') THEN 'past'
    WHEN b.booking_date > CURRENT_DATE THEN 'future'
    ELSE 'present'
  END AS booking_category,
  
  -- Payment transaction info (latest)
  bpt.gross_payment_amount,
  bpt.net_payment_amount,
  bpt.payment_date AS last_payment_date

FROM bookings b
LEFT JOIN customer_profiles cp ON b.customer_id = cp.id
LEFT JOIN services s ON b.service_id = s.id
LEFT JOIN providers p ON b.provider_id = p.id
LEFT JOIN customer_locations cl ON b.customer_location_id = cl.id
LEFT JOIN business_locations bl ON b.business_location_id = bl.id
LEFT JOIN LATERAL (
  SELECT gross_payment_amount, net_payment_amount, payment_date
  FROM business_payment_transactions
  WHERE booking_id = b.id
  ORDER BY created_at DESC
  LIMIT 1
) bpt ON true;

-- Grant access
GRANT SELECT ON provider_bookings_enriched TO authenticated;
GRANT SELECT ON provider_bookings_enriched TO service_role;

COMMENT ON VIEW provider_bookings_enriched IS 
'Optimized bookings view with pre-joined customer, service, provider, and location data. 
Includes computed booking_category field for efficient filtering.';


-- ============================================================================
-- 2. Create function for paginated bookings with stats
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
      AND (p_status IS NULL OR b.booking_status = p_status)
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
    AND (p_status IS NULL OR pbe.booking_status = p_status)
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
Much more efficient than fetching all bookings and filtering client-side.';


-- ============================================================================
-- 3. Create indexes for better query performance
-- ============================================================================

-- Composite index for common booking queries
CREATE INDEX IF NOT EXISTS idx_bookings_business_date_status 
  ON bookings(business_id, booking_date DESC, booking_status);

-- Index for provider-specific queries
CREATE INDEX IF NOT EXISTS idx_bookings_provider_date 
  ON bookings(provider_id, booking_date DESC) 
  WHERE provider_id IS NOT NULL;

-- Note: The following trigram indexes require pg_trgm extension for full-text search
-- Uncomment if pg_trgm is enabled in your Supabase project:
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CREATE INDEX IF NOT EXISTS idx_customer_profiles_name_search 
--   ON customer_profiles USING gin ((first_name || ' ' || last_name) gin_trgm_ops);
-- CREATE INDEX IF NOT EXISTS idx_services_name_search 
--   ON services USING gin (name gin_trgm_ops);


-- ============================================================================
-- 4. Quick stats function (for header/filters without full booking data)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_provider_booking_counts(
  p_business_id UUID,
  p_provider_id UUID DEFAULT NULL,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS TABLE (
  present_count BIGINT,
  future_count BIGINT,
  past_count BIGINT,
  pending_count BIGINT,
  confirmed_count BIGINT,
  in_progress_count BIGINT,
  completed_count BIGINT,
  cancelled_count BIGINT,
  total_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    COUNT(*) FILTER (WHERE 
      booking_status NOT IN ('completed', 'cancelled', 'declined', 'no_show') 
      AND booking_date <= CURRENT_DATE
    ) AS present_count,
    
    COUNT(*) FILTER (WHERE 
      booking_status NOT IN ('completed', 'cancelled', 'declined', 'no_show') 
      AND booking_date > CURRENT_DATE
    ) AS future_count,
    
    COUNT(*) FILTER (WHERE 
      booking_status IN ('completed', 'cancelled', 'declined', 'no_show')
    ) AS past_count,
    
    COUNT(*) FILTER (WHERE booking_status = 'pending') AS pending_count,
    COUNT(*) FILTER (WHERE booking_status = 'confirmed') AS confirmed_count,
    COUNT(*) FILTER (WHERE booking_status = 'in_progress') AS in_progress_count,
    COUNT(*) FILTER (WHERE booking_status = 'completed') AS completed_count,
    COUNT(*) FILTER (WHERE booking_status = 'cancelled') AS cancelled_count,
    COUNT(*) AS total_count
    
  FROM bookings
  WHERE business_id = p_business_id
    AND (p_provider_id IS NULL OR provider_id = p_provider_id)
    AND (p_date_from IS NULL OR booking_date >= p_date_from)
    AND (p_date_to IS NULL OR booking_date <= p_date_to);
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_provider_booking_counts TO authenticated;
GRANT EXECUTE ON FUNCTION get_provider_booking_counts TO service_role;

COMMENT ON FUNCTION get_provider_booking_counts IS 
'Quick function to get booking counts by category and status without fetching booking data.
Ideal for updating tab badges and filter counts.';

