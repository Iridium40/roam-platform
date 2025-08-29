-- Create announcements table and related enums
-- This table manages platform-wide announcements for different audiences

-- Create enum for announcement audiences
CREATE TYPE announcement_audience AS ENUM (
    'customer',
    'provider', 
    'all',
    'staff'
);

-- Create enum for announcement types
CREATE TYPE announcement_type AS ENUM (
    'general',
    'maintenance',
    'promotional',
    'update',
    'alert',
    'feature',
    'news'
);

-- Create announcements table
CREATE TABLE announcements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    start_date DATE,
    end_date DATE,
    announcement_audience announcement_audience DEFAULT 'all',
    announcement_type announcement_type DEFAULT 'general',
    
    -- Ensure end_date is after start_date if both are specified
    CONSTRAINT check_date_order CHECK (
        start_date IS NULL OR 
        end_date IS NULL OR 
        end_date >= start_date
    )
);

-- Create indexes for better query performance
CREATE INDEX idx_announcements_is_active ON announcements(is_active);
CREATE INDEX idx_announcements_audience ON announcements(announcement_audience);
CREATE INDEX idx_announcements_type ON announcements(announcement_type);
CREATE INDEX idx_announcements_start_date ON announcements(start_date);
CREATE INDEX idx_announcements_end_date ON announcements(end_date);
CREATE INDEX idx_announcements_created_at ON announcements(created_at);

-- Add composite index for active announcements by audience
CREATE INDEX idx_announcements_active_audience ON announcements(is_active, announcement_audience) 
WHERE is_active = true;

-- Enable Row Level Security
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Allow all authenticated users to read active announcements
CREATE POLICY "Allow authenticated users to read active announcements" ON announcements
    FOR SELECT TO authenticated
    USING (is_active = true);

-- Allow admins to read all announcements
CREATE POLICY "Allow admins to read all announcements" ON announcements
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin' 
            AND is_active = true
        )
    );

-- Allow admins to insert announcements
CREATE POLICY "Allow admins to insert announcements" ON announcements
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin' 
            AND is_active = true
        )
    );

-- Allow admins to update announcements
CREATE POLICY "Allow admins to update announcements" ON announcements
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin' 
            AND is_active = true
        )
    );

-- Allow admins to delete announcements
CREATE POLICY "Allow admins to delete announcements" ON announcements
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin' 
            AND is_active = true
        )
    );

-- Create function to clean up expired announcements (optional maintenance)
CREATE OR REPLACE FUNCTION cleanup_expired_announcements()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Mark announcements as inactive if they've passed their end date
    UPDATE announcements 
    SET is_active = false 
    WHERE is_active = true 
    AND end_date IS NOT NULL 
    AND end_date < CURRENT_DATE;
    
    -- Log the cleanup
    RAISE NOTICE 'Cleaned up expired announcements';
END;
$$;

-- Add trigger to automatically update updated_at timestamp (if you add this column later)
-- CREATE OR REPLACE FUNCTION update_updated_at_column()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     NEW.updated_at = NOW();
--     RETURN NEW;
-- END;
-- $$ language 'plpgsql';

-- CREATE TRIGGER update_announcements_updated_at 
--     BEFORE UPDATE ON announcements 
--     FOR EACH ROW 
--     EXECUTE FUNCTION update_updated_at_column();

-- Add helpful comments
COMMENT ON TABLE announcements IS 'Platform-wide announcements for different user audiences';
COMMENT ON COLUMN announcements.announcement_audience IS 'Target audience for the announcement';
COMMENT ON COLUMN announcements.announcement_type IS 'Category/type of announcement';
COMMENT ON COLUMN announcements.start_date IS 'Optional date when announcement becomes active';
COMMENT ON COLUMN announcements.end_date IS 'Optional date when announcement expires';
