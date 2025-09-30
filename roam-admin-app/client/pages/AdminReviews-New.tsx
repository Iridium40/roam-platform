import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ReviewStats } from "@/components/reviews/ReviewStats";
import { ReviewOverview } from "@/components/reviews/ReviewOverview";
import { ReviewTable } from "@/components/reviews/ReviewTable";
import { ReviewDetailsModal } from "@/components/reviews/ReviewDetailsModal";
import { ReviewModerationPanel } from "@/components/reviews/ReviewModerationPanel";

// Types
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
  
  // State
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [isReviewDetailsOpen, setIsReviewDetailsOpen] = useState(false);
  const [isModerationModalOpen, setIsModerationModalOpen] = useState(false);

  // Helper functions
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

  // Data fetching
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

        setAdminUser(data);
      } catch (err) {
        console.error("Error in fetchAdminUser:", err);
      }
    }
  };

  const fetchReviews = async (retryCount = 0) => {
    const maxRetries = 2;

    try {
      setError(null);
      
      const { data, error } = await supabase
        .from("reviews")
        .select(`
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
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setReviews(data || []);
    } catch (error: any) {
      console.error("Error fetching reviews:", error);
      let errorMessage = "Failed to load reviews";
      
      if (error?.message) {
        errorMessage = error.message;
      }
      
      if (retryCount < maxRetries) {
        console.log(`Retrying fetch (${retryCount + 1}/${maxRetries})...`);
        setTimeout(() => fetchReviews(retryCount + 1), 1000);
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setLoading(true);
    await Promise.all([fetchAdminUser(), fetchReviews()]);
  };

  // Moderation handlers
  const handleApproveReview = async (review: Review) => {
    if (!adminUser?.id) {
      toast({
        title: "Error",
        description: "Admin user not found. Please refresh the page and try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("reviews")
        .update({
          is_approved: true,
          moderated_by: adminUser.id,
          moderated_at: new Date().toISOString(),
        })
        .eq("id", review.id);

      if (error) throw error;

      toast({
        title: "Review Approved",
        description: `Review by ${getCustomerName(review)} has been approved successfully.`,
        variant: "default",
      });
      await fetchReviews();
    } catch (error: any) {
      console.error("Error approving review:", error);
      toast({
        title: "Error Approving Review",
        description: error?.message || "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const handleDisapproveReview = async (review: Review) => {
    if (!adminUser?.id) {
      toast({
        title: "Error",
        description: "Admin user not found. Please refresh the page and try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("reviews")
        .update({
          is_approved: false,
          is_featured: false,
          moderated_by: adminUser.id,
          moderated_at: new Date().toISOString(),
        })
        .eq("id", review.id);

      if (error) throw error;

      toast({
        title: "Review Disapproved",
        description: `Review by ${getCustomerName(review)} has been disapproved.`,
        variant: "default",
      });
      await fetchReviews();
    } catch (error: any) {
      console.error("Error disapproving review:", error);
      toast({
        title: "Error Disapproving Review",
        description: error?.message || "Unknown error occurred",
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
      toast({
        title: "Error Featuring Review",
        description: error?.message || "Unknown error occurred",
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
      toast({
        title: "Error Unfeaturing Review",
        description: error?.message || "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const handleSaveModerationNotes = async (notes: string) => {
    if (!selectedReview) return;

    try {
      const { error } = await supabase
        .from("reviews")
        .update({
          moderation_notes: notes,
          moderated_at: new Date().toISOString(),
        })
        .eq("id", selectedReview.id);

      if (error) throw error;

      toast({
        title: "Moderation Notes Saved",
        description: `Moderation notes saved for review by ${getCustomerName(selectedReview)}.`,
        variant: "default",
      });
      await fetchReviews();
    } catch (error: any) {
      console.error("Error saving moderation notes:", error);
      toast({
        title: "Error Saving Notes",
        description: error?.message || "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  // Event handlers
  const handleViewReview = (review: Review) => {
    setSelectedReview(review);
    setIsReviewDetailsOpen(true);
  };

  const handleEditModerationNotes = (review: Review) => {
    setSelectedReview(review);
    setIsModerationModalOpen(true);
  };

  // Effects
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (isMounted) {
        await fetchAdminUser();
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    
    const loadReviews = async () => {
      if (adminUser && isMounted) {
        await fetchReviews();
      }
    };
    
    loadReviews();
    
    return () => {
      isMounted = false;
    };
  }, [adminUser]);

  // Loading state
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

  // Error state
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

        {/* Review Statistics */}
        <ReviewStats reviews={reviews} />

        {/* Review Overview */}
        <ReviewOverview reviews={reviews} />

        {/* Review Table */}
        <ReviewTable
          reviews={reviews}
          adminUser={adminUser}
          onViewReview={handleViewReview}
          onApproveReview={handleApproveReview}
          onDisapproveReview={handleDisapproveReview}
          onFeatureReview={handleFeatureReview}
          onUnfeatureReview={handleUnfeatureReview}
          onEditModerationNotes={handleEditModerationNotes}
          formatDate={formatDate}
          getCustomerName={getCustomerName}
          getProviderName={getProviderName}
          getBusinessName={getBusinessName}
          getServiceName={getServiceName}
        />

        {/* Review Details Modal */}
        <ReviewDetailsModal
          isOpen={isReviewDetailsOpen}
          onClose={() => setIsReviewDetailsOpen(false)}
          review={selectedReview}
          onApproveReview={handleApproveReview}
          onDisapproveReview={handleDisapproveReview}
          onFeatureReview={handleFeatureReview}
          onUnfeatureReview={handleUnfeatureReview}
          onEditModerationNotes={handleEditModerationNotes}
          formatDate={formatDate}
          formatDateTime={formatDateTime}
          getCustomerName={getCustomerName}
          getProviderName={getProviderName}
          getBusinessName={getBusinessName}
          getServiceName={getServiceName}
          getModeratorName={getModeratorName}
        />

        {/* Moderation Panel */}
        <ReviewModerationPanel
          isOpen={isModerationModalOpen}
          onClose={() => setIsModerationModalOpen(false)}
          review={selectedReview}
          onSaveModerationNotes={handleSaveModerationNotes}
          getCustomerName={getCustomerName}
          getServiceName={getServiceName}
          getBusinessName={getBusinessName}
        />
      </div>
    </AdminLayout>
  );
}