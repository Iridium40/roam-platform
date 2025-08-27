import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log("=== BUSINESS UPLOAD DOCUMENTS API CALLED ===");
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { businessId, documentType, documentName, fileUrl, fileSizeBytes } = req.body;

    console.log("Request body:", { businessId, documentType, documentName, fileUrl, fileSizeBytes });

    if (!businessId || !documentType || !documentName || !fileUrl) {
      console.error("Missing required fields:", { businessId, documentType, documentName, fileUrl });
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
      document: data
    });

  } catch (error) {
    console.error("Business document upload error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
