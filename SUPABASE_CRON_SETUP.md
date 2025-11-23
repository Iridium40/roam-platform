# Supabase Cron Job Setup Guide

## Overview

The payment capture system uses Supabase `pg_cron` to call our API endpoint every hour to process scheduled payments.

## Setup Options

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to **Database** > **Cron Jobs**
3. Click **Create New Cron Job**
4. Configure:
   - **Name**: `process-scheduled-payments`
   - **Schedule**: `0 * * * *` (every hour at minute 0)
   - **Command**: 
     ```sql
     SELECT net.http_post(
       url := 'https://your-api-url.vercel.app/api/bookings/capture-service-amount',
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'Authorization', 'Bearer YOUR_CRON_SECRET'
       )::text,
       body := '{}'::text
     );
     ```
   - **Database**: `postgres`

### Option 2: SQL Editor

Run this in Supabase SQL Editor:

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the job
SELECT cron.schedule(
  'process-scheduled-payments',
  '0 * * * *', -- Every hour
  $$
  SELECT net.http_post(
    url := 'https://roam-provider-app.vercel.app/api/bookings/capture-service-amount',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
    )::text,
    body := '{}'::text
  );
  $$
);

-- Set the cron secret (run once)
ALTER DATABASE postgres SET app.cron_secret = 'your-strong-secret-token-here';
```

### Option 3: Supabase Edge Function

Create a Supabase Edge Function that processes scheduled payments:

1. Create Edge Function: `process-scheduled-payments`
2. Schedule it via Supabase Dashboard Cron Jobs
3. Function calls Stripe API directly (has access to secrets)

## Environment Variables

Set these in your Vercel project:
- `CRON_SECRET`: Secret token for authenticating cron requests

## Testing

Test the endpoint manually:
```bash
curl -X POST https://your-api-url.vercel.app/api/bookings/capture-service-amount \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

## Monitoring

Check cron job status:
```sql
SELECT * FROM cron.job WHERE jobname = 'process-scheduled-payments';
```

View scheduled payments:
```sql
SELECT * FROM booking_payment_schedules 
WHERE status = 'scheduled' 
ORDER BY scheduled_at;
```

