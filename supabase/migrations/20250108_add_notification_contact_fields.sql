-- Add notification-specific contact fields to user_settings
-- These allow users to specify different email/phone for notifications
-- separate from their profile email/phone

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS notification_email TEXT,
ADD COLUMN IF NOT EXISTS notification_phone TEXT;

-- Add helpful comments
COMMENT ON COLUMN user_settings.notification_email IS 'Optional: Email address for notifications (if different from profile email)';
COMMENT ON COLUMN user_settings.notification_phone IS 'Optional: Phone number for SMS notifications (if different from profile phone)';

-- No need for indexes as these will be queried by user_id which already has an index

