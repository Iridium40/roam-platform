-- Add notification_email column to providers table
-- This column stores the email address used for notifications (may differ from login email)

ALTER TABLE public.providers
ADD COLUMN IF NOT EXISTS notification_email text NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.providers.notification_email IS 'Email address for notifications (may differ from account email)';
