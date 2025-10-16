-- Fix typo in business_services table column name
-- Rename business_duration_mininutes to business_duration_minutes

-- First, add the correctly named column
ALTER TABLE business_services 
ADD COLUMN business_duration_minutes INTEGER;

-- Copy data from the misspelled column to the correctly named column
UPDATE business_services 
SET business_duration_minutes = business_duration_mininutes
WHERE business_duration_mininutes IS NOT NULL;

-- Drop the misspelled column
ALTER TABLE business_services 
DROP COLUMN business_duration_mininutes;

-- Add a comment to explain the column
COMMENT ON COLUMN business_services.business_duration_minutes IS 'Custom duration in minutes for this business service. If null, uses the default duration from the services table.';
