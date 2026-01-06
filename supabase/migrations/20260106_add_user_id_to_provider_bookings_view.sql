-- Add user_id to provider_bookings_enriched view
-- This fixes the issue where customer_profiles.user_id was missing from the optimized view
-- which caused FK errors in ConversationChat component

-- Drop and recreate the view with user_id included
DROP VIEW IF EXISTS provider_bookings_enriched;

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
  
  -- Customer info (flattened) - NOW INCLUDES user_id
  cp.user_id AS customer_user_id,
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
  
  -- Provider info (flattened) - NOW INCLUDES user_id
  p.user_id AS provider_user_id,
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
Includes computed booking_category field for efficient filtering.
NOW INCLUDES user_id fields for both customer_profiles and providers to prevent FK errors.';
