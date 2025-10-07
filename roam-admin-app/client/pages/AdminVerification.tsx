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
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

// Types based on the actual database schema
type BusinessDocumentStatus =
  | "pending"
  | "verified"
  | "rejected"
  | "under_review";
type VerificationStatus = "pending" | "approved" | "rejected" | "suspended";
type BusinessType =
  | "individual"
  | "llc"
  | "corporation"
  | "partnership"
  | "small_business"
  | "franchise"
  | "enterprise"
  | "other";
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

  // Debug user state
  console.log("AdminVerification - User state:", {
    user: user ? { id: user.id, email: user.email } : null,
  });

  // Add debug function to window for testing
  useEffect(() => {
    (window as any).debugDocumentUpdate = async (documentId: string) => {
      console.log("Testing document update with:", {
        documentId,
        userId: user?.id,
      });

      try {
        const { data: existingDoc, error: fetchError } = await supabase
          .from("business_documents")
          .select("*")
          .eq("id", documentId)
          .single();

        console.log("Existing document:", { existingDoc, fetchError });

        if (fetchError) {
          console.error("Could not fetch document:", fetchError);
          return;
        }

        const { data, error } = await supabase
          .from("business_documents")
          .update({
            verification_status: "verified",
            verified_by: user?.id,
            verified_at: new Date().toISOString(),
          })
          .eq("id", documentId)
          .select();

        console.log("Update result:", { data, error });
      } catch (error) {
        console.error("Test update error:", error);
      }
    };

    // Add debug function for business verification testing
    (window as any).debugBusinessVerification = async (
      businessId: string,
      action: string,
    ) => {
      console.log("Testing business verification with:", {
        businessId,
        action,
        userId: user?.id,
      });

      try {
        // Check if business exists
        const { data: existingBusiness, error: fetchError } = await supabase
          .from("business_profiles")
          .select("*")
          .eq("id", businessId)
          .single();

        console.log("Existing business:", { existingBusiness, fetchError });

        if (fetchError) {
          console.error("Could not fetch business:", fetchError);
          return;
        }

        // Check if admin user exists
        const { data: adminUser, error: adminUserError } = await supabase
          .from("admin_users")
          .select("*")
          .eq("user_id", user?.id)
          .single();

        console.log("Admin user lookup:", { adminUser, adminUserError });

        // Test the actual verification action
        await handleVerificationAction(
          businessId,
          action as any,
          "Debug test notes",
        );
      } catch (error) {
        console.error("Test verification error:", error);
      }
    };

    return () => {
      delete (window as any).debugDocumentUpdate;
      delete (window as any).debugBusinessVerification;
    };
  }, [user]);

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

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
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

  // Card state
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [cardDocuments, setCardDocuments] = useState<
    Record<string, BusinessDocument[]>
  >({});

  // Fetch verification data
  const fetchVerifications = async () => {
    try {
      console.log("fetchVerifications started");
      setLoading(true);
      setError(null);

      console.log("Fetching business profiles...");
      // Fetch businesses with all fields
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

      console.log("Fetching business documents for count aggregation...");
      // Fetch document counts for each business
      const { data: documentCounts, error: documentsError } =
        await supabase.from("business_documents").select(`
          business_id,
          verification_status
        `);

      console.log("Business documents result:", {
        count: documentCounts?.length,
        error: documentsError,
        sample: documentCounts?.[0],
      });

      if (documentsError) {
        console.error("Business documents error:", documentsError);
        throw documentsError;
      }

      console.log("Processing document counts...");
      // Calculate document counts by business
      const documentStats: Record<
        string,
        {
          total: number;
          verified: number;
          pending: number;
          rejected: number;
          under_review: number;
        }
      > = {};

      (documentCounts || []).forEach((doc) => {
        if (!documentStats[doc.business_id]) {
          documentStats[doc.business_id] = {
            total: 0,
            verified: 0,
            pending: 0,
            rejected: 0,
            under_review: 0,
          };
        }
        documentStats[doc.business_id].total++;
        if (doc.verification_status === "verified") {
          documentStats[doc.business_id].verified++;
        } else if (doc.verification_status === "pending") {
          documentStats[doc.business_id].pending++;
        } else if (doc.verification_status === "rejected") {
          documentStats[doc.business_id].rejected++;
        } else if (doc.verification_status === "under_review") {
          documentStats[doc.business_id].under_review++;
        }
      });

      console.log(
        "Document stats calculated:",
        Object.keys(documentStats).length,
        "businesses have documents",
      );

      // Prepare verification data with actual document counts
      console.log("Preparing verification data...");
      const verificationData: BusinessVerification[] = (businessData || []).map(
        (business) => {
          const submittedDate = business.application_submitted_at
            ? new Date(business.application_submitted_at)
            : new Date(business.created_at);

          // Determine priority based on status, application submission, and document status
          let priority: "normal" | "high" | "urgent" = "normal";
          const businessStats = documentStats[business.id] || {
            total: 0,
            verified: 0,
            pending: 0,
            rejected: 0,
            under_review: 0,
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
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";
      const response = await fetch(`${apiBaseUrl}/api/business-documents?business_id=${businessId}`);
      
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
        // Look up the admin_users record for the current auth user
        const { data: adminUser, error: adminUserError } = await supabase
          .from("admin_users")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (adminUserError || !adminUser) {
          throw new Error(
            "Admin user record not found. Please contact support.",
          );
        }

        updateData.verified_by = adminUser.id;
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

      const { error, data } = await supabase
        .from("business_documents")
        .update(updateData)
        .eq("id", documentId)
        .select();

      console.log("Supabase update response:", { error, data });

      if (error) {
        console.error("Supabase error details:", error);
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error("Document not found or no changes were made");
      }

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

      const updateData: any = {
        verification_status: newStatus,
        verification_notes: notes || null,
      };

      // Add approval tracking if approving
      if (action === "approve") {
        console.log("Approval action - looking up admin user for:", user?.id);

        // Look up the admin_users record for the current auth user
        const { data: adminUser, error: adminUserError } = await supabase
          .from("admin_users")
          .select("id")
          .eq("user_id", user?.id)
          .single();

        console.log("Admin user lookup result:", { adminUser, adminUserError });

        if (adminUserError || !adminUser) {
          console.error("Admin user lookup failed:", adminUserError);
          throw new Error(
            "Admin user record not found. Please contact support.",
          );
        }

        updateData.approved_at = new Date().toISOString();
        updateData.approved_by = adminUser.id;
        updateData.approval_notes = notes || null;
      }

      console.log("Update data prepared:", updateData);

      const { error } = await supabase
        .from("business_profiles")
        .update(updateData)
        .eq("id", businessId);

      console.log("Supabase update result:", { error });

      if (error) {
        console.error("Supabase update error:", error);
        throw error;
      }

      // Send approval email if business was approved
      if (action === "approve") {
        try {
          console.log("Sending approval email for business:", businessId);

          // Get business details for the email
          const { data: businessData, error: businessFetchError } =
            await supabase
              .from("business_profiles")
              .select("business_name, contact_email")
              .eq("id", businessId)
              .single();

          if (businessFetchError || !businessData?.contact_email) {
            console.error(
              "Could not fetch business email:",
              businessFetchError,
            );
            toast({
              title: "Business Approved",
              description:
                "Business verification approved successfully. Note: No contact email found for approval notification.",
              variant: "default",
            });
          } else {
            console.log(
              "Sending approval email to:",
              businessData.contact_email,
            );

            const emailPayload = {
              businessName: businessData.business_name,
              contactEmail: businessData.contact_email,
              approvalNotes: notes || null,
              businessId: businessId,
              userId: user?.id, // Optional: admin user ID for audit trail
            };

            console.log("Email API payload:", emailPayload);

            // Send email via our server-side API endpoint
            const emailResponse = await fetch("/api/send-approval-email", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(emailPayload),
            });

            console.log("Email API response status:", emailResponse.status);

            if (emailResponse.ok) {
              // Only try to read response body for successful responses
              try {
                const emailResult = await emailResponse.json();
                console.log("Approval email sent successfully:", emailResult);
              } catch (parseError) {
                console.log("Email sent successfully (could not parse response details)");
              }
            } else {
              // For error responses, don't try to read body - just use status
              const errorMessage = `HTTP ${emailResponse.status} - Email service error`;
              console.error("Failed to send approval email:", errorMessage);

              toast({
                title: "Business Approved",
                description: `Business verification approved successfully. Note: Approval email could not be sent. Error: ${errorMessage}`,
                variant: "default",
              });
            }
          }
        } catch (emailError) {
          console.error("Error sending approval email:", emailError);

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

          // Don't throw error here - business approval succeeded
          toast({
            title: "Business Approved",
            description: `Business verification approved successfully. Note: Approval email could not be sent. Error: ${errorMessage}`,
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

      // Show success toast for non-approval actions
      if (action !== "approve") {
        toast({
          title: "Success",
          description: `Business verification ${actionText}`,
        });
      } else {
        // For approval, show success message (email status handled above)
        toast({
          title: "Success",
          description: `Business verification approved successfully`,
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

      const { data, error } = await supabase
        .from("business_documents")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      console.log("fetchCardDocuments response:", { data, error, businessId });

      if (error) throw error;

      setCardDocuments((prev) => ({
        ...prev,
        [businessId]: data || [],
      }));
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

  // Get status badge variant
  const getStatusVariant = (status: VerificationStatus) => {
    switch (status) {
      case "approved":
        return "success";
      case "rejected":
        return "destructive";
      case "in_review":
        return "warning";
      case "pending":
        return "secondary";
      default:
        return "secondary";
    }
  };

  // Get priority badge variant
  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "destructive";
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
      <AdminLayout title="Business Verification">
        <div className="flex items-center justify-center h-64">
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

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
          <ROAMStatCard
            title="Total"
            value={stats.total.toString()}
            icon={<FileText className="w-5 h-5" />}
            changeText="businesses"
            changeType="neutral"
          />
          <ROAMStatCard
            title="Pending"
            value={stats.pending.toString()}
            icon={<Clock className="w-5 h-5" />}
            changeText="awaiting review"
            changeType="warning"
          />
          <ROAMStatCard
            title="Suspended"
            value={stats.suspended.toString()}
            icon={<AlertTriangle className="w-5 h-5" />}
            changeText="suspended"
            changeType="destructive"
          />
          <ROAMStatCard
            title="Approved"
            value={stats.approved.toString()}
            icon={<CheckCircle className="w-5 h-5" />}
            changeText="verified"
            changeType="positive"
          />
          <ROAMStatCard
            title="Rejected"
            value={stats.rejected.toString()}
            icon={<XCircle className="w-5 h-5" />}
            changeText="declined"
            changeType="destructive"
          />
          <ROAMStatCard
            title="Overdue"
            value={stats.overdue.toString()}
            icon={<AlertTriangle className="w-5 h-5" />}
            changeText="past due"
            changeType="destructive"
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
              filteredVerifications.map((business) => {
                const isExpanded = expandedCards.has(business.id);
                const documents = cardDocuments[business.id] || [];

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
                              <ROAMBadge
                                variant={getPriorityVariant(business.priority)}
                              >
                                {business.priority}
                              </ROAMBadge>
                            </div>

                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleCardExpansion(business.id)}
                                className="text-roam-blue border-roam-blue hover:bg-blue-50"
                              >
                                <FileText className="w-4 h-4 mr-1" />
                                {isExpanded ? "Hide" : "View"} Documents
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 ml-1" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 ml-1" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openDocumentReview(business)}
                                className="text-roam-blue hover:text-roam-blue hover:bg-blue-50"
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Full Review
                              </Button>
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
                                              handleDocumentAction(
                                                doc.id,
                                                "review",
                                              );
                                              setTimeout(
                                                () =>
                                                  fetchCardDocuments(
                                                    business.id,
                                                  ),
                                                500,
                                              );
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

                            {/* Business-level actions */}
                            <div className="border-t pt-4 mt-4">
                              <div className="flex items-center justify-between">
                                <div className="text-sm text-muted-foreground">
                                  Business verification actions
                                </div>
                                <div className="flex gap-2">
                                  {business.verification_status !==
                                    "approved" && (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          handleBusinessActionClick(
                                            business.id,
                                            "suspend",
                                          )
                                        }
                                        className="text-orange-600 border-orange-600 hover:bg-orange-50"
                                      >
                                        Suspend
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() =>
                                          handleBusinessActionClick(
                                            business.id,
                                            "reject",
                                          )
                                        }
                                      >
                                        Reject Business
                                      </Button>
                                      <Button
                                        size="sm"
                                        onClick={() => {
                                          handleVerificationAction(
                                            business.id,
                                            "approve",
                                            "Business approved by admin",
                                          );
                                        }}
                                        className="bg-green-600 hover:bg-green-700"
                                      >
                                        Approve Business
                                      </Button>
                                    </>
                                  )}
                                  {business.verification_status ===
                                    "approved" && (
                                    <div className="text-sm text-green-600 font-medium flex items-center gap-2">
                                      <CheckCircle className="w-4 h-4" />
                                      Business Already Approved
                                      {business.approved_at && (
                                        <span className="text-xs text-muted-foreground">
                                          on {formatDate(business.approved_at)}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
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
        </div>

        {/* Document Review Modal */}
        <Dialog
          open={isDocumentReviewOpen}
          onOpenChange={setIsDocumentReviewOpen}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-6 h-6 text-roam-blue" />
                Documents Review - {selectedBusiness?.business_name}
              </DialogTitle>
              <DialogDescription>
                Review all submitted documents for verification approval
              </DialogDescription>
            </DialogHeader>

            {selectedBusiness && (
              <div className="space-y-6">
                {/* Business Info */}
                <ROAMCard>
                  <ROAMCardContent className="p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Business:</span>{" "}
                        {selectedBusiness.business_name}
                      </div>
                      <div>
                        <span className="font-medium">Type:</span>{" "}
                        {selectedBusiness.business_type}
                      </div>
                      <div>
                        <span className="font-medium">Email:</span>{" "}
                        {selectedBusiness.contact_email || "N/A"}
                      </div>
                      <div>
                        <span className="font-medium">Phone:</span>{" "}
                        {selectedBusiness.phone || "N/A"}
                      </div>
                    </div>
                  </ROAMCardContent>
                </ROAMCard>

                {/* Document Types */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Common document types */}
                  {[
                    {
                      type: "business_license",
                      label: "Business License",
                      required: true,
                    },
                    {
                      type: "tax_id",
                      label: "Tax ID Certificate",
                      required: true,
                    },
                    {
                      type: "insurance",
                      label: "Insurance Certificate",
                      required: false,
                    },
                    {
                      type: "background_check",
                      label: "Background Check",
                      required: false,
                    },
                    {
                      type: "professional_cert",
                      label: "Professional Certifications",
                      required: false,
                    },
                  ].map((docType) => {
                    const doc = businessDocuments.find(
                      (d) => d.document_type === docType.type,
                    );
                    const hasDoc = !!doc;
                    const isVerified = doc?.verification_status === "verified";
                    const isPending = doc?.verification_status === "pending";
                    const isRejected = doc?.verification_status === "rejected";
                    const isUnderReview =
                      doc?.verification_status === "under_review";

                    return (
                      <div
                        key={docType.type}
                        className={`p-4 border rounded-lg flex items-center justify-between ${
                          hasDoc
                            ? isVerified
                              ? "border-green-200 bg-green-50"
                              : isRejected
                                ? "border-red-200 bg-red-50"
                                : isUnderReview
                                  ? "border-blue-200 bg-blue-50"
                                  : "border-yellow-200 bg-yellow-50"
                            : "border-gray-200 bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {hasDoc ? (
                            isVerified ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : isRejected ? (
                              <XCircle className="w-5 h-5 text-red-600" />
                            ) : isUnderReview ? (
                              <AlertTriangle className="w-5 h-5 text-blue-600" />
                            ) : (
                              <Clock className="w-5 h-5 text-yellow-600" />
                            )
                          ) : (
                            <XCircle className="w-5 h-5 text-gray-400" />
                          )}
                          <div>
                            <div className="font-medium">{docType.label}</div>
                            {docType.required && (
                              <div className="text-xs text-red-600">
                                Required
                              </div>
                            )}
                          </div>
                        </div>
                        {hasDoc && (
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (doc?.file_url) {
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
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                            {!isVerified && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleDocumentAction(doc!.id, "verify")
                                  }
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Verify
                                </Button>
                                {!isRejected && !isUnderReview && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleDocumentAction(doc!.id, "review")
                                    }
                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  >
                                    <AlertTriangle className="w-4 h-4 mr-1" />
                                    Review
                                  </Button>
                                )}
                                {!isRejected && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRejectClick(doc!.id)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <XCircle className="w-4 h-4 mr-1" />
                                    Reject
                                  </Button>
                                )}
                              </>
                            )}
                            {isRejected && doc?.rejection_reason && (
                              <div className="text-xs text-red-600 mt-1">
                                Rejected: {doc.rejection_reason}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

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
                                <div className="font-medium">
                                  {doc.document_name}
                                </div>
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
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                              {doc.verification_status !== "verified" && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleDocumentAction(doc.id, "verify")
                                    }
                                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                  >
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    {doc.verification_status === "rejected"
                                      ? "Re-verify"
                                      : "Verify"}
                                  </Button>
                                  {doc.verification_status !== "rejected" &&
                                    doc.verification_status !==
                                      "under_review" && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          handleDocumentAction(
                                            doc.id,
                                            "under_review",
                                          )
                                        }
                                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                      >
                                        <AlertTriangle className="w-4 h-4 mr-1" />
                                        Under Review
                                      </Button>
                                    )}
                                  {doc.verification_status !== "rejected" && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        const reason = prompt(
                                          "Please provide a rejection reason:",
                                        );
                                        if (reason) {
                                          handleDocumentAction(
                                            doc.id,
                                            "reject",
                                            reason,
                                          );
                                        }
                                      }}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <XCircle className="w-4 h-4 mr-1" />
                                      Reject
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-muted-foreground py-8">
                          No documents uploaded yet
                        </div>
                      )}
                    </div>
                  </ROAMCardContent>
                </ROAMCard>

                {/* Review Notes */}
                <ROAMCard>
                  <ROAMCardHeader>
                    <ROAMCardTitle>Review Notes</ROAMCardTitle>
                  </ROAMCardHeader>
                  <ROAMCardContent>
                    <Textarea
                      placeholder="Add your review notes here..."
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </ROAMCardContent>
                </ROAMCard>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setIsDocumentReviewOpen(false)}
                  >
                    Close
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      handleVerificationAction(
                        selectedBusiness.id,
                        "request_info",
                        reviewNotes,
                      )
                    }
                    className="text-orange-600 border-orange-600 hover:bg-orange-50"
                  >
                    Request Additional Info
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() =>
                      handleVerificationAction(
                        selectedBusiness.id,
                        "reject",
                        reviewNotes,
                      )
                    }
                  >
                    Reject
                  </Button>
                  <Button
                    onClick={() =>
                      handleVerificationAction(
                        selectedBusiness.id,
                        "approve",
                        reviewNotes,
                      )
                    }
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Approve
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

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
