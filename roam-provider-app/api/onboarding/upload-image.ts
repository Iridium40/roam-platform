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
    const { file, imageType, businessId, userId, fileName, fileType, fileSize } = req.body;

    if (!file || !imageType || !businessId) {
      return res.status(400).json({ 
        error: 'Missing required fields: file, imageType, businessId' 
      });
    }

    // Validate image type
    const allowedTypes = ['business_logo', 'business_cover', 'provider_avatar', 'provider_cover', 'customer_avatar'];
    if (!allowedTypes.includes(imageType)) {
      return res.status(400).json({ error: 'Invalid image type' });
    }

    // Validate file size (50MB max for images)
    const maxSize = 50 * 1024 * 1024; // 50MB in bytes
    if (fileSize && fileSize > maxSize) {
      return res.status(400).json({ error: `Image size exceeds 50MB limit. Maximum allowed size is 50MB.` });
    }

    // Decode base64 file data
    const fileBuffer = Buffer.from(file, 'base64');
    
    // Use unified storage bucket
    const bucket = 'roam-file-storage';
    
    // Generate unique filename
    const fileExt = fileName ? fileName.split('.').pop() : 'jpg';
    const timestamp = Date.now();
    const uniqueFileName = `${imageType}_${timestamp}.${fileExt}`;
    
    // Determine storage path within the unified bucket
    let storagePath: string;
    if (imageType === 'business_logo') {
      storagePath = `business-images/${businessId}/${uniqueFileName}`;
    } else if (imageType === 'business_cover') {
      storagePath = `business-images/${businessId}/${uniqueFileName}`;
    } else if (imageType === 'provider_avatar') {
      storagePath = `provider-images/${userId || businessId}/${uniqueFileName}`;
    } else if (imageType === 'provider_cover') {
      storagePath = `provider-images/${userId || businessId}/${uniqueFileName}`;
    } else if (imageType === 'customer_avatar') {
      storagePath = `customer-images/${userId || businessId}/${uniqueFileName}`;
    } else {
      storagePath = `images/${businessId}/${uniqueFileName}`;
    }

    console.log(`Uploading ${imageType} to ${bucket}/${storagePath}`);

    // Upload to Supabase storage using service role
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, fileBuffer, {
        contentType: fileType || 'image/jpeg',
        upsert: true
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return res.status(500).json({ 
        error: `Upload failed: ${uploadError.message}`,
        details: uploadError
      });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(storagePath);

    if (!urlData || !urlData.publicUrl) {
      return res.status(500).json({ error: 'Failed to get public URL' });
    }

    console.log('Image uploaded successfully:', urlData.publicUrl);

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      url: storagePath,
      publicUrl: urlData.publicUrl,
      imageType,
      businessId,
      bucket
    });

  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ 
      error: 'Image upload failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
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
