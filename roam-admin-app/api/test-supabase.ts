import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Check environment variables
    const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        status: 'error',
        message: 'Missing environment variables',
        missing: {
          supabaseUrl: !supabaseUrl,
          serviceRoleKey: !supabaseKey
        }
      });
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Test basic Supabase connection
    const { data, error } = await supabase
      .from('business_profiles')
      .select('id, business_name')
      .limit(1);

    if (error) {
      return res.status(500).json({
        status: 'error',
        message: 'Supabase connection failed',
        error: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Supabase connection working',
      recordCount: data?.length || 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in supabase test:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Exception in Supabase test',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}