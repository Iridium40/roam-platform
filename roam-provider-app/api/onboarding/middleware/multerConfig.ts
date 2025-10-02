import multer from "multer";

// Configure multer for file upload
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow specific file types
    if (ALLOWED_MIME_TYPES.includes(file.mimetype as AllowedMimeType)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only JPEG, PNG, and PDF files are allowed.",
        ),
      );
    }
  },
});

// Helper function to handle multer middleware in Vercel
export function runMiddleware(req: any, res: any, fn: any) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

// Define allowed MIME types as a constant
export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "application/pdf"] as const;
export type AllowedMimeType = typeof ALLOWED_MIME_TYPES[number];

// File upload configuration
export const UPLOAD_CONFIG = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ALLOWED_MIME_TYPES,
  maxFiles: 10,
  storageBucket: "provider-documents",
} as const;
