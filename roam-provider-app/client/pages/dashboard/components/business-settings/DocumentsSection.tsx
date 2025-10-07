import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, AlertCircle, CheckCircle, Eye, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface BusinessDocument {
  id: string;
  document_type: string;
  document_url: string;
  original_filename: string;
  upload_status: string;
  uploaded_at: string;
  verified_at?: string;
  rejection_reason?: string;
  expiry_date?: string;
  is_required: boolean;
}

interface DocumentsSectionProps {
  businessId: string;
  documents: BusinessDocument[];
  uploading: boolean;
  onDocumentUpload: (file: File, documentType: string) => Promise<void>;
  onDocumentDelete: (documentId: string) => Promise<void>;
}

const REQUIRED_DOCUMENT_TYPES = [
  { type: "drivers_license", label: "Driver's License", description: "Government-issued photo identification" },
  { type: "proof_of_address", label: "Proof of Address", description: "Recent utility bill or lease agreement" },
  { type: "liability_insurance", label: "Liability Insurance", description: "Professional liability insurance certificate" },
  { type: "professional_license", label: "Professional License/Certification", description: "Your professional license, certification, or training credentials" },
  { type: "professional_certificate", label: "Professional Certificate", description: "Professional certification or clear headshot photo" },
  { type: "business_license", label: "Business License", description: "Business registration or operating license (if applicable)" },
];

const OPTIONAL_DOCUMENT_TYPES = [
  // No optional documents currently
];

export function DocumentsSection({
  businessId,
  documents,
  uploading,
  onDocumentUpload,
  onDocumentDelete,
}: DocumentsSectionProps) {
  const [uploadingType, setUploadingType] = React.useState<string | null>(null);

  const getDocumentsByType = (type: string) => {
    return documents.filter(doc => doc.document_type === type);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case "pending":
        return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" />Pending Review</Badge>;
      case "rejected":
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const handleFileUpload = async (file: File, documentType: string) => {
    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024; // 50MB in bytes
    if (file.size > maxSize) {
      alert(`File size exceeds 50MB limit. Please upload a smaller file.`);
      return;
    }

    setUploadingType(documentType);
    try {
      await onDocumentUpload(file, documentType);
    } finally {
      setUploadingType(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const isExpiringSoon = (expiryDate: string) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return expiry <= thirtyDaysFromNow && expiry > now;
  };

  const isExpired = (expiryDate: string) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) <= new Date();
  };

  const DocumentTypeCard = ({ 
    type, 
    label, 
    description, 
    isRequired 
  }: { 
    type: string; 
    label: string; 
    description: string; 
    isRequired: boolean;
  }) => {
    const typeDocuments = getDocumentsByType(type);
    const hasApprovedDoc = typeDocuments.some(doc => doc.upload_status === "approved");
    const isUploading = uploadingType === type;

    return (
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-medium flex items-center gap-2">
              {label}
              {isRequired && <Badge variant="secondary" className="text-xs">Required</Badge>}
            </h4>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <div className="text-right">
            <input
              type="file"
              id={`upload-${type}`}
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleFileUpload(file, type);
                }
              }}
              disabled={isUploading}
            />
            <Button
              variant="outline"
              size="sm"
              asChild
              disabled={isUploading}
            >
              <label htmlFor={`upload-${type}`} className="cursor-pointer">
                <Upload className="w-4 h-4 mr-2" />
                {isUploading ? "Uploading..." : "Upload"}
              </label>
            </Button>
          </div>
        </div>

        {typeDocuments.length > 0 && (
          <div className="space-y-2">
            {typeDocuments.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-2 bg-muted rounded">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <div>
                    <p className="text-sm font-medium">{doc.original_filename}</p>
                    <p className="text-xs text-muted-foreground">
                      Uploaded {formatDate(doc.uploaded_at)}
                      {doc.expiry_date && ` • Expires ${formatDate(doc.expiry_date)}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(doc.upload_status)}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(doc.document_url, '_blank')}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDocumentDelete(doc.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Show expiry warnings */}
        {typeDocuments.some(doc => doc.expiry_date && isExpired(doc.expiry_date)) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This document has expired and needs to be renewed.
            </AlertDescription>
          </Alert>
        )}

        {typeDocuments.some(doc => doc.expiry_date && isExpiringSoon(doc.expiry_date)) && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This document expires within 30 days. Consider renewing it soon.
            </AlertDescription>
          </Alert>
        )}

        {/* Show rejection reason */}
        {typeDocuments.some(doc => doc.upload_status === "rejected" && doc.rejection_reason) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Rejection Reason:</strong> {typeDocuments.find(doc => doc.rejection_reason)?.rejection_reason}
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Documents</CardTitle>
        <CardDescription>
          Upload and manage your business documentation for verification and compliance.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Required Documents */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Required Documents</h3>
          <div className="space-y-4">
            {REQUIRED_DOCUMENT_TYPES.map((docType) => (
              <DocumentTypeCard
                key={docType.type}
                type={docType.type}
                label={docType.label}
                description={docType.description}
                isRequired={true}
              />
            ))}
          </div>
        </div>

        {/* Optional Documents */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Optional Documents</h3>
          <div className="space-y-4">
            {OPTIONAL_DOCUMENT_TYPES.map((docType) => (
              <DocumentTypeCard
                key={docType.type}
                type={docType.type}
                label={docType.label}
                description={docType.description}
                isRequired={false}
              />
            ))}
          </div>
        </div>

        {/* Document Guidelines */}
        <Alert>
          <FileText className="h-4 w-4" />
          <AlertDescription>
            <strong>Document Guidelines:</strong>
            <ul className="mt-2 text-sm space-y-1">
              <li>• Accepted formats: PDF, JPG, PNG, DOC, DOCX</li>
              <li>• Maximum file size: 50MB per document</li>
              <li>• Documents must be clear and legible</li>
              <li>• Required documents must be approved before you can receive bookings</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}