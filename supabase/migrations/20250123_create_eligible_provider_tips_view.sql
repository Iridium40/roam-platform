-- Create a view for tips brought in by providers who are eligible for bookings
-- Eligible providers: is_active = true AND active_for_bookings = true
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
LEFT JOIN customer_profiles cp ON t.customer_id = cp.user_id
LEFT JOIN services s ON b.service_id = s.id
WHERE 
    p.is_active = true 
    AND p.active_for_bookings = true
    AND p.business_id = t.business_id;

-- Add comment to view
COMMENT ON VIEW eligible_provider_tips IS 'Tips received by providers who are eligible for bookings (is_active = true AND active_for_bookings = true)';

-- Create index on business_id for faster filtering
CREATE INDEX IF NOT EXISTS idx_tips_business_id ON tips(business_id);
CREATE INDEX IF NOT EXISTS idx_tips_provider_id ON tips(provider_id);
CREATE INDEX IF NOT EXISTS idx_tips_tip_given_at ON tips(tip_given_at);

