-- Add customer_booking_declined preferences to user_settings table
-- These control whether users receive notifications when their bookings are declined

-- Add columns for customer_booking_declined notification preferences
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS customer_booking_declined_email boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS customer_booking_declined_sms boolean DEFAULT false;

-- Update existing user settings to have the default values
UPDATE user_settings 
SET 
  customer_booking_declined_email = true,
  customer_booking_declined_sms = false
WHERE 
  customer_booking_declined_email IS NULL 
  OR customer_booking_declined_sms IS NULL;

-- Add comment explaining the columns
COMMENT ON COLUMN user_settings.customer_booking_declined_email IS 'Whether user receives email when their booking is declined';
COMMENT ON COLUMN user_settings.customer_booking_declined_sms IS 'Whether user receives SMS when their booking is declined';

