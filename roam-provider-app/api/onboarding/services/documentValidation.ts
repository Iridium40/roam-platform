import { UPLOAD_CONFIG } from "../middleware/multerConfig";

export interface DocumentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface DocumentFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export class DocumentValidationService {
  /**
   * Validate a single document file
   */
  static validateFile(file: DocumentFile, documentType: string): DocumentValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check file size
    if (file.size > UPLOAD_CONFIG.maxFileSize) {
      const fileSizeMB = file.size / (1024 * 1024);
      errors.push(`File size (${fileSizeMB.toFixed(2)} MB) exceeds the ${UPLOAD_CONFIG.maxFileSize / (1024 * 1024)}MB limit`);
    }

    // Check file type
    if (!UPLOAD_CONFIG.allowedTypes.includes(file.mimetype)) {
      errors.push(`File type ${file.mimetype} is not allowed. Allowed types: ${UPLOAD_CONFIG.allowedTypes.join(", ")}`);
    }

    // Check file name
    if (!file.originalname || file.originalname.trim() === "") {
      errors.push("File name is required");
    }

    // Validate document type
    if (!this.isValidDocumentType(documentType)) {
      errors.push(`Invalid document type: ${documentType}`);
    }

    // Check for suspicious file extensions
    const fileExtension = file.originalname.split(".").pop()?.toLowerCase();
    if (fileExtension && this.isSuspiciousExtension(fileExtension)) {
      warnings.push(`File extension .${fileExtension} may be suspicious`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate multiple files
   */
  static validateFiles(files: DocumentFile[], documentMappings: Record<string, string>): DocumentValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!files || files.length === 0) {
      errors.push("No files uploaded");
      return { isValid: false, errors, warnings };
    }

    if (files.length > UPLOAD_CONFIG.maxFiles) {
      errors.push(`Too many files. Maximum allowed: ${UPLOAD_CONFIG.maxFiles}`);
    }

    // Validate each file
    files.forEach((file, index) => {
      const documentType = documentMappings[file.originalname] || `file_${index}`;
      const validation = this.validateFile(file, documentType);
      
      errors.push(...validation.errors.map(error => `${file.originalname}: ${error}`));
      warnings.push(...validation.warnings.map(warning => `${file.originalname}: ${warning}`));
    });

    // Check for duplicate document types
    const documentTypes = files.map((file, index) => 
      documentMappings[file.originalname] || `file_${index}`
    );
    const duplicateTypes = this.findDuplicates(documentTypes);
    if (duplicateTypes.length > 0) {
      warnings.push(`Duplicate document types detected: ${duplicateTypes.join(", ")}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Check if document type is valid
   */
  private static isValidDocumentType(documentType: string): boolean {
    const validTypes = [
      "drivers_license",
      "proof_of_address",
      "professional_license",
      "professional_certificate",
      "business_license",
      "liability_insurance",
      "tax_document",
      "other",
    ];
    return validTypes.includes(documentType);
  }

  /**
   * Check if file extension is suspicious
   */
  private static isSuspiciousExtension(extension: string): boolean {
    const suspiciousExtensions = ["exe", "bat", "cmd", "com", "pif", "scr", "vbs", "js"];
    return suspiciousExtensions.includes(extension);
  }

  /**
   * Find duplicate values in array
   */
  private static findDuplicates<T>(array: T[]): T[] {
    const counts = new Map<T, number>();
    const duplicates: T[] = [];

    array.forEach(item => {
      counts.set(item, (counts.get(item) || 0) + 1);
    });

    counts.forEach((count, item) => {
      if (count > 1) {
        duplicates.push(item);
      }
    });

    return duplicates;
  }

  /**
   * Get required document types based on business type
   */
  static getRequiredDocumentTypes(businessType: string): string[] {
    const baseTypes = [
      "drivers_license",
      "proof_of_address",
      "professional_license",
      "professional_certificate",
    ];

    // Add business license for non-sole proprietorships
    if (businessType && businessType !== "sole_proprietorship") {
      baseTypes.push("business_license");
    }

    return baseTypes;
  }

  /**
   * Check if all required documents are uploaded
   */
  static checkRequiredDocuments(
    uploadedTypes: string[],
    requiredTypes: string[]
  ): { allRequired: boolean; missing: string[] } {
    const missing = requiredTypes.filter(type => !uploadedTypes.includes(type));
    return {
      allRequired: missing.length === 0,
      missing,
    };
  }
}
