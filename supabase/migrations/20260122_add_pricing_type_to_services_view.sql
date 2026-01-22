-- ============================================================================
-- Migration: Add pricing_type to business_eligible_services_enriched view
-- Date: 2026-01-22
-- Description: Updates the services view and function to include pricing_type field
-- ============================================================================

-- ============================================================================
-- 1. UPDATE VIEW: business_eligible_services_enriched
-- ============================================================================
-- Add pricing_type to the view
-- ============================================================================

CREATE OR REPLACE VIEW business_eligible_services_enriched AS
SELECT 
  -- Business context
  bss.business_id,
  
  -- Service details
  s.id AS service_id,
  s.name AS service_name,
  s.description AS service_description,
  s.min_price,
  s.duration_minutes,
  s.image_url AS service_image_url,
  s.is_active AS service_is_active,
  s.pricing_type,  -- Added pricing_type field
  
  -- Subcategory details
  s.subcategory_id,
  sc.service_subcategory_type AS subcategory_name,
  sc.description AS subcategory_description,
  sc.category_id,
  
  -- Category details
  cat.service_category_type AS category_name,
  cat.description AS category_description,
  
  -- Business service configuration (if configured)
  bs.id AS business_service_id,
  bs.business_price,
  bs.business_duration_minutes,
  bs.delivery_type,
  bs.is_active AS business_is_active,
  bs.created_at AS business_service_created_at,
  
  -- Computed fields
  CASE WHEN bs.id IS NOT NULL THEN true ELSE false END AS is_configured,
  COALESCE(bs.is_active, false) AS is_business_active

FROM business_service_subcategories bss
-- Join to get the subcategory details
INNER JOIN service_subcategories sc ON bss.subcategory_id = sc.id AND sc.is_active = true
-- Join to get the category details
INNER JOIN service_categories cat ON sc.category_id = cat.id AND cat.is_active = true
-- Ensure the parent category is also approved for this business
INNER JOIN business_service_categories bsc 
  ON bss.business_id = bsc.business_id 
  AND sc.category_id = bsc.category_id 
  AND bsc.is_active = true
-- Get all services in this subcategory
INNER JOIN services s ON s.subcategory_id = sc.id AND s.is_active = true
-- Left join to get business-specific configuration
LEFT JOIN business_services bs 
  ON bs.business_id = bss.business_id 
  AND bs.service_id = s.id
WHERE bss.is_active = true;

-- ============================================================================
-- 2. UPDATE FUNCTION: get_business_eligible_services_optimized
-- ============================================================================
-- Add pricing_type to the JSON output
-- ============================================================================

CREATE OR REPLACE FUNCTION get_business_eligible_services_optimized(
  p_business_id UUID,
  p_search TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,           -- 'all', 'active', 'inactive', 'configured', 'unconfigured'
  p_category_id UUID DEFAULT NULL,      -- Filter by category
  p_subcategory_id UUID DEFAULT NULL,   -- Filter by subcategory
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  services JSONB,
  total_count BIGINT,
  stats JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_services JSONB;
  v_total_count BIGINT;
  v_stats JSONB;
BEGIN
  -- Build the filtered results
  WITH filtered_services AS (
    SELECT *
    FROM business_eligible_services_enriched bes
    WHERE bes.business_id = p_business_id
      -- Search filter
      AND (
        p_search IS NULL 
        OR p_search = ''
        OR bes.service_name ILIKE '%' || p_search || '%'
        OR bes.service_description ILIKE '%' || p_search || '%'
        OR bes.category_name ILIKE '%' || p_search || '%'
        OR bes.subcategory_name ILIKE '%' || p_search || '%'
      )
      -- Status filter
      AND (
        p_status IS NULL
        OR p_status = 'all'
        OR (p_status = 'active' AND bes.is_business_active = true)
        OR (p_status = 'inactive' AND bes.is_business_active = false)
        OR (p_status = 'configured' AND bes.is_configured = true)
        OR (p_status = 'unconfigured' AND bes.is_configured = false)
      )
      -- Category filter
      AND (p_category_id IS NULL OR bes.category_id = p_category_id)
      -- Subcategory filter
      AND (p_subcategory_id IS NULL OR bes.subcategory_id = p_subcategory_id)
  ),
  -- Calculate stats from filtered results
  service_stats AS (
    SELECT
      COUNT(*) AS total_services,
      COUNT(*) FILTER (WHERE is_business_active = true) AS active_services,
      COUNT(*) FILTER (WHERE is_configured = true) AS configured_services,
      COUNT(*) FILTER (WHERE is_configured = false) AS unconfigured_services,
      COALESCE(AVG(COALESCE(business_price, min_price)) FILTER (WHERE is_business_active = true), 0) AS avg_price,
      COALESCE(SUM(COALESCE(business_price, min_price)) FILTER (WHERE is_business_active = true), 0) AS total_value,
      COUNT(DISTINCT category_id) AS category_count,
      COUNT(DISTINCT subcategory_id) AS subcategory_count
    FROM filtered_services
  ),
  -- Paginate results
  paginated_services AS (
    SELECT *
    FROM filtered_services
    ORDER BY category_name, subcategory_name, service_name
    LIMIT p_limit
    OFFSET p_offset
  )
  SELECT 
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', ps.service_id,
          'name', ps.service_name,
          'description', ps.service_description,
          'min_price', ps.min_price,
          'duration_minutes', ps.duration_minutes,
          'image_url', ps.service_image_url,
          'subcategory_id', ps.subcategory_id,
          'pricing_type', COALESCE(ps.pricing_type, 'fixed'),
          'subcategory_name', ps.subcategory_name,
          'category_id', ps.category_id,
          'category_name', ps.category_name,
          'is_configured', ps.is_configured,
          'business_service_id', ps.business_service_id,
          'business_price', ps.business_price,
          'business_duration_minutes', ps.business_duration_minutes,
          'delivery_type', ps.delivery_type,
          'business_is_active', ps.is_business_active,
          'service_subcategories', jsonb_build_object(
            'id', ps.subcategory_id,
            'service_subcategory_type', ps.subcategory_name,
            'service_categories', jsonb_build_object(
              'id', ps.category_id,
              'service_category_type', ps.category_name
            )
          )
        )
      ) FROM paginated_services ps),
      '[]'::jsonb
    ),
    (SELECT COUNT(*) FROM filtered_services),
    (SELECT jsonb_build_object(
      'total_services', ss.total_services,
      'active_services', ss.active_services,
      'configured_services', ss.configured_services,
      'unconfigured_services', ss.unconfigured_services,
      'avg_price', ROUND(ss.avg_price::numeric, 2),
      'total_value', ROUND(ss.total_value::numeric, 2),
      'category_count', ss.category_count,
      'subcategory_count', ss.subcategory_count
    ) FROM service_stats ss)
  INTO v_services, v_total_count, v_stats;

  RETURN QUERY SELECT v_services, v_total_count, v_stats;
END;
$$;

-- Grant permissions
GRANT SELECT ON business_eligible_services_enriched TO authenticated;
GRANT EXECUTE ON FUNCTION get_business_eligible_services_optimized TO authenticated;
