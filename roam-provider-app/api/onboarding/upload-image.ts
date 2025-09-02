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
    const { file, imageType, businessId, userId } = req.body;

    if (!file || !imageType || !businessId) {
      return res.status(400).json({ 
        error: 'Missing required fields: file, imageType, businessId' 
      });
    }

    // Validate image type
    const allowedTypes = ['business_logo', 'business_cover', 'provider_avatar', 'provider_cover'];
    if (!allowedTypes.includes(imageType)) {
      return res.status(400).json({ error: 'Invalid image type' });
    }

    // For now, return success to test the endpoint
    // In production, this would:
    // 1. Decode the base64 file data
    // 2. Upload to Supabase storage using service role
    // 3. Return the public URL
    
    console.log('Image upload request:', { imageType, businessId, userId, hasFile: !!file });
    
    res.json({
      success: true,
      message: 'Image upload endpoint working',
      testMode: true,
      imageType,
      businessId,
      userId
    });

  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ error: 'Image upload failed' });
  }
}
