import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { userId } = req.method === 'GET' ? req.query : req.body;

    if (!userId) {
      return res.status(400).json({ 
        error: 'User ID is required',
        code: 'MISSING_USER_ID'
      });
    }

    if (req.method === 'GET') {
      // Fetch user settings
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId as string)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user settings:', error);
        return res.status(500).json({ 
          error: 'Failed to fetch user settings',
          details: error.message,
          code: 'FETCH_ERROR'
        });
      }

      return res.status(200).json({ 
        success: true, 
        data: data || null
      });
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      // Upsert user settings
      const settings = req.body;
      const { userId: bodyUserId, ...settingsData } = settings;

      if (bodyUserId !== userId) {
        return res.status(400).json({ 
          error: 'User ID mismatch',
          code: 'USER_ID_MISMATCH'
        });
      }

      const { data, error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: userId as string,
          ...settingsData,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving user settings:', error);
        return res.status(500).json({ 
          error: 'Failed to save user settings',
          details: error.message,
          code: 'SAVE_ERROR'
        });
      }

      return res.status(200).json({ 
        success: true, 
        data 
      });
    }

    return res.status(405).json({ 
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED'
    });
  } catch (error: any) {
    console.error('Unexpected error in user settings API:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message,
      code: 'INTERNAL_ERROR'
    });
  }
}

