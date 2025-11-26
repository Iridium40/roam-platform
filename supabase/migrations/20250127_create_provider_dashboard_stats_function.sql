-- Create a function to get provider dashboard stats for a specific business
-- This replaces multiple client-side queries with a single database call
-- Returns all dashboard metrics in one round-trip

CREATE OR REPLACE FUNCTION get_provider_dashboard_stats(p_business_id UUID)
RETURNS TABLE (
  -- Booking Statistics
  total_bookings BIGINT,
  pending_bookings BIGINT,
  confirmed_bookings BIGINT,
  completed_bookings BIGINT,
  cancelled_bookings BIGINT,
  in_progress_bookings BIGINT,
  
  -- Today's Bookings
  bookings_today BIGINT,
  bookings_scheduled_today BIGINT,
  
  -- This Week
  bookings_this_week BIGINT,
  
  -- Revenue Statistics
  total_revenue NUMERIC,
  pending_revenue NUMERIC,
  revenue_today NUMERIC,
  revenue_this_week NUMERIC,
  revenue_this_month NUMERIC,
  average_booking_value NUMERIC,
  
  -- Staff Statistics
  total_staff BIGINT,
  active_staff BIGINT,
  
  -- Service Statistics
  total_services BIGINT,
  active_services BIGINT,
  
  -- Customer Statistics
  unique_customers BIGINT,
  repeat_customers BIGINT,
  
  -- Location Statistics
  total_locations BIGINT,
  active_locations BIGINT,
  
  -- Performance Rates
  completion_rate_percent NUMERIC,
  cancellation_rate_percent NUMERIC,
  
  -- Recent Activity (Last 30 Days)
  bookings_last_30_days BIGINT,
  revenue_last_30_days NUMERIC,
  new_customers_last_30_days BIGINT,
  
  -- Growth Metrics
  bookings_growth_percent NUMERIC,
  revenue_growth_percent NUMERIC,
  
  -- Timestamp
  stats_generated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bookings_prev_30 BIGINT;
  v_revenue_prev_30 NUMERIC;
BEGIN
  -- Calculate previous 30 days for growth metrics
  SELECT COUNT(*), COALESCE(SUM(total_amount), 0)
  INTO v_bookings_prev_30, v_revenue_prev_30
  FROM bookings
  WHERE business_id = p_business_id
    AND created_at >= CURRENT_DATE - INTERVAL '60 days'
    AND created_at < CURRENT_DATE - INTERVAL '30 days';

  RETURN QUERY
  SELECT
    -- Booking Statistics
    (SELECT COUNT(*) FROM bookings WHERE business_id = p_business_id)::BIGINT,
    (SELECT COUNT(*) FROM bookings WHERE business_id = p_business_id AND booking_status = 'pending')::BIGINT,
    (SELECT COUNT(*) FROM bookings WHERE business_id = p_business_id AND booking_status = 'confirmed')::BIGINT,
    (SELECT COUNT(*) FROM bookings WHERE business_id = p_business_id AND booking_status = 'completed')::BIGINT,
    (SELECT COUNT(*) FROM bookings WHERE business_id = p_business_id AND booking_status = 'cancelled')::BIGINT,
    (SELECT COUNT(*) FROM bookings WHERE business_id = p_business_id AND booking_status = 'in_progress')::BIGINT,
    
    -- Today's Bookings
    (SELECT COUNT(*) FROM bookings WHERE business_id = p_business_id AND DATE(created_at) = CURRENT_DATE)::BIGINT,
    (SELECT COUNT(*) FROM bookings WHERE business_id = p_business_id AND DATE(booking_date) = CURRENT_DATE)::BIGINT,
    
    -- This Week
    (SELECT COUNT(*) FROM bookings WHERE business_id = p_business_id AND created_at >= DATE_TRUNC('week', CURRENT_DATE))::BIGINT,
    
    -- Revenue Statistics
    COALESCE((SELECT SUM(total_amount) FROM bookings WHERE business_id = p_business_id AND booking_status = 'completed'), 0)::NUMERIC,
    COALESCE((SELECT SUM(total_amount) FROM bookings WHERE business_id = p_business_id AND booking_status IN ('pending', 'confirmed', 'in_progress')), 0)::NUMERIC,
    COALESCE((SELECT SUM(total_amount) FROM bookings WHERE business_id = p_business_id AND booking_status = 'completed' AND DATE(created_at) = CURRENT_DATE), 0)::NUMERIC,
    COALESCE((SELECT SUM(total_amount) FROM bookings WHERE business_id = p_business_id AND booking_status = 'completed' AND created_at >= DATE_TRUNC('week', CURRENT_DATE)), 0)::NUMERIC,
    COALESCE((SELECT SUM(total_amount) FROM bookings WHERE business_id = p_business_id AND booking_status = 'completed' AND created_at >= DATE_TRUNC('month', CURRENT_DATE)), 0)::NUMERIC,
    
    -- Average Booking Value
    COALESCE((
      SELECT ROUND(AVG(total_amount)::NUMERIC, 2) 
      FROM bookings 
      WHERE business_id = p_business_id AND booking_status = 'completed' AND total_amount > 0
    ), 0)::NUMERIC,
    
    -- Staff Statistics
    (SELECT COUNT(*) FROM providers WHERE business_id = p_business_id)::BIGINT,
    (SELECT COUNT(*) FROM providers WHERE business_id = p_business_id AND is_active = true)::BIGINT,
    
    -- Service Statistics
    (SELECT COUNT(*) FROM business_services WHERE business_id = p_business_id)::BIGINT,
    (SELECT COUNT(*) FROM business_services WHERE business_id = p_business_id AND is_active = true)::BIGINT,
    
    -- Customer Statistics (unique customers who have booked with this business)
    (SELECT COUNT(DISTINCT customer_id) FROM bookings WHERE business_id = p_business_id)::BIGINT,
    (SELECT COUNT(*) FROM (
      SELECT customer_id 
      FROM bookings 
      WHERE business_id = p_business_id 
      GROUP BY customer_id 
      HAVING COUNT(*) > 1
    ) AS repeat)::BIGINT,
    
    -- Location Statistics
    (SELECT COUNT(*) FROM business_locations WHERE business_id = p_business_id)::BIGINT,
    (SELECT COUNT(*) FROM business_locations WHERE business_id = p_business_id AND is_active = true)::BIGINT,
    
    -- Performance Rates
    CASE 
      WHEN (SELECT COUNT(*) FROM bookings WHERE business_id = p_business_id) > 0 
      THEN ROUND(
        (SELECT COUNT(*) FROM bookings WHERE business_id = p_business_id AND booking_status = 'completed')::NUMERIC / 
        (SELECT COUNT(*) FROM bookings WHERE business_id = p_business_id)::NUMERIC * 100, 2
      )
      ELSE 0 
    END::NUMERIC,
    
    CASE 
      WHEN (SELECT COUNT(*) FROM bookings WHERE business_id = p_business_id) > 0 
      THEN ROUND(
        (SELECT COUNT(*) FROM bookings WHERE business_id = p_business_id AND booking_status = 'cancelled')::NUMERIC / 
        (SELECT COUNT(*) FROM bookings WHERE business_id = p_business_id)::NUMERIC * 100, 2
      )
      ELSE 0 
    END::NUMERIC,
    
    -- Recent Activity (Last 30 Days)
    (SELECT COUNT(*) FROM bookings WHERE business_id = p_business_id AND created_at >= CURRENT_DATE - INTERVAL '30 days')::BIGINT,
    COALESCE((SELECT SUM(total_amount) FROM bookings WHERE business_id = p_business_id AND booking_status = 'completed' AND created_at >= CURRENT_DATE - INTERVAL '30 days'), 0)::NUMERIC,
    (SELECT COUNT(DISTINCT customer_id) FROM bookings WHERE business_id = p_business_id AND created_at >= CURRENT_DATE - INTERVAL '30 days')::BIGINT,
    
    -- Growth Metrics
    CASE 
      WHEN v_bookings_prev_30 > 0
      THEN ROUND(
        ((SELECT COUNT(*) FROM bookings WHERE business_id = p_business_id AND created_at >= CURRENT_DATE - INTERVAL '30 days')::NUMERIC - v_bookings_prev_30::NUMERIC) / 
        v_bookings_prev_30::NUMERIC * 100, 2
      )
      ELSE 0 
    END::NUMERIC,
    
    CASE 
      WHEN v_revenue_prev_30 > 0
      THEN ROUND(
        (COALESCE((SELECT SUM(total_amount) FROM bookings WHERE business_id = p_business_id AND booking_status = 'completed' AND created_at >= CURRENT_DATE - INTERVAL '30 days'), 0) - v_revenue_prev_30) / 
        v_revenue_prev_30 * 100, 2
      )
      ELSE 0 
    END::NUMERIC,
    
    -- Timestamp
    CURRENT_TIMESTAMP;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_provider_dashboard_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_provider_dashboard_stats(UUID) TO service_role;

-- Add comment
COMMENT ON FUNCTION get_provider_dashboard_stats IS 
'Returns comprehensive dashboard statistics for a provider business in a single database call. 
Replaces multiple client-side queries with efficient server-side aggregation.';

-- Create index for better performance on bookings queries
CREATE INDEX IF NOT EXISTS idx_bookings_business_status ON bookings(business_id, booking_status);
CREATE INDEX IF NOT EXISTS idx_bookings_business_date ON bookings(business_id, created_at);
CREATE INDEX IF NOT EXISTS idx_bookings_business_booking_date ON bookings(business_id, booking_date);

