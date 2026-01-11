-- Add cover_image_position column to business_profiles
-- This allows businesses to adjust the vertical position of their cover image
-- Value is 0-100 (percentage), where 50 is center

ALTER TABLE public.business_profiles 
ADD COLUMN IF NOT EXISTS cover_image_position integer DEFAULT 50;

-- Add a check constraint to ensure value is between 0 and 100
ALTER TABLE public.business_profiles
ADD CONSTRAINT check_cover_image_position_range 
CHECK (cover_image_position >= 0 AND cover_image_position <= 100);

-- Add comment for documentation
COMMENT ON COLUMN public.business_profiles.cover_image_position IS 'Vertical position of cover image (0-100%, 50 is center)';
