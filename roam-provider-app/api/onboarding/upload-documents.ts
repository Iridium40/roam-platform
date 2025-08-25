import type { VercelRequest, VercelResponse } from "@vercel/node";
import { runMiddleware, upload } from "./middleware/multerConfig";
import { DocumentValidationService } from "./services/documentValidation";
import { DocumentStorageService } from "./services/documentStorage";
import { DocumentDatabaseService } from "./services/documentDatabase";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log("=== UPLOAD DOCUMENTS API CALLED ===");
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Add a simple test response to verify the API is working
  if (req.url?.includes('test')) {
    return res.status(200).json({ message: "API is working", timestamp: new Date().toISOString() });
  }

  console.log("=== UPLOAD DOCUMENTS API START ===");
  console.log("Request headers:", req.headers);
  console.log("Request body keys:", Object.keys(req.body || {}));

  try {
    // Run multer middleware
    console.log("Running multer middleware...");
    await runMiddleware(req, res, upload.array("documents", 10));
    console.log("Multer middleware completed");

    const files = (req as any).files;
    const body = (req as any).body;
    
    console.log("Files after multer:", files);
    console.log("Body after multer:", body);
    
    const { userId, businessId, documentMappings } = body;

    console.log("Files received:", files ? files.length : 0);
    console.log("Files details:", files?.map(f => ({ name: f.originalname, size: f.size, mimetype: f.mimetype })));
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
    } catch (error) {
      console.error("Failed to parse document mappings:", error);
      return res.status(400).json({ error: "Invalid document mappings format" });
    }

    // Validate files
    console.log("Validating files...");
    const validation = DocumentValidationService.validateFiles(files, mappings);
    
    if (!validation.isValid) {
      console.error("File validation failed:", validation.errors);
      return res.status(400).json({ 
        error: "File validation failed", 
        details: validation.errors,
        warnings: validation.warnings 
      });
    }

    if (validation.warnings.length > 0) {
      console.warn("File validation warnings:", validation.warnings);
    }

    // Upload files to storage
    console.log("Uploading files to storage...");
    const uploadResult = await DocumentStorageService.uploadDocuments(files, businessId, mappings);
    
    if (uploadResult.errors.length > 0) {
      console.error("File upload errors:", uploadResult.errors);
      return res.status(500).json({ 
        error: "Some files failed to upload", 
        details: uploadResult.errors,
        uploaded: uploadResult.uploaded 
      });
    }

    // Create database records
    console.log("Creating database records...");
    const dbResult = await DocumentDatabaseService.createDocumentRecords(uploadResult.uploaded, userId);
    
    if (!dbResult.success) {
      console.error("Database creation errors:", dbResult.errors);
      return res.status(500).json({ 
        error: "Failed to create database records", 
        details: dbResult.errors,
        uploaded: uploadResult.uploaded 
      });
    }

    // Check if all required documents are uploaded
    console.log("Checking required documents...");
    const requiredCheck = await DocumentDatabaseService.checkRequiredDocuments(businessId, "independent"); // TODO: Get actual business type
    
    // Final verification: Query what's actually in the database
    console.log("=== FINAL VERIFICATION ===");
    const finalCheck = await DocumentDatabaseService.getBusinessDocuments(businessId);

    console.log("Final document check - businessId:", businessId);
    console.log("Final document check - results:", finalCheck);

    return res.status(200).json({
      success: true,
      uploaded: uploadResult.uploaded,
      errors: uploadResult.errors.length > 0 ? uploadResult.errors : undefined,
      allRequiredUploaded: requiredCheck.allRequired,
      requiredDocuments: requiredCheck.missing.length > 0 ? requiredCheck.missing : undefined,
      uploadedDocuments: requiredCheck.uploaded,
      warnings: validation.warnings.length > 0 ? validation.warnings : undefined,
      debug: {
        finalDatabaseCheck: finalCheck,
        businessId,
        uploadedCount: uploadResult.uploaded.length,
      },
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
