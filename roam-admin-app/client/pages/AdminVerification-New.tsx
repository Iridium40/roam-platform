import { useState, useEffect, useMemo } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import {
  ROAMCard,
  ROAMCardContent,
} from "@/components/ui/roam-card";
import { Button } from "@/components/ui/button";
import { FileText, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

// Import extracted components
import { VerificationStats } from "@/components/verification/VerificationStats";
import { VerificationFilters } from "@/components/verification/VerificationFilters";
import { BusinessVerificationCard } from "@/components/verification/BusinessVerificationCard";
import { DocumentReviewModal } from "@/components/verification/DocumentReviewModal";
import { BusinessActionHandlers } from "@/components/verification/BusinessActionHandlers";

// Types
type BusinessDocumentStatus = "pending" | "verified" | "rejected" | "under_review";
type VerificationStatus = "pending" | "approved" | "rejected" | "suspended";
type BusinessType = "individual" | "llc" | "corporation" | "partnership" | "small_business" | "franchise" | "enterprise" | "other";
type BusinessDocumentType = "drivers_license" | "proof_of_address" | "liability_insurance" | "professional_license" | "professional_certificate" | "business_license";

interface BusinessProfile {
  id: string;
  business_name: string;
  contact_email: string | null;
  phone: string | null;
  verification_status: VerificationStatus;
  stripe_connect_account_id: string | null;
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
  const [verifications, setVerifications] = useState<BusinessVerification[]>([]);
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

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal state
  const [isDocumentReviewOpen, setIsDocumentReviewOpen] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessVerification | null>(null);
  const [businessDocuments, setBusinessDocuments] = useState<BusinessDocument[]>([]);
  const [reviewNotes, setReviewNotes] = useState("");

  // Card state
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [cardDocuments, setCardDocuments] = useState<Record<string, BusinessDocument[]>>({});

  // Business Action Modal state
  const [isBusinessActionModalOpen, setIsBusinessActionModalOpen] = useState(false);
  const [selectedBusinessForAction, setSelectedBusinessForAction] = useState<string | null>(null);
  const [businessActionType, setBusinessActionType] = useState<"reject" | "suspend" | null>(null);
  const [businessActionNotes, setBusinessActionNotes] = useState("");

  // Document Rejection Modal state
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedDocumentForReject, setSelectedDocumentForReject] = useState<string | null>(null);
  const [rejectionReasonText, setRejectionReasonText] = useState("");

  // Fetch verification data
  const fetchVerifications = async () => {
    try {
      console.log("fetchVerifications started");
      setLoading(true);
      setError(null);

      console.log("Fetching business profiles...");
      const { data: businessData, error: businessError } = await supabase
        .from("business_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      console.log("Business profiles result:", {
        count: businessData?.length,
        error: businessError,
        sample: businessData?.[0],
      });

      if (businessError) {
        console.error("Business profiles error:", businessError);
        throw businessError;
      }

      console.log("Fetching business documents...");
      const { data: documentsData, error: documentsError } = await supabase
        .from("business_documents")
        .select("*")
        .order("created_at", { ascending: false });

      console.log("Documents result:", {
        count: documentsData?.length,
        error: documentsError,
        sample: documentsData?.[0],
      });

      if (documentsError) {
        console.error("Documents error:", documentsError);
        throw documentsError;
      }

      console.log("Processing verification data...");
      const businessMap = new Map(businessData?.map((b) => [b.id, b]) || []);
      const documentsByBusiness = new Map<string, BusinessDocument[]>();

      documentsData?.forEach((doc) => {
        if (!documentsByBusiness.has(doc.business_id)) {
          documentsByBusiness.set(doc.business_id, []);
        }
        documentsByBusiness.get(doc.business_id)!.push(doc);
      });

      const verificationData: BusinessVerification[] = (businessData || []).map(
        (business: BusinessProfile): BusinessVerification => {
          const businessDocs = documentsByBusiness.get(business.id) || [];
          const businessStats = businessDocs.reduce(
            (acc, doc) => {
              acc.total++;
              switch (doc.verification_status) {
                case "verified":
                  acc.verified++;
                  break;
                case "pending":
                  acc.pending++;
                  break;
                case "rejected":
                  acc.rejected++;
                  break;
                case "under_review":
                  acc.under_review++;
                  break;
              }
              return acc;
            },
            { total: 0, verified: 0, pending: 0, rejected: 0, under_review: 0 }
          );

          return {
            ...business,
            priority: business.verification_status === "pending" ? "normal" : "normal",
            documents_count: businessStats.total,
            verified_documents: businessStats.verified,
            pending_documents: businessStats.pending,
            rejected_documents: businessStats.rejected,
            under_review_documents: businessStats.under_review,
          };
        }
      );

      console.log("Verification data prepared:", verificationData.length, "total businesses");
      setVerifications(verificationData);

      // Calculate stats
      console.log("Calculating stats...");
      const newStats: VerificationStats = {
        total: verificationData.length,
        pending: verificationData.filter((v) => v.verification_status === "pending").length,
        suspended: verificationData.filter((v) => v.verification_status === "suspended").length,
        approved: verificationData.filter((v) => v.verification_status === "approved").length,
        rejected: verificationData.filter((v) => v.verification_status === "rejected").length,
        overdue: verificationData.filter((v) => v.priority === "urgent").length,
      };
      console.log("Stats calculated:", newStats);
      setStats(newStats);
      console.log("fetchVerifications completed successfully");
    } catch (error: any) {
      console.error("Full error object in fetchVerifications:", error);
      let errorMessage = "Unknown error occurred";

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      }

      console.error("Final error message:", errorMessage);
      setError(`Failed to fetch verification data: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch documents for specific business
  const fetchBusinessDocuments = async (businessId: string) => {
    try {
      const { data, error } = await supabase
        .from("business_documents")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBusinessDocuments(data || []);
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error("Error fetching business documents:", errorMessage);
      toast({
        title: "Error",
        description: `Failed to load business documents: ${errorMessage}`,
        variant: "destructive",
      });
    }
  };

  // Fetch documents for card view
  const fetchCardDocuments = async (businessId: string) => {
    try {
      const { data, error } = await supabase
        .from("business_documents")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCardDocuments(prev => ({ ...prev, [businessId]: data || [] }));
    } catch (error: any) {
      console.error("Error fetching card documents:", error);
    }
  };

  // Load initial data
  useEffect(() => {
    fetchVerifications();
  }, []);

  // Filter verifications
  const filteredVerifications = useMemo(() => {
    return verifications.filter((verification) => {
      const matchesStatus = statusFilter === "all" || verification.verification_status === statusFilter;
      const matchesPriority = priorityFilter === "all" || verification.priority === priorityFilter;
      const matchesSearch = searchQuery === "" || 
        verification.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        verification.contact_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        verification.phone?.includes(searchQuery);

      return matchesStatus && matchesPriority && matchesSearch;
    });
  }, [verifications, statusFilter, priorityFilter, searchQuery]);

  // Document action handler
  const handleDocumentAction = async (
    documentId: string,
    action: "verify" | "reject" | "review",
    rejectionReason?: string
  ) => {
    try {
      console.log("Document action:", { documentId, action, rejectionReason, userId: user?.id });

      if (action === "reject") {
        if (!rejectionReason || rejectionReason.trim() === "") {
          console.error("Rejection reason is required for reject action");
          toast({
            title: "Error",
            description: "Rejection reason is required",
            variant: "destructive",
          });
          return;
        }
        
        // Handle rejection with reason
        const { error } = await supabase
          .from("business_documents")
          .update({
            verification_status: "rejected",
            rejection_reason: rejectionReason,
          })
          .eq("id", documentId);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Document rejected successfully",
        });

        // Refresh data
        await fetchVerifications();
        if (selectedBusiness) {
          await fetchBusinessDocuments(selectedBusiness.id);
        }
        return;
      }

      const updateData: any = { verification_status: action === "verify" ? "verified" : "under_review" };
      
      if (action === "verify") {
        updateData.verified_by = user?.id;
        updateData.verified_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("business_documents")
        .update(updateData)
        .eq("id", documentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Document ${action === "verify" ? "verified" : "updated"} successfully`,
      });

      // Refresh data
      await fetchVerifications();
      if (selectedBusiness) {
        await fetchBusinessDocuments(selectedBusiness.id);
      }

      // Close rejection modal if it was open
      setIsRejectModalOpen(false);
      setSelectedDocumentForReject(null);
      setRejectionReasonText("");
    } catch (error: any) {
      console.error("Error updating document:", error);
      toast({
        title: "Error",
        description: `Failed to update document status: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  // Business verification action handler
  const handleVerificationAction = async (
    businessId: string,
    action: "approve" | "reject" | "suspend",
    notes?: string
  ) => {
    try {
      console.log("Business verification action:", { businessId, action, notes, userId: user?.id });

      if ((action === "reject" || action === "suspend") && (!notes || notes.trim() === "")) {
        handleBusinessActionClick(businessId, action);
        return;
      }

      const updateData: any = { verification_status: action === "approve" ? "approved" : action };
      
      if (action === "approve") {
        updateData.approved_by = user?.id;
        updateData.approved_at = new Date().toISOString();
        if (notes) updateData.approval_notes = notes;
      } else {
        updateData.verification_notes = notes;
      }

      const { error } = await supabase
        .from("business_profiles")
        .update(updateData)
        .eq("id", businessId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Business ${action}d successfully`,
      });

      // Refresh data
      await fetchVerifications();
      
      // Close modals
      setIsBusinessActionModalOpen(false);
      setSelectedBusinessForAction(null);
      setBusinessActionType(null);
      setBusinessActionNotes("");
    } catch (error: any) {
      console.error("Error updating business verification:", error);
      toast({
        title: "Error",
        description: `Failed to ${action} business: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  // Modal handlers
  const handleOpenDocumentReview = async (business: BusinessVerification) => {
    setSelectedBusiness(business);
    setReviewNotes("");
    await fetchBusinessDocuments(business.id);
    setIsDocumentReviewOpen(true);
  };

  const handleCloseDocumentReview = () => {
    setIsDocumentReviewOpen(false);
    setSelectedBusiness(null);
    setBusinessDocuments([]);
    setReviewNotes("");
  };

  const handleToggleExpanded = async (businessId: string) => {
    const newExpanded = new Set(expandedCards);
    if (expandedCards.has(businessId)) {
      newExpanded.delete(businessId);
    } else {
      newExpanded.add(businessId);
      await fetchCardDocuments(businessId);
    }
    setExpandedCards(newExpanded);
  };

  const handleRejectClick = (documentId: string) => {
    setSelectedDocumentForReject(documentId);
    setRejectionReasonText("");
    setIsRejectModalOpen(true);
  };

  const handleRejectSubmit = () => {
    if (selectedDocumentForReject && rejectionReasonText.trim()) {
      handleDocumentAction(selectedDocumentForReject, "reject", rejectionReasonText.trim());
    } else {
      toast({
        title: "Error",
        description: "Please provide a rejection reason",
        variant: "destructive",
      });
    }
  };

  const handleBusinessActionClick = (businessId: string, actionType: "reject" | "suspend") => {
    setSelectedBusinessForAction(businessId);
    setBusinessActionType(actionType);
    setBusinessActionNotes("");
    setIsBusinessActionModalOpen(true);
  };

  const handleBusinessActionSubmit = () => {
    if (selectedBusinessForAction && businessActionType && businessActionNotes.trim()) {
      handleVerificationAction(selectedBusinessForAction, businessActionType, businessActionNotes.trim());
    } else {
      toast({
        title: "Error",
        description: "Please provide notes for this action",
        variant: "destructive",
      });
    }
  };

  const handleViewDocument = (documentId: string, fileUrl: string) => {
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Loading state
  if (loading) {
    return (
      <AdminLayout title="Business Verification">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-roam-blue" />
            <p className="text-muted-foreground">Loading verifications...</p>
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
            <h1 className="text-2xl font-bold">Business Verification</h1>
            <p className="text-muted-foreground mt-1">
              Manage business verification queue and approvals
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => fetchVerifications()} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <VerificationStats stats={stats} />

        {/* Filters */}
        <VerificationFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          priorityFilter={priorityFilter}
          onPriorityFilterChange={setPriorityFilter}
          filteredCount={filteredVerifications.length}
          totalCount={verifications.length}
        />

        {/* Business Verification Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Business Verifications ({filteredVerifications.length})
            </h2>
          </div>

          <div className="space-y-4">
            {filteredVerifications.length === 0 ? (
              <ROAMCard>
                <ROAMCardContent className="p-8 text-center">
                  <div className="text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No businesses match your current filters</p>
                  </div>
                </ROAMCardContent>
              </ROAMCard>
            ) : (
              filteredVerifications.map((business) => (
                <BusinessVerificationCard
                  key={business.id}
                  business={business}
                  documents={cardDocuments[business.id] || []}
                  isExpanded={expandedCards.has(business.id)}
                  onToggleExpanded={handleToggleExpanded}
                  onViewDocument={handleViewDocument}
                  onDocumentAction={handleDocumentAction}
                  onBusinessAction={handleVerificationAction}
                  onOpenDocumentReview={handleOpenDocumentReview}
                  formatDate={formatDate}
                />
              ))
            )}
          </div>
        </div>

        {/* Document Review Modal */}
        <DocumentReviewModal
          isOpen={isDocumentReviewOpen}
          onClose={handleCloseDocumentReview}
          selectedBusiness={selectedBusiness}
          businessDocuments={businessDocuments}
          reviewNotes={reviewNotes}
          onReviewNotesChange={setReviewNotes}
          onDocumentAction={handleDocumentAction}
          onBusinessApproval={() => selectedBusiness && handleVerificationAction(selectedBusiness.id, "approve", reviewNotes)}
          formatDate={formatDate}
        />

        {/* Business Action Handlers */}
        <BusinessActionHandlers
          isRejectModalOpen={isRejectModalOpen}
          selectedDocumentForReject={selectedDocumentForReject}
          rejectionReasonText={rejectionReasonText}
          onRejectModalChange={setIsRejectModalOpen}
          onRejectionReasonChange={setRejectionReasonText}
          onRejectSubmit={handleRejectSubmit}
          isBusinessActionModalOpen={isBusinessActionModalOpen}
          selectedBusinessForAction={selectedBusinessForAction}
          businessActionType={businessActionType}
          businessActionNotes={businessActionNotes}
          onBusinessActionModalChange={setIsBusinessActionModalOpen}
          onBusinessActionNotesChange={setBusinessActionNotes}
          onBusinessActionSubmit={handleBusinessActionSubmit}
        />
      </div>
    </AdminLayout>
  );
}