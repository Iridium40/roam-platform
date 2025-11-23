-- Alternative: Simple pg_cron setup for Supabase
-- This version uses Supabase's built-in HTTP capabilities

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Note: Supabase pg_cron can call HTTP endpoints directly
-- However, the exact syntax depends on your Supabase version
-- 
-- Option 1: If you have pg_net extension (Supabase Pro/Enterprise)
-- Uncomment and use this:
--
-- CREATE EXTENSION IF NOT EXISTS pg_net;
-- 
-- SELECT cron.schedule(
--   'process-scheduled-payments',
--   '0 * * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://your-api-url.vercel.app/api/bookings/capture-service-amount',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer your-cron-secret'
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );

-- Option 2: Use Supabase Dashboard to set up cron job
-- Go to Database > Cron Jobs in Supabase Dashboard
-- Create a new cron job with:
--   Schedule: 0 * * * * (every hour)
--   Command: SELECT pg_cron.job_run('process-scheduled-payments');
--   Database: postgres

-- Option 3: Manual setup via Supabase SQL Editor
-- Run this in Supabase SQL Editor after setting up the HTTP endpoint:
--
-- SELECT cron.schedule(
--   'process-scheduled-payments',
--   '0 * * * *',
--   $$
--   -- This will be handled by Supabase Edge Function or external cron
--   -- The actual HTTP call should be made from your application
--   SELECT 1;
--   $$
-- );

-- For now, we'll create a placeholder that can be updated
-- The actual HTTP call should be configured in Supabase Dashboard
-- or via Supabase Edge Functions

COMMENT ON EXTENSION pg_cron IS 
'pg_cron extension for scheduling database jobs. Configure the actual HTTP call via Supabase Dashboard or Edge Functions.';

