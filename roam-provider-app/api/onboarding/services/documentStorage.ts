import { createClient } from "@supabase/supabase-js";
import { UPLOAD_CONFIG } from "../middleware/multerConfig";
import type { DocumentFile } from "./documentValidation";

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export interface StorageUploadResult {
  success: boolean;
  path?: string;
  publicUrl?: string;
  error?: string;
}

export interface DocumentRecord {
  userId: string;
  businessId: string;
  documentType: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storageUrl: string;
  status: "uploaded" | "pending_review" | "approved" | "rejected";
}

export class DocumentStorageService {
  /**
   * Upload a single document to storage
   */
  static async uploadDocument(
    file: DocumentFile,
    businessId: string,
    documentType: string
  ): Promise<StorageUploadResult> {
    try {
      // Check file size before upload
      const fileSizeMB = file.size / (1024 * 1024);
      console.log(`Uploading document: ${file.originalname}, size: ${fileSizeMB.toFixed(2)} MB`);
      
      if (fileSizeMB > 5) {
        throw new Error(`File size (${fileSizeMB.toFixed(2)} MB) exceeds the 5MB limit`);
      }

      // Generate unique file path
      const timestamp = Date.now();
      const fileExtension = file.originalname.split(".").pop();
      const fileName = `${documentType}_${timestamp}.${fileExtension}`;
      const filePath = `provider-documents/${businessId}/${fileName}`;

      // Upload file to Supabase Storage
      console.log(`Uploading file to storage: ${filePath}`);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(UPLOAD_CONFIG.storageBucket)
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        let errorMessage = uploadError.message;
        if (uploadError.message.includes("maximum allowed size")) {
          errorMessage = `File size (${fileSizeMB.toFixed(2)} MB) is too large. Please upload a file smaller than 5MB.`;
        }
        
        return {
          success: false,
          error: errorMessage,
        };
      }

      console.log("Storage upload successful:", uploadData);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(UPLOAD_CONFIG.storageBucket)
        .getPublicUrl(uploadData.path);

      return {
        success: true,
        path: uploadData.path,
        publicUrl: urlData.publicUrl,
      };
    } catch (error) {
      console.error("Document upload error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
      };
    }
  }

  /**
   * Upload multiple documents
   */
  static async uploadDocuments(
    files: DocumentFile[],
    businessId: string,
    documentMappings: Record<string, string>
  ): Promise<{ uploaded: DocumentRecord[]; errors: string[] }> {
    const uploaded: DocumentRecord[] = [];
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const documentType = documentMappings[file.originalname] || `file_${i}`;

      console.log(`Processing file ${i + 1}/${files.length}: ${file.originalname}`);

      const result = await this.uploadDocument(file, businessId, documentType);

      if (result.success && result.path && result.publicUrl) {
        uploaded.push({
          userId: "", // Will be set by the caller
          businessId,
          documentType,
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          storageUrl: result.publicUrl,
          status: "uploaded",
        });
      } else {
        errors.push(`Failed to upload ${file.originalname}: ${result.error}`);
      }
    }

    return { uploaded, errors };
  }

  /**
   * Delete a document from storage
   */
  static async deleteDocument(filePath: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from(UPLOAD_CONFIG.storageBucket)
        .remove([filePath]);

      if (error) {
        console.error("Failed to delete document:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Document deletion error:", error);
      return false;
    }
  }

  /**
   * Get document public URL
   */
  static getDocumentUrl(filePath: string): string {
    const { data } = supabase.storage
      .from(UPLOAD_CONFIG.storageBucket)
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  /**
   * List documents for a business
   */
  static async listBusinessDocuments(businessId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase.storage
        .from(UPLOAD_CONFIG.storageBucket)
        .list(`provider-documents/${businessId}`);

      if (error) {
        console.error("Failed to list documents:", error);
        return [];
      }

      return data?.map(item => item.name) || [];
    } catch (error) {
      console.error("List documents error:", error);
      return [];
    }
  }

  /**
   * Check if document exists
   */
  static async documentExists(filePath: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.storage
        .from(UPLOAD_CONFIG.storageBucket)
        .list(filePath);

      return !error && data && data.length > 0;
    } catch (error) {
      return false;
    }
  }
}
