-- Fix typo in reviews table: businesss_id -> business_id
-- Add provider_id column if it doesn't exist
-- Add indexes for business_id and provider_id

-- First, check if businesss_id exists and rename it to business_id
DO $$
BEGIN
  -- Check if businesss_id column exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reviews' 
    AND column_name = 'businesss_id'
  ) THEN
    -- Rename the column
    ALTER TABLE public.reviews RENAME COLUMN businesss_id TO business_id;
    RAISE NOTICE 'Renamed businesss_id to business_id';
  END IF;
END $$;

-- Add provider_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reviews' 
    AND column_name = 'provider_id'
  ) THEN
    ALTER TABLE public.reviews 
    ADD COLUMN provider_id uuid NULL;
    
    -- Add foreign key constraint for provider_id
    ALTER TABLE public.reviews
    ADD CONSTRAINT reviews_provider_id_fkey 
    FOREIGN KEY (provider_id) 
    REFERENCES public.providers(id);
    
    RAISE NOTICE 'Added provider_id column and foreign key';
  END IF;
END $$;

-- Ensure business_id has foreign key constraint (fix if needed)
DO $$
BEGIN
  -- Check if the foreign key constraint exists with the correct name
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'reviews' 
    AND constraint_name = 'reviews_business_id_fkey'
  ) THEN
    -- Drop the old constraint if it exists with wrong name
    IF EXISTS (
      SELECT 1 
      FROM information_schema.table_constraints 
      WHERE constraint_schema = 'public' 
      AND table_name = 'reviews' 
      AND constraint_name = 'reviews_businesss_id_fkey'
    ) THEN
      ALTER TABLE public.reviews DROP CONSTRAINT reviews_businesss_id_fkey;
    END IF;
    
    -- Add the correct foreign key constraint
    ALTER TABLE public.reviews
    ADD CONSTRAINT reviews_business_id_fkey 
    FOREIGN KEY (business_id) 
    REFERENCES public.business_profiles(id);
    
    RAISE NOTICE 'Added business_id foreign key constraint';
  END IF;
END $$;

-- Add indexes for business_id and provider_id if they don't exist
CREATE INDEX IF NOT EXISTS idx_reviews_business_id 
ON public.reviews USING btree (business_id) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_reviews_provider_id 
ON public.reviews USING btree (provider_id) 
TABLESPACE pg_default;

-- Add comment to document the columns
COMMENT ON COLUMN public.reviews.business_id IS 'Direct reference to the business being reviewed';
COMMENT ON COLUMN public.reviews.provider_id IS 'Direct reference to the provider being reviewed';

