import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { conversationId, userId } = req.body;

    console.log('📖 [Provider] mark-messages-read API called:', { 
      conversationId, 
      userId,
      hasBody: !!req.body,
      bodyKeys: Object.keys(req.body || {})
    });

    if (!conversationId || !userId) {
      console.error('❌ Missing required fields:', { conversationId, userId });
      return res.status(400).json({ 
        error: 'Missing required fields: conversationId and userId' 
      });
    }

    // Get environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl) {
      console.error('❌ Missing Supabase URL');
      return res.status(500).json({ 
        error: 'Server configuration error',
        details: 'Missing Supabase URL'
      });
    }

    // Prefer service key, but fallback to anon key
    const supabaseKey = supabaseServiceKey || supabaseAnonKey;
    
    if (!supabaseKey) {
      console.error('❌ No Supabase key available', {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey,
        hasAnonKey: !!supabaseAnonKey
      });
      return res.status(500).json({ 
        error: 'Server configuration error',
        details: 'Missing Supabase credentials'
      });
    }

    console.log('🔑 Using Supabase key:', {
      usingServiceKey: !!supabaseServiceKey,
      usingAnonKey: !supabaseServiceKey && !!supabaseAnonKey
    });

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // conversationId could be either:
    // 1. A Twilio conversation SID (starts with "CH")
    // 2. A conversation metadata UUID
    // We need to convert Twilio SID to metadata UUID if needed
    let metadataId = conversationId;
    
    if (conversationId.startsWith('CH')) {
      console.log('🔍 Looking up conversation metadata UUID for Twilio SID:', conversationId);
      const { data: metadata, error: lookupError } = await supabase
        .from('conversation_metadata')
        .select('id')
        .eq('twilio_conversation_sid', conversationId)
        .single();
      
      if (lookupError || !metadata) {
        console.error('❌ Failed to find conversation metadata for Twilio SID:', conversationId, lookupError);
        return res.status(404).json({ 
          error: 'Conversation not found',
          details: 'Could not find conversation metadata for the provided conversation ID'
        });
      }
      
      metadataId = metadata.id;
      console.log('✅ Found metadata UUID:', metadataId);
    }

    // Update all unread message notifications for this user in this conversation
    console.log('📝 Attempting to mark messages as read:', { 
      originalId: conversationId,
      metadataId, 
      userId,
      timestamp: new Date().toISOString()
    });
    
    const { data, error } = await supabase
      .from('message_notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('conversation_id', metadataId)
      .eq('user_id', userId)
      .eq('is_read', false)
      .select();

    if (error) {
      console.error('❌ Supabase error marking messages as read:', {
        error,
        errorMessage: error.message,
        errorDetails: error.details,
        errorHint: error.hint,
        conversationId,
        userId
      });
      return res.status(500).json({ 
        error: 'Failed to mark messages as read',
        details: error.message,
        hint: error.hint
      });
    }

    console.log('✅ Successfully marked messages as read:', { 
      count: data?.length || 0,
      conversationId,
      userId,
      updatedRecords: data
    });

    return res.status(200).json({ 
      success: true,
      message: 'Messages marked as read',
      count: data?.length || 0
    });
  } catch (error: any) {
    console.error('❌ Caught error in markMessagesAsRead:', {
      error,
      errorMessage: error?.message,
      errorStack: error?.stack,
      errorName: error?.name,
      conversationId: req.body?.conversationId,
      userId: req.body?.userId
    });
    
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error?.message || 'Unknown error',
      errorType: error?.name || 'Error'
    });
  }
}

