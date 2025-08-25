import { createClient } from "@supabase/supabase-js";
import type { DocumentRecord } from "./documentStorage";
import { DocumentValidationService } from "./documentValidation";

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export interface DatabaseDocument {
  id: string;
  business_id: string;
  user_id: string;
  document_type: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  storage_url: string;
  verification_status: "pending" | "under_review" | "approved" | "rejected";
  uploaded_at: string;
  verified_at?: string;
  verification_notes?: string;
}

export class DocumentDatabaseService {
  /**
   * Create document records in database
   */
  static async createDocumentRecords(
    documents: DocumentRecord[],
    userId: string
  ): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Prepare documents for database insertion
      const documentsToInsert = documents.map(doc => ({
        business_id: doc.businessId,
        user_id: userId,
        document_type: doc.documentType,
        file_name: doc.fileName,
        file_size: doc.fileSize,
        mime_type: doc.mimeType,
        storage_url: doc.storageUrl,
        verification_status: "pending" as const,
        uploaded_at: new Date().toISOString(),
      }));

      // Insert documents into database
      const { data, error } = await supabase
        .from("business_documents")
        .insert(documentsToInsert)
        .select();

      if (error) {
        console.error("Database insertion error:", error);
        errors.push(`Database error: ${error.message}`);
        return { success: false, errors };
      }

      console.log(`Successfully created ${data?.length || 0} document records`);
      return { success: true, errors: [] };
    } catch (error) {
      console.error("Document database creation error:", error);
      errors.push(`Unexpected error: ${error instanceof Error ? error.message : "Unknown error"}`);
      return { success: false, errors };
    }
  }

  /**
   * Get documents for a business
   */
  static async getBusinessDocuments(businessId: string): Promise<DatabaseDocument[]> {
    try {
      const { data, error } = await supabase
        .from("business_documents")
        .select("*")
        .eq("business_id", businessId)
        .order("uploaded_at", { ascending: false });

      if (error) {
        console.error("Failed to fetch business documents:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Get business documents error:", error);
      return [];
    }
  }

  /**
   * Get documents by verification status
   */
  static async getDocumentsByStatus(
    businessId: string,
    status: "pending" | "under_review" | "approved" | "rejected"
  ): Promise<DatabaseDocument[]> {
    try {
      const { data, error } = await supabase
        .from("business_documents")
        .select("*")
        .eq("business_id", businessId)
        .eq("verification_status", status)
        .order("uploaded_at", { ascending: false });

      if (error) {
        console.error("Failed to fetch documents by status:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Get documents by status error:", error);
      return [];
    }
  }

  /**
   * Update document verification status
   */
  static async updateDocumentStatus(
    documentId: string,
    status: "pending" | "under_review" | "approved" | "rejected",
    notes?: string
  ): Promise<boolean> {
    try {
      const updateData: any = {
        verification_status: status,
        verified_at: new Date().toISOString(),
      };

      if (notes) {
        updateData.verification_notes = notes;
      }

      const { error } = await supabase
        .from("business_documents")
        .update(updateData)
        .eq("id", documentId);

      if (error) {
        console.error("Failed to update document status:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Update document status error:", error);
      return false;
    }
  }

  /**
   * Delete document record
   */
  static async deleteDocumentRecord(documentId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("business_documents")
        .delete()
        .eq("id", documentId);

      if (error) {
        console.error("Failed to delete document record:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Delete document record error:", error);
      return false;
    }
  }

  /**
   * Check if all required documents are uploaded
   */
  static async checkRequiredDocuments(
    businessId: string,
    businessType: string
  ): Promise<{ allRequired: boolean; missing: string[]; uploaded: string[] }> {
    try {
      // Get all documents for the business
      const documents = await this.getBusinessDocuments(businessId);
      const uploadedTypes = documents.map(doc => doc.document_type);

      // Get required document types
      const requiredTypes = DocumentValidationService.getRequiredDocumentTypes(businessType);

      // Check which required documents are missing
      const missing = requiredTypes.filter(type => !uploadedTypes.includes(type));

      return {
        allRequired: missing.length === 0,
        missing,
        uploaded: uploadedTypes,
      };
    } catch (error) {
      console.error("Check required documents error:", error);
      return {
        allRequired: false,
        missing: [],
        uploaded: [],
      };
    }
  }

  /**
   * Get document statistics
   */
  static async getDocumentStats(businessId: string): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    underReview: number;
  }> {
    try {
      const documents = await this.getBusinessDocuments(businessId);
      
      const stats = {
        total: documents.length,
        pending: documents.filter(doc => doc.verification_status === "pending").length,
        approved: documents.filter(doc => doc.verification_status === "approved").length,
        rejected: documents.filter(doc => doc.verification_status === "rejected").length,
        underReview: documents.filter(doc => doc.verification_status === "under_review").length,
      };

      return stats;
    } catch (error) {
      console.error("Get document stats error:", error);
      return {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        underReview: 0,
      };
    }
  }
}
