import type { BusinessDocumentType } from "@roam/shared/dist/types/database/enums";

export interface UploadedDocument {
  id: string;
  file: File;
  type: DocumentType;
  url?: string;
  uploadProgress: number;
  status: "pending" | "uploading" | "uploaded" | "error";
  error?: string;
}

export type DocumentType = BusinessDocumentType;

export interface RequiredDocuments {
  drivers_license: boolean;
  proof_of_address: boolean;
  liability_insurance: boolean;
  professional_license: boolean;
  business_license: boolean;
}

export interface DocumentRequirements {
  title: string;
  description: string;
  required: boolean;
  acceptedFormats: string[];
  maxSize: number; // MB
  examples: string[];
}

export const documentRequirements: Record<DocumentType, DocumentRequirements> = {
  drivers_license: {
    title: "Driver's License",
    description: "Government-issued photo identification",
    required: true,
    acceptedFormats: [".pdf", ".jpg", ".jpeg", ".png"],
    maxSize: 5, // MB
    examples: ["Driver's License", "State ID", "Passport"],
  },
  proof_of_address: {
    title: "Proof of Address",
    description: "Recent utility bill or lease agreement",
    required: true,
    acceptedFormats: [".pdf", ".jpg", ".jpeg", ".png"],
    maxSize: 5, // MB
    examples: ["Utility Bill", "Lease Agreement", "Bank Statement"],
  },
  liability_insurance: {
    title: "Liability Insurance",
    description: "Professional liability insurance certificate",
    required: false,
    acceptedFormats: [".pdf", ".jpg", ".jpeg", ".png"],
    maxSize: 5, // MB
    examples: [
      "General Liability",
      "Professional Indemnity",
      "Malpractice Insurance",
    ],
  },
  professional_license: {
    title: "Professional License/Certification",
    description:
      "Your professional license, certification, or training credentials",
    required: false,
    acceptedFormats: [".pdf", ".jpg", ".jpeg", ".png"],
    maxSize: 5, // MB
    examples: [
      "Massage License",
      "Cosmetology License",
      "Personal Trainer Certification",
    ],
  },
  professional_certificate: {
    title: "Professional Certificate",
    description: "Professional certification or clear headshot photo",
    required: false, // Duplicate of Professional License/Certification - should be filtered out
    acceptedFormats: [".jpg", ".jpeg", ".png", ".pdf"],
    maxSize: 2, // MB
    examples: [
      "Professional certificate",
      "Professional headshot",
      "Business portrait",
    ],
  },
  business_license: {
    title: "Business License",
    description: "Business registration or operating license (if applicable)",
    required: false,
    acceptedFormats: [".pdf", ".jpg", ".jpeg", ".png"],
    maxSize: 5, // MB
    examples: ["Business Registration", "DBA Certificate", "Operating License"],
  },
};

export interface DocumentUploadFormProps {
  onSubmit: (documents: UploadedDocument[]) => Promise<void>;
  loading?: boolean;
  error?: string;
  businessType?: string;
  userId: string;
  businessId?: string;
}
