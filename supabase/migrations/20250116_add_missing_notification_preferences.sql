-- Add missing notification preference columns to user_settings
-- These columns control whether users receive email/SMS for specific notification types
-- Email defaults to true, SMS defaults to false (opt-in)

-- Customer notifications
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS customer_welcome_email boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS customer_welcome_sms boolean DEFAULT false;

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS customer_booking_accepted_email boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS customer_booking_accepted_sms boolean DEFAULT false;

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS customer_booking_completed_email boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS customer_booking_completed_sms boolean DEFAULT false;

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS customer_booking_reminder_email boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS customer_booking_reminder_sms boolean DEFAULT false;

-- Provider notifications
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS provider_new_booking_email boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS provider_new_booking_sms boolean DEFAULT false;

-- Admin notifications
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS admin_business_verification_email boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS admin_business_verification_sms boolean DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN user_settings.customer_welcome_email IS 'Whether user receives welcome email when they sign up';
COMMENT ON COLUMN user_settings.customer_welcome_sms IS 'Whether user receives welcome SMS when they sign up';

COMMENT ON COLUMN user_settings.customer_booking_accepted_email IS 'Whether customer receives email when booking is accepted';
COMMENT ON COLUMN user_settings.customer_booking_accepted_sms IS 'Whether customer receives SMS when booking is accepted';

COMMENT ON COLUMN user_settings.customer_booking_completed_email IS 'Whether customer receives email when service is completed';
COMMENT ON COLUMN user_settings.customer_booking_completed_sms IS 'Whether customer receives SMS when service is completed';

COMMENT ON COLUMN user_settings.customer_booking_reminder_email IS 'Whether customer receives email reminder before appointment';
COMMENT ON COLUMN user_settings.customer_booking_reminder_sms IS 'Whether customer receives SMS reminder before appointment';

COMMENT ON COLUMN user_settings.provider_new_booking_email IS 'Whether provider receives email for new booking requests';
COMMENT ON COLUMN user_settings.provider_new_booking_sms IS 'Whether provider receives SMS for new booking requests';

COMMENT ON COLUMN user_settings.admin_business_verification_email IS 'Whether admin receives email for new business verifications';
COMMENT ON COLUMN user_settings.admin_business_verification_sms IS 'Whether admin receives SMS for new business verifications';

-- Verification query (comment out after running)
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'user_settings' 
-- AND column_name LIKE '%_email' OR column_name LIKE '%_sms'
-- ORDER BY column_name;
