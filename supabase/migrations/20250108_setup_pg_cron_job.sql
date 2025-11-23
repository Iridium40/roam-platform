-- Schedule pg_cron job to call our API endpoint to process scheduled payments
-- This will capture service amount payments 24 hours before bookings

-- First, ensure pg_cron extension is enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable http extension for making HTTP requests (if not already enabled)
-- Note: Supabase may use 'net' extension instead - check your Supabase version
CREATE EXTENSION IF NOT EXISTS http;

-- Schedule the job to run every hour at minute 0
-- Format: minute hour day month day_of_week
-- '0 * * * *' = every hour at minute 0
-- 
-- IMPORTANT: Replace 'YOUR_API_URL' with your actual API URL
-- Example: 'https://roam-provider-app.vercel.app'
--
-- The cron job will call the API endpoint which queries booking_payment_schedules
-- and processes any payments that are due
SELECT cron.schedule(
  'process-scheduled-payments',
  '0 * * * *', -- Every hour at minute 0
  $cron$
  SELECT
    http_post(
      url := current_setting('app.api_url', true) || '/api/bookings/capture-service-amount',
      content := '{}'::text,
      content_type := 'application/json',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
      )::text
    );
  $cron$
);

-- Optional: Schedule a more frequent check (every 15 minutes) for better accuracy
-- Uncomment if you want more frequent processing (recommended for production)
-- SELECT cron.schedule(
--   'process-scheduled-payments-frequent',
--   '*/15 * * * *', -- Every 15 minutes
--   $cron$
--   SELECT
--     http_post(
--       url := current_setting('app.api_url', true) || '/api/bookings/capture-service-amount',
--       content := '{}'::text,
--       content_type := 'application/json',
--       headers := jsonb_build_object(
--         'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
--       )::text
--     );
--   $cron$
-- );

COMMENT ON EXTENSION pg_cron IS 
'pg_cron extension for scheduling database jobs. Used to call API endpoint to process scheduled payment captures 24 hours before bookings.';

-- IMPORTANT: After running this migration, you MUST set these database settings:
-- 
-- 1. Set your API URL (replace with your actual Vercel/API URL):
--    ALTER DATABASE postgres SET app.api_url = 'https://roam-provider-app.vercel.app';
--
-- 2. Set your cron secret (use a strong random string):
--    ALTER DATABASE postgres SET app.cron_secret = 'your-strong-secret-token-here';
--
-- 3. Verify settings:
--    SHOW app.api_url;
--    SHOW app.cron_secret;
--
-- Note: These settings are database-level and persist across connections.

