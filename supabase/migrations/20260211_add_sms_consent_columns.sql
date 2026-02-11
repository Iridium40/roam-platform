-- Add SMS consent tracking columns to customer_profiles table
-- Tracks separate consent for service messages (required for booking) and marketing messages (optional opt-in)

-- Service message consent (required for booking functionality)
ALTER TABLE public.customer_profiles 
  ADD COLUMN IF NOT EXISTS sms_service_consent BOOLEAN DEFAULT false;

ALTER TABLE public.customer_profiles 
  ADD COLUMN IF NOT EXISTS sms_service_consent_date TIMESTAMPTZ;

-- Marketing message consent (optional, must be explicitly opted in)
ALTER TABLE public.customer_profiles 
  ADD COLUMN IF NOT EXISTS sms_marketing_consent BOOLEAN DEFAULT false;

ALTER TABLE public.customer_profiles 
  ADD COLUMN IF NOT EXISTS sms_marketing_consent_date TIMESTAMPTZ;

-- Track opt-out dates for compliance
ALTER TABLE public.customer_profiles 
  ADD COLUMN IF NOT EXISTS sms_marketing_opt_out_date TIMESTAMPTZ;

ALTER TABLE public.customer_profiles 
  ADD COLUMN IF NOT EXISTS sms_service_opt_out_date TIMESTAMPTZ;

-- Index for querying users by marketing consent status (e.g. bulk marketing sends)
CREATE INDEX IF NOT EXISTS idx_customer_profiles_sms_marketing_consent 
  ON public.customer_profiles(sms_marketing_consent) 
  WHERE sms_marketing_consent = true;
