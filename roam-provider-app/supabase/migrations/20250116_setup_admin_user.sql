-- Setup existing admin user with proper roles
-- This ensures admin@roamyourbestlife.com has admin access

-- Function to setup admin role for existing user
CREATE OR REPLACE FUNCTION setup_admin_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Get the user ID for the admin email
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = 'admin@roamyourbestlife.com';
    
    -- Check if user exists
    IF admin_user_id IS NULL THEN
        RAISE NOTICE 'Admin user admin@roamyourbestlife.com not found in auth.users';
        RETURN;
    END IF;
    
    -- Insert or update admin role (use ON CONFLICT to handle existing records)
    INSERT INTO user_roles (user_id, role, granted_by, is_active, created_at) 
    VALUES (admin_user_id, 'admin', admin_user_id, true, NOW())
    ON CONFLICT (user_id, role, business_id) 
    DO UPDATE SET 
        is_active = true,
        updated_at = NOW();
    
    RAISE NOTICE 'Admin role setup completed for user: %', admin_user_id;
END;
$$;

-- Execute the function to setup the admin user
SELECT setup_admin_user();

-- Verify the setup
DO $$
DECLARE
    admin_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO admin_count 
    FROM user_roles ur
    JOIN auth.users u ON ur.user_id = u.id
    WHERE u.email = 'admin@roamyourbestlife.com' 
    AND ur.role = 'admin' 
    AND ur.is_active = true;
    
    IF admin_count > 0 THEN
        RAISE NOTICE 'Success: Admin user is properly configured with % admin role(s)', admin_count;
    ELSE
        RAISE NOTICE 'Warning: Admin user role not found or not active';
    END IF;
END;
$$;

-- Drop the temporary function
DROP FUNCTION IF EXISTS setup_admin_user();
