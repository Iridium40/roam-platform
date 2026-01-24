-- Migration: Remove business tax tracking trigger
-- Purpose: The track_business_payment_for_stripe_tax trigger is causing 42P10 errors
-- when updating bookings (e.g., for balance payments). This tax info is available
-- through Stripe Express dashboard, so this trigger is not needed.

-- Drop the trigger
DROP TRIGGER IF EXISTS track_business_payment_for_stripe_tax ON public.bookings;

-- Drop the function if it exists
DROP FUNCTION IF EXISTS public.track_business_payment_for_tax();

-- Log the removal
DO $$
BEGIN
  RAISE NOTICE 'Removed track_business_payment_for_stripe_tax trigger from bookings table';
  RAISE NOTICE 'Business tax information is available via Stripe Express dashboard';
END $$;
