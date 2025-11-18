import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Upload,
  FileText,
  Image,
  Camera,
  CheckCircle,
  AlertCircle,
  X,
  Eye,
  Shield,
  Info,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { BusinessDocumentType } from "@roam/shared";

interface UploadedDocument {
  id: string;
  file: File;
  type: DocumentType;
  url?: string;
  uploadProgress: number;
  status: "pending" | "uploading" | "uploaded" | "error";
  error?: string;
}

type DocumentType = BusinessDocumentType;

interface RequiredDocuments {
  liability_insurance: boolean;
  professional_license: boolean;
  business_license: boolean;
}

interface DocumentUploadFormProps {
  onSubmit: (documents: UploadedDocument[]) => Promise<void>;
  loading?: boolean;
  error?: string;
  businessType?: string;
  userId: string;
  businessId?: string;
}

interface DocumentRequirement {
  title: string;
  description: string;
  required: boolean;
  acceptedFormats: string[];
  maxSize: number;
  examples: string[];
}

const documentRequirements: Record<DocumentType, DocumentRequirement> = {
  // NOTE: These are verified via Stripe Identity in a separate step - not uploaded here
  drivers_license: {
    title: "Driver's License",
    description: "Verified via Stripe Identity",
    required: false, // Verified separately
    acceptedFormats: [],
    maxSize: 0,
    examples: ["Verified via Stripe Identity"],
  },
  proof_of_address: {
    title: "Proof of Address",
    description: "Verified via Stripe Identity",
    required: false, // Verified separately  
    acceptedFormats: [],
    maxSize: 0,
    examples: ["Verified via Stripe Identity"],
  },
  // Business documents (uploaded in this step)
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
    required: false, // Duplicate of Professional License/Certification - filtered out in UI
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

// Freeze the documentRequirements to prevent accidental modification
Object.freeze(documentRequirements);

// Safe getter to ensure documentRequirements is always available
const getDocumentRequirements = (): Record<DocumentType, DocumentRequirement> => {
  if (!documentRequirements || typeof documentRequirements !== 'object') {
    console.error("CRITICAL: documentRequirements is invalid!", documentRequirements);
    return {} as Record<DocumentType, DocumentRequirement>;
  }
  return documentRequirements;
};

export function DocumentUploadForm({
  onSubmit,
  loading = false,
  error,
  businessType,
  userId,
  businessId,
}: DocumentUploadFormProps) {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [dragOver, setDragOver] = useState<DocumentType | null>(null);
  const [uploadingCount, setUploadingCount] = useState(0);
  const fileInputRefs = useRef<Record<DocumentType, HTMLInputElement | null>>(
    {} as any,
  );

  // Determine which documents are required based on business type
  // NOTE: Identity documents (driver's license, proof of address) are verified
  // separately via Stripe Identity in the previous step
  const getRequiredDocuments = (): RequiredDocuments => {
    const base: RequiredDocuments = {
      liability_insurance: false,
      professional_license: false,
      business_license: false,
    };

    return base;
  };

  const requiredDocs = getRequiredDocuments();

  // Load existing documents when component mounts
  useEffect(() => {
    const loadExistingDocuments = async () => {
      if (!businessId) {
        console.log("No businessId provided, skipping document load");
        return;
      }

      try {
        console.log("Loading existing documents for businessId:", businessId);
        const { data: existingDocs, error } = await supabase
          .from('business_documents')
          .select('id, document_type, document_name, file_url, file_size_bytes, verification_status, created_at')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error("Error loading existing documents:", error);
          return;
        }

        if (existingDocs && existingDocs.length > 0) {
          console.log("Found existing documents:", existingDocs.length);
          
          // Convert database documents to UploadedDocument format
          const loadedDocuments: UploadedDocument[] = existingDocs.map((doc: any) => {
            // Create a dummy File object for display purposes
            // We'll use the document_name to create a File-like object
            const fileName = doc.document_name || `document.${doc.file_url?.split('.').pop() || 'pdf'}`;
            const dummyFile = new File([], fileName, { type: 'application/pdf' });
            
            return {
              id: doc.id,
              file: dummyFile,
              type: doc.document_type as DocumentType,
              url: doc.file_url || undefined,
              uploadProgress: 100,
              status: "uploaded" as const,
            };
          });

          setDocuments(loadedDocuments);
          console.log("Loaded documents into state:", loadedDocuments.length);
        } else {
          console.log("No existing documents found");
        }
      } catch (error) {
        console.error("Error in loadExistingDocuments:", error);
      }
    };

    loadExistingDocuments();
  }, [businessId]);

  const validateFile = (
    file: File,
    documentType: DocumentType,
  ): string | null => {
    const reqs = getDocumentRequirements();
    const requirements = reqs[documentType];
    
    if (!requirements) {
      console.error("No requirements found for document type:", documentType);
      return "Invalid document type";
    }

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

    // Check for duplicate document type (except professional_license which allows multiple uploads)
    if (documentType !== "professional_license") {
      const existingDoc = documents.find(
        (doc) => doc.type === documentType && doc.status !== "error",
      );
      if (existingDoc) {
        return `A ${requirements.title.toLowerCase()} has already been uploaded`;
      }
    }

    return null;
  };

  const generateDocumentPath = (
    userId: string,
    documentType: DocumentType,
    fileName: string,
  ): string => {
    const timestamp = Date.now();
    const fileExtension = fileName.split(".").pop();
    return `provider-documents/${userId}/${documentType}_${timestamp}.${fileExtension}`;
  };

  const uploadToSupabase = async (
    file: File,
    documentType: DocumentType,
  ): Promise<string> => {
    const filePath = generateDocumentPath(userId, documentType, file.name);

    const { data, error } = await supabase.storage
      .from("roam-file-storage")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("roam-file-storage").getPublicUrl(data.path);

    return publicUrl;
  };

  const handleFileSelect = async (
    files: FileList | null,
    documentType: DocumentType,
  ) => {
    if (!files || files.length === 0) return;

    // For professional_license, process all selected files
    // For other document types, process only the first file
    const filesToProcess = documentType === "professional_license"
      ? Array.from(files)
      : [files[0]];

    // Process each file
    for (const file of filesToProcess) {
      const validationError = validateFile(file, documentType);

      if (validationError) {
        // Add error document
        const errorDoc: UploadedDocument = {
          id: `${documentType}-${Date.now()}-${Math.random()}`,
          file,
          type: documentType,
          uploadProgress: 0,
          status: "error",
          error: validationError,
        };
        setDocuments((prev) => [...prev, errorDoc]);
        continue;
      }

      // Process this file (continue with existing logic)
      await processFileUpload(file, documentType);
    }
  };

  const processFileUpload = async (
    file: File,
    documentType: DocumentType,
  ) => {

    // Create document entry with unique ID
    const newDoc: UploadedDocument = {
      id: `${documentType}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      file,
      type: documentType,
      uploadProgress: 0,
      status: "uploading",
    };

    setDocuments((prev) => [...prev, newDoc]);
    setUploadingCount((prev) => prev + 1);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setDocuments((prev) =>
          prev.map((doc) =>
            doc.id === newDoc.id
              ? {
                  ...doc,
                  uploadProgress: Math.min(doc.uploadProgress + 10, 90),
                }
              : doc,
          ),
        );
      }, 200);

      // Upload via onboarding API (uses service role for both storage and database)
      console.log("Uploading file via onboarding API:", {
        fileName: file.name,
        fileSize: file.size,
        documentType: documentType,
        userId: userId,
        businessId: businessId
      });

      // Convert file to base64 for API transmission (streaming approach)
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URL prefix to get just the base64 data
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = () => reject(reader.error);
      });
      
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;
      
      // Sanitize filename for storage
      const sanitizeFileName = (filename: string) => {
        return filename
          .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special characters with underscores
          .replace(/_+/g, '_') // Replace multiple underscores with single
          .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
      };

      const sanitizedFileName = sanitizeFileName(file.name);
      const fileName = `provider-documents/${businessId}/${documentType}_${Date.now()}_${sanitizedFileName}`;

      // Upload via onboarding API (uses service role for everything)
      const response = await fetch('/api/onboarding/upload-documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileData: base64Data,
          fileName: file.name,
          filePath: fileName,
          mimeType: file.type,
          businessId: businessId,
          userId: userId,
          documentType: documentType,
          fileSizeBytes: file.size
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Server upload failed: ${errorData.error || response.statusText}`);
      }

      const uploadResult = await response.json();
      console.log("Onboarding upload successful:", uploadResult);

      const uploadedDoc = uploadResult.uploaded?.[0] || {
        url: uploadResult.publicUrl,
        id: uploadResult.documentId
      };

      clearInterval(progressInterval);

      // Update document with success
      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === newDoc.id
            ? {
                ...doc,
                uploadProgress: 100,
                status: "uploaded",
                url: uploadedDoc?.url || "",
              }
            : doc,
        ),
      );
    } catch (uploadError) {
      console.error("Upload error:", uploadError);

      // Update document with error
      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === newDoc.id
            ? {
                ...doc,
                status: "error",
                error:
                  uploadError instanceof Error
                    ? uploadError.message
                    : "Upload failed",
              }
            : doc,
        ),
      );
    } finally {
      setUploadingCount((prev) => prev - 1);
    }
  };

  const handleDrop = (e: React.DragEvent, documentType: DocumentType) => {
    e.preventDefault();
    setDragOver(null);
    const files = e.dataTransfer.files;
    handleFileSelect(files, documentType);
  };

  const handleDragOver = (e: React.DragEvent, documentType: DocumentType) => {
    e.preventDefault();
    setDragOver(documentType);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
  };

  const removeDocument = (docId: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
  };

  const retryUpload = async (docId: string) => {
    console.log("Retrying upload for document ID:", docId);
    console.log("Available documents:", documents);
    
    const document = documents.find((doc) => doc.id === docId);
    if (document && document.file) {
      console.log("Found document to retry:", document);
      
      // Get the updated documents list (without the failed one) for validation
      const updatedDocuments = documents.filter((doc) => doc.id !== docId);
      
      // Validate the file again before retrying
      // Check file size and type
      const reqs = getDocumentRequirements();
      const requirements = reqs[document.type];
      
      if (!requirements) {
        console.error("No requirements found for document type:", document.type);
        return;
      }
      
      // Check file size
      const maxSizeBytes = requirements.maxSize * 1024 * 1024;
      if (document.file.size > maxSizeBytes) {
        // File is still too large, keep the error state
        console.warn("File still too large, cannot retry:", document.file.size, ">", maxSizeBytes);
        return;
      }
      
      // Check file type
      const fileExtension = "." + document.file.name.split(".").pop()?.toLowerCase();
      if (!requirements.acceptedFormats.includes(fileExtension)) {
        // File type still invalid, keep the error state
        console.warn("File type still invalid, cannot retry:", fileExtension);
        return;
      }
      
      // Check for duplicate (using updated documents list)
      if (document.type !== "professional_license") {
        const existingDoc = updatedDocuments.find(
          (doc) => doc.type === document.type && doc.status !== "error",
        );
        if (existingDoc) {
          console.warn("Duplicate document already exists, cannot retry");
          return;
        }
      }
      
      // Remove the failed document from state
      setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
      
      // Directly call processFileUpload to retry the upload
      await processFileUpload(document.file, document.type);
    } else {
      console.error("Document not found for retry:", docId);
    }
  };

  const openCamera = (documentType: DocumentType) => {
    // This would open camera for mobile devices
    // For now, just trigger file input
    fileInputRefs.current[documentType]?.click();
  };

  const canSubmit = () => {
    // All documents are optional in Phase 1 onboarding
    // Only check that no uploads are currently in progress
    return uploadingCount === 0;
  };

  const handleSubmit = async () => {
    if (!canSubmit()) return;

    const uploadedDocs = documents.filter((doc) => doc.status === "uploaded");
    try {
      await onSubmit(uploadedDocs);
    } catch (submitError) {
      console.error("Document submission error:", submitError);
    }
  };

  const getDocumentStatus = (documentType: DocumentType) => {
    const doc = documents.find(
      (doc) => doc.type === documentType,
    );
    return doc?.status || null;
  };

  const getDocumentError = (documentType: DocumentType) => {
    const doc = documents.find(
      (doc) => doc.type === documentType && doc.status === "error",
    );
    return doc?.error || null;
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-roam-blue">
          Business Documents
        </CardTitle>
        <p className="text-foreground/70">
          Upload your professional licenses and business documents
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {/* Identity Verification Complete Notice */}
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Identity Verified!</strong> Your driver's license and proof of address 
              have been verified through Stripe Identity. Now upload your business-related documents below.
            </AlertDescription>
          </Alert>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Security Notice */}
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>Secure Upload:</strong> All documents are encrypted and
              stored securely. Only you and approved ROAM administrators can
              access your documents.
            </AlertDescription>
          </Alert>

          {/* Document Upload Sections */}
          <div className="space-y-6">
            {(() => {
              try {
                const reqs = getDocumentRequirements();
                if (!reqs || 
                    reqs === null || 
                    typeof reqs !== 'object' || 
                    Array.isArray(reqs) ||
                    Object.keys(reqs).length === 0) {
                  console.warn("Document requirements is invalid:", reqs);
                  return null;
                }
                
                const entries = Object.entries(reqs);
                return entries
                  // Filter out identity documents (verified via Stripe Identity)
                  .filter(([docType]) => docType !== "drivers_license" && docType !== "proof_of_address")
                  .filter(([docType]) => docType !== "professional_certificate") // Remove duplicate Professional Certificate
                  .filter(([, requirements]) => requirements !== undefined && requirements !== null) // Ensure requirements exists
                  .map(([docType, requirements]) => {
                const documentType = docType as DocumentType;
                const isRequired = requiredDocs?.[documentType] ?? false;
                const status = getDocumentStatus(documentType);
                const error = getDocumentError(documentType);
                const uploadedDoc = documents.find(
                  (doc) =>
                    doc.type === documentType && doc.status === "uploaded",
                );
                // For professional_license, get all uploaded documents
                const uploadedProfessionalLicenses = documentType === "professional_license"
                  ? documents.filter(
                      (doc) =>
                        doc.type === documentType && doc.status === "uploaded",
                    )
                  : uploadedDoc ? [uploadedDoc] : [];

                return (
                  <div key={documentType} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          {requirements.title}
                          {isRequired && (
                            <Badge variant="destructive" className="text-xs">
                              Required
                            </Badge>
                          )}
                          {!isRequired && (
                            <Badge variant="outline" className="text-xs">
                              Optional
                            </Badge>
                          )}
                          {(status === "uploaded" || (documentType === "professional_license" && uploadedProfessionalLicenses.length > 0)) && (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          )}
                        </h3>
                        <p className="text-sm text-foreground/70">
                          {requirements.description}
                        </p>
                      </div>
                    </div>

                    {/* Upload Area */}
                    <div
                      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                        dragOver === documentType
                          ? "border-roam-blue bg-roam-light-blue/10"
                          : (status === "uploaded" || (documentType === "professional_license" && uploadedProfessionalLicenses.length > 0))
                            ? "border-green-300 bg-green-50"
                            : error
                              ? "border-red-300 bg-red-50"
                              : "border-gray-300 hover:border-roam-blue"
                      }`}
                      onDrop={(e) => handleDrop(e, documentType)}
                      onDragOver={(e) => handleDragOver(e, documentType)}
                      onDragLeave={handleDragLeave}
                    >
                      {/* Hidden file input */}
                      <input
                        ref={(el) => (fileInputRefs.current[documentType] = el)}
                        type="file"
                        accept={requirements.acceptedFormats.join(",")}
                        multiple={documentType === "professional_license"}
                        onChange={(e) =>
                          handleFileSelect(e.target.files, documentType)
                        }
                        className="hidden"
                      />

                      {documentType === "professional_license" && uploadedProfessionalLicenses.length > 0 ? (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 mb-4">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <p className="font-medium text-green-800">
                              {uploadedProfessionalLicenses.length} {uploadedProfessionalLicenses.length === 1 ? "license" : "licenses"} uploaded
                            </p>
                          </div>
                          
                          {/* List of uploaded professional licenses */}
                          <div className="space-y-3">
                            {uploadedProfessionalLicenses.map((doc) => (
                              <div key={doc.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-green-600" />
                                  <span className="text-sm font-medium">{doc.file.name}</span>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(doc.url, "_blank")}
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    Preview
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removeDocument(doc.id)}
                                  >
                                    <X className="h-4 w-4 mr-2" />
                                    Remove
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {/* Allow uploading additional licenses */}
                          <div className="pt-4 border-t">
                            <p className="text-sm text-muted-foreground mb-3 text-center">
                              Upload additional {requirements.title.toLowerCase()}
                            </p>
                            <div className="flex justify-center gap-2">
                              <Button
                                variant="outline"
                                onClick={() =>
                                  fileInputRefs.current[documentType]?.click()
                                }
                                disabled={loading}
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                Add Another
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : status === "uploaded" && uploadedDoc ? (
                        <div className="space-y-3">
                          <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
                          <div>
                            <p className="font-medium text-green-800">
                              {uploadedDoc.file.name}
                            </p>
                            <p className="text-sm text-green-600">
                              Successfully uploaded
                            </p>
                          </div>
                          <div className="flex justify-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                window.open(uploadedDoc.url, "_blank")
                              }
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Preview
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeDocument(uploadedDoc.id)}
                            >
                              <X className="h-4 w-4 mr-2" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      ) : status === "uploading" ? (
                        <div className="space-y-3">
                          <Loader2 className="h-12 w-12 text-roam-blue mx-auto animate-spin" />
                          <div>
                            <p className="font-medium">Uploading...</p>
                            <Progress
                              value={
                                documents.find(
                                  (doc) => doc.type === documentType,
                                )?.uploadProgress || 0
                              }
                              className="w-full max-w-xs mx-auto"
                            />
                          </div>
                        </div>
                      ) : error ? (
                        <div className="space-y-3">
                          <AlertCircle className="h-12 w-12 text-red-600 mx-auto" />
                          <div>
                            <p className="font-medium text-red-800">
                              Upload Failed
                            </p>
                            <p className="text-sm text-red-600">{error}</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const failedDoc = documents.find(
                                (doc) =>
                                  doc.type === documentType &&
                                  doc.status === "error",
                              );
                              if (failedDoc) {
                                retryUpload(failedDoc.id);
                              } else {
                                console.error("Failed document not found for retry:", documentType);
                              }
                            }}
                          >
                            Try Again
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {requirements.title.includes("Headshot") ? (
                            <Image className="h-12 w-12 text-gray-400 mx-auto" />
                          ) : (
                            <FileText className="h-12 w-12 text-gray-400 mx-auto" />
                          )}
                          <div>
                            <p className="text-lg font-medium mb-2">
                              Drop {requirements.title.toLowerCase()} here or
                              click to browse
                              {documentType === "professional_license" && " (you can upload multiple)"}
                            </p>
                            <p className="text-sm text-foreground/60 mb-3">
                              Formats: {requirements.acceptedFormats.join(", ")}{" "}
                              • Max size: {requirements.maxSize}MB
                              {documentType === "professional_license" && " • You can select multiple files"}
                            </p>
                            <div className="flex justify-center gap-2">
                              <Button
                                variant="outline"
                                onClick={() =>
                                  fileInputRefs.current[documentType]?.click()
                                }
                                disabled={loading}
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                {documentType === "professional_license" ? "Choose Files" : "Choose File"}
                              </Button>
                              {requirements.title.includes("Headshot") && (
                                <Button
                                  variant="outline"
                                  onClick={() => openCamera(documentType)}
                                  disabled={loading}
                                >
                                  <Camera className="h-4 w-4 mr-2" />
                                  Take Photo
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-foreground/50">
                            <p className="font-medium mb-1">Examples:</p>
                            <p>{requirements.examples.join(" • ")}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              });
              } catch (error) {
                console.error("Error rendering document requirements:", error);
                return null;
              }
            })()}
          </div>

          {/* Upload Progress Summary */}
          {uploadingCount > 0 && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Uploading {uploadingCount} document
                {uploadingCount > 1 ? "s" : ""}...
              </AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            className="w-full bg-roam-blue hover:bg-roam-blue/90"
            disabled={!canSubmit() || loading}
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting Documents...
              </>
            ) : (
              "Continue to Review"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
