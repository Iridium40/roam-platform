-- Add sms_notifications column to user_settings table
-- Date: October 6, 2025

ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS sms_notifications boolean NULL DEFAULT false;

-- Update existing rows to have default value
UPDATE public.user_settings
SET sms_notifications = false
WHERE sms_notifications IS NULL;

-- Add comment to column
COMMENT ON COLUMN public.user_settings.sms_notifications IS 'Enable/disable SMS text message notifications. Phone number is stored in providers.notification_phone';
