-- ============================================================================
-- NEW BOOKING NOTIFICATION TRIGGER
-- ============================================================================
-- This migration creates a database trigger that calls an Edge Function
-- when a new booking is inserted. The Edge Function sends notifications to:
-- 1. Business contact_email (always)
-- 2. Assigned provider (if provider_id is set) based on their preferences
-- ============================================================================

-- Enable pg_net extension if not already enabled (for HTTP requests from triggers)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create app_config table if it doesn't exist (stores environment-specific settings)
CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert the Supabase URL config (update this value per environment)
-- DEV: https://vssomyuyhicaxsgiaupo.supabase.co
-- PROD: Update to your production Supabase URL
INSERT INTO public.app_config (key, value, description)
VALUES (
  'supabase_url',
  'https://vssomyuyhicaxsgiaupo.supabase.co',
  'Base URL for Supabase project (used for Edge Function calls)'
)
ON CONFLICT (key) DO NOTHING;

-- Insert the Supabase anon key for Edge Function authorization
-- IMPORTANT: Update this for each environment!
-- You can find this in Supabase Dashboard -> Settings -> API -> anon/public key
INSERT INTO public.app_config (key, value, description)
VALUES (
  'supabase_anon_key',
  'YOUR_SUPABASE_ANON_KEY_HERE',
  'Supabase anon key for Edge Function authorization (update per environment)'
)
ON CONFLICT (key) DO NOTHING;

-- Create function to call Edge Function for new booking notifications
CREATE OR REPLACE FUNCTION public.notify_new_booking()
RETURNS TRIGGER AS $$
DECLARE
  edge_function_url TEXT;
  supabase_base_url TEXT;
  supabase_anon_key TEXT;
  request_id BIGINT;
BEGIN
  -- Only trigger for new bookings (INSERT operations)
  IF TG_OP = 'INSERT' THEN
    -- Get the Supabase URL from app_config table (environment-specific)
    SELECT value INTO supabase_base_url
    FROM public.app_config
    WHERE key = 'supabase_url';
    
    -- Get the Supabase anon key from app_config table
    SELECT value INTO supabase_anon_key
    FROM public.app_config
    WHERE key = 'supabase_anon_key';
    
    -- Fallback to production URL if not configured
    IF supabase_base_url IS NULL THEN
      supabase_base_url := 'https://nfvlyvdbzvvpcjaxtuip.supabase.co';
    END IF;
    
    -- Check if anon key is configured
    IF supabase_anon_key IS NULL OR supabase_anon_key = 'YOUR_SUPABASE_ANON_KEY_HERE' THEN
      RAISE WARNING 'Supabase anon key not configured in app_config. Notification will fail.';
      RETURN NEW;
    END IF;
    
    -- Construct the Edge Function URL
    edge_function_url := supabase_base_url || '/functions/v1/notify-new-booking';
    
    -- Make async HTTP POST to Edge Function using anon key for authorization
    SELECT net.http_post(
      url := edge_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || supabase_anon_key
      ),
      body := jsonb_build_object(
        'type', 'INSERT',
        'record', jsonb_build_object(
          'id', NEW.id,
          'business_id', NEW.business_id,
          'provider_id', NEW.provider_id,
          'customer_id', NEW.customer_id,
          'service_id', NEW.service_id,
          'booking_date', NEW.booking_date,
          'start_time', NEW.start_time,
          'total_amount', NEW.total_amount,
          'booking_reference', NEW.booking_reference,
          'special_instructions', NEW.special_instructions,
          'booking_status', NEW.booking_status
        )
      )
    ) INTO request_id;
    
    -- Log the request (optional - for debugging)
    RAISE NOTICE 'New booking notification triggered for booking %, request_id: %', NEW.id, request_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.notify_new_booking() TO postgres, service_role;

-- Drop existing trigger if it exists (to allow re-running migration)
DROP TRIGGER IF EXISTS on_booking_created ON public.bookings;

-- Create the trigger
CREATE TRIGGER on_booking_created
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_booking();

-- Add comment to document the trigger
COMMENT ON TRIGGER on_booking_created ON public.bookings IS 
  'Triggers Edge Function to send new booking notifications to business and provider';

COMMENT ON FUNCTION public.notify_new_booking() IS 
  'Calls notify-new-booking Edge Function when a new booking is created';

-- ============================================================================
-- CONFIGURATION REQUIRED
-- ============================================================================
-- After running this migration, you MUST set the anon key:
--
-- UPDATE public.app_config 
-- SET value = 'your-supabase-anon-key-here',
--     updated_at = NOW()
-- WHERE key = 'supabase_anon_key';
--
-- Find your anon key in: Supabase Dashboard -> Settings -> API -> anon/public
-- ============================================================================
-- PRODUCTION DEPLOYMENT NOTE
-- ============================================================================
-- When deploying to production, update BOTH values in app_config:
--
-- UPDATE public.app_config 
-- SET value = 'https://YOUR_PROD_PROJECT_REF.supabase.co',
--     updated_at = NOW()
-- WHERE key = 'supabase_url';
--
-- UPDATE public.app_config 
-- SET value = 'your-prod-anon-key',
--     updated_at = NOW()
-- WHERE key = 'supabase_anon_key';
--
-- ============================================================================
