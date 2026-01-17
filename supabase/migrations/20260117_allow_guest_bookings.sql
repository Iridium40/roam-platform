-- ============================================================================
-- ALLOW GUEST BOOKINGS
-- ============================================================================
-- This migration ensures the bookings table supports guest checkouts where
-- customer_id is NULL. Guest bookings store contact info in guest_name, 
-- guest_email, and guest_phone fields.
-- ============================================================================

-- Ensure customer_id allows NULL values (for guest bookings)
-- First, check if there's a NOT NULL constraint and remove it if exists
DO $$ 
BEGIN
  -- Try to alter the column to allow NULL
  -- This will succeed if the column exists, regardless of current constraint
  ALTER TABLE public.bookings 
  ALTER COLUMN customer_id DROP NOT NULL;
  
  RAISE NOTICE 'customer_id NOT NULL constraint dropped (or was already nullable)';
EXCEPTION 
  WHEN others THEN
    RAISE NOTICE 'customer_id column may already allow NULL or does not exist: %', SQLERRM;
END $$;

-- Add a comment documenting that customer_id can be NULL for guest bookings
COMMENT ON COLUMN public.bookings.customer_id IS 
  'Reference to customer_profiles. NULL for guest bookings - use guest_name, guest_email, guest_phone instead.';

-- Ensure guest fields have appropriate defaults and constraints
-- These fields are used for notification purposes for both guest and logged-in users
ALTER TABLE public.bookings 
  ALTER COLUMN guest_name SET DEFAULT NULL,
  ALTER COLUMN guest_email SET DEFAULT NULL,
  ALTER COLUMN guest_phone SET DEFAULT NULL;

-- Add check constraint to ensure guest bookings have at least name and email
-- This is a soft check - if customer_id is null, guest fields should be populated
DO $$
BEGIN
  -- Drop existing constraint if it exists
  ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS guest_booking_requires_contact_info;
  
  -- Add constraint: if customer_id is NULL, guest_name and guest_email must be provided
  ALTER TABLE public.bookings ADD CONSTRAINT guest_booking_requires_contact_info
    CHECK (
      customer_id IS NOT NULL 
      OR (guest_name IS NOT NULL AND guest_email IS NOT NULL)
    );
    
  RAISE NOTICE 'Added guest booking contact info constraint';
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Could not add guest booking constraint: %', SQLERRM;
END $$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
-- Ensure service_role can insert guest bookings (it should already have this)
GRANT INSERT, UPDATE, SELECT ON public.bookings TO service_role;

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================
-- Guest bookings are identified by:
-- - customer_id = NULL
-- - guest_name IS NOT NULL
-- - guest_email IS NOT NULL
-- 
-- Guest checkout flow:
-- 1. Customer fills in name/email on checkout form
-- 2. Booking created via /api/bookings/create-guest-booking with customer_id=NULL
-- 3. Payment processed via /api/stripe/create-guest-payment-intent
-- 4. Notifications sent to guest_email
-- 5. Booking appears in admin/provider dashboards with guest info
-- ============================================================================
