-- Disable RLS on customer_favorite_businesses table
-- Access control is enforced at the application level (useBusinessFavorites hook validates customer.id)

-- Drop any existing policies
DROP POLICY IF EXISTS "customer_favorite_businesses_select_own" ON customer_favorite_businesses;
DROP POLICY IF EXISTS "customer_favorite_businesses_insert_own" ON customer_favorite_businesses;
DROP POLICY IF EXISTS "customer_favorite_businesses_delete_own" ON customer_favorite_businesses;

-- Disable RLS
ALTER TABLE customer_favorite_businesses DISABLE ROW LEVEL SECURITY;

-- Add comment explaining the decision
COMMENT ON TABLE customer_favorite_businesses IS 'Customer favorite businesses. RLS disabled as access control is enforced at application level via useBusinessFavorites hook.';
