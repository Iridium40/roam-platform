import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { ROAMDataTable, Column } from "@/components/ui/roam-data-table";
import {
  ROAMCard,
  ROAMCardHeader,
  ROAMCardTitle,
  ROAMCardContent,
} from "@/components/ui/roam-card";
import { ROAMStatCard } from "@/components/ui/roam-stat-card";
import { ROAMBadge } from "@/components/ui/roam-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ShieldCheck,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Eye,
  Building2,
  Calendar,
  MapPin,
  Mail,
  Phone,
  TrendingUp,
  Search,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { DocumentReviewModal } from "@/components/verification/DocumentReviewModal";
import { IndividualDocumentReviewModal } from "@/components/verification/IndividualDocumentReviewModal";

// Types based on the actual database schema
type BusinessDocumentStatus =
  | "pending"
  | "verified"
  | "rejected"
  | "under_review";
type VerificationStatus = "pending" | "approved" | "rejected" | "suspended";
type BusinessType =
  | "independent"
  | "business";
// Matches database enum: business_document_type
type BusinessDocumentType =
  | "drivers_license"
  | "proof_of_address"
  | "liability_insurance"
  | "professional_license"
  | "professional_certificate"
  | "business_license";

interface BusinessProfile {
  id: string;
  business_name: string;
  contact_email: string | null;
  phone: string | null;
  verification_status: VerificationStatus;
  stripe_account_id: string | null;
  is_active: boolean;
  created_at: string;
  image_url: string | null;
  website_url: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  business_hours: any;
  social_media: any;
  verification_notes: string | null;
  business_type: BusinessType;
  service_categories: string[] | null;
  service_subcategories: string[] | null;
  setup_completed: boolean | null;
  setup_step: number | null;
  is_featured: boolean | null;
  identity_verified: boolean;
  identity_verified_at: string | null;
  bank_connected: boolean;
  bank_connected_at: string | null;
  application_submitted_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  approval_notes: string | null;
  business_description: string | null;
}

interface BusinessVerification extends BusinessProfile {
  priority: "normal" | "high" | "urgent";
  documents_count: number;
  verified_documents: number;
  pending_documents: number;
  rejected_documents: number;
  under_review_documents: number;
}

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

interface VerificationStats {
  total: number;
  pending: number;
  suspended: number;
  approved: number;
  rejected: number;
  overdue: number;
}

export default function AdminVerification() {
  const { toast } = useToast();
  const { user } = useAuth();

  // State
  const [verifications, setVerifications] = useState<BusinessVerification[]>(
    [],
  );
  const [documents, setDocuments] = useState<BusinessDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<VerificationStats>({
    total: 0,
    pending: 0,
    suspended: 0,
    approved: 0,
    rejected: 0,
    overdue: 0,
  });

  // Filters - Default to showing pending businesses for admin workflow
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal state
  const [isDocumentReviewOpen, setIsDocumentReviewOpen] = useState(false);
  const [selectedBusiness, setSelectedBusiness] =
    useState<BusinessVerification | null>(null);
  const [businessDocuments, setBusinessDocuments] = useState<
    BusinessDocument[]
  >([]);
  const [reviewNotes, setReviewNotes] = useState("");
  
  // Individual document review modal state
  const [isIndividualDocumentReviewOpen, setIsIndividualDocumentReviewOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<BusinessDocument | null>(null);

  // Card state
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [cardDocuments, setCardDocuments] = useState<
    Record<string, BusinessDocument[]>
  >({});

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch verification data
  const fetchVerifications = async () => {
    try {
      console.log("fetchVerifications started");
      setLoading(true);
      setError(null);

      console.log("Fetching business profiles from optimized API (with pre-aggregated document counts)...");
      // Use optimized approvals view that includes document counts in a single query
      // Pass verification_status=all to get ALL businesses with their document counts
      const businessResponse = await fetch('/api/businesses?use_approvals_view=true&verification_status=all');
      const businessResult = await businessResponse.json();

      if (!businessResponse.ok) {
        console.error("Business profiles error:", businessResult.error);
        throw new Error(businessResult.error || 'Failed to fetch businesses');
      }

      const businessData = businessResult.data || [];
      console.log("Business profiles result (optimized):", {
        count: businessData.length,
        sample: businessData[0],
      });

      // Prepare verification data - document counts are already included in the view!
      console.log("Preparing verification data...");
      const verificationData: BusinessVerification[] = (businessData || []).map(
        (business) => {
          const submittedDate = business.application_submitted_at
            ? new Date(business.application_submitted_at)
            : new Date(business.created_at);

          // Determine priority based on status, application submission, and document status
          let priority: "normal" | "high" | "urgent" = "normal";
          // Document stats now come directly from the view
          const businessStats = {
            total: business.total_documents || 0,
            verified: business.verified_documents || 0,
            pending: business.pending_documents || 0,
            rejected: business.rejected_documents || 0,
            under_review: business.under_review_documents || 0,
          };

          const now = new Date();
          const daysSinceSubmission = Math.ceil(
            (now.getTime() - submittedDate.getTime()) / (1000 * 60 * 60 * 24),
          );

          if (business.verification_status === "pending") {
            if (daysSinceSubmission > 7)
              priority = "urgent"; // Over 7 days
            else if (daysSinceSubmission > 3) priority = "high"; // Over 3 days
          } else if (business.verification_status === "suspended") {
            priority = "urgent"; // Suspended businesses need immediate attention
          }

          return {
            ...business,
            priority,
            documents_count: businessStats.total,
            verified_documents: businessStats.verified,
            pending_documents: businessStats.pending,
            rejected_documents: businessStats.rejected,
            under_review_documents: businessStats.under_review,
          };
        },
      );

      console.log(
        "Verification data prepared:",
        verificationData.length,
        "total businesses",
      );
      setVerifications(verificationData);

      // Calculate stats
      console.log("Calculating stats...");
      const newStats: VerificationStats = {
        total: verificationData.length,
        pending: verificationData.filter(
          (v) => v.verification_status === "pending",
        ).length,
        suspended: verificationData.filter(
          (v) => v.verification_status === "suspended",
        ).length,
        approved: verificationData.filter(
          (v) => v.verification_status === "approved",
        ).length,
        rejected: verificationData.filter(
          (v) => v.verification_status === "rejected",
        ).length,
        overdue: verificationData.filter((v) => v.priority === "urgent").length,
      };
      console.log("Stats calculated:", newStats);
      setStats(newStats);
      console.log("fetchVerifications completed successfully");
    } catch (error: any) {
      console.error("Full error object in fetchVerifications:", error);
      console.error("Error type:", typeof error);
      console.error("Error keys:", Object.keys(error || {}));

      let errorMessage = "Unknown error occurred";

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error_description) {
        errorMessage = error.error_description;
      } else if (error?.details) {
        errorMessage = error.details;
      } else if (error?.hint) {
        errorMessage = error.hint;
      } else if (typeof error === "string") {
        errorMessage = error;
      } else {
        try {
          errorMessage = JSON.stringify(error);
        } catch (e) {
          errorMessage = `Serialization failed. Error type: ${typeof error}`;
        }
      }

      console.error("Final error message:", errorMessage);
      console.error("User authenticated:", !!user?.id);

      setError(`Failed to fetch verification data: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch documents for specific business
  const fetchBusinessDocuments = async (businessId: string) => {
    try {
      console.log("fetchBusinessDocuments called for business_id:", businessId);
      
      // Use server API endpoint with service role key (bypasses RLS)
      const response = await fetch(`/api/business-documents?business_id=${businessId}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const result = await response.json();
      
      console.log("fetchBusinessDocuments API result:", {
        businessId,
        documentsCount: result.data?.length || 0,
        documents: result.data,
      });

      setBusinessDocuments(result.data || []);
      
      if (!result.data || result.data.length === 0) {
        console.warn("No documents found for business_id:", businessId);
      }
    } catch (error: any) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      console.error("Error fetching business documents:", errorMessage);
      toast({
        title: "Error",
        description: `Failed to load business documents: ${errorMessage}`,
        variant: "destructive",
      });
    }
  };

  // Dialog state for rejection reason
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedDocumentForReject, setSelectedDocumentForReject] = useState<
    string | null
  >(null);
  const [rejectionReasonText, setRejectionReasonText] = useState("");

  // Dialog state for business verification actions
  const [isBusinessActionModalOpen, setIsBusinessActionModalOpen] =
    useState(false);
  const [selectedBusinessForAction, setSelectedBusinessForAction] = useState<
    string | null
  >(null);
  const [businessActionType, setBusinessActionType] = useState<
    "reject" | "suspend" | null
  >(null);
  const [businessActionNotes, setBusinessActionNotes] = useState("");

  // Handle individual document verification status changes
  const handleDocumentAction = async (
    documentId: string,
    action: "verify" | "reject" | "review",
    rejectionReason?: string,
  ) => {
    try {
      // Validate required data
      if (!user?.id) {
        throw new Error("User not authenticated - please log in again");
      }

      if (!documentId) {
        throw new Error("Document ID is required");
      }

      let status: BusinessDocumentStatus;
      switch (action) {
        case "verify":
          status = "verified";
          break;
        case "reject":
          status = "rejected";
          break;
        case "review":
          status = "under_review";
          break;
        default:
          throw new Error(`Invalid action: ${action}`);
      }

      const updateData: any = {
        verification_status: status,
      };

      // Only set verified_by and verified_at when actually verifying the document
      if (action === "verify") {
        updateData.verified_by = user.id;
        updateData.verified_at = new Date().toISOString();
      } else {
        // For other actions (review, reject), leave verified_by as NULL
        updateData.verified_by = null;
        updateData.verified_at = null;
      }

      if (action === "reject" && rejectionReason) {
        updateData.rejection_reason = rejectionReason;
      }

      console.log("Updating document with data:", { documentId, updateData });

      const updateResponse = await fetch("/api/business-documents", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: documentId,
          ...updateData,
        }),
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to update document (${updateResponse.status})`
        );
      }

      const result = await updateResponse.json();
      console.log("Document update response:", result);

      toast({
        title: "Success",
        description: `Document status updated to ${status.replace("_", " ")} successfully`,
      });

      // Refresh business documents
      if (selectedBusiness) {
        await fetchBusinessDocuments(selectedBusiness.id);
      }

      // Close rejection modal if it was open
      setIsRejectModalOpen(false);
      setSelectedDocumentForReject(null);
      setRejectionReasonText("");
    } catch (error: any) {
      console.error("Full error object:", error);
      console.error("Error type:", typeof error);
      console.error("Error keys:", Object.keys(error || {}));

      let errorMessage = "Unknown error occurred";

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error_description) {
        errorMessage = error.error_description;
      } else if (error?.details) {
        errorMessage = error.details;
      } else if (typeof error === "string") {
        errorMessage = error;
      } else {
        try {
          errorMessage = JSON.stringify(error);
        } catch (e) {
          errorMessage = `Serialization failed. Error type: ${typeof error}`;
        }
      }

      console.error("Final error message:", errorMessage);

      toast({
        title: "Error",
        description: `Failed to update document status: ${errorMessage}`,
        variant: "destructive",
      });
    }
  };

  // Handle reject button click - opens modal for rejection reason
  const handleRejectClick = (documentId: string) => {
    setSelectedDocumentForReject(documentId);
    setRejectionReasonText("");
    setIsRejectModalOpen(true);
  };

  // Handle rejection reason submission
  const handleRejectSubmit = () => {
    if (selectedDocumentForReject && rejectionReasonText.trim()) {
      handleDocumentAction(
        selectedDocumentForReject,
        "reject",
        rejectionReasonText.trim(),
      );
    } else {
      toast({
        title: "Error",
        description: "Please provide a rejection reason",
        variant: "destructive",
      });
    }
  };

  // Handle business action button clicks - opens modal for reject/suspend
  const handleBusinessActionClick = (
    businessId: string,
    actionType: "reject" | "suspend",
  ) => {
    setSelectedBusinessForAction(businessId);
    setBusinessActionType(actionType);
    setBusinessActionNotes("");
    setIsBusinessActionModalOpen(true);
  };

  // Handle business action submission
  const handleBusinessActionSubmit = () => {
    if (
      selectedBusinessForAction &&
      businessActionType &&
      businessActionNotes.trim()
    ) {
      handleVerificationAction(
        selectedBusinessForAction,
        businessActionType,
        businessActionNotes.trim(),
      );
    } else {
      toast({
        title: "Error",
        description: "Please provide notes for this action",
        variant: "destructive",
      });
    }
  };

  // Close business action modal
  const closeBusinessActionModal = () => {
    setIsBusinessActionModalOpen(false);
    setSelectedBusinessForAction(null);
    setBusinessActionType(null);
    setBusinessActionNotes("");
  };

  // Open individual document review modal
  const openIndividualDocumentReview = (document: BusinessDocument, business: BusinessVerification) => {
    setSelectedDocument(document);
    setSelectedBusiness(business);
    setIsIndividualDocumentReviewOpen(true);
  };

  // Handle document approval with email
  const handleDocumentApproval = async (documentId: string, reviewNotes: string) => {
    if (!selectedBusiness || !selectedDocument) return;

    try {
      // Update document status
      await handleDocumentAction(documentId, "verify");

      // Send approval email
      if (selectedBusiness.contact_email) {
        try {
          const emailPayload = {
            businessName: selectedBusiness.business_name,
            contactEmail: selectedBusiness.contact_email,
            approvalNotes: reviewNotes || `Your ${selectedDocument.document_type.replace(/_/g, " ")} document has been approved.`,
            businessId: selectedBusiness.id,
            userId: user?.id,
          };

          const emailResponse = await fetch("/api/send-approval-email", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(emailPayload),
          });

          if (emailResponse.ok) {
            toast({
              title: "Document Approved",
              description: "Document approved and email sent to business",
            });
          } else {
            toast({
              title: "Document Approved",
              description: "Document approved but email could not be sent",
              variant: "default",
            });
          }
        } catch (emailError) {
          console.error("Error sending approval email:", emailError);
          toast({
            title: "Document Approved",
            description: "Document approved but email could not be sent",
            variant: "default",
          });
        }
      }

      // Refresh documents
      await fetchBusinessDocuments(selectedBusiness.id);
      if (expandedCards.has(selectedBusiness.id)) {
        await fetchCardDocuments(selectedBusiness.id);
      }
    } catch (error: any) {
      console.error("Error approving document:", error);
      toast({
        title: "Error",
        description: `Failed to approve document: ${error.message || "Unknown error"}`,
        variant: "destructive",
      });
      throw error;
    }
  };

  // Handle document rejection with email
  const handleDocumentRejection = async (documentId: string, reviewNotes: string) => {
    if (!selectedBusiness || !selectedDocument) return;

    if (!reviewNotes.trim()) {
      toast({
        title: "Review Notes Required",
        description: "Please provide review notes when rejecting a document",
        variant: "destructive",
      });
      return;
    }

    try {
      // Update document status
      await handleDocumentAction(documentId, "reject", reviewNotes.trim());

      // Send rejection email
      if (selectedBusiness.contact_email) {
        try {
          const emailPayload = {
            businessName: selectedBusiness.business_name,
            contactEmail: selectedBusiness.contact_email,
            rejectionReason: reviewNotes.trim(),
            businessId: selectedBusiness.id,
            userId: user?.id,
          };

          const emailResponse = await fetch("/api/send-rejection-email", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(emailPayload),
          });

          if (emailResponse.ok) {
            try {
              const emailResult = await emailResponse.json();
              if (emailResult.emailStatus?.sent) {
                toast({
                  title: "Document Rejected",
                  description: "Document rejected and email sent to business",
                });
              } else if (emailResult.emailStatus?.warning) {
                toast({
                  title: "Document Rejected",
                  description: "Document rejected successfully. Note: Email could not be sent due to Resend test mode limitations.",
                  variant: "default",
                });
              } else {
                toast({
                  title: "Document Rejected",
                  description: "Document rejected but email could not be sent",
                  variant: "default",
                });
              }
            } catch (parseError) {
              toast({
                title: "Document Rejected",
                description: "Document rejected and email sent to business",
              });
            }
          } else {
            toast({
              title: "Document Rejected",
              description: "Document rejected but email could not be sent",
              variant: "default",
            });
          }
        } catch (emailError) {
          console.error("Error sending rejection email:", emailError);
          toast({
            title: "Document Rejected",
            description: "Document rejected but email could not be sent",
            variant: "default",
          });
        }
      }

      // Refresh documents
      await fetchBusinessDocuments(selectedBusiness.id);
      if (expandedCards.has(selectedBusiness.id)) {
        await fetchCardDocuments(selectedBusiness.id);
      }
    } catch (error: any) {
      console.error("Error rejecting document:", error);
      toast({
        title: "Error",
        description: `Failed to reject document: ${error.message || "Unknown error"}`,
        variant: "destructive",
      });
      throw error;
    }
  };

  // Handle verification actions
  const handleVerificationAction = async (
    businessId: string,
    action: "approve" | "reject" | "suspend" | "pending",
    notes?: string,
  ) => {
    try {
      console.log("handleVerificationAction called with:", {
        businessId,
        action,
        notes,
        userId: user?.id,
      });

      let newStatus: VerificationStatus;
      switch (action) {
        case "approve":
          newStatus = "approved";
          break;
        case "reject":
          newStatus = "rejected";
          break;
        case "suspend":
          newStatus = "suspended";
          break;
        case "pending":
          newStatus = "pending";
          break;
        default:
          console.error("Invalid action provided:", action);
          return;
      }

      console.log("Status to set:", newStatus);

      // NOTE: Documents are optional. Approval should not be blocked by document status.
      if (action === "approve") {
        console.log("Checking if all documents are verified before approval...");
        
        // Fetch documents for this business
        const response = await fetch(`/api/business-documents?business_id=${businessId}`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch business documents for validation");
        }
        
        const result = await response.json();
        const documents = result.data || [];
        
        console.log("Documents validation:", {
          total: documents.length,
          documents: documents.map((d: any) => ({
            type: d.document_type,
            status: d.verification_status
          }))
        });
        
        // Check if there are any unverified documents (only if documents exist)
        const unverifiedDocs = documents.filter(
          (doc: any) => doc.verification_status !== "verified"
        );
        
        // If documents exist and some are unverified, warn but continue.
        if (documents.length > 0 && unverifiedDocs.length > 0) {
          const unverifiedList = unverifiedDocs
            .map((doc: any) => `${doc.document_type} (${doc.verification_status})`)
            .join(", ");
          
          toast({
            title: "Unverified documents",
            description: `Proceeding with approval. Unverified documents: ${unverifiedList}`,
            variant: "default",
          });
        }
        
        console.log("Proceeding with approval (documents verified or none uploaded)...");
      }

      const updateData: any = {
        verification_status: newStatus,
        verification_notes: notes || null,
      };

      // Handle approve action via proper API endpoint
      if (action === "approve") {
        console.log("Approval action - calling approve-business API for:", businessId);

        if (!user?.id) {
          throw new Error("User ID not found. Please log in again.");
        }

        // Call the proxy API that creates proper approval records
        const approvalResponse = await fetch("/api/approve-business", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            businessId: businessId,
            adminUserId: user.id, // Auth user ID
            approvalNotes: notes || null,
            sendEmail: true,
          }),
        });

        console.log("Approval API response status:", approvalResponse.status);

        if (!approvalResponse.ok) {
          const errorData = await approvalResponse.json().catch(() => ({}));
          console.error("Approval API error:", errorData);
          throw new Error(
            errorData.error || `Failed to approve application (${approvalResponse.status})`
          );
        }

        const approvalResult = await approvalResponse.json();
        console.log("Approval successful:", approvalResult);

        // Check email status
        const emailStatus = approvalResult.emailStatus;
        
        // Show success toast for approval
        toast({
          title: "Business Approved & Activated",
          description: "Business is now active and the owner can log in.",
          variant: "default",
        });

        // Show separate warning if email wasn't sent
        if (!emailStatus?.sent) {
          if (emailStatus?.warning) {
            toast({
              title: "Email Not Sent",
              description: emailStatus.warning,
              variant: "destructive",
            });
          } else if (emailStatus?.error) {
            toast({
              title: "Email Not Sent",
              description: `Email could not be sent: ${emailStatus.error}. Approval link: ${approvalResult.approvalUrl}`,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Email Sent",
            description: "Approval email with Phase 2 onboarding link has been sent.",
            variant: "default",
          });
        }
          } else {
        // For other actions (reject, suspend, pending), update directly via API
        const updateResponse = await fetch("/api/businesses", {
          method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
          body: JSON.stringify({
            id: businessId,
            ...updateData,
          }),
        });

        if (!updateResponse.ok) {
          const errorData = await updateResponse.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Failed to update business status (${updateResponse.status})`
          );
        }

              toast({
          title: `Business ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
          description: `Business verification status updated to ${newStatus}.`,
                variant: "default",
              });
      }

      // Send rejection email if business was rejected
      if (action === "reject" && notes) {
        try {
          console.log("Sending rejection email for business:", businessId);

          // Get business details for the email via API
          const businessResponse = await fetch(`/api/businesses?id=${businessId}`);
          
          if (!businessResponse.ok) {
            console.error("Could not fetch business details");
            toast({
              title: "Business Rejected",
              description:
                "Business verification rejected successfully. Note: Could not send rejection notification.",
              variant: "default",
            });
          } else {
            const businessResult = await businessResponse.json();
            const businessData = businessResult.data?.[0];

          if (!businessData?.contact_email) {
            console.error("No contact email found for business");
            toast({
              title: "Business Rejected",
              description:
                "Business verification rejected successfully. Note: No contact email found for rejection notification.",
              variant: "default",
            });
          } else {
            console.log(
              "Sending rejection email to:",
              businessData.contact_email,
            );

            const emailPayload = {
              businessName: businessData.business_name,
              contactEmail: businessData.contact_email,
              rejectionReason: notes,
              businessId: businessId,
              userId: user?.id,
            };

            console.log("Rejection email API payload:", emailPayload);

            // Send email via our server-side API endpoint
            const emailResponse = await fetch("/api/send-rejection-email", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(emailPayload),
            });

            console.log("Rejection email API response status:", emailResponse.status);

            if (emailResponse.ok) {
              try {
                const emailResult = await emailResponse.json();
                console.log("Rejection email API response:", emailResult);
                
                if (emailResult.emailStatus?.sent) {
                  toast({
                    title: "Business Rejected",
                    description: "Business verification rejected and email sent to business",
                  });
                } else if (emailResult.emailStatus?.warning) {
                  toast({
                    title: "Business Rejected",
                    description: "Business verification rejected successfully. Note: Email could not be sent due to Resend test mode limitations.",
                    variant: "default",
                  });
                } else {
                  toast({
                    title: "Business Rejected",
                    description: "Business verification rejected successfully. Note: Rejection email could not be sent.",
                    variant: "default",
                  });
                }
              } catch (parseError) {
                console.log("Rejection email sent successfully (could not parse response details)");
                toast({
                  title: "Business Rejected",
                  description: "Business verification rejected and email sent to business",
                });
              }
            } else {
              const errorMessage = `HTTP ${emailResponse.status} - Email service error`;
              console.error("Failed to send rejection email:", errorMessage);

              toast({
                title: "Business Rejected",
                description: `Business verification rejected successfully. Note: Rejection email could not be sent. Error: ${errorMessage}`,
                variant: "default",
              });
            }
            }
          }
        } catch (emailError) {
          console.error("Error sending rejection email:", emailError);

          let errorMessage = "Network error or server unavailable";
          if (emailError instanceof Error) {
            errorMessage = emailError.message;
          } else if (typeof emailError === "string") {
            errorMessage = emailError;
          } else if (emailError && typeof emailError === "object") {
            try {
              errorMessage = JSON.stringify(emailError);
            } catch (e) {
              errorMessage = "Unknown error occurred";
            }
          }

          // Don't throw error here - business rejection succeeded
          toast({
            title: "Business Rejected",
            description: `Business verification rejected successfully. Note: Rejection email could not be sent. Error: ${errorMessage}`,
            variant: "default",
          });
        }
      }

      const actionText =
        {
          approve: "approved",
          reject: "rejected",
          suspend: "suspended",
          pending: "set to pending",
        }[action] || "updated";

      // Show success toast for non-approval/rejection actions
      if (action !== "approve" && action !== "reject") {
        toast({
          title: "Success",
          description: `Business verification ${actionText}`,
        });
      } else if (action === "approve") {
        // Approval already shows a dedicated toast above (plus email status toast).
      } else if (action === "reject") {
        // For rejection, show success message (email status handled above)
        toast({
          title: "Success",
          description: `Business verification rejected successfully`,
        });
      }

      // Refresh data
      await fetchVerifications();
      setIsDocumentReviewOpen(false);

      // Close business action modal if it was open
      setIsBusinessActionModalOpen(false);
      setSelectedBusinessForAction(null);
      setBusinessActionType(null);
      setBusinessActionNotes("");
    } catch (error: any) {
      console.error("Full error object:", error);
      console.error("Error type:", typeof error);
      console.error("Error keys:", Object.keys(error || {}));

      let errorMessage = "Unknown error occurred";

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error_description) {
        errorMessage = error.error_description;
      } else if (error?.details) {
        errorMessage = error.details;
      } else if (typeof error === "string") {
        errorMessage = error;
      } else {
        try {
          errorMessage = JSON.stringify(error);
        } catch (e) {
          errorMessage = `Serialization failed. Error type: ${typeof error}`;
        }
      }

      console.error("Final error message:", errorMessage);
      console.error("Action attempted:", action);
      console.error("Business ID:", businessId);
      console.error("Notes provided:", notes);

      toast({
        title: "Error",
        description: `Failed to update verification status: ${errorMessage}`,
        variant: "destructive",
      });
    }
  };

  // Toggle card expansion and fetch documents
  const toggleCardExpansion = async (businessId: string) => {
    const newExpanded = new Set(expandedCards);

    if (expandedCards.has(businessId)) {
      newExpanded.delete(businessId);
    } else {
      newExpanded.add(businessId);
      // Fetch documents for this business if not already loaded
      if (!cardDocuments[businessId]) {
        await fetchCardDocuments(businessId);
      }
    }

    setExpandedCards(newExpanded);
  };

  // Fetch documents for card view
  const fetchCardDocuments = async (businessId: string) => {
    try {
      console.log("Fetching documents for business:", businessId);

      // Use server API endpoint (same as fetchBusinessDocuments) to bypass RLS
      const response = await fetch(`/api/business-documents?business_id=${businessId}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const result = await response.json();
      const documents: BusinessDocument[] = result.data || [];
      
      console.log("fetchCardDocuments response:", {
        businessId,
        documentsCount: documents.length,
      });

      setCardDocuments((prev) => ({
        ...prev,
        [businessId]: documents,
      }));

      // Update the verifications state with accurate document counts from the fetched data
      // This ensures the header counts match the actual documents
      setVerifications((prev) =>
        prev.map((v) => {
          if (v.id === businessId) {
            const verified = documents.filter(d => d.verification_status === 'verified').length;
            const pending = documents.filter(d => d.verification_status === 'pending').length;
            const rejected = documents.filter(d => d.verification_status === 'rejected').length;
            const underReview = documents.filter(d => d.verification_status === 'under_review').length;
            return {
              ...v,
              documents_count: documents.length,
              verified_documents: verified,
              pending_documents: pending,
              rejected_documents: rejected,
              under_review_documents: underReview,
            };
          }
          return v;
        })
      );
    } catch (error: any) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      console.error("Error fetching card documents:", errorMessage);
      toast({
        title: "Error",
        description: `Failed to load documents: ${errorMessage}`,
        variant: "destructive",
      });
    }
  };

  // Open document review modal
  const openDocumentReview = async (business: BusinessVerification) => {
    setSelectedBusiness(business);
    setReviewNotes(business.verification_notes || "");
    await fetchBusinessDocuments(business.id);
    setIsDocumentReviewOpen(true);
  };

  // Filter verifications
  const filteredVerifications = verifications.filter((verification) => {
    const matchesStatus =
      statusFilter === "all" ||
      verification.verification_status === statusFilter;
    const matchesPriority =
      priorityFilter === "all" || verification.priority === priorityFilter;
    const matchesSearch =
      searchQuery === "" ||
      verification.business_name
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      verification.contact_email
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());

    return matchesStatus && matchesPriority && matchesSearch;
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredVerifications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedVerifications = filteredVerifications.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, priorityFilter, searchQuery]);

  // Get status badge variant
  const getStatusVariant = (status: VerificationStatus): "default" | "success" | "warning" | "secondary" | "danger" | "neutral" | "outline" => {
    switch (status) {
      case "approved":
        return "success";
      case "rejected":
        return "danger";
      case "suspended":
        return "warning";
      case "pending":
        return "secondary";
      default:
        return "secondary";
    }
  };

  // Get priority badge variant
  const getPriorityVariant = (priority: string): "default" | "success" | "warning" | "secondary" | "danger" | "neutral" | "outline" => {
    switch (priority) {
      case "urgent":
        return "danger";
      case "high":
        return "warning";
      case "normal":
        return "secondary";
      default:
        return "secondary";
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Columns for verification table
  const columns: Column[] = [
    {
      key: "business_name",
      header: "Business",
      sortable: true,
      render: (value: string, row: BusinessVerification) => (
        <div className="flex flex-col">
          <div className="font-medium">{value}</div>
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Building2 className="w-3 h-3" />
            {row.business_type}
          </div>
        </div>
      ),
    },
    {
      key: "verification_status",
      header: "Status",
      sortable: true,
      render: (value: VerificationStatus) => (
        <div className="flex gap-2">
          <ROAMBadge variant={getStatusVariant(value)}>
            {value.replace("_", " ")}
          </ROAMBadge>
        </div>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      sortable: true,
      render: (value: string) => (
        <ROAMBadge variant={getPriorityVariant(value)}>{value}</ROAMBadge>
      ),
    },
    {
      key: "contact_email",
      header: "Contact",
      render: (value: string | null, row: BusinessVerification) => (
        <div className="text-sm">
          {value && (
            <div className="flex items-center gap-1">
              <Mail className="w-3 h-3" />
              {value}
            </div>
          )}
          {row.phone && (
            <div className="flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {row.phone}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "submitted_at",
      header: "Submitted",
      sortable: true,
      render: (value: string) => (
        <div className="text-sm">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDate(value)}
          </div>
        </div>
      ),
    },
    {
      key: "due_date",
      header: "Due Date",
      sortable: true,
      render: (value: string | null) => (
        <div className="text-sm">
          {value && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDate(value)}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (value: any, row: BusinessVerification) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => openDocumentReview(row)}
          className="text-roam-blue hover:text-roam-blue hover:bg-blue-50"
        >
          <Eye className="w-4 h-4 mr-1" />
          Review
        </Button>
      ),
    },
  ];

  useEffect(() => {
    fetchVerifications();
  }, []);

  if (loading) {
    return (
      <AdminLayout title="Approvals">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-roam-blue" />
            <p className="text-muted-foreground">Loading approvals...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Business Verification">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">Approvals</h1>
            <p className="text-muted-foreground mt-1">
              Review documents and approve or reject businesses requesting platform access
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => fetchVerifications()}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Workflow Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <ROAMStatCard
            title="Needs Review"
            value={stats.pending.toString()}
            icon={<Clock className="w-6 h-6" />}
            changeText="pending approval"
            changeType="neutral"
          />
          <ROAMStatCard
            title="Urgent"
            value={stats.overdue.toString()}
            icon={<AlertTriangle className="w-6 h-6" />}
            changeText="requires immediate attention"
            changeType="negative"
          />
          <ROAMStatCard
            title="Approved Today"
            value={stats.approved.toString()}
            icon={<CheckCircle className="w-6 h-6" />}
            changeText="completed"
            changeType="positive"
          />
          <ROAMStatCard
            title="Total Businesses"
            value={stats.total.toString()}
            icon={<Building2 className="w-6 h-6" />}
            changeText="in system"
            changeType="neutral"
          />
        </div>

        {/* Filters */}
        <ROAMCard>
          <ROAMCardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search businesses, emails, or locations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={priorityFilter}
                  onValueChange={setPriorityFilter}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="text-sm text-muted-foreground">
                Showing {filteredVerifications.length} of {verifications.length}{" "}
                businesses
              </div>
            </div>
          </ROAMCardContent>
        </ROAMCard>

        {/* Workflow Guide */}
        {statusFilter === "pending" && filteredVerifications.length > 0 && (
          <ROAMCard className="bg-blue-50 border-blue-200">
            <ROAMCardContent className="p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 mb-1">Approval Workflow</h3>
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">Step 1:</span> Click "Review Documents" to expand each business card.{" "}
                    <span className="font-medium">Step 2:</span> View and verify each document individually.{" "}
                    <span className="font-medium">Step 3:</span> Once all documents are verified, use the "Approve" or "Reject" buttons.
                  </p>
                </div>
              </div>
            </ROAMCardContent>
          </ROAMCard>
        )}

        {/* Business Approval Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {statusFilter === "pending" ? "Pending Approvals" : "Business Approvals"} ({filteredVerifications.length})
            </h2>
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredVerifications.length)} of {filteredVerifications.length}
            </div>
          </div>

          <div className="space-y-4">
            {paginatedVerifications.length === 0 ? (
              <ROAMCard>
                <ROAMCardContent className="p-8 text-center">
                  <div className="text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No businesses match your current filters</p>
                  </div>
                </ROAMCardContent>
              </ROAMCard>
            ) : (
              paginatedVerifications.map((business) => {
                const isExpanded = expandedCards.has(business.id);
                const documents = cardDocuments[business.id] || [];

                return (
                  <ROAMCard 
                    key={business.id} 
                    className={`overflow-hidden ${
                      business.priority === "urgent" 
                        ? "border-l-4 border-l-red-500 shadow-lg" 
                        : business.priority === "high" 
                          ? "border-l-4 border-l-orange-400" 
                          : ""
                    }`}
                  >
                    <ROAMCardContent className="p-0">
                      {/* Business Header */}
                      <div className={`p-6 border-b border-gray-100 ${
                        business.priority === "urgent" ? "bg-red-50/50" : ""
                      }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="flex flex-col">
                                <h3 className="text-lg font-semibold text-gray-900">
                                  {business.business_name}
                                </h3>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Building2 className="w-4 h-4" />
                                  <span className="capitalize">
                                    {business.business_type}
                                  </span>
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
                                <span>
                                  Created {formatDate(business.created_at)}
                                </span>
                              </div>
                              {business.application_submitted_at && (
                                <div className="flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-muted-foreground" />
                                  <span>
                                    Applied{" "}
                                    {formatDate(
                                      business.application_submitted_at,
                                    )}
                                  </span>
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
                                  {(() => {
                                    // Use actual fetched documents if available, otherwise fall back to view data
                                    const docs = cardDocuments[business.id];
                                    if (docs) {
                                      const verified = docs.filter(d => d.verification_status === 'verified').length;
                                      const pending = docs.filter(d => d.verification_status === 'pending').length;
                                      return `${docs.length} documents (${verified} verified, ${pending} pending)`;
                                    }
                                    return `${business.documents_count} documents (${business.verified_documents} verified, ${business.pending_documents} pending)`;
                                  })()}
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

                          {/* Status and Actions */}
                          <div className="flex flex-col items-end gap-3">
                            <div className="flex gap-2">
                              <ROAMBadge
                                variant={getStatusVariant(
                                  business.verification_status,
                                )}
                              >
                                {business.verification_status.replace("_", " ")}
                              </ROAMBadge>
                              {business.priority !== "normal" && (
                              <ROAMBadge
                                variant={getPriorityVariant(business.priority)}
                              >
                                  {business.priority === "urgent" ? "⚠️ Urgent" : "⚡ High Priority"}
                              </ROAMBadge>
                              )}
                            </div>

                            <div className="flex flex-col gap-2 items-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleCardExpansion(business.id)}
                                className="text-roam-blue border-roam-blue hover:bg-blue-50 w-full"
                              >
                                <FileText className="w-4 h-4 mr-1" />
                                {isExpanded ? "Hide" : "Review"} Documents ({cardDocuments[business.id]?.length ?? business.documents_count})
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 ml-1" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 ml-1" />
                                )}
                              </Button>
                              
                              {business.verification_status !== "approved" && (
                                <div className="flex gap-2 w-full">
                              <Button
                                    variant="destructive"
                                size="sm"
                                    onClick={() =>
                                      handleBusinessActionClick(
                                        business.id,
                                        "reject",
                                      )
                                    }
                                    className="flex-1"
                                  >
                                    <XCircle className="w-4 h-4 mr-1" />
                                    Reject
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      const docs = cardDocuments[business.id] || [];
                                      const hasUnverifiedDocs = docs.some(
                                        (doc) => doc.verification_status !== "verified"
                                      );
                                      
                                      // Documents are optional - warn if docs exist and are unverified, but allow approval.
                                      if (docs.length > 0 && hasUnverifiedDocs) {
                                        toast({
                                          title: "Unverified documents",
                                          description: "Proceeding with approval even though some documents are not verified.",
                                          variant: "default",
                                        });
                                      }
                                      
                                      handleVerificationAction(
                                        business.id,
                                        "approve",
                                        "Business approved by admin",
                                      );
                                    }}
                                    className="bg-green-600 hover:bg-green-700 flex-1"
                                  >
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Approve
                              </Button>
                            </div>
                              )}
                              
                              {business.verification_status === "approved" && (
                                <div className="text-sm text-green-600 font-medium flex items-center gap-1 bg-green-50 px-3 py-2 rounded">
                                  <CheckCircle className="w-4 h-4" />
                                  Approved
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Document Section */}
                      {isExpanded && (
                        <div className="p-6 bg-gray-50">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-gray-900">
                                Documents for Review
                              </h4>
                              <div className="text-sm text-muted-foreground">
                                {documents.length} documents uploaded
                              </div>
                            </div>

                            {documents.length === 0 ? (
                              <div className="text-center py-8">
                                <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                <p className="text-muted-foreground">
                                  No documents uploaded yet
                                </p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {documents.map((doc) => (
                                  <div
                                    key={doc.id}
                                    className={`p-4 border rounded-lg bg-white ${
                                      doc.verification_status === "verified"
                                        ? "border-green-200 bg-green-50"
                                        : doc.verification_status === "rejected"
                                          ? "border-red-200 bg-red-50"
                                          : doc.verification_status ===
                                              "under_review"
                                            ? "border-blue-200 bg-blue-50"
                                            : "border-yellow-200 bg-yellow-50"
                                    }`}
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="flex items-start gap-3">
                                        {doc.verification_status ===
                                        "verified" ? (
                                          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                                        ) : doc.verification_status ===
                                          "rejected" ? (
                                          <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                                        ) : doc.verification_status ===
                                          "under_review" ? (
                                          <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
                                        ) : (
                                          <Clock className="w-5 h-5 text-yellow-600 mt-0.5" />
                                        )}
                                        <div className="flex-1">
                                          <div className="font-medium text-sm">
                                            {doc.document_name}
                                          </div>
                                          <div className="text-xs text-muted-foreground capitalize">
                                            {doc.document_type.replace(
                                              /_/g,
                                              " ",
                                            )}
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
                                        onClick={() => {
                                          if (doc.file_url) {
                                            window.open(
                                              doc.file_url,
                                              "_blank",
                                              "noopener,noreferrer",
                                            );
                                          } else {
                                            toast({
                                              title: "Error",
                                              description:
                                                "No file URL available for this document",
                                              variant: "destructive",
                                            });
                                          }
                                        }}
                                      >
                                        <Eye className="w-3 h-3 mr-1" />
                                        View
                                      </Button>

                                      {doc.verification_status !==
                                        "verified" && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            handleDocumentAction(
                                              doc.id,
                                              "verify",
                                            );
                                            // Refresh the card documents after update
                                            setTimeout(
                                              () =>
                                                fetchCardDocuments(business.id),
                                              500,
                                            );
                                          }}
                                          className="h-7 px-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
                                        >
                                          <CheckCircle className="w-3 h-3 mr-1" />
                                          Verify
                                        </Button>
                                      )}

                                      {doc.verification_status !== "rejected" &&
                                        doc.verification_status !==
                                          "under_review" && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                              openIndividualDocumentReview(doc, business);
                                            }}
                                            className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                          >
                                            <AlertTriangle className="w-3 h-3 mr-1" />
                                            Review
                                          </Button>
                                        )}

                                      {doc.verification_status !==
                                        "rejected" && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            handleRejectClick(doc.id)
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

                            {/* Document Status Summary */}
                            <div className="border-t pt-4 mt-4">
                              <div className="flex items-center justify-between">
                                <div className="text-sm">
                                  <span className="font-medium">Document Review Status:</span>
                                  <span className="ml-2 text-green-600">
                                    {documents.filter((d) => d.verification_status === "verified").length} Verified
                                  </span>
                                  {documents.some((d) => d.verification_status !== "verified") && (
                                    <span className="ml-2 text-orange-600">
                                      • {documents.filter((d) => d.verification_status !== "verified").length} Pending
                                    </span>
                                  )}
                                </div>
                                {business.verification_status !== "approved" && documents.length > 0 && (
                                  <div className="text-xs text-muted-foreground">
                                    {documents.every((d) => d.verification_status === "verified")
                                      ? "✓ All documents verified - Ready to approve"
                                      : "⚠ Review remaining documents before approval"
                                                  }
                                                </div>
                                              )}
                                            </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </ROAMCardContent>
                  </ROAMCard>
                );
              })
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t pt-4">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                
                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Show first page, last page, current page, and pages around current
                    const showPage = 
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1);
                    
                    // Show ellipsis
                    const showEllipsisBefore = page === currentPage - 2 && currentPage > 3;
                    const showEllipsisAfter = page === currentPage + 2 && currentPage < totalPages - 2;
                    
                    if (showEllipsisBefore || showEllipsisAfter) {
                      return (
                        <span key={page} className="px-2 text-muted-foreground">
                          ...
                        </span>
                      );
                    }
                    
                    if (!showPage) return null;
                    
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className={currentPage === page ? "bg-roam-blue hover:bg-roam-blue/90" : ""}
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Document Review Modal - Read Only */}
        <DocumentReviewModal
          isOpen={isDocumentReviewOpen}
          onClose={() => setIsDocumentReviewOpen(false)}
          selectedBusiness={selectedBusiness}
          businessDocuments={businessDocuments}
          reviewNotes={reviewNotes}
          onReviewNotesChange={setReviewNotes}
          onDocumentAction={handleDocumentAction}
          onBusinessApproval={() => {}}
          formatDate={(date: string) => {
            return new Date(date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
                                    });
          }}
        />

        {/* Individual Document Review Modal */}
        <IndividualDocumentReviewModal
          isOpen={isIndividualDocumentReviewOpen}
          onClose={() => {
            setIsIndividualDocumentReviewOpen(false);
            setSelectedDocument(null);
          }}
          document={selectedDocument}
          businessName={selectedBusiness?.business_name || ""}
          businessEmail={selectedBusiness?.contact_email || null}
          onApprove={handleDocumentApproval}
          onReject={handleDocumentRejection}
        />

        {/* Rejection Reason Modal */}
        <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
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
                  onChange={(e) => setRejectionReasonText(e.target.value)}
                  rows={4}
                  className="mt-1"
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsRejectModalOpen(false);
                    setSelectedDocumentForReject(null);
                    setRejectionReasonText("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleRejectSubmit}
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
          onOpenChange={setIsBusinessActionModalOpen}
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
                  onChange={(e) => setBusinessActionNotes(e.target.value)}
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
                  onClick={handleBusinessActionSubmit}
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
      </div>
    </AdminLayout>
  );
}
