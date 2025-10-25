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
    // Simple implementation for file upload
    // Note: This is a basic implementation - the client-side direct upload is preferred
    
    const { businessId, userId, documentType, documentName, fileUrl, fileSizeBytes } = req.body;

    console.log("Request body:", { businessId, userId, documentType, documentName, fileUrl, fileSizeBytes });

    if (!businessId || !userId || !documentType || !documentName || !fileUrl) {
      console.error("Missing required fields:", { businessId, userId, documentType, documentName, fileUrl });
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Create document record in database
    const { data, error } = await supabase
      .from('business_documents')
      .insert({
        business_id: businessId,
        document_type: documentType,
        document_name: documentName,
        file_url: fileUrl,
        file_size_bytes: fileSizeBytes || null,
        verification_status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return res.status(500).json({ 
        error: "Failed to create document record",
        details: error.message 
      });
    }

    console.log("Document created successfully:", data);

    return res.status(200).json({
      success: true,
      uploaded: [{
        id: data.id,
        url: fileUrl,
        name: documentName,
        type: documentType
      }],
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

// Enable body parsing for JSON data
export const config = {
  api: {
    bodyParser: true,
  },
};
