import React from 'react';
import { Button } from "@/components/ui/button";
import {
  ROAMCard,
  ROAMCardContent,
} from "@/components/ui/roam-card";
import { ROAMBadge } from "@/components/ui/roam-badge";
import {
  Building2,
  Mail,
  Phone,
  Calendar,
  FileText,
  ShieldCheck,
  CheckCircle,
  Eye,
  Clock,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { VerificationStatus, BusinessDocumentStatus, BusinessDocumentType } from "@roam/shared";

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
  verification_status: VerificationStatus;
  is_active: boolean;
  created_at: string;
  website_url: string | null;
  business_type: string;
  identity_verified: boolean;
  bank_connected: boolean;
  setup_completed: boolean | null;
  is_featured: boolean | null;
  application_submitted_at: string | null;
  priority: "normal" | "high" | "urgent";
  documents_count: number;
  verified_documents: number;
  pending_documents: number;
  rejected_documents: number;
  under_review_documents: number;
}

interface BusinessVerificationCardProps {
  business: BusinessVerification;
  documents: BusinessDocument[];
  isExpanded: boolean;
  onToggleExpanded: (businessId: string) => void;
  onViewDocument: (documentId: string, fileUrl: string) => void;
  onDocumentAction: (documentId: string, action: string, businessId?: string) => void;
  onBusinessAction: (businessId: string, action: "approve" | "reject" | "suspend") => void;
  onOpenDocumentReview: (business: BusinessVerification) => void;
  formatDate: (date: string) => string;
}

export function BusinessVerificationCard({
  business,
  documents,
  isExpanded,
  onToggleExpanded,
  onViewDocument,
  onDocumentAction,
  onBusinessAction,
  onOpenDocumentReview,
  formatDate,
}: BusinessVerificationCardProps) {
  const { toast } = useToast();

  const getStatusBadgeVariant = (status: VerificationStatus) => {
    switch (status) {
      case "pending":
        return "warning";
      case "approved":
        return "success";
      case "rejected":
        return "danger";
      case "suspended":
        return "outline";
      default:
        return "outline";
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "danger";
      case "high":
        return "warning";
      default:
        return "outline";
    }
  };

  return (
    <ROAMCard key={business.id} className="overflow-hidden">
      <ROAMCardContent className="p-0">
        {/* Business Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex flex-col">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {business.business_name}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="w-4 h-4" />
                    <span className="capitalize">{business.business_type}</span>
                  </div>
                </div>
              </div>

              {/* Business Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                {business.contact_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{business.contact_email}</span>
                  </div>
                )}
                {business.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{business.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>Created {formatDate(business.created_at)}</span>
                </div>
                {business.application_submitted_at && (
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span>Applied {formatDate(business.application_submitted_at)}</span>
                  </div>
                )}
                {business.website_url && (
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <a
                      href={business.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Website
                    </a>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span>
                    {business.documents_count} documents (
                    {business.verified_documents} verified,{" "}
                    {business.pending_documents} pending)
                  </span>
                </div>
              </div>

              {/* Business Status Indicators */}
              <div className="flex flex-wrap gap-2 mt-3">
                {business.identity_verified && (
                  <ROAMBadge variant="success" size="sm">
                    <ShieldCheck className="w-3 h-3 mr-1" />
                    Identity Verified
                  </ROAMBadge>
                )}
                {business.bank_connected && (
                  <ROAMBadge variant="success" size="sm">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Bank Connected
                  </ROAMBadge>
                )}
                {business.setup_completed && (
                  <ROAMBadge variant="outline" size="sm">
                    Setup Complete
                  </ROAMBadge>
                )}
                {business.is_featured && (
                  <ROAMBadge variant="warning" size="sm">
                    Featured
                  </ROAMBadge>
                )}
              </div>
            </div>

            {/* Status and Priority Badges */}
            <div className="flex flex-col items-end gap-2 ml-4">
              <ROAMBadge variant={getStatusBadgeVariant(business.verification_status)}>
                {business.verification_status}
              </ROAMBadge>
              {business.priority !== "normal" && (
                <ROAMBadge variant={getPriorityBadgeVariant(business.priority)} size="sm">
                  {business.priority} priority
                </ROAMBadge>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onToggleExpanded(business.id)}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-1" />
                  Hide Details
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-1" />
                  Show Details
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenDocumentReview(business)}
            >
              <Eye className="w-4 h-4 mr-1" />
              Review Documents
            </Button>

            {business.verification_status === "pending" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onBusinessAction(business.id, "approve")}
                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onBusinessAction(business.id, "reject")}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Reject
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onBusinessAction(business.id, "suspend")}
                  className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                >
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  Suspend
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Expanded Documents Section */}
        {isExpanded && (
          <div className="p-6 bg-gray-50">
            <h4 className="text-md font-medium text-gray-900 mb-4">
              Business Documents ({documents.length})
            </h4>
            {documents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No documents uploaded yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className={`p-4 border rounded-lg ${
                      doc.verification_status === "verified"
                        ? "border-green-200 bg-green-50"
                        : doc.verification_status === "rejected"
                          ? "border-red-200 bg-red-50"
                          : doc.verification_status === "under_review"
                            ? "border-blue-200 bg-blue-50"
                            : "border-yellow-200 bg-yellow-50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {doc.verification_status === "verified" ? (
                          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                        ) : doc.verification_status === "rejected" ? (
                          <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                        ) : doc.verification_status === "under_review" ? (
                          <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
                        ) : (
                          <Clock className="w-5 h-5 text-yellow-600 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <div className="font-medium text-sm">{doc.document_name}</div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {doc.document_type.replace(/_/g, " ")}
                          </div>
                          {doc.rejection_reason && (
                            <div className="text-xs text-red-600 mt-1">
                              Rejected: {doc.rejection_reason}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Document Actions */}
                    <div className="flex gap-1 mt-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => onViewDocument(doc.id, doc.file_url)}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </Button>

                      {doc.verification_status !== "verified" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            onDocumentAction(doc.id, "verify", business.id)
                          }
                          className="h-7 px-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Verify
                        </Button>
                      )}

                      {doc.verification_status !== "rejected" &&
                        doc.verification_status !== "under_review" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              onDocumentAction(doc.id, "review", business.id)
                            }
                            className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Review
                          </Button>
                        )}

                      {doc.verification_status !== "rejected" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            onDocumentAction(doc.id, "reject", business.id)
                          }
                          className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <XCircle className="w-3 h-3 mr-1" />
                          Reject
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </ROAMCardContent>
    </ROAMCard>
  );
}