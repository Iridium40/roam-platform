-- Create admin dashboard stats view for stat cards with total historic numbers
-- This view provides aggregated lifetime statistics for the admin dashboard

CREATE OR REPLACE VIEW admin_dashboard_stats AS
SELECT
  -- Booking Statistics
  (SELECT COUNT(*) FROM bookings) AS total_bookings,
  (SELECT COUNT(*) FROM bookings WHERE booking_status = 'completed') AS completed_bookings,
  (SELECT COUNT(*) FROM bookings WHERE booking_status = 'cancelled') AS cancelled_bookings,
  (SELECT COUNT(*) FROM bookings WHERE booking_status = 'pending') AS pending_bookings,
  (SELECT COUNT(*) FROM bookings WHERE booking_status = 'confirmed') AS confirmed_bookings,
  (SELECT COUNT(*) FROM bookings WHERE booking_status = 'in_progress') AS in_progress_bookings,
  
  -- Completion and Cancellation Rates
  CASE 
    WHEN (SELECT COUNT(*) FROM bookings) > 0 
    THEN ROUND((SELECT COUNT(*) FROM bookings WHERE booking_status = 'completed')::numeric / (SELECT COUNT(*) FROM bookings)::numeric * 100, 2)
    ELSE 0 
  END AS completion_rate_percent,
  
  CASE 
    WHEN (SELECT COUNT(*) FROM bookings) > 0 
    THEN ROUND((SELECT COUNT(*) FROM bookings WHERE booking_status = 'cancelled')::numeric / (SELECT COUNT(*) FROM bookings)::numeric * 100, 2)
    ELSE 0 
  END AS cancellation_rate_percent,
  
  -- Revenue Statistics
  (SELECT COALESCE(SUM(total_amount), 0) FROM bookings WHERE booking_status = 'completed') AS total_revenue,
  (SELECT COALESCE(SUM(total_amount), 0) FROM bookings WHERE booking_status IN ('pending', 'confirmed', 'in_progress')) AS pending_revenue,
  
  -- Average Booking Value
  CASE 
    WHEN (SELECT COUNT(*) FROM bookings WHERE booking_status = 'completed') > 0 
    THEN ROUND((SELECT COALESCE(SUM(total_amount), 0) FROM bookings WHERE booking_status = 'completed')::numeric / 
               (SELECT COUNT(*) FROM bookings WHERE booking_status = 'completed')::numeric, 2)
    ELSE 0 
  END AS average_booking_value,
  
  -- User Statistics
  (SELECT COUNT(*) FROM customer_profiles) AS total_customers,
  (SELECT COUNT(*) FROM customer_profiles WHERE is_active = true) AS active_customers,
  (SELECT COUNT(*) FROM providers) AS total_providers,
  (SELECT COUNT(*) FROM providers WHERE is_active = true) AS active_providers,
  
  -- Business Statistics
  (SELECT COUNT(*) FROM business_profiles) AS total_businesses,
  (SELECT COUNT(*) FROM business_profiles WHERE is_active = true) AS active_businesses,
  (SELECT COUNT(*) FROM business_profiles WHERE verification_status = 'approved') AS approved_businesses,
  (SELECT COUNT(*) FROM business_profiles WHERE verification_status = 'pending') AS pending_businesses,
  (SELECT COUNT(*) FROM business_profiles WHERE verification_status = 'rejected') AS rejected_businesses,
  
  -- Service Statistics
  (SELECT COUNT(*) FROM services) AS total_services,
  (SELECT COUNT(*) FROM services WHERE is_active = true) AS active_services,
  
  -- Review Statistics
  (SELECT COUNT(*) FROM reviews) AS total_reviews,
  (SELECT COUNT(*) FROM reviews WHERE is_approved = true) AS approved_reviews,
  (SELECT COUNT(*) FROM reviews WHERE is_featured = true) AS featured_reviews,
  (SELECT ROUND(AVG(overall_rating)::numeric, 2) FROM reviews WHERE is_approved = true) AS average_rating,
  
  -- Financial Transaction Statistics
  (SELECT COUNT(*) FROM financial_transactions WHERE transaction_type = 'booking_payment') AS total_payment_transactions,
  (SELECT COALESCE(SUM(amount), 0) FROM financial_transactions WHERE transaction_type = 'booking_payment' AND status = 'completed') AS total_payments_amount,
  (SELECT COUNT(*) FROM financial_transactions WHERE transaction_type = 'refund') AS total_refund_transactions,
  (SELECT COALESCE(SUM(amount), 0) FROM financial_transactions WHERE transaction_type = 'refund' AND status = 'completed') AS total_refunds_amount,
  
  -- Note: Additional transaction types (provider_payout, adjustment, tip) can be added once enum is confirmed
  (SELECT COUNT(DISTINCT transaction_type) FROM financial_transactions) AS transaction_types_count,
  
  -- Recent Activity (Last 30 Days)
  (SELECT COUNT(*) FROM bookings WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') AS bookings_last_30_days,
  (SELECT COUNT(*) FROM customer_profiles WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') AS new_customers_last_30_days,
  (SELECT COUNT(*) FROM providers WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') AS new_providers_last_30_days,
  (SELECT COUNT(*) FROM business_profiles WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') AS new_businesses_last_30_days,
  (SELECT COALESCE(SUM(total_amount), 0) FROM bookings WHERE booking_status = 'completed' AND created_at >= CURRENT_DATE - INTERVAL '30 days') AS revenue_last_30_days,
  
  -- Today's Activity
  (SELECT COUNT(*) FROM bookings WHERE DATE(created_at) = CURRENT_DATE) AS bookings_today,
  (SELECT COUNT(*) FROM bookings WHERE DATE(booking_date) = CURRENT_DATE) AS bookings_scheduled_today,
  (SELECT COALESCE(SUM(total_amount), 0) FROM bookings WHERE booking_status = 'completed' AND DATE(created_at) = CURRENT_DATE) AS revenue_today,
  
  -- Growth Metrics (comparing last 30 days to previous 30 days)
  CASE 
    WHEN (SELECT COUNT(*) FROM bookings WHERE created_at >= CURRENT_DATE - INTERVAL '60 days' AND created_at < CURRENT_DATE - INTERVAL '30 days') > 0
    THEN ROUND(
      ((SELECT COUNT(*) FROM bookings WHERE created_at >= CURRENT_DATE - INTERVAL '30 days')::numeric - 
       (SELECT COUNT(*) FROM bookings WHERE created_at >= CURRENT_DATE - INTERVAL '60 days' AND created_at < CURRENT_DATE - INTERVAL '30 days')::numeric) / 
       (SELECT COUNT(*) FROM bookings WHERE created_at >= CURRENT_DATE - INTERVAL '60 days' AND created_at < CURRENT_DATE - INTERVAL '30 days')::numeric * 100, 2
    )
    ELSE 0 
  END AS bookings_growth_percent,
  
  CASE 
    WHEN (SELECT COALESCE(SUM(total_amount), 0) FROM bookings WHERE booking_status = 'completed' AND created_at >= CURRENT_DATE - INTERVAL '60 days' AND created_at < CURRENT_DATE - INTERVAL '30 days') > 0
    THEN ROUND(
      ((SELECT COALESCE(SUM(total_amount), 0) FROM bookings WHERE booking_status = 'completed' AND created_at >= CURRENT_DATE - INTERVAL '30 days')::numeric - 
       (SELECT COALESCE(SUM(total_amount), 0) FROM bookings WHERE booking_status = 'completed' AND created_at >= CURRENT_DATE - INTERVAL '60 days' AND created_at < CURRENT_DATE - INTERVAL '30 days')::numeric) / 
       (SELECT COALESCE(SUM(total_amount), 0) FROM bookings WHERE booking_status = 'completed' AND created_at >= CURRENT_DATE - INTERVAL '60 days' AND created_at < CURRENT_DATE - INTERVAL '30 days')::numeric * 100, 2
    )
    ELSE 0 
  END AS revenue_growth_percent,
  
  -- Timestamp of when this view was queried
  CURRENT_TIMESTAMP AS stats_generated_at;

-- Add comment to explain the view
COMMENT ON VIEW admin_dashboard_stats IS 
'Aggregated lifetime statistics for admin dashboard stat cards. Includes total counts, rates, and growth metrics.';

-- Grant access to authenticated users (will be restricted by RLS in the app)
GRANT SELECT ON admin_dashboard_stats TO authenticated;
GRANT SELECT ON admin_dashboard_stats TO service_role;

