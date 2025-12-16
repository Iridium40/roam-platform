import type { VercelRequest, VercelResponse } from "@vercel/node";
// Multer middleware import removed to fix serverless function issues
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client with service role key for admin operations
const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log("=== UPLOAD DOCUMENTS API CALLED ===");
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  console.log("=== UPLOAD DOCUMENTS API START ===");
  console.log("Request headers:", req.headers);

  try {
    // Handle file upload with service role permissions
    const { 
      businessId, 
      userId, 
      documentType, 
      fileName, 
      fileData, 
      filePath, 
      mimeType, 
      fileSizeBytes 
    } = req.body;

    console.log("Upload request:", { 
      businessId, 
      userId, 
      documentType, 
      fileName, 
      filePath, 
      mimeType, 
      fileSizeBytes 
    });

    if (!businessId || !userId || !documentType || !fileName || !fileData || !filePath) {
      console.error("Missing required fields:", { businessId, userId, documentType, fileName, filePath });
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Convert base64 back to buffer
    const buffer = Buffer.from(fileData, 'base64');

    // Upload to Supabase storage using service role key
    console.log("Uploading to storage:", filePath);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('roam-file-storage')
      .upload(filePath, buffer, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return res.status(500).json({ 
        error: "Storage upload failed",
        details: uploadError.message 
      });
    }

    console.log("Storage upload successful:", uploadData);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('roam-file-storage')
      .getPublicUrl(filePath);

    // Create document record in database using service role
    const { data: dbData, error: dbError } = await supabase
      .from('business_documents')
      .insert({
        business_id: businessId,
        document_type: documentType,
        document_name: fileName,
        file_url: urlData.publicUrl,
        file_size_bytes: fileSizeBytes || buffer.length,
        verification_status: 'pending'
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      return res.status(500).json({ 
        error: "Failed to create document record",
        details: dbError.message 
      });
    }

    console.log("Document created successfully:", dbData);

    return res.status(200).json({
      success: true,
      uploaded: [{
        id: dbData.id,
        url: urlData.publicUrl,
        name: fileName,
        type: documentType
      }],
      publicUrl: urlData.publicUrl,
      documentId: dbData.id,
      message: "Document uploaded successfully"
    });

  } catch (error) {
    console.error("Document upload error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// Enable body parsing with increased size limit for file uploads
// Vercel Pro allows up to 4.5MB by default, we set higher for larger documents
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb'  // Increase limit for document uploads
    }
  }
};
