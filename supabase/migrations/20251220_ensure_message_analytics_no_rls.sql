-- Ensure message_analytics table has RLS disabled for analytics service access
-- This table is updated by backend services only, not directly by users
-- Access control is already enforced at the API level

-- Disable RLS if not already disabled
ALTER TABLE message_analytics DISABLE ROW LEVEL SECURITY;

-- Add comment explaining the decision
COMMENT ON TABLE message_analytics IS 'Message analytics aggregation table. RLS disabled as updates are performed by backend analytics service with service role key. Access control enforced at API level.';

