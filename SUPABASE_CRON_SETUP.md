# Supabase Cron Job Setup Guide

## Overview

The payment capture system uses Supabase `pg_cron` to call our API endpoint every hour to process scheduled payments.

## Setup Options

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to **Database** > **Extensions**
3. Enable `pg_cron` and `pg_net` extensions if not already enabled
4. Navigate to **Database** > **Cron Jobs** (or use SQL Editor)
5. Run the migration: `20250108_setup_pg_cron_job.sql`

**OR** Set up manually via SQL Editor:
```sql
SELECT cron.schedule(
  'process-scheduled-payments',
  '0 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://your-api-url.vercel.app/api/bookings/capture-service-amount',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR_CRON_SECRET'
      )::jsonb,
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
```

### Option 2: SQL Editor (Correct Syntax)

Run this in Supabase SQL Editor:

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Set the cron secret and API URL (run once)
ALTER DATABASE postgres SET app.api_url = 'https://roam-provider-app.vercel.app';
ALTER DATABASE postgres SET app.cron_secret = 'your-strong-secret-token-here';

-- Schedule the job
SELECT cron.schedule(
  'process-scheduled-payments',
  '0 * * * *', -- Every hour
  $$
  SELECT
    net.http_post(
      url := COALESCE(
        current_setting('app.api_url', true),
        'https://roam-provider-app.vercel.app'
      ) || '/api/bookings/capture-service-amount',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(
          current_setting('app.cron_secret', true),
          'your-cron-secret-here'
        )
      )::jsonb,
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
```

**Important Notes:**
- `net.http_post` requires `pg_net` extension (not `http`)
- Headers and body must be `jsonb` type (not `text`)
- Use `::jsonb` cast for headers

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

