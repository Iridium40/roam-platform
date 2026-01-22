-- Fix existing tips that don't have tip_given_at set
-- Set tip_given_at to payment_processed_at or created_at

UPDATE tips
SET tip_given_at = COALESCE(payment_processed_at, created_at, NOW())
WHERE tip_given_at IS NULL;

-- Also update the view to be more inclusive - show all tips for the business
-- regardless of provider active_for_bookings status (historical tips should still show)
DROP VIEW IF EXISTS eligible_provider_tips;

CREATE OR REPLACE VIEW eligible_provider_tips AS
SELECT 
    t.id,
    t.booking_id,
    t.customer_id,
    t.provider_id,
    t.business_id,
    t.tip_amount,
    t.tip_percentage,
    t.stripe_payment_intent_id,
    t.payment_status,
    t.platform_fee_amount,
    t.provider_net_amount,
    t.customer_message,
    t.provider_response,
    t.provider_responded_at,
    t.tip_given_at,
    t.payment_processed_at,
    t.payout_status,
    t.payout_batch_id,
    t.payout_date,
    t.created_at,
    t.updated_at,
    -- Provider information
    p.first_name as provider_first_name,
    p.last_name as provider_last_name,
    p.provider_role,
    p.is_active as provider_is_active,
    p.active_for_bookings as provider_active_for_bookings,
    -- Customer information
    cp.first_name as customer_first_name,
    cp.last_name as customer_last_name,
    -- Booking information
    b.booking_reference,
    b.booking_date,
    b.start_time,
    b.booking_status,
    -- Service information
    s.name as service_name
FROM tips t
INNER JOIN providers p ON t.provider_id = p.id
INNER JOIN bookings b ON t.booking_id = b.id
LEFT JOIN customer_profiles cp ON t.customer_id = cp.id
LEFT JOIN services s ON b.service_id = s.id
WHERE 
    -- Show tips for all providers in the business (not just active ones)
    -- This allows historical tips to show even if provider is no longer active
    p.business_id = t.business_id
    -- Only show completed tips (payment successful)
    AND t.payment_status = 'completed';

-- Add comment to view
COMMENT ON VIEW eligible_provider_tips IS 'All completed tips for providers in a business, including inactive providers for historical reporting';
