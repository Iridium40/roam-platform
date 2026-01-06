-- Create comprehensive admin dashboard stats RPC function
-- This function returns all statistics needed by the admin dashboard in a single call
-- Optimizes the 15+ sequential queries into one database roundtrip

CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  today_date date := CURRENT_DATE;
  yesterday_date date := CURRENT_DATE - INTERVAL '1 day';
  week_start_date date := CURRENT_DATE - INTERVAL '7 days';
  two_weeks_ago_date date := CURRENT_DATE - INTERVAL '14 days';
  month_start_date date := DATE_TRUNC('month', CURRENT_DATE);
  thirty_days_ago_date date := CURRENT_DATE - INTERVAL '30 days';
  
  -- Today's stats
  today_bookings_total int;
  today_bookings_completed int;
  today_bookings_pending int;
  today_revenue numeric;
  
  -- Yesterday's stats (for comparison)
  yesterday_revenue numeric;
  
  -- Weekly stats
  weekly_revenue numeric;
  last_week_revenue numeric;
  
  -- Promotion stats
  active_promotions_count int;
  total_promotion_usage int;
  weekly_promotion_usage int;
  
  -- Total stats
  total_bookings int;
  total_revenue numeric;
  completed_bookings int;
  
  -- Average rating
  avg_rating numeric;
  
  -- Other counts
  new_customers_count int;
  active_businesses_count int;
  pending_verification_count int;
  new_contact_submissions_count int;
  
  -- Top services
  top_services_json json;
BEGIN
  -- Today's bookings stats
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE booking_status = 'completed'),
    COUNT(*) FILTER (WHERE booking_status = 'pending'),
    COALESCE(SUM(total_amount), 0)
  INTO 
    today_bookings_total,
    today_bookings_completed,
    today_bookings_pending,
    today_revenue
  FROM bookings
  WHERE booking_date >= today_date 
    AND booking_date < today_date + INTERVAL '1 day';
  
  -- Yesterday's revenue
  SELECT COALESCE(SUM(total_amount), 0)
  INTO yesterday_revenue
  FROM bookings
  WHERE booking_date >= yesterday_date 
    AND booking_date < today_date;
  
  -- Weekly revenue
  SELECT COALESCE(SUM(total_amount), 0)
  INTO weekly_revenue
  FROM bookings
  WHERE booking_date >= week_start_date 
    AND total_amount IS NOT NULL;
  
  -- Last week's revenue (for comparison)
  SELECT COALESCE(SUM(total_amount), 0)
  INTO last_week_revenue
  FROM bookings
  WHERE booking_date >= two_weeks_ago_date 
    AND booking_date < week_start_date;
  
  -- Promotion stats
  SELECT COUNT(*)
  INTO active_promotions_count
  FROM promotions
  WHERE is_active = true;
  
  SELECT COUNT(*)
  INTO total_promotion_usage
  FROM promotion_usage;
  
  SELECT COUNT(*)
  INTO weekly_promotion_usage
  FROM promotion_usage
  WHERE created_at >= week_start_date;
  
  -- Total booking stats
  SELECT 
    COUNT(*),
    COALESCE(SUM(total_amount), 0),
    COUNT(*) FILTER (WHERE booking_status = 'completed')
  INTO 
    total_bookings,
    total_revenue,
    completed_bookings
  FROM bookings;
  
  -- Average rating from reviews
  SELECT COALESCE(ROUND(AVG(overall_rating)::numeric, 1), 0)
  INTO avg_rating
  FROM reviews
  WHERE overall_rating IS NOT NULL;
  
  -- New customers this month
  SELECT COUNT(*)
  INTO new_customers_count
  FROM customer_profiles
  WHERE created_at >= month_start_date;
  
  -- Active businesses
  SELECT COUNT(*)
  INTO active_businesses_count
  FROM business_profiles
  WHERE is_active = true;
  
  -- Pending verification
  SELECT COUNT(*)
  INTO pending_verification_count
  FROM business_profiles
  WHERE verification_status = 'pending';
  
  -- New contact submissions
  SELECT COUNT(*)
  INTO new_contact_submissions_count
  FROM contact_submissions
  WHERE status = 'received';
  
  -- Top services (last 30 days)
  SELECT json_agg(top_services ORDER BY booking_count DESC)
  INTO top_services_json
  FROM (
    SELECT 
      s.id,
      s.name,
      COUNT(b.id) as booking_count,
      COALESCE(sc.service_subcategory_type, 'other') as service_subcategory_type
    FROM services s
    LEFT JOIN service_subcategories sc ON s.service_subcategory_id = sc.id
    LEFT JOIN bookings b ON b.service_id = s.id 
      AND b.created_at >= thirty_days_ago_date
    WHERE s.is_active = true
    GROUP BY s.id, s.name, sc.service_subcategory_type
    ORDER BY COUNT(b.id) DESC
    LIMIT 4
  ) top_services;
  
  -- Construct the final JSON result
  result := json_build_object(
    'todayBookings', json_build_object(
      'total', today_bookings_total,
      'completed', today_bookings_completed,
      'pending', today_bookings_pending
    ),
    'todayRevenue', json_build_object(
      'total', today_revenue,
      'change', CASE 
        WHEN yesterday_revenue > 0 
        THEN ROUND(((today_revenue - yesterday_revenue) / yesterday_revenue * 100)::numeric, 0)
        ELSE 0 
      END
    ),
    'weeklyRevenue', json_build_object(
      'total', weekly_revenue,
      'change', CASE 
        WHEN last_week_revenue > 0 
        THEN ROUND(((weekly_revenue - last_week_revenue) / last_week_revenue * 100)::numeric, 0)
        ELSE 0 
      END
    ),
    'promotionUsage', json_build_object(
      'totalActive', active_promotions_count,
      'usedThisWeek', weekly_promotion_usage,
      'totalUsage', total_promotion_usage
    ),
    'topServices', COALESCE(top_services_json, '[]'::json),
    'totalStats', json_build_object(
      'totalBookings', total_bookings,
      'totalRevenue', total_revenue,
      'completionRate', CASE 
        WHEN total_bookings > 0 
        THEN ROUND((completed_bookings::numeric / total_bookings::numeric * 100)::numeric, 0)
        ELSE 0 
      END,
      'avgRating', avg_rating
    ),
    'newCustomersThisMonth', new_customers_count,
    'activeBusinesses', active_businesses_count,
    'pendingVerification', pending_verification_count,
    'newContactSubmissions', new_contact_submissions_count,
    'generatedAt', CURRENT_TIMESTAMP
  );
  
  RETURN result;
END;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION get_admin_dashboard_stats() IS 
'Returns all admin dashboard statistics in a single call. Optimizes 15+ sequential queries into one database roundtrip.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats() TO service_role;
