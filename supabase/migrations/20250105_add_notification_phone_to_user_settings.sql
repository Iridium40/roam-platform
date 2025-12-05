-- Add notification_phone column to user_settings for custom SMS notifications
-- This allows users to specify a different phone number for receiving SMS notifications
-- separate from their account phone number

ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS notification_phone TEXT NULL;

COMMENT ON COLUMN public.user_settings.notification_phone IS 'Custom phone number for SMS notifications (E.164 format recommended, e.g., +1234567890). If null, will use the user''s primary phone number.';

