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
    // TODO: Implement file upload without multer middleware
    // For now, return a temporary error message
    console.log("File upload temporarily disabled - multer middleware removed");
    
    return res.status(501).json({
      error: "File upload temporarily disabled",
      message: "Document upload functionality is being updated. Please try again later.",
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
