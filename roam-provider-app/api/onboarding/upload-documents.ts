import type { VercelRequest, VercelResponse } from "@vercel/node";
import { runMiddleware, upload } from "./middleware/multerConfig";
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
    // Run multer middleware
    console.log("Running multer middleware...");
    await runMiddleware(req, res, upload.array("documents", 10));
    console.log("Multer middleware completed");

    const files = (req as any).files;
    const body = (req as any).body;
    
    console.log("Files after multer:", files?.length || 0);
    console.log("Body after multer:", body);
    
    const { userId, businessId, documentMappings } = body;

    console.log("Files received:", files ? files.length : 0);
    console.log("Request body:", { userId, businessId, documentMappings });

    if (!userId || !businessId) {
      console.error("Missing userId or businessId:", { userId, businessId });
      return res.status(400).json({ error: "Missing userId or businessId" });
    }

    if (!files || files.length === 0) {
      console.error("No files uploaded");
      return res.status(400).json({ error: "No files uploaded" });
    }

    // Parse document mappings
    let mappings: Record<string, string> = {};
    try {
      mappings = JSON.parse(documentMappings || "{}");
      console.log("Document mappings:", mappings);
    } catch (error) {
      console.error("Failed to parse document mappings:", error);
      return res.status(400).json({ error: "Invalid document mappings format" });
    }

    // Validate file types
    console.log("Validating files...");
    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
    const invalidFiles = files.filter(file => !allowedTypes.includes(file.mimetype));
    
    if (invalidFiles.length > 0) {
      console.error("Invalid file types:", invalidFiles.map(f => f.originalname));
      return res.status(400).json({ 
        error: "Invalid file types. Only JPEG, PNG, and PDF files are allowed.",
        invalidFiles: invalidFiles.map(f => f.originalname)
      });
    }

    const uploadedDocuments: any[] = [];
    const errors: any[] = [];

    // Process each file
    for (const file of files) {
      try {
        const documentType = mappings[file.originalname];
        if (!documentType) {
          console.error("No document type mapping for:", file.originalname);
          errors.push({
            file: file.originalname,
            error: "No document type specified"
          });
          continue;
        }

        console.log(`Processing file: ${file.originalname}, type: ${documentType}`);

        // Generate storage path: provider-documents/{userId}/{documentType}_{timestamp}.{extension}
        const timestamp = Date.now();
        const fileExtension = file.originalname.split(".").pop()?.toLowerCase();
        const storagePath = `provider-documents/${userId}/${documentType}_${timestamp}.${fileExtension}`;

        console.log(`Uploading to storage: ${storagePath}`);

        // Upload to Supabase Storage using service role (bypasses RLS)
        const { data: storageData, error: storageError } = await supabase.storage
          .from("provider-documents")
          .upload(storagePath, file.buffer, {
            contentType: file.mimetype,
            cacheControl: "3600",
            upsert: false,
          });

        if (storageError) {
          console.error("Storage upload error:", storageError);
          errors.push({
            file: file.originalname,
            error: `Storage upload failed: ${storageError.message}`
          });
          continue;
        }

        console.log("Storage upload successful:", storageData.path);

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from("provider-documents")
          .getPublicUrl(storageData.path);

        console.log("Public URL generated:", publicUrl);

        // Save to business_documents table using service role
        const { data: dbData, error: dbError } = await supabase
          .from("business_documents")
          .insert({
            business_id: businessId,
            document_type: documentType,
            document_name: file.originalname,
            file_url: publicUrl,
            file_size_bytes: file.size,
            verification_status: "pending",
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (dbError) {
          console.error("Database insert error:", dbError);
          
          // If database insert fails, try to clean up storage
          try {
            await supabase.storage
              .from("provider-documents")
              .remove([storageData.path]);
            console.log("Cleaned up storage file after db error");
          } catch (cleanupError) {
            console.error("Failed to clean up storage:", cleanupError);
          }

          errors.push({
            file: file.originalname,
            error: `Database insert failed: ${dbError.message}`
          });
          continue;
        }

        console.log("Database record created:", dbData.id);

        uploadedDocuments.push({
          id: dbData.id,
          originalName: file.originalname,
          documentType: documentType,
          url: publicUrl,
          size: file.size,
          mimetype: file.mimetype,
          storagePath: storageData.path,
          uploadedAt: new Date().toISOString()
        });

      } catch (fileError) {
        console.error(`Error processing file ${file.originalname}:`, fileError);
        errors.push({
          file: file.originalname,
          error: fileError instanceof Error ? fileError.message : "Unknown error"
        });
      }
    }

    console.log("Upload process completed");
    console.log("Successful uploads:", uploadedDocuments.length);
    console.log("Errors:", errors.length);

    // Return response
    if (uploadedDocuments.length === 0 && errors.length > 0) {
      return res.status(500).json({
        success: false,
        error: "All document uploads failed",
        errors: errors
      });
    }

    return res.status(200).json({
      success: true,
      message: `Successfully uploaded ${uploadedDocuments.length} document(s)`,
      uploaded: uploadedDocuments,
      errors: errors.length > 0 ? errors : undefined,
      totalFiles: files.length,
      successCount: uploadedDocuments.length,
      errorCount: errors.length
    });

  } catch (error) {
    console.error("Document upload error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// Disable body parsing for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};
