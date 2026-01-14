-- Fix admin dashboard stats RPC to be resilient to optional/missing tables
-- and to avoid runtime failures that surface as PostgREST 400 errors.

CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  today_bookings_total int := 0;
  today_bookings_completed int := 0;
  today_bookings_pending int := 0;
  today_revenue numeric := 0;

  -- Yesterday's stats (for comparison)
  yesterday_revenue numeric := 0;

  -- Weekly stats
  weekly_revenue numeric := 0;
  last_week_revenue numeric := 0;

  -- Promotion stats
  active_promotions_count int := 0;
  total_promotion_usage int := 0;
  weekly_promotion_usage int := 0;

  -- Total stats
  total_bookings int := 0;
  total_revenue numeric := 0;
  completed_bookings int := 0;

  -- Average rating
  avg_rating numeric := 0;

  -- Other counts
  new_customers_count int := 0;
  active_businesses_count int := 0;
  pending_verification_count int := 0;
  new_contact_submissions_count int := 0;

  -- Top services
  top_services_json json := '[]'::json;
BEGIN
  -- Bookings-based stats (core tables; if these are missing, we fall back to zeros)
  IF to_regclass('public.bookings') IS NOT NULL THEN
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
  END IF;

  -- Promotion stats (optional tables)
  IF to_regclass('public.promotions') IS NOT NULL THEN
    SELECT COUNT(*)
    INTO active_promotions_count
    FROM promotions
    WHERE is_active = true;
  END IF;

  IF to_regclass('public.promotion_usage') IS NOT NULL THEN
    SELECT COUNT(*)
    INTO total_promotion_usage
    FROM promotion_usage;

    SELECT COUNT(*)
    INTO weekly_promotion_usage
    FROM promotion_usage
    WHERE created_at >= week_start_date;
  END IF;

  -- Average rating from reviews (optional)
  IF to_regclass('public.reviews') IS NOT NULL THEN
    SELECT COALESCE(ROUND(AVG(overall_rating)::numeric, 1), 0)
    INTO avg_rating
    FROM reviews
    WHERE overall_rating IS NOT NULL;
  END IF;

  -- New customers this month (optional)
  IF to_regclass('public.customer_profiles') IS NOT NULL THEN
    SELECT COUNT(*)
    INTO new_customers_count
    FROM customer_profiles
    WHERE created_at >= month_start_date;
  END IF;

  -- Active businesses / pending verification (optional)
  IF to_regclass('public.business_profiles') IS NOT NULL THEN
    SELECT COUNT(*)
    INTO active_businesses_count
    FROM business_profiles
    WHERE is_active = true;

    SELECT COUNT(*)
    INTO pending_verification_count
    FROM business_profiles
    WHERE verification_status = 'pending';
  END IF;

  -- New contact submissions (optional)
  IF to_regclass('public.contact_submissions') IS NOT NULL THEN
    SELECT COUNT(*)
    INTO new_contact_submissions_count
    FROM contact_submissions
    WHERE status = 'received';
  END IF;

  -- Top services (optional; depends on services + bookings)
  IF to_regclass('public.services') IS NOT NULL THEN
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
  END IF;

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
EXCEPTION
  WHEN OTHERS THEN
    -- Always return a valid JSON object with the expected shape so the admin UI can render.
    RETURN json_build_object(
      'todayBookings', json_build_object('total', 0, 'completed', 0, 'pending', 0),
      'todayRevenue', json_build_object('total', 0, 'change', 0),
      'weeklyRevenue', json_build_object('total', 0, 'change', 0),
      'promotionUsage', json_build_object('totalActive', 0, 'usedThisWeek', 0, 'totalUsage', 0),
      'topServices', '[]'::json,
      'totalStats', json_build_object('totalBookings', 0, 'totalRevenue', 0, 'completionRate', 0, 'avgRating', 0),
      'newCustomersThisMonth', 0,
      'activeBusinesses', 0,
      'pendingVerification', 0,
      'newContactSubmissions', 0,
      'generatedAt', CURRENT_TIMESTAMP,
      '_error', json_build_object('message', SQLERRM, 'code', SQLSTATE)
    );
END;
$$;

COMMENT ON FUNCTION get_admin_dashboard_stats() IS
'Returns all admin dashboard statistics in a single call. Resilient to optional tables and avoids runtime failures.';

GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats() TO service_role;

