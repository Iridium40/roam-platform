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
    const {
      fileData,
      fileName,
      filePath,
      mimeType,
      businessId,
      userId,
      imageType
    } = req.body;

    if (!fileData || !fileName || !filePath || !mimeType || !businessId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Convert base64 back to buffer
    const buffer = Buffer.from(fileData, 'base64');

    // Upload to Supabase storage using service role key
    const { data, error } = await supabase.storage
      .from('roam-file-storage')
      .upload(filePath, buffer, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Storage upload error:', error);
      return res.status(500).json({ error: `Upload failed: ${error.message}` });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('roam-file-storage')
      .getPublicUrl(filePath);

    return res.status(200).json({
      success: true,
      url: filePath,
      publicUrl: urlData.publicUrl
    });

  } catch (error) {
    console.error('Error in upload-image handler:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Enable body parsing with increased size limit for image uploads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    }
  }
};
