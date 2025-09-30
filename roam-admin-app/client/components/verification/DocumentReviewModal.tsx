import React from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ROAMCard,
  ROAMCardHeader,
  ROAMCardTitle,
  ROAMCardContent,
} from "@/components/ui/roam-card";
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Eye,
  Building2,
  Mail,
  Phone,
  Calendar,
  FileText,
  MapPin,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type BusinessDocumentStatus = "pending" | "verified" | "rejected" | "under_review";
type BusinessDocumentType =
  | "drivers_license"
  | "proof_of_address"
  | "liability_insurance"
  | "professional_license"
  | "professional_certificate"
  | "business_license";

interface BusinessDocument {
  id: string;
  business_id: string;
  document_type: BusinessDocumentType;
  document_name: string;
  file_url: string;
  file_size_bytes: number | null;
  verified_by: string | null;
  verified_at: string | null;
  rejection_reason: string | null;
  expiry_date: string | null;
  created_at: string;
  verification_status: BusinessDocumentStatus;
}

interface BusinessVerification {
  id: string;
  business_name: string;
  contact_email: string | null;
  phone: string | null;
  verification_status: string;
  created_at: string;
  website_url: string | null;
  business_type: string;
  application_submitted_at: string | null;
  business_description: string | null;
}

interface DocumentReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBusiness: BusinessVerification | null;
  businessDocuments: BusinessDocument[];
  reviewNotes: string;
  onReviewNotesChange: (notes: string) => void;
  onDocumentAction: (documentId: string, action: string) => void;
  onBusinessApproval: () => void;
  formatDate: (date: string) => string;
}

export function DocumentReviewModal({
  isOpen,
  onClose,
  selectedBusiness,
  businessDocuments,
  reviewNotes,
  onReviewNotesChange,
  onDocumentAction,
  onBusinessApproval,
  formatDate,
}: DocumentReviewModalProps) {
  const { toast } = useToast();

  if (!selectedBusiness) return null;

  const handleViewDocument = (fileUrl: string) => {
    if (fileUrl) {
      window.open(fileUrl, "_blank", "noopener,noreferrer");
    } else {
      toast({
        title: "Error",
        description: "No file URL available for this document",
        variant: "destructive",
      });
    }
  };

  const canApproveBusiness = businessDocuments.length > 0 && 
    businessDocuments.every(doc => doc.verification_status === "verified");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            Business Verification Review
          </DialogTitle>
          <DialogDescription>
            Review and verify business documents and information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Business Information Section */}
          <ROAMCard>
            <ROAMCardHeader>
              <ROAMCardTitle>Business Information</ROAMCardTitle>
            </ROAMCardHeader>
            <ROAMCardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{selectedBusiness.business_name}</div>
                      <div className="text-sm text-muted-foreground capitalize">
                        {selectedBusiness.business_type}
                      </div>
                    </div>
                  </div>
                  
                  {selectedBusiness.contact_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{selectedBusiness.contact_email}</span>
                    </div>
                  )}
                  
                  {selectedBusiness.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{selectedBusiness.phone}</span>
                    </div>
                  )}
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Created {formatDate(selectedBusiness.created_at)}</span>
                  </div>
                  
                  {selectedBusiness.application_submitted_at && (
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">
                        Applied {formatDate(selectedBusiness.application_submitted_at)}
                      </span>
                    </div>
                  )}
                  
                  {selectedBusiness.website_url && (
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <a
                        href={selectedBusiness.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {selectedBusiness.website_url}
                      </a>
                    </div>
                  )}
                </div>
              </div>
              
              {selectedBusiness.business_description && (
                <div className="mt-4">
                  <div className="font-medium text-sm mb-2">Business Description</div>
                  <p className="text-sm text-muted-foreground">
                    {selectedBusiness.business_description}
                  </p>
                </div>
              )}
            </ROAMCardContent>
          </ROAMCard>

          {/* Document Management Section */}
          <ROAMCard>
            <ROAMCardHeader>
              <ROAMCardTitle>Document Management</ROAMCardTitle>
            </ROAMCardHeader>
            <ROAMCardContent>
              <div className="space-y-4">
                {businessDocuments.length > 0 ? (
                  businessDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className={`p-4 border rounded-lg flex items-center justify-between ${
                        doc.verification_status === "verified"
                          ? "border-green-200 bg-green-50"
                          : doc.verification_status === "rejected"
                            ? "border-red-200 bg-red-50"
                            : doc.verification_status === "under_review"
                              ? "border-blue-200 bg-blue-50"
                              : "border-yellow-200 bg-yellow-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {doc.verification_status === "verified" ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : doc.verification_status === "rejected" ? (
                          <XCircle className="w-5 h-5 text-red-600" />
                        ) : doc.verification_status === "under_review" ? (
                          <AlertTriangle className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Clock className="w-5 h-5 text-yellow-600" />
                        )}
                        <div>
                          <div className="font-medium">{doc.document_name}</div>
                          <div className="text-sm text-muted-foreground capitalize">
                            {doc.document_type.replace(/_/g, " ")}
                          </div>
                          {doc.rejection_reason && (
                            <div className="text-xs text-red-600 mt-1">
                              Rejection reason: {doc.rejection_reason}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDocument(doc.file_url)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        {doc.verification_status !== "verified" && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDocumentAction(doc.id, "verify")}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              {doc.verification_status === "rejected" ? "Re-verify" : "Verify"}
                            </Button>
                            {doc.verification_status !== "rejected" &&
                              doc.verification_status !== "under_review" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onDocumentAction(doc.id, "review")}
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                >
                                  <AlertTriangle className="w-4 h-4 mr-1" />
                                  Review
                                </Button>
                              )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDocumentAction(doc.id, "reject")}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No documents uploaded yet</p>
                  </div>
                )}
              </div>
            </ROAMCardContent>
          </ROAMCard>

          {/* Review Notes Section */}
          <ROAMCard>
            <ROAMCardHeader>
              <ROAMCardTitle>Review Notes</ROAMCardTitle>
            </ROAMCardHeader>
            <ROAMCardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="review-notes">Internal Notes</Label>
                  <Textarea
                    id="review-notes"
                    placeholder="Add internal notes about this verification..."
                    value={reviewNotes}
                    onChange={(e) => onReviewNotesChange(e.target.value)}
                    rows={4}
                    className="mt-1"
                  />
                </div>
              </div>
            </ROAMCardContent>
          </ROAMCard>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-6 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <div className="flex gap-3">
            {canApproveBusiness && (
              <Button
                onClick={onBusinessApproval}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve Business
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}