import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log("=== BUSINESS DOCUMENT UPLOAD API CALLED ===");
  console.log("Method:", req.method);
  
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { business_id, document_type, document_name, file, file_type, file_size } = req.body;

    console.log("Request body:", { business_id, document_type, document_name, file_type, file_size, hasFile: !!file });

    if (!business_id || !document_type || !document_name || !file) {
      console.error("Missing required fields");
      return res.status(400).json({ error: "Missing required fields: business_id, document_type, document_name, file" });
    }

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024; // 50MB in bytes
    if (file_size && file_size > maxSize) {
      console.error(`File size ${file_size} exceeds 50MB limit`);
      return res.status(400).json({ error: `File size exceeds 50MB limit. Maximum allowed size is 50MB.` });
    }

    // Step 1: Decode base64 file
    const fileBuffer = Buffer.from(file, 'base64');
    
    // Step 2: Generate unique filename
    const fileExt = document_name.split('.').pop() || 'pdf';
    const timestamp = Date.now();
    const uniqueFileName = `${document_type}_${timestamp}.${fileExt}`;
    const storagePath = `provider-documents/${business_id}/${uniqueFileName}`;

    console.log(`Uploading document to: ${storagePath}`);

    // Step 3: Upload to Supabase storage using service role (bypasses RLS)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('roam-file-storage')
      .upload(storagePath, fileBuffer, {
        contentType: file_type || 'application/pdf',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return res.status(500).json({ 
        error: `Upload failed: ${uploadError.message}`,
        details: uploadError
      });
    }

    // Step 4: Get public URL
    const { data: urlData } = supabase.storage
      .from('roam-file-storage')
      .getPublicUrl(storagePath);

    if (!urlData || !urlData.publicUrl) {
      return res.status(500).json({ error: 'Failed to get public URL' });
    }

    console.log('Document uploaded successfully:', urlData.publicUrl);

    // Step 5: Save document metadata to database
    const { data: documentData, error: dbError } = await supabase
      .from('business_documents')
      .insert({
        business_id: business_id,
        document_type: document_type,
        document_name: document_name,
        file_url: urlData.publicUrl,
        file_size_bytes: file_size || null,
        verification_status: 'pending'
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      // Try to clean up uploaded file
      await supabase.storage
        .from('roam-file-storage')
        .remove([storagePath]);
      
      return res.status(500).json({ 
        error: "Failed to create document record",
        details: dbError.message 
      });
    }

    console.log("Document record created successfully:", documentData);

    res.json({
      success: true,
      message: 'Document uploaded successfully',
      document: documentData,
      file_url: urlData.publicUrl,
      storage_path: storagePath
    });

  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({ 
      error: 'Document upload failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
