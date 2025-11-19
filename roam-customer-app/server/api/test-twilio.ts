import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { createTwilioConversationsService } from '@roam/shared/dist/services/twilio/TwilioConversationsService.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Test Twilio service availability
    const twilioService = createTwilioConversationsService();
    const isAvailable = !!twilioService;
    
    if (!isAvailable) {
      return res.status(500).json({ 
        error: 'Twilio messaging service not available',
        details: 'Check environment variables: VITE_TWILIO_ACCOUNT_SID, VITE_TWILIO_AUTH_TOKEN, VITE_TWILIO_CONVERSATIONS_SERVICE_SID'
      });
    }

    // Test database connection
    const supabase = createClient(
      process.env.VITE_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if conversation tables exist
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['conversation_metadata', 'conversation_participants']);

    if (tablesError) {
      return res.status(500).json({ 
        error: 'Database connection failed',
        details: tablesError.message
      });
    }

    const existingTables = tables?.map(t => t.table_name) || [];
    const requiredTables = ['conversation_metadata', 'conversation_participants'];
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));

    return res.status(200).json({
      status: 'success',
      twilio: {
        available: isAvailable,
        account_sid: process.env.VITE_TWILIO_ACCOUNT_SID ? 'configured' : 'missing',
        auth_token: process.env.VITE_TWILIO_AUTH_TOKEN ? 'configured' : 'missing',
        conversations_service_sid: process.env.VITE_TWILIO_CONVERSATIONS_SERVICE_SID ? 'configured' : 'missing'
      },
      database: {
        connected: true,
        tables: {
          existing: existingTables,
          missing: missingTables,
          all_present: missingTables.length === 0
        }
      },
      environment: {
        supabase_url: process.env.VITE_PUBLIC_SUPABASE_URL ? 'configured' : 'missing',
        supabase_service_key: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'configured' : 'missing'
      }
    });

  } catch (error) {
    console.error('Twilio test error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}