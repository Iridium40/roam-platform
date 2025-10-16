-- Add business_duration_minutes column to business_services table
-- This column allows businesses to set custom durations for their services

ALTER TABLE business_services 
ADD COLUMN business_duration_minutes INTEGER;

-- Add a comment to explain the column
COMMENT ON COLUMN business_services.business_duration_minutes IS 'Custom duration in minutes for this business service. If null, uses the default duration from the services table.';

-- Update existing records to use the service's default duration
UPDATE business_services 
SET business_duration_minutes = (
  SELECT s.duration_minutes 
  FROM services s 
  WHERE s.id = business_services.service_id
)
WHERE business_duration_minutes IS NULL;
