import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * Mark all messages in a conversation as read for a specific user
 * This clears the unread message counter
 */
export async function markMessagesAsRead(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { conversationId, userId } = req.body;

    if (!conversationId || !userId) {
      return res.status(400).json({ 
        error: 'Missing required fields: conversationId and userId' 
      });
    }

    // Get environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase environment variables');
      return res.status(500).json({ 
        error: 'Server configuration error',
        details: 'Missing Supabase credentials'
      });
    }

    // Create Supabase client (using anon key since RLS is disabled on message_notifications)
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update all unread message notifications for this user in this conversation
    const { error } = await supabase
      .from('message_notifications')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking messages as read:', error);
      return res.status(500).json({ 
        error: 'Failed to mark messages as read',
        details: error.message 
      });
    }

    return res.status(200).json({ 
      success: true,
      message: 'Messages marked as read' 
    });
  } catch (error: any) {
    console.error('Error in markMessagesAsRead:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

