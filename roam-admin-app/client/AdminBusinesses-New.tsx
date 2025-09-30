import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { BusinessFilters } from "./components/businesses/BusinessFilters";
import { BusinessActions } from "./components/businesses/BusinessActions";
import { BusinessList } from "./components/businesses/BusinessList";
import { BusinessDetails } from "./components/businesses/BusinessDetails";
import { ROAMStatCard } from "@/components/ui/roam-stat-card";
import { useToast } from "@/hooks/use-toast";
import { Building2, CheckCircle, Star, CreditCard, TrendingUp } from "lucide-react";

type VerificationStatus = "pending" | "approved" | "rejected" | "suspended";
type BusinessType =
  | "independent"
  | "small_business"
  | "franchise"
  | "enterprise"
  | "other";

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
  business_hours: Record<string, any> | string | null;
  social_media: Record<string, any> | null;
  verification_notes: string | null;
  business_type: BusinessType;
  service_categories: string[] | null;
  service_subcategories: string[] | null;
  is_featured: boolean | null;
}

export default function AdminBusinesses() {
  const { toast } = useToast();
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessProfile | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedBusinesses, setSelectedBusinesses] = useState<string[]>([]);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [verificationFilter, setVerificationFilter] = useState<"all" | "verified" | "unverified">("all");
  const [businessTypeFilter, setBusinessTypeFilter] = useState<"all" | BusinessType>("all");
  const [featuredFilter, setFeaturedFilter] = useState<"all" | "featured" | "not_featured">("all");

  // Stats calculations
  const businessStats = {
    total: businesses.length,
    active: businesses.filter(b => b.is_active).length,
    verified: businesses.filter(b => b.verification_status === "approved").length,
    withStripe: businesses.filter(b => b.stripe_connect_account_id).length,
  };

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const fetchBusinesses = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("Fetching businesses from API...");

      const response = await fetch('/api/businesses');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch businesses');
      }

      console.log("Business API response:", result);

      if (result.data) {
        console.log(`Successfully fetched ${result.data.length || 0} businesses from API`);
        setBusinesses(result.data || []);
      } else {
        console.log("No data field in API response, using empty array");
        setBusinesses([]);
      }
    } catch (error) {
      console.error("Error fetching businesses:", error);
      setError(error instanceof Error ? error.message : "Failed to fetch businesses");
      
      // Fallback to direct Supabase query
      try {
        console.log("Trying direct Supabase query as fallback...");
        const { data, error: supabaseError } = await supabase
          .from("business_profiles")
          .select("*")
          .order("created_at", { ascending: false });

        if (supabaseError) {
          throw supabaseError;
        }

        console.log(`Successfully fetched ${data?.length || 0} businesses from Supabase`);
        setBusinesses(data || []);
        setError(null);
      } catch (supabaseError) {
        console.error("Supabase fallback also failed:", supabaseError);
        setError("Failed to fetch businesses from both API and database");
        setBusinesses([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const getFilteredBusinesses = () => {
    let filtered = businesses;

    // Apply status filter
    if (statusFilter !== "all") {
      if (statusFilter === "active") {
        filtered = filtered.filter(business => business.is_active);
      } else if (statusFilter === "inactive") {
        filtered = filtered.filter(business => !business.is_active);
      }
    }

    // Apply verification filter
    if (verificationFilter !== "all") {
      if (verificationFilter === "verified") {
        filtered = filtered.filter(business => business.verification_status === "approved");
      } else if (verificationFilter === "unverified") {
        filtered = filtered.filter(business => business.verification_status !== "approved");
      }
    }

    // Apply business type filter
    if (businessTypeFilter !== "all") {
      filtered = filtered.filter(business => business.business_type === businessTypeFilter);
    }

    // Apply featured filter
    if (featuredFilter !== "all") {
      if (featuredFilter === "featured") {
        filtered = filtered.filter(business => business.is_featured);
      } else if (featuredFilter === "not_featured") {
        filtered = filtered.filter(business => !business.is_featured);
      }
    }

    return filtered;
  };

  const handleViewBusiness = (business: BusinessProfile) => {
    setSelectedBusiness(business);
    setIsDetailsOpen(true);
  };

  const handleEditBusiness = (business: BusinessProfile) => {
    // TODO: Implement edit functionality
    console.log("Edit business:", business);
    toast({
      title: "Edit Business",
      description: "Edit functionality would be implemented here",
    });
  };

  const handleDeleteBusiness = (business: BusinessProfile) => {
    // TODO: Implement delete functionality
    console.log("Delete business:", business);
    toast({
      title: "Delete Business",
      description: "Delete functionality would be implemented here",
    });
  };

  const handleToggleStatus = async (business: BusinessProfile) => {
    try {
      const { error } = await supabase
        .from("business_profiles")
        .update({ is_active: !business.is_active })
        .eq("id", business.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Status Updated",
        description: `Business ${business.is_active ? 'deactivated' : 'activated'} successfully`,
      });

      await fetchBusinesses();
    } catch (error) {
      console.error("Error updating business status:", error);
      toast({
        title: "Error",
        description: "Failed to update business status",
        variant: "destructive",
      });
    }
  };

  const handleToggleFeatured = async (business: BusinessProfile) => {
    try {
      const { error } = await supabase
        .from("business_profiles")
        .update({ is_featured: !business.is_featured })
        .eq("id", business.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Featured Status Updated",
        description: `Business ${business.is_featured ? 'removed from' : 'added to'} featured list`,
      });

      await fetchBusinesses();
    } catch (error) {
      console.error("Error updating featured status:", error);
      toast({
        title: "Error",
        description: "Failed to update featured status",
        variant: "destructive",
      });
    }
  };

  const handleApproveBusiness = async (business: BusinessProfile) => {
    try {
      const { error } = await supabase
        .from("business_profiles")
        .update({ 
          verification_status: "approved",
          verification_notes: "Approved by admin"
        })
        .eq("id", business.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Business Approved",
        description: `${business.business_name} has been approved`,
      });

      await fetchBusinesses();
    } catch (error) {
      console.error("Error approving business:", error);
      toast({
        title: "Error",
        description: "Failed to approve business",
        variant: "destructive",
      });
    }
  };

  const handleRejectBusiness = async (business: BusinessProfile) => {
    try {
      const { error } = await supabase
        .from("business_profiles")
        .update({ 
          verification_status: "rejected",
          verification_notes: "Rejected by admin - requires review"
        })
        .eq("id", business.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Business Rejected",
        description: `${business.business_name} has been rejected`,
      });

      await fetchBusinesses();
    } catch (error) {
      console.error("Error rejecting business:", error);
      toast({
        title: "Error",
        description: "Failed to reject business",
        variant: "destructive",
      });
    }
  };

  const handleAddBusiness = () => {
    // TODO: Implement add business functionality
    console.log("Add new business");
    toast({
      title: "Add Business",
      description: "Add business functionality would be implemented here",
    });
  };

  const handleBulkAction = async (action: string, businessIds: string[]) => {
    console.log("Bulk action:", action, businessIds);
    toast({
      title: "Bulk Action",
      description: `Bulk ${action} functionality would be implemented here`,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading businesses...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Business Management</h1>
        <p className="text-muted-foreground">
          Manage business profiles, verification status, and business settings
        </p>
      </div>

      {/* Stats Overview */}
      <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ROAMStatCard
          title="Total Businesses"
          value={businessStats.total.toString()}
          icon={<Building2 className="w-5 h-5" />}
          subtitle="2 new this month"
          changeType="positive"
        />

        <ROAMStatCard
          title="Active Businesses"
          value={businessStats.active.toString()}
          icon={<CheckCircle className="w-5 h-5" />}
          subtitle={
            businessStats.total > 0
              ? `${Math.round((businessStats.active / businessStats.total) * 100)}% of total`
              : "No businesses yet"
          }
          changeType="positive"
        />

        <ROAMStatCard
          title="Verified"
          value={businessStats.verified.toString()}
          icon={<Star className="w-5 h-5" />}
          subtitle="Fully verified businesses"
          changeType="neutral"
        />

        <ROAMStatCard
          title="With Stripe Connect"
          value={businessStats.withStripe.toString()}
          icon={<CreditCard className="w-5 h-5" />}
          subtitle="Payment processing enabled"
          changeType="positive"
        />
      </div>

      {/* Filters */}
      <BusinessFilters
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        verificationFilter={verificationFilter}
        setVerificationFilter={setVerificationFilter}
        businessTypeFilter={businessTypeFilter}
        setBusinessTypeFilter={setBusinessTypeFilter}
        featuredFilter={featuredFilter}
        setFeaturedFilter={setFeaturedFilter}
        onRefresh={fetchBusinesses}
        isLoading={loading}
      />

      {/* Actions */}
      <BusinessActions
        onAddBusiness={handleAddBusiness}
        selectedItems={selectedBusinesses}
        onBulkAction={handleBulkAction}
      />

      {/* Business List */}
      <BusinessList
        data={getFilteredBusinesses()}
        onView={handleViewBusiness}
        onEdit={handleEditBusiness}
        onDelete={handleDeleteBusiness}
        onToggleStatus={handleToggleStatus}
        onToggleFeatured={handleToggleFeatured}
        onApprove={handleApproveBusiness}
        onReject={handleRejectBusiness}
      />

      {/* Business Details Modal */}
      <BusinessDetails
        business={selectedBusiness}
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedBusiness(null);
        }}
        onEdit={handleEditBusiness}
        onApprove={handleApproveBusiness}
        onReject={handleRejectBusiness}
      />
    </div>
  );
}