-- Create comprehensive admin reports views
-- These views aggregate data for the admin reports page

-- ============================================================================
-- 1. ADMIN USER REPORTS VIEW
-- ============================================================================
-- Aggregates user data with bookings, spending, and ratings
CREATE OR REPLACE VIEW admin_user_reports_view AS
SELECT 
    u.id,
    u.email,
    u.created_at as registration_date,
    u.last_sign_in_at as last_activity,
    COALESCE(u.last_sign_in_at, u.created_at) as last_activity_fallback,
    
    -- Determine user type and status
    -- Note: Business owners are providers with provider_role = 'owner'
    CASE 
        WHEN cp.id IS NOT NULL THEN 'customer'
        WHEN p.id IS NOT NULL THEN 
            CASE 
                WHEN p.provider_role = 'owner' THEN 'business'
                ELSE 'provider'
            END
        ELSE 'unknown'
    END as user_type,
    
    CASE 
        WHEN cp.id IS NOT NULL THEN COALESCE(cp.is_active, true)
        WHEN p.id IS NOT NULL THEN COALESCE(p.is_active, true)
        ELSE false
    END as is_active_flag,
    
    CASE 
        WHEN cp.id IS NOT NULL AND NOT COALESCE(cp.is_active, true) THEN 'inactive'
        WHEN p.id IS NOT NULL AND NOT COALESCE(p.is_active, true) THEN 'inactive'
        ELSE 'active'
    END as status,
    
    -- Customer profile data
    cp.first_name as customer_first_name,
    cp.last_name as customer_last_name,
    cp.phone as customer_phone,
    
    -- Customer location (from customer_locations table)
    cl.city as customer_city,
    cl.state as customer_state,
    cl.zip_code as customer_zip_code,
    CASE 
        WHEN cl.city IS NOT NULL AND cl.state IS NOT NULL THEN
            CONCAT(cl.city, ', ', cl.state, COALESCE(' ' || cl.zip_code, ''))
        ELSE NULL
    END as customer_location,
    
    -- Provider profile data
    p.first_name as provider_first_name,
    p.last_name as provider_last_name,
    p.phone as provider_phone,
    p.provider_role,
    p.business_id as provider_business_id,
    
    -- Business profile data (via provider's business_id)
    bp.business_name,
    bl.city as business_city,
    bl.state as business_state,
    bl.postal_code as business_postal_code,
    CASE 
        WHEN bl.city IS NOT NULL AND bl.state IS NOT NULL THEN
            CONCAT(bl.city, ', ', bl.state, COALESCE(' ' || bl.postal_code, ''))
        ELSE NULL
    END as business_location,
    
    -- Location (prioritize customer location, then business location)
    COALESCE(
        CASE 
            WHEN cl.city IS NOT NULL AND cl.state IS NOT NULL THEN
                CONCAT(cl.city, ', ', cl.state, COALESCE(' ' || cl.zip_code, ''))
            ELSE NULL
        END,
        CASE 
            WHEN bl.city IS NOT NULL AND bl.state IS NOT NULL THEN
                CONCAT(bl.city, ', ', bl.state, COALESCE(' ' || bl.postal_code, ''))
            ELSE NULL
        END,
        'Unknown'
    ) as location,
    
    -- Aggregated booking statistics (for customers)
    COALESCE((
        SELECT COUNT(DISTINCT b.id)
        FROM bookings b
        WHERE b.customer_id = cp.id
    ), 0) as total_bookings,
    
    COALESCE((
        SELECT SUM(b.total_amount)
        FROM bookings b
        WHERE b.customer_id = cp.id
    ), 0) as total_spent,
    
    -- Aggregated booking statistics (for providers)
    COALESCE((
        SELECT COUNT(DISTINCT b.id)
        FROM bookings b
        WHERE b.provider_id = p.id
    ), 0) as provider_total_bookings,
    
    COALESCE((
        SELECT SUM(b.total_amount)
        FROM bookings b
        WHERE b.provider_id = p.id
    ), 0) as total_earned,
    
    -- Aggregated rating statistics (for customers)
    COALESCE((
        SELECT AVG(r.overall_rating)
        FROM reviews r
        INNER JOIN bookings b ON r.booking_id = b.id
        WHERE b.customer_id = cp.id
    ), 0) as customer_avg_rating,
    
    COALESCE((
        SELECT COUNT(r.id)
        FROM reviews r
        INNER JOIN bookings b ON r.booking_id = b.id
        WHERE b.customer_id = cp.id
    ), 0) as customer_total_reviews,
    
    -- Aggregated rating statistics (for providers)
    COALESCE((
        SELECT AVG(r.overall_rating)
        FROM reviews r
        WHERE r.provider_id = p.id
    ), 0) as provider_avg_rating,
    
    COALESCE((
        SELECT COUNT(r.id)
        FROM reviews r
        WHERE r.provider_id = p.id
    ), 0) as provider_total_reviews,
    
    -- Combined rating (prioritize customer, then provider)
    COALESCE((
        SELECT AVG(r.overall_rating)
        FROM reviews r
        INNER JOIN bookings b ON r.booking_id = b.id
        WHERE b.customer_id = cp.id
    ), (
        SELECT AVG(r.overall_rating)
        FROM reviews r
        WHERE r.provider_id = p.id
    ), 0) as avg_rating,
    
    COALESCE((
        SELECT COUNT(r.id)
        FROM reviews r
        INNER JOIN bookings b ON r.booking_id = b.id
        WHERE b.customer_id = cp.id
    ), (
        SELECT COUNT(r.id)
        FROM reviews r
        WHERE r.provider_id = p.id
    ), 0) as total_reviews
    
FROM auth.users u
LEFT JOIN customer_profiles cp ON u.id = cp.user_id
LEFT JOIN customer_locations cl ON u.id = cl.customer_id AND cl.is_primary = true
LEFT JOIN providers p ON u.id = p.user_id
LEFT JOIN business_profiles bp ON p.business_id = bp.id
LEFT JOIN business_locations bl ON bp.id = bl.business_id AND bl.is_primary = true;

COMMENT ON VIEW admin_user_reports_view IS 
'Comprehensive user reports view aggregating user data with bookings, spending, and ratings for admin dashboard.';

-- ============================================================================
-- 2. ADMIN BOOKING REPORTS VIEW
-- ============================================================================
-- Aggregates booking data with reviews
CREATE OR REPLACE VIEW admin_booking_reports_view AS
SELECT 
    b.id,
    b.booking_reference,
    b.booking_date,
    b.start_time,
    b.created_at,
    b.booking_status,
    b.total_amount as amount,
    b.payment_status,
    
    -- Service details
    s.id as service_id,
    s.name as service_name,
    
    -- Business details
    bp.id as business_id,
    bp.business_name,
    
    -- Customer details
    cp.id as customer_id,
    cp.first_name as customer_first_name,
    cp.last_name as customer_last_name,
    COALESCE(CONCAT(cp.first_name, ' ', cp.last_name), b.guest_name, 'Guest') as customer_name,
    b.guest_name,
    b.guest_email,
    b.guest_phone,
    
    -- Provider details
    p.id as provider_id,
    p.first_name as provider_first_name,
    p.last_name as provider_last_name,
    CONCAT(p.first_name, ' ', p.last_name) as provider_name,
    
    -- Review details
    r.id as review_id,
    r.overall_rating as rating,
    r.review_text as review,
    r.is_approved as review_approved,
    r.created_at as review_created_at
    
FROM bookings b
INNER JOIN services s ON b.service_id = s.id
INNER JOIN business_profiles bp ON b.business_id = bp.id
LEFT JOIN customer_profiles cp ON b.customer_id = cp.id
LEFT JOIN providers p ON b.provider_id = p.id
LEFT JOIN reviews r ON b.id = r.booking_id;

COMMENT ON VIEW admin_booking_reports_view IS 
'Comprehensive booking reports view with service, business, customer, provider, and review details for admin dashboard.';

-- ============================================================================
-- 3. ADMIN BUSINESS REPORTS VIEW
-- ============================================================================
-- Aggregates business data with providers, services, bookings, revenue, and ratings
CREATE OR REPLACE VIEW admin_business_reports_view AS
SELECT 
    bp.id,
    bp.business_name,
    bp.business_type,
    bp.verification_status,
    bp.is_active,
    bp.created_at,
    bp.contact_email,
    bp.phone,
    
    -- Business location (from business_locations table)
    bl.city as business_city,
    bl.state as business_state,
    bl.postal_code as business_postal_code,
    CASE 
        WHEN bl.city IS NOT NULL AND bl.state IS NOT NULL THEN
            CONCAT(bl.city, ', ', bl.state, COALESCE(' ' || bl.postal_code, ''))
        ELSE 'Unknown'
    END as location,
    
    -- Aggregated provider statistics
    COALESCE(provider_stats.total_providers, 0) as total_providers,
    COALESCE(provider_stats.active_providers, 0) as active_providers,
    
    -- Aggregated service statistics
    COALESCE(service_stats.total_services, 0) as total_services,
    COALESCE(service_stats.active_services, 0) as active_services,
    
    -- Aggregated booking statistics
    COALESCE(booking_stats.total_bookings, 0) as total_bookings,
    COALESCE(booking_stats.completed_bookings, 0) as completed_bookings,
    COALESCE(booking_stats.cancelled_bookings, 0) as cancelled_bookings,
    COALESCE(booking_stats.total_revenue, 0) as total_revenue,
    COALESCE(booking_stats.completed_revenue, 0) as completed_revenue,
    
    -- Aggregated rating statistics
    COALESCE(rating_stats.avg_rating, 0) as avg_rating,
    COALESCE(rating_stats.total_reviews, 0) as total_reviews,
    COALESCE(rating_stats.approved_reviews, 0) as approved_reviews
    
FROM business_profiles bp
LEFT JOIN business_locations bl ON bp.id = bl.business_id AND bl.is_primary = true
LEFT JOIN LATERAL (
    SELECT 
        COUNT(DISTINCT p.id) as total_providers,
        COUNT(DISTINCT p.id) FILTER (WHERE p.is_active = true) as active_providers
    FROM providers p
    WHERE p.business_id = bp.id
) provider_stats ON true
LEFT JOIN LATERAL (
    SELECT 
        COUNT(DISTINCT bs.id) as total_services,
        COUNT(DISTINCT bs.id) FILTER (WHERE bs.is_active = true) as active_services
    FROM business_services bs
    WHERE bs.business_id = bp.id
) service_stats ON true
LEFT JOIN LATERAL (
    SELECT 
        COUNT(DISTINCT b.id) as total_bookings,
        COUNT(DISTINCT b.id) FILTER (WHERE b.booking_status = 'completed') as completed_bookings,
        COUNT(DISTINCT b.id) FILTER (WHERE b.booking_status IN ('cancelled', 'no_show')) as cancelled_bookings,
        SUM(b.total_amount) as total_revenue,
        SUM(b.total_amount) FILTER (WHERE b.booking_status = 'completed') as completed_revenue
    FROM bookings b
    WHERE b.business_id = bp.id
) booking_stats ON true
LEFT JOIN LATERAL (
    SELECT 
        AVG(r.overall_rating) as avg_rating,
        COUNT(r.id) as total_reviews,
        COUNT(r.id) FILTER (WHERE r.is_approved = true) as approved_reviews
    FROM reviews r
    WHERE r.business_id = bp.id
) rating_stats ON true;

COMMENT ON VIEW admin_business_reports_view IS 
'Comprehensive business reports view aggregating providers, services, bookings, revenue, and ratings for admin dashboard.';

-- ============================================================================
-- 4. ADMIN SERVICE REPORTS VIEW
-- ============================================================================
-- Aggregates service data with bookings, revenue, and ratings
CREATE OR REPLACE VIEW admin_service_reports_view AS
SELECT 
    s.id,
    s.name as service_name,
    s.description,
    s.min_price,
    s.duration_minutes,
    s.is_active,
    s.is_featured,
    s.is_popular,
    s.created_at,
    
    -- Business service details (from business_services)
    bs.business_price,
    bs.business_duration_minutes,
    bs.delivery_type,
    bs.is_active as business_service_active,
    
    -- Business details
    bp.id as business_id,
    bp.business_name,
    
    -- Category and subcategory
    ss.service_subcategory_type as subcategory,
    sc.service_category_type as category,
    
    -- Aggregated booking statistics
    COALESCE(booking_stats.total_bookings, 0) as total_bookings,
    COALESCE(booking_stats.completed_bookings, 0) as completed_bookings,
    COALESCE(booking_stats.total_revenue, 0) as total_revenue,
    COALESCE(booking_stats.completed_revenue, 0) as completed_revenue,
    COALESCE(booking_stats.avg_booking_amount, 0) as avg_booking_amount,
    
    -- Aggregated rating statistics
    COALESCE(rating_stats.avg_rating, 0) as avg_rating,
    COALESCE(rating_stats.total_reviews, 0) as total_reviews,
    COALESCE(rating_stats.approved_reviews, 0) as approved_reviews
    
FROM services s
INNER JOIN business_services bs ON s.id = bs.service_id
INNER JOIN business_profiles bp ON bs.business_id = bp.id
LEFT JOIN service_subcategories ss ON s.subcategory_id = ss.id
LEFT JOIN service_categories sc ON ss.service_category_id = sc.id
LEFT JOIN LATERAL (
    SELECT 
        COUNT(DISTINCT b.id) as total_bookings,
        COUNT(DISTINCT b.id) FILTER (WHERE b.booking_status = 'completed') as completed_bookings,
        SUM(b.total_amount) as total_revenue,
        SUM(b.total_amount) FILTER (WHERE b.booking_status = 'completed') as completed_revenue,
        AVG(b.total_amount) FILTER (WHERE b.booking_status = 'completed') as avg_booking_amount
    FROM bookings b
    WHERE b.service_id = s.id
) booking_stats ON true
LEFT JOIN LATERAL (
    SELECT 
        AVG(r.overall_rating) as avg_rating,
        COUNT(r.id) as total_reviews,
        COUNT(r.id) FILTER (WHERE r.is_approved = true) as approved_reviews
    FROM reviews r
    INNER JOIN bookings b ON r.booking_id = b.id
    WHERE b.service_id = s.id
) rating_stats ON true;

COMMENT ON VIEW admin_service_reports_view IS 
'Comprehensive service reports view aggregating bookings, revenue, and ratings for admin dashboard.';

-- Note: Metrics are calculated directly in the API with date range filters
-- for better performance and flexibility. The four views above provide
-- the aggregated data needed for the reports page.

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Note: Indexes on auth.users cannot be created via migrations as it's a managed table
-- Supabase already maintains indexes on auth.users for performance

-- Indexes for booking reports view
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_status ON bookings(booking_status);
CREATE INDEX IF NOT EXISTS idx_bookings_business_id ON bookings(business_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_provider_id ON bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_bookings_service_id ON bookings(service_id);

-- Indexes for business reports view
CREATE INDEX IF NOT EXISTS idx_business_profiles_created_at ON business_profiles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_business_profiles_verification_status ON business_profiles(verification_status);
CREATE INDEX IF NOT EXISTS idx_providers_business_id ON providers(business_id);
CREATE INDEX IF NOT EXISTS idx_business_services_business_id ON business_services(business_id);
CREATE INDEX IF NOT EXISTS idx_business_services_service_id ON business_services(service_id);
CREATE INDEX IF NOT EXISTS idx_business_services_is_active ON business_services(is_active);

-- Indexes for service reports view
CREATE INDEX IF NOT EXISTS idx_services_created_at ON services(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_services_is_featured ON services(is_featured);
CREATE INDEX IF NOT EXISTS idx_services_is_popular ON services(is_popular);

-- Indexes for reviews
CREATE INDEX IF NOT EXISTS idx_reviews_business_id ON reviews(business_id);
CREATE INDEX IF NOT EXISTS idx_reviews_is_approved ON reviews(is_approved);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);

