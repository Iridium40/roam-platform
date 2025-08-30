-- Migration to fix announcement_audience enum to include 'business'
-- This will resolve the error: invalid input value for enum announcement_audience: "business"

-- Add 'business' to the announcement_audience enum if it doesn't already exist
DO $$ 
BEGIN
    -- Check if the enum value already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'business' 
        AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'announcement_audience'
        )
    ) THEN
        -- Add 'business' to the enum
        ALTER TYPE announcement_audience ADD VALUE 'business';
        RAISE NOTICE 'Added business to announcement_audience enum';
    ELSE
        RAISE NOTICE 'business already exists in announcement_audience enum';
    END IF;
END $$;

-- Verify the enum now includes all expected values
SELECT enumlabel as "Available announcement_audience values"
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'announcement_audience')
ORDER BY enumlabel;
