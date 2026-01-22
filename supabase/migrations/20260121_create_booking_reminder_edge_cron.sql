-- Migration: Create cron job for customer booking reminders via Edge Function
-- Purpose: Send reminder notifications (email + SMS) to customers 24 hours before their scheduled bookings
-- Date: 2026-01-21
-- Edge Function: send-booking-reminder
-- Template: customer_booking_reminder (id: 67bda99d-6579-43ac-8cb0-a1f146c4f411)

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Drop existing cron job if it exists (to allow re-running this migration)
SELECT cron.unschedule('send-booking-reminder-edge')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'send-booking-reminder-edge'
);

-- Create the cron job to call the Edge Function daily at 9:00 AM UTC
-- This will send reminders for bookings scheduled for the next day
SELECT cron.schedule(
  'send-booking-reminder-edge',
  '0 9 * * *', -- Run daily at 9:00 AM UTC (4:00 AM EST / 3:00 AM CST)
  $$
  SELECT net.http_post(
    url := 'https://nfvlyvdbzvvpcjaxtuip.supabase.co/functions/v1/send-booking-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('supabase.anon_key', true)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Add comment for documentation
COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL - used for booking reminders';

-- Verification query (run this to check the job was created)
-- SELECT * FROM cron.job WHERE jobname = 'send-booking-reminder-edge';

-- To manually trigger the job for testing:
-- SELECT net.http_post(
--   url := 'https://nfvlyvdbzvvpcjaxtuip.supabase.co/functions/v1/send-booking-reminder',
--   headers := jsonb_build_object(
--     'Content-Type', 'application/json',
--     'Authorization', 'Bearer YOUR_ANON_KEY'
--   ),
--   body := '{}'::jsonb
-- );

-- To check recent job runs:
-- SELECT * FROM cron.job_run_details 
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-booking-reminder-edge')
-- ORDER BY start_time DESC LIMIT 10;

-- To unschedule the job:
-- SELECT cron.unschedule('send-booking-reminder-edge');
