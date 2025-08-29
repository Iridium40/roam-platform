-- Fix RLS policies for announcements to allow development access
-- This ensures the admin panel can fetch announcements even without authentication

-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read active announcements" ON announcements;
DROP POLICY IF EXISTS "Allow admins to read all announcements" ON announcements;
DROP POLICY IF EXISTS "Allow admins to insert announcements" ON announcements;
DROP POLICY IF EXISTS "Allow admins to update announcements" ON announcements;
DROP POLICY IF EXISTS "Allow admins to delete announcements" ON announcements;

-- Create more permissive policies for development

-- Allow anyone to read announcements (for development/demo purposes)
CREATE POLICY "Allow public read access to announcements" ON announcements
    FOR SELECT
    USING (true);

-- Allow authenticated users to manage announcements (more permissive for development)
CREATE POLICY "Allow authenticated users to manage announcements" ON announcements
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- Alternative: If you want stricter control, uncomment the admin-only policies below
-- and comment out the policies above

-- CREATE POLICY "Allow admins full access to announcements" ON announcements
--     FOR ALL TO authenticated
--     USING (
--         EXISTS (
--             SELECT 1 FROM user_roles 
--             WHERE user_id = auth.uid() 
--             AND role = 'admin' 
--             AND is_active = true
--         )
--     )
--     WITH CHECK (
--         EXISTS (
--             SELECT 1 FROM user_roles 
--             WHERE user_id = auth.uid() 
--             AND role = 'admin' 
--             AND is_active = true
--         )
--     );

-- Ensure RLS is enabled
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Add a comment about the policy
COMMENT ON POLICY "Allow public read access to announcements" ON announcements 
IS 'Development policy - allows public read access to announcements. Tighten in production.';

COMMENT ON POLICY "Allow authenticated users to manage announcements" ON announcements 
IS 'Development policy - allows authenticated users to manage announcements. Restrict to admins in production.';
