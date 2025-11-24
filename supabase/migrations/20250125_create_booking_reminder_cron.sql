-- Migration: Create cron job for day-before booking reminders
-- Purpose: Send reminder emails to customers 24 hours before their scheduled bookings
-- Date: 2025-01-25

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a function that will be called by the cron job
-- This function calls the HTTP endpoint to send reminder emails
CREATE OR REPLACE FUNCTION send_day_before_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  api_url text;
  cron_secret text;
  response_status int;
  response_body text;
BEGIN
  -- Get the API URL and cron secret from environment variables
  -- These should be set in Supabase Dashboard > Settings > Edge Functions > Secrets
  api_url := current_setting('app.reminder_api_url', true);
  cron_secret := current_setting('app.cron_secret', true);
  
  -- Default values if not set (for development)
  IF api_url IS NULL OR api_url = '' THEN
    api_url := 'https://roamyourbestlife.com/api/bookings/send-day-before-reminders';
  END IF;
  
  IF cron_secret IS NULL OR cron_secret = '' THEN
    cron_secret := 'your-cron-secret-here';
  END IF;
  
  -- Call the HTTP endpoint using pg_net (if available) or log that it needs to be called externally
  -- Note: Supabase may require using Edge Functions or external cron service
  -- For now, we'll create a placeholder that logs the intent
  
  RAISE NOTICE 'Sending day-before reminders via API: %', api_url;
  
  -- If pg_net extension is available, use it to make HTTP call
  -- Otherwise, this will need to be triggered via Supabase Edge Function or external cron
  BEGIN
    SELECT status, content INTO response_status, response_body
    FROM net.http_post(
      url := api_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || cron_secret
      ),
      body := jsonb_build_object('cron_secret', cron_secret)
    );
    
    RAISE NOTICE 'Reminder API response: Status %, Body %', response_status, response_body;
  EXCEPTION WHEN OTHERS THEN
    -- If pg_net is not available, log that external trigger is needed
    RAISE NOTICE 'pg_net not available. Please trigger reminder endpoint externally or use Supabase Edge Function.';
    RAISE NOTICE 'Error: %', SQLERRM;
  END;
END;
$$;

-- Create the cron job to run daily at 9:00 AM UTC (adjust timezone as needed)
-- This will send reminders for bookings scheduled for the next day
SELECT cron.schedule(
  'send-day-before-reminders',
  '0 9 * * *', -- Run daily at 9:00 AM UTC
  $$SELECT send_day_before_reminders();$$
);

-- Alternative: If pg_net is not available, you can use Supabase Edge Functions
-- Create an Edge Function that calls the API endpoint, then schedule it via:
-- SELECT cron.schedule(
--   'send-day-before-reminders',
--   '0 9 * * *',
--   $$SELECT net.http_post(...)$$ -- Call Edge Function or API directly
-- );

-- Add comment
COMMENT ON FUNCTION send_day_before_reminders() IS 
  'Sends reminder emails to customers for bookings scheduled the next day. Called daily by cron job.';

-- Instructions for setup:
-- 1. Set environment variables in Supabase Dashboard:
--    - app.reminder_api_url: Your API endpoint URL
--    - app.cron_secret: Secret key for authenticating cron requests
-- 2. Ensure pg_net extension is enabled (Supabase Pro/Enterprise) OR
-- 3. Use Supabase Edge Functions to call the API endpoint instead
-- 4. Verify cron job is running: SELECT * FROM cron.job WHERE jobname = 'send-day-before-reminders';

