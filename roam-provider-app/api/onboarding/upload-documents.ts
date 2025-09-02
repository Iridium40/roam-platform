import type { VercelRequest, VercelResponse } from "@vercel/node";
import { runMiddleware, upload } from "./middleware/multerConfig";
// Temporarily comment out complex services for testing
// import { DocumentValidationService } from "./services/documentValidation";
// import { DocumentStorageService } from "./services/documentStorage";
// import { DocumentDatabaseService } from "./services/documentDatabase";

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

    // Simplified validation for testing
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

    // Simplified response for testing
    console.log("Document upload completed successfully (simplified)");
    return res.status(200).json({
      success: true,
      message: "Documents uploaded successfully (test mode)",
      uploaded: files.map(file => ({
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        uploadedAt: new Date().toISOString()
      })),
      totalFiles: files.length,
      note: "This is a simplified upload for testing. Full storage and database integration will be enabled later."
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
