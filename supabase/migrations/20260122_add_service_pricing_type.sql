-- Add pricing_type column to services table
-- This determines whether min_price represents a fixed minimum price or a deposit amount

ALTER TABLE services 
ADD COLUMN IF NOT EXISTS pricing_type VARCHAR(10) DEFAULT 'fixed';

-- Add check constraint
ALTER TABLE services 
ADD CONSTRAINT services_pricing_type_check 
CHECK (pricing_type IN ('fixed', 'deposit'));

-- Add comment explaining the field
COMMENT ON COLUMN services.pricing_type IS 
'fixed = min_price is the minimum total price businesses can charge; deposit = min_price is the deposit amount collected at booking with remaining balance collected via Add More Services';

-- Update any existing NULL values to 'fixed' (shouldn't happen due to default, but just in case)
UPDATE services SET pricing_type = 'fixed' WHERE pricing_type IS NULL;
