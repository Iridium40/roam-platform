import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../server/lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
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