import React, { useState } from 'react';
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
  CheckCircle,
  XCircle,
  Eye,
  FileText,
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

interface IndividualDocumentReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: BusinessDocument | null;
  businessName: string;
  businessEmail: string | null;
  onApprove: (documentId: string, reviewNotes: string) => Promise<void>;
  onReject: (documentId: string, reviewNotes: string) => Promise<void>;
}

export function IndividualDocumentReviewModal({
  isOpen,
  onClose,
  document,
  businessName,
  businessEmail,
  onApprove,
  onReject,
}: IndividualDocumentReviewModalProps) {
  const { toast } = useToast();
  const [reviewNotes, setReviewNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  if (!document) return null;

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

  const handleApprove = async () => {
    if (!document) return;
    
    setIsProcessing(true);
    try {
      await onApprove(document.id, reviewNotes);
      setReviewNotes("");
      onClose();
    } catch (error) {
      console.error("Error approving document:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!document) return;
    
    if (!reviewNotes.trim()) {
      toast({
        title: "Review Notes Required",
        description: "Please provide review notes when rejecting a document",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      await onReject(document.id, reviewNotes);
      setReviewNotes("");
      onClose();
    } catch (error) {
      console.error("Error rejecting document:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setReviewNotes("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Review Document
          </DialogTitle>
          <DialogDescription>
            Review and approve or reject this document for {businessName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Document Information */}
          <ROAMCard>
            <ROAMCardHeader>
              <ROAMCardTitle>Document Information</ROAMCardTitle>
            </ROAMCardHeader>
            <ROAMCardContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Document Name</Label>
                  <div className="mt-1 font-medium">{document.document_name}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Document Type</Label>
                  <div className="mt-1 capitalize">
                    {document.document_type.replace(/_/g, " ")}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Current Status</Label>
                  <div className="mt-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm ${
                      document.verification_status === "verified"
                        ? "bg-green-100 text-green-800"
                        : document.verification_status === "rejected"
                          ? "bg-red-100 text-red-800"
                          : document.verification_status === "under_review"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-yellow-100 text-yellow-800"
                    }`}>
                      {document.verification_status === "verified" && <CheckCircle className="w-3 h-3" />}
                      {document.verification_status === "rejected" && <XCircle className="w-3 h-3" />}
                      {document.verification_status.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
                {document.rejection_reason && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Previous Rejection Reason</Label>
                    <div className="mt-1 text-sm text-red-600">{document.rejection_reason}</div>
                  </div>
                )}
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDocument(document.file_url)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Document
                  </Button>
                </div>
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
                  <Label htmlFor="review-notes">Add your review notes</Label>
                  <Textarea
                    id="review-notes"
                    placeholder="Add your review notes here... (Required for rejection)"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    rows={6}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Review notes will be included in the email notification sent to the business.
                  </p>
                </div>
              </div>
            </ROAMCardContent>
          </ROAMCard>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-6 border-t">
          <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
            Close
          </Button>
          <div className="flex gap-3">
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isProcessing || !reviewNotes.trim()}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

