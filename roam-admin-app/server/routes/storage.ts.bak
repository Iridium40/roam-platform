import { Request, Response } from 'express';
import { supabase } from '../lib/supabase.js';

export async function handleUploadImage(req: Request, res: Response) {
  try {
    const {
      fileData,
      fileName,
      filePath,
      mimeType,
      adminUserId,
      userId,
      imageType
    } = req.body;

    if (!fileData || !fileName || !filePath || !mimeType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log('[Storage] Uploading file:', { fileName, filePath, mimeType });

    // Convert base64 back to buffer
    const buffer = Buffer.from(fileData, 'base64');

    // Upload to Supabase storage using service role key (bypasses RLS)
    const { data, error } = await supabase.storage
      .from('roam-file-storage')
      .upload(filePath, buffer, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('[Storage] Upload error:', error);
      return res.status(500).json({ error: `Upload failed: ${error.message}` });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('roam-file-storage')
      .getPublicUrl(filePath);

    console.log('[Storage] Upload successful:', urlData.publicUrl);

    return res.status(200).json({
      success: true,
      url: filePath,
      publicUrl: urlData.publicUrl
    });

  } catch (error) {
    console.error('[Storage] Error in upload handler:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
