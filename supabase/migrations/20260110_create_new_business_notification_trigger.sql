-- ============================================================================
-- NEW BUSINESS NOTIFICATION TRIGGER
-- ============================================================================
-- This migration creates a database trigger that calls an Edge Function
-- when a new business is created. The Edge Function sends a notification
-- email to alan@roamyourbestlife.com
-- ============================================================================

-- Ensure pg_net extension is enabled (should already be from booking trigger)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create function to call Edge Function for new business notifications
CREATE OR REPLACE FUNCTION public.notify_new_business()
RETURNS TRIGGER AS $$
DECLARE
  edge_function_url TEXT;
  supabase_base_url TEXT;
  supabase_anon_key TEXT;
  request_id BIGINT;
BEGIN
  -- Only trigger for new businesses (INSERT operations)
  IF TG_OP = 'INSERT' THEN
    -- Get the Supabase URL from app_config table (environment-specific)
    SELECT value INTO supabase_base_url
    FROM public.app_config
    WHERE key = 'supabase_url';
    
    -- Get the Supabase anon key from app_config table
    SELECT value INTO supabase_anon_key
    FROM public.app_config
    WHERE key = 'supabase_anon_key';
    
    -- Fallback to dev URL if not configured
    IF supabase_base_url IS NULL THEN
      supabase_base_url := 'https://vssomyuyhicaxsgiaupo.supabase.co';
    END IF;
    
    -- Check if anon key is configured
    IF supabase_anon_key IS NULL OR supabase_anon_key = 'YOUR_SUPABASE_ANON_KEY_HERE' THEN
      RAISE WARNING 'Supabase anon key not configured in app_config. Notification will fail.';
      RETURN NEW;
    END IF;
    
    -- Construct the Edge Function URL
    edge_function_url := supabase_base_url || '/functions/v1/notify-new-business';
    
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
          'business_name', NEW.business_name,
          'business_type', NEW.business_type,
          'contact_email', NEW.contact_email,
          'phone', NEW.phone,
          'verification_status', NEW.verification_status,
          'business_description', NEW.business_description,
          'website_url', NEW.website_url,
          'created_at', NEW.created_at
        )
      )
    ) INTO request_id;
    
    -- Log the request (optional - for debugging)
    RAISE NOTICE 'New business notification triggered for business %, request_id: %', NEW.id, request_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.notify_new_business() TO postgres, service_role;

-- Drop existing trigger if it exists (to allow re-running migration)
DROP TRIGGER IF EXISTS on_business_created ON public.business_profiles;

-- Create the trigger
CREATE TRIGGER on_business_created
  AFTER INSERT ON public.business_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_business();

-- Add comment to document the trigger
COMMENT ON TRIGGER on_business_created ON public.business_profiles IS 
  'Triggers Edge Function to send new business notification email to admin';

COMMENT ON FUNCTION public.notify_new_business() IS 
  'Calls notify-new-business Edge Function when a new business is created';

-- ============================================================================
-- DEPLOYMENT NOTES
-- ============================================================================
-- 1. Deploy the Edge Function first:
--    cd supabase/functions
--    supabase functions deploy notify-new-business
--
-- 2. Ensure RESEND_API_KEY is set in Supabase Edge Function secrets:
--    supabase secrets set RESEND_API_KEY=your-resend-api-key
--
-- 3. Ensure app_config table has correct values for your environment
--    (supabase_url and supabase_anon_key should already be configured
--    from the booking notification trigger)
-- ============================================================================
