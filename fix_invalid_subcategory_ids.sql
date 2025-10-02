-- Fix Invalid Subcategory IDs in business_service_subcategories
-- Issue: Some records have 'null' string instead of actual NULL or valid UUIDs

-- 1. Check for invalid subcategory_id values
SELECT 
    id,
    business_id,
    subcategory_id,
    category_id,
    is_active
FROM business_service_subcategories
WHERE subcategory_id IS NULL 
   OR subcategory_id::text = 'null'
   OR NOT (subcategory_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

-- 2. Option A: Delete invalid records (RECOMMENDED)
-- Removes rows with invalid subcategory_id values
DELETE FROM business_service_subcategories
WHERE subcategory_id IS NULL 
   OR subcategory_id::text = 'null'
   OR NOT (subcategory_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

-- 3. Option B: Set to inactive instead of deleting (SAFER)
-- Keeps the records but marks them as inactive
UPDATE business_service_subcategories
SET is_active = false
WHERE (
    subcategory_id IS NULL 
    OR subcategory_id::text = 'null'
    OR NOT (subcategory_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
)
AND is_active = true;

-- 4. Check service_subcategories table for valid IDs
-- This helps identify which subcategories actually exist
SELECT 
    id,
    service_subcategory_type,
    category_id
FROM service_subcategories
WHERE is_active = true
ORDER BY service_subcategory_type;

-- 5. Verify the fix
-- Should return 0 rows after cleanup
SELECT COUNT(*) as invalid_count
FROM business_service_subcategories
WHERE subcategory_id IS NULL 
   OR subcategory_id::text = 'null'
   OR NOT (subcategory_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

-- 6. Check for orphaned records (subcategory_id doesn't exist in service_subcategories)
SELECT 
    bsc.id,
    bsc.business_id,
    bsc.subcategory_id,
    bsc.category_id
FROM business_service_subcategories bsc
LEFT JOIN service_subcategories ss ON bsc.subcategory_id = ss.id
WHERE ss.id IS NULL
  AND bsc.is_active = true;

-- 7. Clean up orphaned records (if any)
UPDATE business_service_subcategories bsc
SET is_active = false
FROM (
    SELECT bsc.id
    FROM business_service_subcategories bsc
    LEFT JOIN service_subcategories ss ON bsc.subcategory_id = ss.id
    WHERE ss.id IS NULL
      AND bsc.is_active = true
) AS orphaned
WHERE business_service_subcategories.id = orphaned.id;

-- 8. Final verification query
-- This should return only valid, active approvals
SELECT 
    bsc.id,
    bsc.business_id,
    bp.business_name,
    bsc.subcategory_id,
    ss.service_subcategory_type,
    sc.service_category_type,
    bsc.is_active
FROM business_service_subcategories bsc
INNER JOIN business_profiles bp ON bsc.business_id = bp.id
INNER JOIN service_subcategories ss ON bsc.subcategory_id = ss.id
INNER JOIN service_categories sc ON ss.category_id = sc.id
WHERE bsc.is_active = true
ORDER BY bp.business_name, sc.service_category_type, ss.service_subcategory_type;
