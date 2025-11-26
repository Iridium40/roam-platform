import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { filePath } = req.body;

    if (!filePath) {
      return res.status(400).json({ error: 'Missing required field: filePath' });
    }

    // Remove file from Supabase storage using service role key
    const { error } = await supabase.storage
      .from('roam-file-storage')
      .remove([filePath]);

    if (error) {
      console.error('Storage delete error:', error);
      return res.status(500).json({ error: `Delete failed: ${error.message}` });
    }

    return res.status(200).json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('Error in delete-image handler:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

