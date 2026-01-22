-- Migration: Add Event category and Photography/Live Music subcategories
-- Date: 2026-01-22
-- Description: Adds new enum values for Event service category and related subcategories

-- Add 'event' to service_category_types enum
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'event' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'service_category_types')
    ) THEN
        ALTER TYPE service_category_types ADD VALUE 'event';
    END IF;
END $$;

-- Add 'photography' to service_subcategory_types enum
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'photography' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'service_subcategory_types')
    ) THEN
        ALTER TYPE service_subcategory_types ADD VALUE 'photography';
    END IF;
END $$;

-- Add 'live_music' to service_subcategory_types enum
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'live_music' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'service_subcategory_types')
    ) THEN
        ALTER TYPE service_subcategory_types ADD VALUE 'live_music';
    END IF;
END $$;

-- Note: After running this migration, you need to:
-- 1. Insert a record into service_categories with service_category_type = 'event'
-- 2. Insert records into service_subcategories with service_subcategory_type = 'photography' and 'live_music'
--    (make sure to set the category_id to the Event category's id)

-- Example inserts (uncomment if the records don't exist yet):
/*
-- Insert Event category
INSERT INTO service_categories (id, service_category_type, description, sort_order, is_active)
VALUES (
    gen_random_uuid(),
    'event',
    'Event services including photography, music, and entertainment',
    5,
    true
)
ON CONFLICT DO NOTHING;

-- Get the Event category ID and insert subcategories
WITH event_cat AS (
    SELECT id FROM service_categories WHERE service_category_type = 'event' LIMIT 1
)
INSERT INTO service_subcategories (id, category_id, service_subcategory_type, description, is_active)
SELECT 
    gen_random_uuid(),
    event_cat.id,
    subcat.type,
    subcat.description,
    true
FROM event_cat, (
    VALUES 
        ('photography', 'Professional photography services'),
        ('live_music', 'Live music and entertainment services')
) AS subcat(type, description)
ON CONFLICT DO NOTHING;
*/
