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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Star,
  StarHalf,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Edit,
  MoreHorizontal,
  TrendingUp,
  Users,
  Building2,
  UserCheck,
  Calendar,
  MessageSquare,
  Shield,
  Crown,
  Flag,
  User,
  RefreshCw,
  Plus,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface Review {
  id: string;
  booking_id: string;
  overall_rating: number;
  service_rating?: number;
  communication_rating?: number;
  punctuality_rating?: number;
  review_text?: string;
  is_approved: boolean;
  is_featured: boolean;
  moderated_by?: string;
  moderated_at?: string;
  moderation_notes?: string;
  created_at: string;
  // Joined data from related tables
  bookings?: {
    id: string;
    customer_profiles?: {
      id: string;
      first_name: string;
      last_name: string;
    };
    providers?: {
      id: string;
      first_name: string;
      last_name: string;
      business_profiles?: {
        id: string;
        business_name: string;
      };
    };
    services?: {
      id: string;
      name: string;
    };
  };
  admin_users?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const renderStars = (rating: number, size: "sm" | "md" = "sm") => {
  const stars = [];
  const iconSize = size === "sm" ? "w-3 h-3" : "w-4 h-4";

  for (let i = 1; i <= 5; i++) {
    if (i <= rating) {
      stars.push(
        <Star
          key={i}
          className={`${iconSize} fill-roam-yellow text-roam-yellow`}
        />,
      );
    } else if (i - 0.5 <= rating) {
      stars.push(
        <StarHalf
          key={i}
          className={`${iconSize} fill-roam-yellow text-roam-yellow`}
        />,
      );
    } else {
      stars.push(<Star key={i} className={`${iconSize} text-gray-300`} />);
    }
  }

  return <div className="flex items-center gap-0.5">{stars}</div>;
};

const getApprovalBadgeVariant = (isApproved: boolean) => {
  return isApproved ? "success" : "warning";
};

interface AdminUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

export default function AdminReviews() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "all" | "pending" | "approved" | "featured"
  >("all");
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [isReviewDetailsOpen, setIsReviewDetailsOpen] = useState(false);
  const [isModerationModalOpen, setIsModerationModalOpen] = useState(false);
  const [moderationNotes, setModerationNotes] = useState("");

  // Fetch admin user data
  const fetchAdminUser = async () => {
    if (user?.id) {
      try {
        const { data, error } = await supabase
          .from("admin_users")
          .select("id, first_name, last_name, email, role")
          .eq("user_id", user.id)
          .single();

        if (error) {
          console.error("Error fetching admin user:", error);
          return;
        }

        console.log("Admin user loaded successfully:", data);
        setAdminUser(data);
      } catch (err) {
        console.error("Error in fetchAdminUser:", err);
      }
    }
  };

  // Fetch reviews from Supabase with related data
  const fetchReviews = async (retryCount = 0) => {
    const maxRetries = 2;

    try {
      setLoading(true);
      setError(null);

      // Add a small delay for retries
      if (retryCount > 0) {
        console.log(`Retrying fetchReviews... Attempt ${retryCount + 1}`);
        await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
      }

      const { data, error } = await supabase
        .from("reviews")
        .select(
          `
          *,
          bookings (
            id,
            customer_profiles (
              id,
              first_name,
              last_name
            ),
            providers (
              id,
              first_name,
              last_name,
              business_profiles (
                id,
                business_name
              )
            ),
            services (
              id,
              name
            )
          ),
          admin_users (
            id,
            first_name,
            last_name
          )
        `,
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching reviews:", error.message, error);
        setError(
          `Reviews Query Error: ${error.message}. Details: ${JSON.stringify(error)}. You may need to create RLS policy: CREATE POLICY "Allow anon read access" ON public.reviews FOR SELECT USING (true);`,
        );
        return;
      }

      console.log(`Fetched ${data?.length || 0} reviews`);
      setReviews(data || []);
    } catch (error: any) {
      console.error("Error in fetchReviews:", error);
      console.error("Error type:", typeof error);
      console.error("Error name:", error?.name);
      console.error("Error message:", error?.message);

      let errorMessage = "Failed to fetch reviews data";

      if (
        error?.name === "TypeError" &&
        error?.message.includes("Failed to fetch")
      ) {
        if (retryCount < maxRetries) {
          console.log(
            `Network error, retrying... (${retryCount + 1}/${maxRetries})`,
          );
          return fetchReviews(retryCount + 1);
        }
        errorMessage = `Network error: ${error.message}. Please check your internet connection and Supabase configuration.`;
      } else if (error?.message) {
        errorMessage = `Failed to fetch reviews: ${error.message}`;
      } else if (typeof error === "string") {
        errorMessage = `Failed to fetch reviews: ${error}`;
      } else {
        errorMessage = `Failed to fetch reviews: ${JSON.stringify(error)}`;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    await fetchReviews();
  };

  useEffect(() => {
    fetchAdminUser();
  }, [user]);

  useEffect(() => {
    if (adminUser) {
      fetchReviews();
    }
  }, [adminUser]);

  const reviewStats = {
    totalReviews: reviews.length,
    approvedReviews: reviews.filter((r) => r.is_approved).length,
    pendingReviews: reviews.filter((r) => !r.is_approved).length,
    featuredReviews: reviews.filter((r) => r.is_featured).length,
    averageRating:
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.overall_rating, 0) / reviews.length
        : 0,
    lowRatingReviews: reviews.filter((r) => r.overall_rating <= 2).length,
    highRatingReviews: reviews.filter((r) => r.overall_rating >= 4).length,
  };

  // Helper functions to get display names from joined data
  const getCustomerName = (review: Review) => {
    if (review.bookings?.customer_profiles) {
      const { first_name, last_name } = review.bookings.customer_profiles;
      return `${first_name} ${last_name}`;
    }
    return "Unknown Customer";
  };

  const getProviderName = (review: Review) => {
    if (review.bookings?.providers) {
      const { first_name, last_name } = review.bookings.providers;
      return `${first_name} ${last_name}`;
    }
    return "Unknown Provider";
  };

  const getBusinessName = (review: Review) => {
    return (
      review.bookings?.providers?.business_profiles?.business_name ||
      "Unknown Business"
    );
  };

  const getServiceName = (review: Review) => {
    return review.bookings?.services?.name || "Unknown Service";
  };

  const getModeratorName = (review: Review) => {
    if (review.admin_users) {
      const { first_name, last_name } = review.admin_users;
      return `${first_name} ${last_name}`;
    }
    return null;
  };

  // Moderation handlers
  const handleApproveReview = async (review: Review) => {
    if (!adminUser?.id) {
      toast({
        title: "Error",
        description:
          "Admin user not found. Please refresh the page and try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log("Starting approval for review:", review.id);
      console.log("Admin user ID:", adminUser.id);

      // Update with moderation fields
      const { data, error } = await supabase
        .from("reviews")
        .update({
          is_approved: true,
          moderated_at: new Date().toISOString(),
          moderated_by: adminUser?.id || null,
        })
        .eq("id", review.id)
        .select();

      console.log("Supabase update result:", { data, error });

      if (error) {
        console.error("=== APPROVE REVIEW - SUPABASE ERROR DEBUG START ===");
        console.error("Raw error object:", error);
        console.error("Error message:", error.message);
        console.error("Error details:", error.details);
        console.error("Error hint:", error.hint);
        console.error("Error code:", error.code);
        console.error("Error toString():", error.toString());
        console.error("All error keys:", Object.keys(error));
        try {
          console.error("Error JSON attempt:", JSON.stringify(error, null, 2));
        } catch (e) {
          console.error("JSON stringify failed:", e);
        }
        console.error("=== APPROVE REVIEW - SUPABASE ERROR DEBUG END ===");
        throw error;
      }

      console.log("Review approval successful, fetching reviews...");
      toast({
        title: "Review Approved",
        description: `Review by ${getCustomerName(review)} has been approved successfully.`,
        variant: "default",
      });

      // Refresh reviews
      await fetchReviews();
      console.log("Reviews refreshed successfully");
    } catch (error: any) {
      console.error("=== APPROVE REVIEW - CATCH BLOCK DEBUG START ===");
      console.error("Full error object:", error);
      console.error("Error type:", typeof error);
      console.error("Error constructor:", error?.constructor?.name);
      console.error("Error.toString():", error?.toString?.());
      console.error("Error keys:", Object.keys(error || {}));

      // Try to extract all possible error properties
      const errorProps = {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        status: error?.status,
        statusText: error?.statusText,
        statusCode: error?.statusCode,
        data: error?.data,
        response: error?.response,
      };
      console.error("Error properties:", errorProps);
      console.error("=== APPROVE REVIEW - CATCH BLOCK DEBUG END ===");

      let errorMessage = "Unknown error occurred while approving review";

      // Try multiple ways to extract a meaningful error message
      if (typeof error === "string") {
        errorMessage = error;
      } else if (error?.message && typeof error.message === "string") {
        errorMessage = error.message;
      } else if (error?.details && typeof error.details === "string") {
        errorMessage = error.details;
      } else if (error?.hint && typeof error.hint === "string") {
        errorMessage = error.hint;
      } else if (
        error?.error?.message &&
        typeof error.error.message === "string"
      ) {
        errorMessage = error.error.message;
      } else if (error?.toString && typeof error.toString === "function") {
        try {
          errorMessage = error.toString();
        } catch (toStringError) {
          console.error("toString() failed:", toStringError);
        }
      }

      // If we still have an object, try to display it in a readable way
      if (
        errorMessage === "Unknown error occurred while approving review" &&
        error
      ) {
        try {
          const stringified = JSON.stringify(error, null, 2);
          if (stringified !== "{}") {
            errorMessage = `Error details: ${stringified}`;
          }
        } catch (jsonError) {
          console.error("JSON.stringify failed:", jsonError);
          errorMessage = "Complex error object - see console for details";
        }
      }

      toast({
        title: "Error Approving Review",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleDisapproveReview = async (review: Review) => {
    if (!adminUser?.id) {
      toast({
        title: "Error",
        description:
          "Admin user not found. Please refresh the page and try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log("Starting disapproval for review:", review.id);
      console.log("Admin user ID:", adminUser.id);

      const { data, error } = await supabase
        .from("reviews")
        .update({
          is_approved: false,
          moderated_at: new Date().toISOString(),
          moderated_by: adminUser?.id || null,
        })
        .eq("id", review.id)
        .select();

      console.log("Supabase update result:", { data, error });

      if (error) {
        console.error("=== DISAPPROVE REVIEW - SUPABASE ERROR DEBUG START ===");
        console.error("Raw error object:", error);
        console.error("Error message:", error.message);
        console.error("Error details:", error.details);
        console.error("Error hint:", error.hint);
        console.error("Error code:", error.code);
        console.error("Error toString():", error.toString());
        console.error("All error keys:", Object.keys(error));
        try {
          console.error("Error JSON attempt:", JSON.stringify(error, null, 2));
        } catch (e) {
          console.error("JSON stringify failed:", e);
        }
        console.error("=== DISAPPROVE REVIEW - SUPABASE ERROR DEBUG END ===");
        throw error;
      }

      toast({
        title: "Review Disapproved",
        description: `Review by ${getCustomerName(review)} has been disapproved.`,
        variant: "default",
      });
      await fetchReviews();
    } catch (error: any) {
      console.error("Error disapproving review - Full error object:", error);

      let errorMessage = "Unknown error occurred";

      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error?.message) {
        errorMessage = error.error.message;
      } else if (error?.details) {
        errorMessage = error.details;
      } else if (error?.hint) {
        errorMessage = error.hint;
      } else if (typeof error === "string") {
        errorMessage = error;
      } else if (error) {
        try {
          errorMessage = JSON.stringify(error, null, 2);
        } catch (jsonError) {
          errorMessage = "Error object could not be serialized";
        }
      }

      toast({
        title: "Error Disapproving Review",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleFeatureReview = async (review: Review) => {
    try {
      const { error } = await supabase
        .from("reviews")
        .update({ is_featured: true })
        .eq("id", review.id);

      if (error) throw error;

      toast({
        title: "Review Featured",
        description: `Review by ${getCustomerName(review)} has been featured successfully.`,
        variant: "default",
      });
      await fetchReviews();
    } catch (error: any) {
      console.error("Error featuring review:", error);
      let errorMessage = "Unknown error occurred";
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error?.message) {
        errorMessage = error.error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      } else if (error) {
        errorMessage = JSON.stringify(error);
      }
      toast({
        title: "Error Featuring Review",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleUnfeatureReview = async (review: Review) => {
    try {
      const { error } = await supabase
        .from("reviews")
        .update({ is_featured: false })
        .eq("id", review.id);

      if (error) throw error;

      toast({
        title: "Review Unfeatured",
        description: `Review by ${getCustomerName(review)} has been removed from featured reviews.`,
        variant: "default",
      });
      await fetchReviews();
    } catch (error: any) {
      console.error("Error unfeaturing review:", error);
      let errorMessage = "Unknown error occurred";
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error?.message) {
        errorMessage = error.error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      } else if (error) {
        errorMessage = JSON.stringify(error);
      }
      toast({
        title: "Error Unfeaturing Review",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const openModerationModal = (review: Review) => {
    setSelectedReview(review);
    setModerationNotes(review.moderation_notes || "");
    setIsModerationModalOpen(true);
  };

  const saveModerationNotes = async () => {
    if (!selectedReview) return;

    try {
      const { error } = await supabase
        .from("reviews")
        .update({
          moderation_notes: moderationNotes,
          moderated_at: new Date().toISOString(),
        })
        .eq("id", selectedReview.id);

      if (error) throw error;

      toast({
        title: "Moderation Notes Saved",
        description: `Moderation notes saved for review by ${getCustomerName(selectedReview)}.`,
        variant: "default",
      });
      setIsModerationModalOpen(false);
      setModerationNotes("");
      await fetchReviews();
    } catch (error: any) {
      console.error("Error saving moderation notes:", error);
      let errorMessage = "Unknown error occurred";
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error?.message) {
        errorMessage = error.error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      } else if (error) {
        errorMessage = JSON.stringify(error);
      }
      toast({
        title: "Error Saving Notes",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Filter reviews based on active tab
  const filteredReviews = reviews.filter((review) => {
    switch (activeTab) {
      case "pending":
        return !review.is_approved;
      case "approved":
        return review.is_approved;
      case "featured":
        return review.is_featured;
      default:
        return true;
    }
  });

  const columns: Column[] = [
    {
      key: "customer_service",
      header: "Customer & Service",
      render: (value: any, row: Review) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{getCustomerName(row)}</span>
            {!row.bookings?.customer_profiles && (
              <ROAMBadge variant="outline" size="sm">
                Guest
              </ROAMBadge>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            {getServiceName(row)}
          </div>
          <div className="text-xs text-muted-foreground">
            {getBusinessName(row)}
          </div>
        </div>
      ),
    },
    {
      key: "ratings",
      header: "Ratings",
      sortable: true,
      render: (value: any, row: Review) => (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Overall:</span>
            {renderStars(row.overall_rating)}
            <span className="text-sm font-bold text-roam-blue">
              {row.overall_rating}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {row.service_rating && (
              <div className="flex items-center gap-1">
                <span>Service:</span>
                <span className="font-medium">{row.service_rating}</span>
              </div>
            )}
            {row.communication_rating && (
              <div className="flex items-center gap-1">
                <span>Comm:</span>
                <span className="font-medium">{row.communication_rating}</span>
              </div>
            )}
            {row.punctuality_rating && (
              <div className="flex items-center gap-1">
                <span>Time:</span>
                <span className="font-medium">{row.punctuality_rating}</span>
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "review_content",
      header: "Review Content",
      render: (value: any, row: Review) => (
        <div className="max-w-xs">
          <p className="text-sm line-clamp-3 mb-2">
            {row.review_text || "No written review provided"}
          </p>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {row.review_text ? `${row.review_text.length} chars` : "No text"}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "provider_business",
      header: "Provider & Business",
      render: (value: any, row: Review) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{getProviderName(row)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="w-3 h-3" />
            <span>{getBusinessName(row)}</span>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status & Features",
      render: (value: any, row: Review) => (
        <div className="space-y-1">
          <ROAMBadge variant={getApprovalBadgeVariant(row.is_approved)}>
            {row.is_approved ? "Approved" : "Pending"}
          </ROAMBadge>
          {row.is_featured && (
            <ROAMBadge
              variant="warning"
              size="sm"
              className="flex items-center gap-1 w-fit"
            >
              <Crown className="w-3 h-3" />
              Featured
            </ROAMBadge>
          )}
          {row.overall_rating <= 2 && (
            <ROAMBadge
              variant="danger"
              size="sm"
              className="flex items-center gap-1 w-fit"
            >
              <Flag className="w-3 h-3" />
              Low Rating
            </ROAMBadge>
          )}
        </div>
      ),
    },
    {
      key: "moderation",
      header: "Moderation",
      render: (value: any, row: Review) => (
        <div className="space-y-1">
          {getModeratorName(row) ? (
            <div>
              <div className="text-sm font-medium">{getModeratorName(row)}</div>
              <div className="text-xs text-muted-foreground">
                {row.moderated_at && formatDateTime(row.moderated_at)}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>Unmoderated</span>
            </div>
          )}
          {row.moderation_notes && (
            <div className="text-xs text-muted-foreground max-w-xs">
              {row.moderation_notes}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "created_at",
      header: "Created",
      sortable: true,
      render: (value: string) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(value)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (value: any, row: Review) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              setSelectedReview(row);
              setIsReviewDetailsOpen(true);
            }}
            title="View Review Details"
          >
            <Eye className="h-4 w-4" />
          </Button>
          {!row.is_approved ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-roam-success hover:text-roam-success"
              onClick={() => handleApproveReview(row)}
              disabled={!adminUser?.id}
              title={
                !adminUser?.id ? "Loading admin user..." : "Approve Review"
              }
            >
              <CheckCircle className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => handleDisapproveReview(row)}
              disabled={!adminUser?.id}
              title={
                !adminUser?.id ? "Loading admin user..." : "Disapprove Review"
              }
            >
              <XCircle className="h-4 w-4" />
            </Button>
          )}
          {!row.is_featured ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-roam-warning hover:text-roam-warning"
              onClick={() => handleFeatureReview(row)}
              title="Feature Review"
              disabled={!row.is_approved || row.overall_rating < 4}
            >
              <Crown className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-muted-foreground"
              onClick={() => handleUnfeatureReview(row)}
              title="Unfeature Review"
            >
              <Crown className="h-4 w-4 fill-current" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => openModerationModal(row)}
            title="Add/Edit Moderation Notes"
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <AdminLayout title="Reviews">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-roam-blue" />
            <p className="text-muted-foreground">Loading reviews...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="Reviews">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Failed to Load Reviews
              </h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md">
                {error}
              </p>
              <Button onClick={refreshData} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Reviews">
      <div className="space-y-8">
        {/* Header with Refresh Button */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Reviews Management</h1>
          <Button onClick={refreshData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Data
          </Button>
        </div>
        {/* Stats Overview */}
        <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ROAMStatCard
            title="Total Reviews"
            value={reviewStats.totalReviews}
            icon={<Star className="w-5 h-5" />}
            changeText={`${reviewStats.approvedReviews} approved`}
            changeType="positive"
            changeIcon={<TrendingUp className="w-3 h-3" />}
          />

          <ROAMStatCard
            title="Avg Rating"
            value={reviewStats.averageRating.toFixed(1)}
            icon={<Star className="w-5 h-5" />}
            changeText="Platform average"
            changeType="neutral"
          />

          <ROAMStatCard
            title="Pending Review"
            value={reviewStats.pendingReviews}
            icon={<Clock className="w-5 h-5" />}
            changeText="Need moderation"
            changeType={reviewStats.pendingReviews > 0 ? "neutral" : "positive"}
          />

          <ROAMStatCard
            title="Featured Reviews"
            value={reviewStats.featuredReviews}
            icon={<Crown className="w-5 h-5" />}
            changeText="Marketing highlights"
            changeType="positive"
          />
        </div>

        {/* Review Quality Analysis */}
        <div className="hidden md:grid grid-cols-1 md:grid-cols-3 gap-6">
          <ROAMCard>
            <ROAMCardHeader>
              <ROAMCardTitle>Review Quality Distribution</ROAMCardTitle>
            </ROAMCardHeader>
            <ROAMCardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <ThumbsUp className="w-4 h-4 text-roam-success" />
                    <span className="text-sm font-medium">
                      High Ratings (4-5★)
                    </span>
                  </div>
                  <span className="text-lg font-bold">
                    {reviewStats.highRatingReviews}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-roam-warning" />
                    <span className="text-sm font-medium">
                      Medium Ratings (3★)
                    </span>
                  </div>
                  <span className="text-lg font-bold">
                    {reviews.filter((r) => r.overall_rating === 3).length}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <ThumbsDown className="w-4 h-4 text-destructive" />
                    <span className="text-sm font-medium">
                      Low Ratings (1-2★)
                    </span>
                  </div>
                  <span className="text-lg font-bold">
                    {reviewStats.lowRatingReviews}
                  </span>
                </div>

                <div className="pt-2 border-t">
                  <div className="text-xs text-muted-foreground">
                    {Math.round(
                      (reviewStats.highRatingReviews /
                        reviewStats.totalReviews) *
                        100,
                    )}
                    % positive reviews
                  </div>
                </div>
              </div>
            </ROAMCardContent>
          </ROAMCard>

          <ROAMCard>
            <ROAMCardHeader>
              <ROAMCardTitle>Moderation Status</ROAMCardTitle>
            </ROAMCardHeader>
            <ROAMCardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-roam-success" />
                    <span className="text-sm font-medium">Approved</span>
                  </div>
                  <span className="text-lg font-bold">
                    {reviewStats.approvedReviews}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-roam-warning" />
                    <span className="text-sm font-medium">Pending</span>
                  </div>
                  <span className="text-lg font-bold">
                    {reviewStats.pendingReviews}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-roam-warning" />
                    <span className="text-sm font-medium">Featured</span>
                  </div>
                  <span className="text-lg font-bold">
                    {reviewStats.featuredReviews}
                  </span>
                </div>

                <div className="pt-2 border-t">
                  <div className="text-xs text-muted-foreground">
                    {Math.round(
                      (reviewStats.approvedReviews / reviewStats.totalReviews) *
                        100,
                    )}
                    % approval rate
                  </div>
                </div>
              </div>
            </ROAMCardContent>
          </ROAMCard>

          <ROAMCard>
            <ROAMCardHeader>
              <ROAMCardTitle>Rating Breakdown</ROAMCardTitle>
            </ROAMCardHeader>
            <ROAMCardContent>
              <div className="space-y-4">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = reviews.filter(
                    (r) => r.overall_rating === rating,
                  ).length;
                  const percentage = (count / reviewStats.totalReviews) * 100;

                  return (
                    <div key={rating} className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium">{rating}</span>
                        <Star className="w-3 h-3 fill-roam-yellow text-roam-yellow" />
                      </div>
                      <div className="flex-1 bg-muted rounded-full h-2">
                        <div
                          className="bg-roam-blue h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                  );
                })}
              </div>
            </ROAMCardContent>
          </ROAMCard>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-border">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab("all")}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "all"
                  ? "border-roam-blue text-roam-blue"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              All Reviews ({reviewStats.totalReviews})
            </button>
            <button
              onClick={() => setActiveTab("pending")}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "pending"
                  ? "border-roam-blue text-roam-blue"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Pending ({reviewStats.pendingReviews})
            </button>
            <button
              onClick={() => setActiveTab("approved")}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "approved"
                  ? "border-roam-blue text-roam-blue"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Approved ({reviewStats.approvedReviews})
            </button>
            <button
              onClick={() => setActiveTab("featured")}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "featured"
                  ? "border-roam-blue text-roam-blue"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Featured ({reviewStats.featuredReviews})
            </button>
          </nav>
        </div>

        {/* Reviews Table */}
        <ROAMDataTable
          title={`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Reviews`}
          columns={columns}
          data={filteredReviews}
          searchable={true}
          filterable={true}
          addable={false}
          onRowClick={(review) => console.log("View review:", review)}
          pageSize={10}
        />
      </div>

      {/* Review Details Modal */}
      <Dialog open={isReviewDetailsOpen} onOpenChange={setIsReviewDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="w-6 h-6 text-roam-yellow" />
              Review Details - {selectedReview?.overall_rating}�� Rating
            </DialogTitle>
            <DialogDescription>
              View detailed review information including ratings, feedback, and
              moderation status.
            </DialogDescription>
          </DialogHeader>

          {selectedReview && (
            <div className="space-y-6">
              {/* Review Header */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ROAMCard>
                  <ROAMCardHeader>
                    <ROAMCardTitle className="text-base">
                      Review Information
                    </ROAMCardTitle>
                  </ROAMCardHeader>
                  <ROAMCardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Star className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Review ID
                        </div>
                        <div className="font-medium">{selectedReview.id}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Booking ID
                        </div>
                        <div className="font-medium">
                          #{selectedReview.booking_id.slice(-6)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Business
                        </div>
                        <div className="font-medium">
                          {getBusinessName(selectedReview)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Service
                        </div>
                        <div className="font-medium">
                          {getServiceName(selectedReview)}
                        </div>
                      </div>
                    </div>
                  </ROAMCardContent>
                </ROAMCard>

                <ROAMCard>
                  <ROAMCardHeader>
                    <ROAMCardTitle className="text-base">
                      People Involved
                    </ROAMCardTitle>
                  </ROAMCardHeader>
                  <ROAMCardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Customer
                        </div>
                        <div className="font-medium">
                          {getCustomerName(selectedReview)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <UserCheck className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Provider
                        </div>
                        <div className="font-medium">
                          {getProviderName(selectedReview)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Created
                        </div>
                        <div className="font-medium">
                          {formatDateTime(selectedReview.created_at)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Shield className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Status
                        </div>
                        <div className="flex gap-2 mt-1">
                          <ROAMBadge
                            variant={
                              selectedReview.is_approved ? "success" : "warning"
                            }
                          >
                            {selectedReview.is_approved
                              ? "Approved"
                              : "Pending"}
                          </ROAMBadge>
                          {selectedReview.is_featured && (
                            <ROAMBadge
                              variant="warning"
                              className="flex items-center gap-1"
                            >
                              <Crown className="w-3 h-3" />
                              Featured
                            </ROAMBadge>
                          )}
                          {selectedReview.overall_rating <= 2 && (
                            <ROAMBadge
                              variant="danger"
                              className="flex items-center gap-1"
                            >
                              <Flag className="w-3 h-3" />
                              Low Rating
                            </ROAMBadge>
                          )}
                        </div>
                      </div>
                    </div>
                  </ROAMCardContent>
                </ROAMCard>
              </div>

              {/* Rating Breakdown */}
              <ROAMCard>
                <ROAMCardHeader>
                  <ROAMCardTitle className="text-base">
                    Rating Breakdown
                  </ROAMCardTitle>
                </ROAMCardHeader>
                <ROAMCardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-center gap-1 mb-2">
                        <Star className="w-5 h-5 fill-roam-yellow text-roam-yellow" />
                        <span className="text-xl font-bold">
                          {selectedReview.overall_rating}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Overall Rating
                      </div>
                    </div>

                    {selectedReview.service_rating && (
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-center gap-1 mb-2">
                          <Star className="w-5 h-5 fill-roam-blue text-roam-blue" />
                          <span className="text-xl font-bold">
                            {selectedReview.service_rating}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Service Quality
                        </div>
                      </div>
                    )}

                    {selectedReview.communication_rating && (
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-center gap-1 mb-2">
                          <MessageSquare className="w-5 h-5 text-roam-success" />
                          <span className="text-xl font-bold">
                            {selectedReview.communication_rating}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Communication
                        </div>
                      </div>
                    )}

                    {selectedReview.punctuality_rating && (
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-center gap-1 mb-2">
                          <Clock className="w-5 h-5 text-roam-warning" />
                          <span className="text-xl font-bold">
                            {selectedReview.punctuality_rating}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Punctuality
                        </div>
                      </div>
                    )}
                  </div>
                </ROAMCardContent>
              </ROAMCard>

              {/* Review Text */}
              {selectedReview.review_text && (
                <ROAMCard>
                  <ROAMCardHeader>
                    <ROAMCardTitle className="text-base">
                      Customer Review
                    </ROAMCardTitle>
                  </ROAMCardHeader>
                  <ROAMCardContent>
                    <div className="p-4 bg-muted/30 border-l-4 border-roam-blue rounded-lg">
                      <div className="flex items-start gap-3">
                        <MessageSquare className="w-5 h-5 text-roam-blue mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-sm leading-relaxed italic">
                            "{selectedReview.review_text}"
                          </p>
                          <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                            <User className="w-3 h-3" />
                            <span>{getCustomerName(selectedReview)}</span>
                            <span>•</span>
                            <span>{formatDate(selectedReview.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </ROAMCardContent>
                </ROAMCard>
              )}

              {/* Moderation Information */}
              <ROAMCard>
                <ROAMCardHeader>
                  <ROAMCardTitle className="text-base">
                    Moderation Information
                  </ROAMCardTitle>
                </ROAMCardHeader>
                <ROAMCardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Shield className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm text-muted-foreground">
                            Moderation Status
                          </div>
                          <ROAMBadge
                            variant={
                              selectedReview.is_approved ? "success" : "warning"
                            }
                            className="mt-1"
                          >
                            {selectedReview.is_approved
                              ? "Approved"
                              : "Pending Review"}
                          </ROAMBadge>
                        </div>
                      </div>

                      {selectedReview.moderated_by_name && (
                        <div className="flex items-center gap-3">
                          <UserCheck className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <div className="text-sm text-muted-foreground">
                              Moderated By
                            </div>
                            <div className="font-medium">
                              {selectedReview.moderated_by_name}
                            </div>
                          </div>
                        </div>
                      )}

                      {selectedReview.moderated_at && (
                        <div className="flex items-center gap-3">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <div className="text-sm text-muted-foreground">
                              Moderated At
                            </div>
                            <div className="font-medium">
                              {formatDateTime(selectedReview.moderated_at)}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {selectedReview.moderation_notes && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium">
                          Moderation Notes
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg border">
                          <p className="text-sm">
                            {selectedReview.moderation_notes}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </ROAMCardContent>
              </ROAMCard>

              {/* Moderation Actions */}
              <ROAMCard>
                <ROAMCardHeader>
                  <ROAMCardTitle className="text-base">
                    Moderation Actions
                  </ROAMCardTitle>
                </ROAMCardHeader>
                <ROAMCardContent>
                  <div className="space-y-4">
                    {/* Approval Status */}
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">Approval Status</div>
                          <div className="text-sm text-muted-foreground">
                            {selectedReview.is_approved
                              ? "Approved"
                              : "Pending Approval"}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!selectedReview.is_approved ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-roam-success border-roam-success"
                            onClick={() => handleApproveReview(selectedReview)}
                            disabled={!adminUser?.id}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive border-destructive"
                            onClick={() =>
                              handleDisapproveReview(selectedReview)
                            }
                            disabled={!adminUser?.id}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Disapprove
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Featured Status */}
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <Crown className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">Featured Status</div>
                          <div className="text-sm text-muted-foreground">
                            {selectedReview.is_featured
                              ? "Featured"
                              : "Not Featured"}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!selectedReview.is_featured ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-roam-warning border-roam-warning"
                            onClick={() => handleFeatureReview(selectedReview)}
                            disabled={
                              !selectedReview.is_approved ||
                              selectedReview.overall_rating < 4
                            }
                          >
                            <Crown className="w-4 h-4 mr-2" />
                            Feature
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-muted-foreground border-muted-foreground"
                            onClick={() =>
                              handleUnfeatureReview(selectedReview)
                            }
                          >
                            <Crown className="w-4 h-4 mr-2" />
                            Unfeature
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Moderation Notes */}
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Edit className="w-4 h-4 text-muted-foreground" />
                          <div className="font-medium">Moderation Notes</div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openModerationModal(selectedReview)}
                        >
                          Edit Notes
                        </Button>
                      </div>
                      {selectedReview.moderation_notes ? (
                        <div className="p-2 bg-muted/50 rounded text-sm">
                          {selectedReview.moderation_notes}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground italic">
                          No moderation notes added yet
                        </div>
                      )}
                      {selectedReview.moderated_by_name && (
                        <div className="text-xs text-muted-foreground mt-2">
                          Last moderated by {selectedReview.moderated_by_name}
                          {selectedReview.moderated_at && (
                            <>
                              {" "}
                              on {formatDateTime(selectedReview.moderated_at)}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </ROAMCardContent>
              </ROAMCard>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Moderation Notes Modal */}
      <Dialog
        open={isModerationModalOpen}
        onOpenChange={setIsModerationModalOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-6 h-6 text-roam-blue" />
              Moderation Notes
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {selectedReview && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="text-sm">
                  <div className="font-medium mb-1">
                    Review by {getCustomerName(selectedReview)}
                  </div>
                  <div className="text-muted-foreground">
                    {getServiceName(selectedReview)} at{" "}
                    {getBusinessName(selectedReview)}
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="moderation_notes">Moderation Notes</Label>
              <Textarea
                id="moderation_notes"
                value={moderationNotes}
                onChange={(e) => setModerationNotes(e.target.value)}
                placeholder="Add notes about this review's moderation status, quality, or any concerns..."
                className="mt-1"
                rows={4}
              />
              <div className="text-xs text-muted-foreground mt-1">
                These notes are only visible to admin moderators
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setIsModerationModalOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={saveModerationNotes}>Save Notes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
