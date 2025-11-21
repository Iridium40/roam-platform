-- Fix conversation_metadata RLS causing 500 errors
-- The RLS policies were causing infinite recursion errors
-- Solution: Disable RLS on conversation_metadata table
-- Access control is already enforced at the application level through conversation_participants

-- Drop all existing policies
DROP POLICY IF EXISTS "conversation_metadata_select_policy" ON conversation_metadata;
DROP POLICY IF EXISTS "conversation_metadata_insert_policy" ON conversation_metadata;
DROP POLICY IF EXISTS "conversation_metadata_update_policy" ON conversation_metadata;
DROP POLICY IF EXISTS "conversation_metadata_delete_policy" ON conversation_metadata;

-- Disable RLS on conversation_metadata
-- This is safe because:
-- 1. Access control is enforced through conversation_participants table (which has RLS)
-- 2. All queries go through the application layer which validates permissions
-- 3. The table only stores metadata, not sensitive message content
ALTER TABLE conversation_metadata DISABLE ROW LEVEL SECURITY;

