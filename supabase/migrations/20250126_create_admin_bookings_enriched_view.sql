-- Create admin bookings enriched view to solve N+1 query problem
-- This view includes all booking data with related customer, provider, service, review, and payment information
-- 
-- Transaction Types:
--   - booking_payment: Payment from customer for booking
--   - platform_fee: Fee charged by platform
--   - provider_payout: Payout to provider
--   - refund: Refund to customer
--   - adjustment: Manual adjustment
--   - tip: Tip from customer to provider

CREATE OR REPLACE VIEW admin_bookings_enriched AS
SELECT
  b.id,
  b.customer_id,
  b.provider_id,
  b.service_id,
  b.booking_date,
  b.start_time,
  b.booking_status,
  b.total_amount,
  b.service_fee,
  b.remaining_balance,
  b.cancellation_fee,
  b.refund_amount,
  b.special_instructions,
  b.payment_status,
  b.cancellation_reason,
  b.booking_reference,
  b.business_id AS booking_business_id,
  b.delivery_type,
  b.tip_amount,
  b.tip_status,
  b.tip_eligible,
  b.guest_name,
  b.guest_email,
  b.guest_phone,
  b.created_at,
  b.cancelled_at,
  b.rescheduled_at,
  b.original_booking_date,
  b.original_start_time,
  b.reschedule_count,
  
  -- Customer information
  cp.first_name AS customer_first_name,
  cp.last_name AS customer_last_name,
  cp.email AS customer_email,
  cp.phone AS customer_phone,
  CONCAT(cp.first_name, ' ', cp.last_name) AS customer_name,
  
  -- Provider information
  p.first_name AS provider_first_name,
  p.last_name AS provider_last_name,
  p.email AS provider_email,
  p.business_id,
  CONCAT(p.first_name, ' ', p.last_name) AS provider_name,
  
  -- Business information
  bp.business_name,
  bp.business_type,
  
  -- Service information
  s.name AS service_name,
  s.min_price AS service_price,
  s.duration_minutes AS service_duration,
  s.description AS service_description,
  s.is_featured AS service_is_featured,
  s.is_popular AS service_is_popular,
  s.image_url AS service_image_url,
  
  -- Service subcategory information
  ss.id AS service_subcategory_id,
  ss.service_subcategory_type AS service_subcategory,
  ss.description AS service_subcategory_description,
  
  -- Service category information
  sc.id AS service_category_id,
  sc.service_category_type AS service_category,
  sc.description AS service_category_description,
  
  -- Review information (if exists)
  r.id AS review_id,
  r.overall_rating,
  r.service_rating,
  r.communication_rating,
  r.punctuality_rating,
  r.review_text,
  r.is_approved AS review_is_approved,
  r.is_featured AS review_is_featured,
  r.created_at AS review_created_at,
  CASE WHEN r.id IS NOT NULL THEN true ELSE false END AS has_review,
  
  -- Payment/Transaction information (if exists)
  ft.id AS payment_id,
  ft.stripe_transaction_id,
  ft.amount AS amount_paid,
  ft.processed_at AS payment_date,
  ft.status AS transaction_status,
  ft.transaction_type,
  ft.payment_method AS transaction_payment_method,
  
  -- Computed fields
  CONCAT(b.booking_date, 'T', b.start_time) AS booking_datetime,
  CONCAT(COALESCE(s.duration_minutes, 60), ' minutes') AS duration_display,
  
  -- Additional useful fields
  EXTRACT(EPOCH FROM ((b.booking_date || ' ' || b.start_time)::timestamp - CURRENT_TIMESTAMP)) AS seconds_until_booking,
  CASE 
    WHEN b.booking_date < CURRENT_DATE THEN 'past'
    WHEN b.booking_date = CURRENT_DATE THEN 'today'
    WHEN b.booking_date = CURRENT_DATE + INTERVAL '1 day' THEN 'tomorrow'
    ELSE 'future'
  END AS booking_time_category

FROM bookings b
LEFT JOIN customer_profiles cp ON b.customer_id = cp.id
LEFT JOIN providers p ON b.provider_id = p.id
LEFT JOIN business_profiles bp ON p.business_id = bp.id
LEFT JOIN services s ON b.service_id = s.id
LEFT JOIN service_subcategories ss ON s.subcategory_id = ss.id
LEFT JOIN service_categories sc ON ss.category_id = sc.id
LEFT JOIN reviews r ON b.id = r.booking_id
LEFT JOIN financial_transactions ft ON b.id = ft.booking_id AND ft.transaction_type = 'booking_payment';

-- Add comment to explain the view
COMMENT ON VIEW admin_bookings_enriched IS 
'Enriched booking data with all related information (customer, provider, business, service, review, payment) in a single query. Solves N+1 query problem.';

-- Grant access
GRANT SELECT ON admin_bookings_enriched TO authenticated;
GRANT SELECT ON admin_bookings_enriched TO service_role;

-- Create indexes on underlying tables to optimize the view queries
-- (only create if they don't already exist)

CREATE INDEX IF NOT EXISTS idx_bookings_booking_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_status ON bookings(booking_status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_provider_id ON bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_bookings_service_id ON bookings(service_id);

CREATE INDEX IF NOT EXISTS idx_customer_profiles_is_active ON customer_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_created_at ON customer_profiles(created_at);

CREATE INDEX IF NOT EXISTS idx_providers_is_active ON providers(is_active);
CREATE INDEX IF NOT EXISTS idx_providers_business_id ON providers(business_id);
CREATE INDEX IF NOT EXISTS idx_providers_created_at ON providers(created_at);

CREATE INDEX IF NOT EXISTS idx_business_profiles_verification_status ON business_profiles(verification_status);
CREATE INDEX IF NOT EXISTS idx_business_profiles_is_active ON business_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_business_profiles_created_at ON business_profiles(created_at);

CREATE INDEX IF NOT EXISTS idx_reviews_booking_id ON reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_reviews_is_approved ON reviews(is_approved);

-- Index on financial_transactions already exists from table schema
-- CREATE INDEX IF NOT EXISTS idx_financial_transactions_booking_id ON financial_transactions(booking_id);

CREATE INDEX IF NOT EXISTS idx_services_is_active ON services(is_active);
CREATE INDEX IF NOT EXISTS idx_services_subcategory_id ON services(subcategory_id);

CREATE INDEX IF NOT EXISTS idx_service_subcategories_category_id ON service_subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_service_subcategories_is_active ON service_subcategories(is_active);

CREATE INDEX IF NOT EXISTS idx_service_categories_is_active ON service_categories(is_active);

