-- ROAM Platform Seed Data
-- This file seeds the database with test data for local development

-- ==========================================
-- ADMIN USER SETUP INSTRUCTIONS
-- ==========================================
-- Since auth.users is managed by Supabase Auth, you need to create the admin user manually:
-- 
-- 1. Go to your Supabase Dashboard > Authentication > Users
-- 2. Click "Invite a user" or "Add user"
-- 3. Email: admin@roam.local
-- 4. Password: admin123!
-- 5. Confirm email: true
-- 6. Copy the user ID from the dashboard
-- 7. Run the following SQL with the actual user ID:
-- 
-- INSERT INTO user_roles (user_id, role, granted_by, is_active) 
-- VALUES ('YOUR_USER_ID_HERE', 'admin', 'YOUR_USER_ID_HERE', true);

-- ==========================================
-- SAMPLE ANNOUNCEMENTS
-- ==========================================
-- Add some sample announcements for testing

INSERT INTO announcements (title, content, is_active, announcement_audience, announcement_type, start_date, end_date) VALUES
('Welcome to ROAM Platform', 'Welcome to the ROAM Platform! We are excited to have you on board.', true, 'all', 'general', NULL, NULL),
('System Maintenance Scheduled', 'We will be performing system maintenance on Saturday from 2 AM to 4 AM EST. During this time, the platform may be temporarily unavailable.', true, 'all', 'maintenance', CURRENT_DATE + INTERVAL '7 days', CURRENT_DATE + INTERVAL '8 days'),
('New Feature: Advanced Search', 'We have launched a new advanced search feature that allows you to filter services by location, price, and availability.', true, 'customer', 'feature', NULL, NULL),
('Provider Training Workshop', 'Join us for a comprehensive training workshop designed for service providers. Learn best practices and platform features.', true, 'provider', 'update', NULL, CURRENT_DATE + INTERVAL '30 days'),
('Security Update Complete', 'We have successfully completed our security updates. Your data is now even more secure with enhanced encryption.', true, 'all', 'update', NULL, NULL),
('Holiday Promotion Available', 'Special holiday pricing is now available! Contact customer service for details on seasonal discounts.', true, 'customer', 'promotional', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days'),
('Staff Alert: New Policy', 'All staff members must review the updated privacy policy by the end of this month.', true, 'staff', 'alert', NULL, CURRENT_DATE + INTERVAL '15 days'),
('Platform News: User Milestone', 'We are proud to announce that we have reached 10,000 active users on the ROAM Platform!', true, 'all', 'news', NULL, NULL);

-- ==========================================
-- SAMPLE BUSINESS PROFILES (if needed)
-- ==========================================
-- Uncomment and modify if you need test business data

-- INSERT INTO business_profiles (business_name, business_type, contact_email, phone, verification_status, is_active) VALUES
-- ('Test Cleaning Service', 'cleaning', 'test@cleaningservice.com', '+1234567890', 'verified', true),
-- ('Sample Moving Company', 'moving', 'contact@movingco.com', '+1987654321', 'pending', true),
-- ('Demo Handyman Services', 'handyman', 'info@handyman.com', '+1555123456', 'verified', true);

-- ==========================================
-- HELPFUL FUNCTIONS FOR TESTING
-- ==========================================

-- Function to create a test admin user (call this after creating the auth user)
CREATE OR REPLACE FUNCTION create_test_admin(user_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_id UUID;
BEGIN
    -- Get user ID from auth.users by email
    SELECT id INTO user_id 
    FROM auth.users 
    WHERE email = user_email;
    
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found in auth.users', user_email;
    END IF;
    
    -- Insert admin role
    INSERT INTO user_roles (user_id, role, granted_by, is_active) 
    VALUES (user_id, 'admin', user_id, true)
    ON CONFLICT (user_id, role, business_id) DO NOTHING;
    
    RAISE NOTICE 'Created admin role for user %', user_email;
    RETURN user_id;
END;
$$;

-- Function to check if user has admin access
CREATE OR REPLACE FUNCTION is_admin(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = check_user_id 
        AND role = 'admin' 
        AND is_active = true
    );
END;
$$;

-- ==========================================
-- VERIFICATION QUERIES
-- ==========================================

-- Query to check announcements
-- SELECT COUNT(*) as announcement_count FROM announcements;

-- Query to check admin users
-- SELECT u.email, ur.role, ur.is_active 
-- FROM auth.users u 
-- JOIN user_roles ur ON u.id = ur.user_id 
-- WHERE ur.role = 'admin';

-- ==========================================
-- POST-SEED INSTRUCTIONS
-- ==========================================
-- After running this seed file:
-- 
-- 1. Create the admin user in Supabase Dashboard:
--    Email: admin@roam.local
--    Password: admin123!
-- 
-- 2. Run this SQL to give admin permissions:
--    SELECT create_test_admin('admin@roam.local');
-- 
-- 3. Test login with:
--    Email: admin@roam.local
--    Password: admin123!
-- 
-- 4. Verify announcements are visible in the admin panel
