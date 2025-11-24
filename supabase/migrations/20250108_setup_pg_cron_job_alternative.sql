-- Alternative: If pg_net is not available, use Supabase Dashboard to set up cron
-- This file provides instructions for manual setup

-- Option 1: Use Supabase Dashboard (Recommended if pg_net not available)
-- 
-- 1. Go to Supabase Dashboard > Database > Cron Jobs
-- 2. Click "Create New Cron Job"
-- 3. Configure:
--    - Name: process-scheduled-payments
--    - Schedule: 0 * * * * (every hour)
--    - Command: (leave empty - will use HTTP call from Dashboard)
--    - HTTP Endpoint: https://your-api-url.vercel.app/api/bookings/capture-service-amount
--    - Headers: {"Authorization": "Bearer YOUR_CRON_SECRET"}
--    - Method: POST
--    - Body: {}

-- Option 2: Use Supabase Edge Function
-- Create an Edge Function that processes scheduled payments
-- Then schedule it via Dashboard

-- Option 3: Use external cron service (Vercel Cron, GitHub Actions, etc.)
-- Call the endpoint: POST /api/bookings/capture-service-amount
-- With header: Authorization: Bearer YOUR_CRON_SECRET

COMMENT ON EXTENSION pg_cron IS 
'pg_cron extension for scheduling. If pg_net is not available, use Supabase Dashboard or external cron service.';

