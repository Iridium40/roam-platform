-- Add provider notification preferences for cancelled and rescheduled bookings
-- These control whether providers receive notifications about booking changes

-- Add columns for provider_booking_cancelled notification preferences
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS provider_booking_cancelled_email boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS provider_booking_cancelled_sms boolean DEFAULT false;

-- Add columns for provider_booking_rescheduled notification preferences
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS provider_booking_rescheduled_email boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS provider_booking_rescheduled_sms boolean DEFAULT false;

-- Update existing user settings to have the default values
UPDATE user_settings 
SET 
  provider_booking_cancelled_email = COALESCE(provider_booking_cancelled_email, true),
  provider_booking_cancelled_sms = COALESCE(provider_booking_cancelled_sms, false),
  provider_booking_rescheduled_email = COALESCE(provider_booking_rescheduled_email, true),
  provider_booking_rescheduled_sms = COALESCE(provider_booking_rescheduled_sms, false);

-- Add comments explaining the columns
COMMENT ON COLUMN user_settings.provider_booking_cancelled_email IS 'Whether provider receives email when a booking is cancelled';
COMMENT ON COLUMN user_settings.provider_booking_cancelled_sms IS 'Whether provider receives SMS when a booking is cancelled';
COMMENT ON COLUMN user_settings.provider_booking_rescheduled_email IS 'Whether provider receives email when a booking is rescheduled';
COMMENT ON COLUMN user_settings.provider_booking_rescheduled_sms IS 'Whether provider receives SMS when a booking is rescheduled';

