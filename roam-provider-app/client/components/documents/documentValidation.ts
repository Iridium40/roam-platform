import type { DocumentType, UploadedDocument, RequiredDocuments } from "./documentTypes";
import { documentRequirements } from "./documentTypes";

export class DocumentValidationService {
  /**
   * Determine which documents are required based on business type
   */
  static getRequiredDocuments(businessType?: string): RequiredDocuments {
    const base: RequiredDocuments = {
      drivers_license: true,
      proof_of_address: true,
      liability_insurance: false,
      professional_license: true,
      professional_certificate: true,
      business_license: false,
    };

    // Business entities typically need business license
    if (businessType && businessType !== "sole_proprietorship") {
      base.business_license = true;
    }

    return base;
  }

  /**
   * Validate a file against document requirements
   */
  static validateFile(
    file: File,
    documentType: DocumentType,
    existingDocuments: UploadedDocument[]
  ): string | null {
    const requirements = documentRequirements[documentType];

    // Check file size
    const maxSizeBytes = requirements.maxSize * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `File size must be less than ${requirements.maxSize}MB`;
    }

    // Check file type
    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
    if (!requirements.acceptedFormats.includes(fileExtension)) {
      return `File must be one of: ${requirements.acceptedFormats.join(", ")}`;
    }

    // Check for duplicate document type
    const existingDoc = existingDocuments.find(
      (doc) => doc.type === documentType && doc.status !== "error"
    );
    if (existingDoc) {
      return `A ${requirements.title.toLowerCase()} has already been uploaded`;
    }

    return null;
  }

  /**
   * Check if all required documents are uploaded
   */
  static canSubmit(
    documents: UploadedDocument[],
    requiredDocs: RequiredDocuments,
    uploadingCount: number
  ): boolean {
    const requiredDocTypes = Object.entries(requiredDocs)
      .filter(([_, required]) => required)
      .map(([type]) => type as DocumentType);

    const uploadedRequiredDocs = requiredDocTypes.every((type) =>
      documents.some((doc) => doc.type === type && doc.status === "uploaded")
    );

    return uploadedRequiredDocs && uploadingCount === 0;
  }

  /**
   * Get document status for a specific type
   */
  static getDocumentStatus(
    documents: UploadedDocument[],
    documentType: DocumentType
  ): "pending" | "uploading" | "uploaded" | "error" | null {
    const doc = documents.find((doc) => doc.type === documentType);
    return doc?.status || null;
  }

  /**
   * Get document error for a specific type
   */
  static getDocumentError(
    documents: UploadedDocument[],
    documentType: DocumentType
  ): string | null {
    const doc = documents.find(
      (doc) => doc.type === documentType && doc.status === "error"
    );
    return doc?.error || null;
  }

  /**
   * Get uploaded document for a specific type
   */
  static getUploadedDocument(
    documents: UploadedDocument[],
    documentType: DocumentType
  ): UploadedDocument | undefined {
    return documents.find(
      (doc) => doc.type === documentType && doc.status === "uploaded"
    );
  }
}
