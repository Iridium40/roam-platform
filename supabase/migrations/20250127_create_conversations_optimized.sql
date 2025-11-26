-- Conversations Optimization for Messages Page
-- Eliminates N+1 Twilio API calls by storing last message in database

-- ============================================================================
-- 1. Add last_message columns to conversation_metadata table
-- ============================================================================

-- Add columns to store last message (avoid Twilio API calls)
ALTER TABLE conversation_metadata 
ADD COLUMN IF NOT EXISTS last_message_body TEXT,
ADD COLUMN IF NOT EXISTS last_message_author TEXT,
ADD COLUMN IF NOT EXISTS last_message_author_name TEXT,
ADD COLUMN IF NOT EXISTS last_message_timestamp TIMESTAMPTZ;

-- Add index for sorting by last message
CREATE INDEX IF NOT EXISTS idx_conversation_metadata_last_message 
  ON conversation_metadata(last_message_at DESC NULLS LAST);


-- ============================================================================
-- 2. Create optimized conversations view with all data pre-joined
-- ============================================================================

CREATE OR REPLACE VIEW provider_conversations_enriched AS
SELECT 
  cm.id AS metadata_id,
  cm.booking_id,
  cm.twilio_conversation_sid,
  cm.conversation_type,
  cm.participant_count,
  cm.is_active,
  cm.created_at,
  cm.updated_at,
  cm.last_message_at,
  
  -- Last message (stored in DB, no Twilio API needed)
  cm.last_message_body,
  cm.last_message_author,
  cm.last_message_author_name,
  cm.last_message_timestamp,
  
  -- Booking info
  b.id AS booking_id_ref,
  b.booking_date,
  b.booking_status,
  b.business_id,
  b.provider_id,
  
  -- Service info
  s.name AS service_name,
  
  -- Customer info
  cp.id AS customer_id,
  cp.user_id AS customer_user_id,
  cp.first_name AS customer_first_name,
  cp.last_name AS customer_last_name,
  cp.email AS customer_email,
  cp.image_url AS customer_image_url,
  
  -- Provider info
  p.id AS provider_id_ref,
  p.user_id AS provider_user_id,
  p.first_name AS provider_first_name,
  p.last_name AS provider_last_name,
  p.email AS provider_email,
  p.provider_role,
  p.image_url AS provider_image_url

FROM conversation_metadata cm
LEFT JOIN bookings b ON cm.booking_id = b.id
LEFT JOIN services s ON b.service_id = s.id
LEFT JOIN customer_profiles cp ON b.customer_id = cp.id
LEFT JOIN providers p ON b.provider_id = p.id
WHERE cm.is_active = true;

-- Grant access
GRANT SELECT ON provider_conversations_enriched TO authenticated;
GRANT SELECT ON provider_conversations_enriched TO service_role;

COMMENT ON VIEW provider_conversations_enriched IS 
'Pre-joined conversations view with booking, customer, provider, and last message data.
Eliminates N+1 queries and Twilio API calls for listing conversations.';


-- ============================================================================
-- 3. Create function to get conversations with unread counts
-- ============================================================================

CREATE OR REPLACE FUNCTION get_provider_conversations(
  p_user_id UUID,
  p_user_type TEXT,  -- 'customer', 'provider', 'owner', 'dispatcher'
  p_business_id UUID DEFAULT NULL,
  p_provider_id UUID DEFAULT NULL,  -- For providers, filter to their assigned bookings
  p_unread_only BOOLEAN DEFAULT FALSE,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  conversation JSONB,
  unread_count BIGINT,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_count BIGINT;
  v_provider_types TEXT[] := ARRAY['provider', 'owner', 'dispatcher'];
BEGIN
  -- First get total count
  SELECT COUNT(DISTINCT pce.metadata_id)
  INTO v_total_count
  FROM provider_conversations_enriched pce
  JOIN conversation_participants cp ON cp.conversation_id = pce.metadata_id
  LEFT JOIN (
    SELECT conversation_id, COUNT(*) as cnt
    FROM message_notifications
    WHERE user_id = p_user_id AND is_read = false
    GROUP BY conversation_id
  ) mn ON mn.conversation_id = pce.metadata_id
  WHERE cp.user_id = p_user_id
    AND cp.is_active = true
    AND (
      -- Provider-side users match any provider role type
      (p_user_type = ANY(v_provider_types) AND cp.user_type = ANY(v_provider_types))
      OR 
      -- Customers match exactly
      (p_user_type = 'customer' AND cp.user_type = 'customer')
    )
    AND (p_business_id IS NULL OR pce.business_id = p_business_id)
    AND (p_provider_id IS NULL OR pce.provider_id = p_provider_id)
    AND (NOT p_unread_only OR COALESCE(mn.cnt, 0) > 0);

  -- Return paginated results with unread counts
  RETURN QUERY
  SELECT 
    jsonb_build_object(
      'metadataId', pce.metadata_id,
      'bookingId', pce.booking_id,
      'twilioConversationSid', pce.twilio_conversation_sid,
      'conversationType', pce.conversation_type,
      'participantCount', pce.participant_count,
      'isActive', pce.is_active,
      'createdAt', pce.created_at,
      'updatedAt', pce.updated_at,
      'lastMessageAt', pce.last_message_at,
      'lastMessage', CASE 
        WHEN pce.last_message_body IS NOT NULL THEN
          jsonb_build_object(
            'body', pce.last_message_body,
            'author', pce.last_message_author,
            'authorName', pce.last_message_author_name,
            'timestamp', pce.last_message_timestamp
          )
        ELSE NULL
      END,
      'booking', jsonb_build_object(
        'id', pce.booking_id_ref,
        'booking_date', pce.booking_date,
        'booking_status', pce.booking_status,
        'service_name', pce.service_name,
        'business_id', pce.business_id,
        'customer_profiles', CASE 
          WHEN pce.customer_id IS NOT NULL THEN
            jsonb_build_object(
              'id', pce.customer_id,
              'user_id', pce.customer_user_id,
              'first_name', pce.customer_first_name,
              'last_name', pce.customer_last_name,
              'email', pce.customer_email,
              'image_url', pce.customer_image_url
            )
          ELSE NULL
        END,
        'providers', CASE 
          WHEN pce.provider_id_ref IS NOT NULL THEN
            jsonb_build_object(
              'id', pce.provider_id_ref,
              'user_id', pce.provider_user_id,
              'first_name', pce.provider_first_name,
              'last_name', pce.provider_last_name,
              'email', pce.provider_email,
              'provider_role', pce.provider_role,
              'image_url', pce.provider_image_url
            )
          ELSE NULL
        END
      )
    ) AS conversation,
    COALESCE(mn.cnt, 0)::BIGINT AS unread_count,
    v_total_count AS total_count
  FROM provider_conversations_enriched pce
  JOIN conversation_participants cp ON cp.conversation_id = pce.metadata_id
  LEFT JOIN (
    SELECT conversation_id, COUNT(*) as cnt
    FROM message_notifications
    WHERE user_id = p_user_id AND is_read = false
    GROUP BY conversation_id
  ) mn ON mn.conversation_id = pce.metadata_id
  WHERE cp.user_id = p_user_id
    AND cp.is_active = true
    AND (
      (p_user_type = ANY(v_provider_types) AND cp.user_type = ANY(v_provider_types))
      OR 
      (p_user_type = 'customer' AND cp.user_type = 'customer')
    )
    AND (p_business_id IS NULL OR pce.business_id = p_business_id)
    AND (p_provider_id IS NULL OR pce.provider_id = p_provider_id)
    AND (NOT p_unread_only OR COALESCE(mn.cnt, 0) > 0)
  ORDER BY pce.last_message_at DESC NULLS LAST, pce.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_provider_conversations TO authenticated;
GRANT EXECUTE ON FUNCTION get_provider_conversations TO service_role;

COMMENT ON FUNCTION get_provider_conversations IS 
'Returns paginated conversations with unread counts in a single query.
Eliminates N+1 queries for unread counts and Twilio API calls for last messages.';


-- ============================================================================
-- 4. Function to update last message (called when new message arrives)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_conversation_last_message(
  p_conversation_id UUID,
  p_message_body TEXT,
  p_author TEXT,
  p_author_name TEXT DEFAULT NULL,
  p_timestamp TIMESTAMPTZ DEFAULT NOW()
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE conversation_metadata
  SET 
    last_message_body = p_message_body,
    last_message_author = p_author,
    last_message_author_name = p_author_name,
    last_message_timestamp = p_timestamp,
    last_message_at = p_timestamp
  WHERE id = p_conversation_id;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_conversation_last_message TO authenticated;
GRANT EXECUTE ON FUNCTION update_conversation_last_message TO service_role;

COMMENT ON FUNCTION update_conversation_last_message IS 
'Updates the cached last message for a conversation. 
Call this whenever a new message is sent to avoid Twilio API calls when listing conversations.';


-- ============================================================================
-- 5. Quick stats function for conversations
-- ============================================================================

CREATE OR REPLACE FUNCTION get_conversation_counts(
  p_user_id UUID,
  p_user_type TEXT,
  p_business_id UUID DEFAULT NULL
)
RETURNS TABLE (
  total_conversations BIGINT,
  unread_conversations BIGINT,
  total_unread_messages BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  WITH user_conversations AS (
    SELECT DISTINCT cm.id
    FROM conversation_metadata cm
    JOIN conversation_participants cp ON cp.conversation_id = cm.id
    WHERE cp.user_id = p_user_id
      AND cp.is_active = true
      AND cm.is_active = true
      AND (
        (p_user_type IN ('provider', 'owner', 'dispatcher') AND cp.user_type IN ('provider', 'owner', 'dispatcher'))
        OR
        (p_user_type = 'customer' AND cp.user_type = 'customer')
      )
  ),
  unread_stats AS (
    SELECT 
      COUNT(DISTINCT mn.conversation_id) as unread_convs,
      COUNT(*) as unread_msgs
    FROM message_notifications mn
    JOIN user_conversations uc ON mn.conversation_id = uc.id
    WHERE mn.user_id = p_user_id AND mn.is_read = false
  )
  SELECT 
    (SELECT COUNT(*) FROM user_conversations)::BIGINT,
    COALESCE(us.unread_convs, 0)::BIGINT,
    COALESCE(us.unread_msgs, 0)::BIGINT
  FROM unread_stats us;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_conversation_counts TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversation_counts TO service_role;


-- ============================================================================
-- 6. Add indexes for better query performance
-- ============================================================================

-- Index for conversation participants lookup
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_active 
  ON conversation_participants(user_id, is_active) 
  WHERE is_active = true;

-- Index for message notifications unread count
CREATE INDEX IF NOT EXISTS idx_message_notifications_user_unread 
  ON message_notifications(user_id, conversation_id) 
  WHERE is_read = false;

-- Index for booking-based filtering
CREATE INDEX IF NOT EXISTS idx_conversation_metadata_booking 
  ON conversation_metadata(booking_id) 
  WHERE is_active = true;

