# Booking Reminder Cron Job Setup Guide

This guide explains how to set up the day-before booking reminder email system using Supabase cron jobs.

## Overview

The system sends reminder emails to customers 24 hours before their scheduled bookings. It runs daily and processes all confirmed bookings scheduled for the next day.

## Components

### 1. API Endpoint
**File:** `roam-customer-app/api/bookings/send-day-before-reminders.ts`

This endpoint:
- Finds all confirmed bookings scheduled for tomorrow
- Checks if reminders have already been sent today (prevents duplicates)
- Sends reminder emails via Resend
- Logs notifications in the `notification_logs` table

**Security:** Requires `CRON_SECRET` in Authorization header or request body.

### 2. Email Template
**File:** `roam-customer-app/shared/emailTemplates.ts`

Added `bookingReminder()` template function that generates the reminder email HTML.

### 3. Database Function & Cron Job
**File:** `supabase/migrations/20250125_create_booking_reminder_cron.sql`

Creates:
- `send_day_before_reminders()` function
- Cron job scheduled to run daily at 9:00 AM UTC

## Setup Instructions

### Step 1: Deploy the API Endpoint

The API endpoint is already created. Ensure it's deployed to Vercel and accessible at:
```
https://roamyourbestlife.com/api/bookings/send-day-before-reminders
```

### Step 2: Set Environment Variables

In your Vercel project settings, ensure these environment variables are set:
- `RESEND_API_KEY` - Your Resend API key
- `CRON_SECRET` - A secret key for authenticating cron requests
- `VITE_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key

### Step 3: Run the Migration

Run the migration in your Supabase SQL Editor:
```sql
-- Run: supabase/migrations/20250125_create_booking_reminder_cron.sql
```

### Step 4: Configure Supabase Cron Job

#### Option A: Using pg_net (Supabase Pro/Enterprise)

If you have `pg_net` extension available:

1. Enable pg_net extension:
```sql
CREATE EXTENSION IF NOT EXISTS pg_net;
```

2. Set configuration variables:
```sql
ALTER DATABASE postgres SET app.reminder_api_url = 'https://roamyourbestlife.com/api/bookings/send-day-before-reminders';
ALTER DATABASE postgres SET app.cron_secret = 'your-actual-cron-secret-here';
```

3. Update the function to use pg_net:
```sql
CREATE OR REPLACE FUNCTION send_day_before_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  api_url text := current_setting('app.reminder_api_url', true);
  cron_secret text := current_setting('app.cron_secret', true);
  response_status int;
  response_body text;
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
END;
$$;
```

#### Option B: Using Supabase Edge Functions

1. Create a Supabase Edge Function that calls your API endpoint
2. Update the cron job to call the Edge Function instead

#### Option C: External Cron Service (Recommended for Free Tier)

Use an external cron service like:
- **cron-job.org**
- **EasyCron**
- **GitHub Actions** (if using GitHub)

Schedule a daily HTTP request to:
```
POST https://roamyourbestlife.com/api/bookings/send-day-before-reminders
Headers:
  Authorization: Bearer YOUR_CRON_SECRET
  Content-Type: application/json
Body:
  {
    "cron_secret": "YOUR_CRON_SECRET"
  }
```

Schedule: Daily at 9:00 AM UTC (or your preferred time)

### Step 5: Verify Setup

1. **Check cron job exists:**
```sql
SELECT * FROM cron.job WHERE jobname = 'send-day-before-reminders';
```

2. **Test the API endpoint manually:**
```bash
curl -X POST https://roamyourbestlife.com/api/bookings/send-day-before-reminders \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"cron_secret": "YOUR_CRON_SECRET"}'
```

3. **Check notification logs:**
```sql
SELECT * FROM notification_logs 
WHERE notification_type = 'customer_booking_reminder' 
ORDER BY sent_at DESC 
LIMIT 10;
```

## How It Works

1. **Daily at 9:00 AM UTC**, the cron job triggers
2. **Finds bookings** scheduled for tomorrow (`booking_date = tomorrow`)
3. **Filters** for confirmed bookings that haven't been cancelled
4. **Checks** if reminder was already sent today (prevents duplicates)
5. **Sends email** to customer (or guest email if guest booking)
6. **Logs** the notification in `notification_logs` table

## Email Content

The reminder email includes:
- Service name
- Provider name
- Booking date and time (formatted nicely)
- Location (business or customer location based on delivery type)
- Pre-appointment tips
- Link to view booking details

## Troubleshooting

### Reminders not sending?

1. Check cron job is running:
```sql
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-day-before-reminders')
ORDER BY start_time DESC 
LIMIT 5;
```

2. Check API endpoint logs in Vercel dashboard

3. Verify environment variables are set correctly

4. Check Resend API key is valid

### Duplicate reminders?

The system checks `notification_logs` for reminders sent today. If you see duplicates:
- Check the `metadata.booking_id` in notification_logs
- Ensure the booking date check is working correctly

### Timezone issues?

The cron job runs at 9:00 AM UTC. Adjust the schedule if needed:
```sql
-- Change to 9:00 AM EST (UTC-5) = 2:00 PM UTC
SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'send-day-before-reminders'),
  schedule := '0 14 * * *'
);
```

## Customization

### Change reminder timing

To send reminders 48 hours before instead of 24 hours:
1. Update the API endpoint to look for bookings 2 days ahead
2. Update the cron job to run earlier if needed

### Change email content

Edit the `bookingReminder()` template in `roam-customer-app/shared/emailTemplates.ts`

### Change schedule

Update the cron schedule:
```sql
SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'send-day-before-reminders'),
  schedule := '0 8 * * *' -- 8:00 AM UTC instead of 9:00 AM
);
```

## Notes

- The cron job runs daily, so reminders are sent once per booking
- Reminders are only sent for confirmed bookings
- Cancelled bookings are excluded
- Guest bookings use guest_email instead of customer email
- All reminders are logged in `notification_logs` for tracking

