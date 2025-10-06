-- Add notification_phone column to admin_users table
-- This column stores the phone number used for SMS notifications

ALTER TABLE public.admin_users
ADD COLUMN IF NOT EXISTS notification_phone text NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.admin_users.notification_phone IS 'Phone number for SMS notifications (E.164 format recommended)';
