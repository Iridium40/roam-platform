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
  XCircle,
  AlertTriangle,
} from "lucide-react";

interface BusinessActionHandlersProps {
  // Document rejection modal state
  isRejectModalOpen: boolean;
  selectedDocumentForReject: string | null;
  rejectionReasonText: string;
  onRejectModalChange: (open: boolean) => void;
  onRejectionReasonChange: (reason: string) => void;
  onRejectSubmit: () => void;
  
  // Business action modal state
  isBusinessActionModalOpen: boolean;
  selectedBusinessForAction: string | null;
  businessActionType: "reject" | "suspend" | null;
  businessActionNotes: string;
  onBusinessActionModalChange: (open: boolean) => void;
  onBusinessActionNotesChange: (notes: string) => void;
  onBusinessActionSubmit: () => void;
}

export function BusinessActionHandlers({
  isRejectModalOpen,
  selectedDocumentForReject,
  rejectionReasonText,
  onRejectModalChange,
  onRejectionReasonChange,
  onRejectSubmit,
  isBusinessActionModalOpen,
  selectedBusinessForAction,
  businessActionType,
  businessActionNotes,
  onBusinessActionModalChange,
  onBusinessActionNotesChange,
  onBusinessActionSubmit,
}: BusinessActionHandlersProps) {
  
  const closeRejectModal = () => {
    onRejectModalChange(false);
  };
  
  const closeBusinessActionModal = () => {
    onBusinessActionModalChange(false);
  };

  return (
    <>
      {/* Document Rejection Reason Modal */}
      <Dialog open={isRejectModalOpen} onOpenChange={onRejectModalChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              Reject Document
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this document. This will
              help the business understand what needs to be corrected.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="rejection-reason">Rejection Reason</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Please explain why this document is being rejected..."
                value={rejectionReasonText}
                onChange={(e) => onRejectionReasonChange(e.target.value)}
                rows={4}
                className="mt-1"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={closeRejectModal}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={onRejectSubmit}
                disabled={!rejectionReasonText.trim()}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject Document
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Business Action Modal (for Reject/Suspend with Notes) */}
      <Dialog
        open={isBusinessActionModalOpen}
        onOpenChange={onBusinessActionModalChange}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {businessActionType === "reject" ? (
                <>
                  <XCircle className="w-5 h-5 text-red-600" />
                  Reject Business
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  Suspend Business
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {businessActionType === "reject"
                ? "Please provide a reason for rejecting this business verification. This will help the business understand what went wrong."
                : "Please provide a reason for suspending this business. This action can be reversed later."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="business-action-notes">Notes</Label>
              <Textarea
                id="business-action-notes"
                placeholder={
                  businessActionType === "reject"
                    ? "Please explain why this business verification is being rejected..."
                    : "Please explain why this business is being suspended..."
                }
                value={businessActionNotes}
                onChange={(e) => onBusinessActionNotesChange(e.target.value)}
                rows={4}
                className="mt-1"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={closeBusinessActionModal}>
                Cancel
              </Button>
              <Button
                variant={
                  businessActionType === "reject" ? "destructive" : "outline"
                }
                onClick={onBusinessActionSubmit}
                disabled={!businessActionNotes.trim()}
                className={
                  businessActionType === "suspend"
                    ? "text-orange-600 border-orange-600 hover:bg-orange-50"
                    : ""
                }
              >
                {businessActionType === "reject" ? (
                  <>
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject Business
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Suspend Business
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}