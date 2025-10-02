-- Add Database Constraints to Prevent Invalid Records
-- This ensures data integrity for business service categories and subcategories

-- ============================================================================
-- 1. Add NOT NULL constraints for business_service_categories
-- ============================================================================

-- First check if there are any NULL category_ids (should be none after cleanup)
SELECT COUNT(*) as null_category_count
FROM business_service_categories
WHERE category_id IS NULL;

-- Add NOT NULL constraint for category_id
ALTER TABLE business_service_categories
ALTER COLUMN category_id SET NOT NULL;

-- ============================================================================
-- 2. Add NOT NULL constraints for business_service_subcategories
-- ============================================================================

-- Check for any NULL values (should be none after cleanup)
SELECT COUNT(*) as null_category_count
FROM business_service_subcategories
WHERE category_id IS NULL;

SELECT COUNT(*) as null_subcategory_count
FROM business_service_subcategories
WHERE subcategory_id IS NULL;

-- Add NOT NULL constraints
ALTER TABLE business_service_subcategories
ALTER COLUMN category_id SET NOT NULL;

ALTER TABLE business_service_subcategories
ALTER COLUMN subcategory_id SET NOT NULL;

-- ============================================================================
-- 3. Add CHECK constraints to validate UUID format
-- ============================================================================

-- Ensure category_id is a valid UUID format
ALTER TABLE business_service_categories
ADD CONSTRAINT check_valid_category_id 
CHECK (category_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

-- Ensure both IDs are valid UUID formats in subcategories table
ALTER TABLE business_service_subcategories
ADD CONSTRAINT check_valid_subcategory_category_id 
CHECK (category_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

ALTER TABLE business_service_subcategories
ADD CONSTRAINT check_valid_subcategory_id 
CHECK (subcategory_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

-- ============================================================================
-- 4. Add/Verify Foreign Key Constraints
-- ============================================================================

-- Add foreign key for business_service_categories if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_business_service_categories_category'
    ) THEN
        ALTER TABLE business_service_categories
        ADD CONSTRAINT fk_business_service_categories_category
        FOREIGN KEY (category_id) 
        REFERENCES service_categories(id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign keys for business_service_subcategories if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_business_service_subcategories_category'
    ) THEN
        ALTER TABLE business_service_subcategories
        ADD CONSTRAINT fk_business_service_subcategories_category
        FOREIGN KEY (category_id) 
        REFERENCES service_categories(id)
        ON DELETE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_business_service_subcategories_subcategory'
    ) THEN
        ALTER TABLE business_service_subcategories
        ADD CONSTRAINT fk_business_service_subcategories_subcategory
        FOREIGN KEY (subcategory_id) 
        REFERENCES service_subcategories(id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- ============================================================================
-- 5. Verify Constraints
-- ============================================================================

-- List all constraints on business_service_categories
SELECT
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'business_service_categories'::regclass
ORDER BY contype, conname;

-- List all constraints on business_service_subcategories
SELECT
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'business_service_subcategories'::regclass
ORDER BY contype, conname;

-- ============================================================================
-- 6. Final Data Integrity Check
-- ============================================================================

-- Verify all business_service_categories have valid relationships
SELECT 
    bsc.id,
    bsc.business_id,
    bsc.category_id,
    sc.service_category_type,
    bsc.is_active
FROM business_service_categories bsc
INNER JOIN service_categories sc ON bsc.category_id = sc.id
WHERE bsc.is_active = true
ORDER BY sc.service_category_type;

-- Verify all business_service_subcategories have valid relationships
SELECT 
    bss.id,
    bss.business_id,
    bss.category_id,
    bss.subcategory_id,
    sc.service_category_type,
    ss.service_subcategory_type,
    bss.is_active
FROM business_service_subcategories bss
INNER JOIN service_categories sc ON bss.category_id = sc.id
INNER JOIN service_subcategories ss ON bss.subcategory_id = ss.id
WHERE bss.is_active = true
ORDER BY sc.service_category_type, ss.service_subcategory_type;

-- ============================================================================
-- NOTES:
-- ============================================================================
-- After running this script:
-- 1. NULL values will be rejected for category_id and subcategory_id
-- 2. Invalid UUID formats will be rejected
-- 3. Invalid foreign key references will be rejected (orphaned records prevented)
-- 4. These constraints will be enforced at the database level for all future inserts/updates
-- 
-- This prevents the data quality issues that caused the API errors.
-- ============================================================================
