-- Add provider_id to business_earnings_detailed view
-- This allows filtering transactions by provider
-- We need to DROP and recreate the view to add the new column

DROP VIEW IF EXISTS business_earnings_detailed;

CREATE VIEW business_earnings_detailed AS
SELECT 
    bpt.id,
    bpt.business_id,
    bpt.booking_id,
    bpt.payment_date,
    bpt.gross_payment_amount,
    bpt.platform_fee,
    bpt.net_payment_amount,
    bpt.tax_year,
    bpt.transaction_type,
    bpt.stripe_payment_intent_id,
    bpt.stripe_transfer_id,
    bpt.stripe_connect_account_id,
    bpt.booking_reference,
    bpt.transaction_description,
    bpt.created_at,
    -- Booking details
    b.booking_date,
    b.booking_status,
    b.total_amount as booking_total_amount,
    b.service_id,
    b.provider_id,  -- Added provider_id for filtering
    -- Service details
    s.name as service_name,
    s.min_price as service_price,
    -- Customer details
    cp.first_name as customer_first_name,
    cp.last_name as customer_last_name
FROM business_payment_transactions bpt
LEFT JOIN bookings b ON bpt.booking_id = b.id
LEFT JOIN services s ON b.service_id = s.id
LEFT JOIN customer_profiles cp ON b.customer_id = cp.user_id;

COMMENT ON VIEW business_earnings_detailed IS 'Detailed earnings view with booking, service, customer, and provider information';
