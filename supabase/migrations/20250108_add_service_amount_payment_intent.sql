-- Add column to store service amount payment intent ID separately
-- This allows us to have two payment intents: one for service fee (charged immediately) 
-- and one for service amount (authorized but captured 24h before booking)

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS stripe_service_amount_payment_intent_id text;

COMMENT ON COLUMN bookings.stripe_service_amount_payment_intent_id IS 
'Stripe payment intent ID for service amount (captured 24h before booking). Service fee uses stripe_payment_intent_id and is charged immediately.';

-- Add index for efficient querying of bookings needing capture
CREATE INDEX IF NOT EXISTS idx_bookings_service_amount_capture 
ON bookings(stripe_service_amount_payment_intent_id, remaining_balance_charged, booking_date, start_time)
WHERE stripe_service_amount_payment_intent_id IS NOT NULL 
  AND remaining_balance_charged = false 
  AND booking_status IN ('confirmed');

