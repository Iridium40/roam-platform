import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { ROAMStatCard } from "@/components/ui/roam-stat-card";
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
  UserCheck,
  Users,
  TrendingUp,
  Star,
  Calendar,
  Plus,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  ProviderList,
  ProviderDetails,
  ProviderFilters,
  BulkActions,
} from "@/components/providers";

type VerificationStatus =
  | "pending"
  | "documents_submitted"
  | "under_review"
  | "approved"
  | "rejected";

type BackgroundCheckStatus =
  | "pending"
  | "under_review"
  | "approved"
  | "rejected";

type ProviderRole = "provider" | "owner" | "dispatcher";

interface Provider {
  id: string;
  user_id: string;
  business_id: string;
  location_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  bio: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  date_of_birth: string | null;
  experience_years: number | null;
  verification_status: VerificationStatus;
  background_check_status: BackgroundCheckStatus;
  provider_role: ProviderRole;
  business_managed: boolean;
  notification_email: string | null;
  notification_phone: string | null;
  total_bookings: number;
  completed_bookings: number;
  average_rating: number;
  total_reviews: number;
  business_name: string;
}

interface ProviderService {
  id: string;
  business_id: string;
  service_id: string;
  business_name: string;
  service_name: string;
  service_category: string;
  base_price: number;
  custom_price?: number;
  is_active: boolean;
  created_at: string;
}

interface Business {
  id: string;
  business_name: string;
}

export default function AdminProviders() {
  // Data state
  const [providers, setProviders] = useState<Provider[]>([]);
  const [providerServices, setProviderServices] = useState<ProviderService[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [isProviderDetailsOpen, setIsProviderDetailsOpen] = useState(false);
  const [isAddProviderOpen, setIsAddProviderOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Filter state
  const [verificationFilter, setVerificationFilter] = useState<"all" | VerificationStatus>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [roleFilter, setRoleFilter] = useState<"all" | ProviderRole>("all");
  
  // New provider form state
  const [newProvider, setNewProvider] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    bio: "",
    business_id: "",
    date_of_birth: "",
    experience_years: "",
    provider_role: "provider" as ProviderRole,
    business_managed: false,
    notification_email: "",
    notification_phone: "",
    is_active: true,
  });

  // Fetch data on component mount
  useEffect(() => {
    fetchProviders();
    fetchProviderServices();
    fetchBusinesses();
  }, []);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("providers")
        .select(
          `
          *,
          business_profiles!business_id (
            business_name
          )
        `
        )
        .order("created_at", { ascending: false });

      if (error) {
        setError(`Query Error: ${error.message}`);
        setProviders([]);
      } else {
        // Flatten the business_profiles data
        const flattenedData = data?.map((provider: any) => ({
          ...provider,
          business_name: provider.business_profiles?.business_name || "Unknown Business",
        })) || [];
        
        setProviders(flattenedData);
        if (flattenedData.length === 0) {
          setError("No provider records found.");
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      setError(`Connection Error: ${errorMessage}`);
      setProviders([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProviderServices = async () => {
    try {
      const { data, error } = await supabase
        .from("provider_services")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching provider services:", error);
      } else {
        setProviderServices(data || []);
      }
    } catch (err) {
      console.error("Error fetching provider services:", err);
    }
  };

  const fetchBusinesses = async () => {
    try {
      const { data, error } = await supabase
        .from("business_profiles")
        .select("id, business_name")
        .order("business_name");

      if (error) {
        console.error("Error fetching businesses:", error);
      } else {
        setBusinesses(data || []);
      }
    } catch (err) {
      console.error("Error fetching businesses:", err);
    }
  };

  // Filter providers based on current filters
  const filteredProviders = providers.filter((provider) => {
    if (statusFilter !== "all" && 
        ((statusFilter === "active" && !provider.is_active) ||
         (statusFilter === "inactive" && provider.is_active))) {
      return false;
    }
    
    if (verificationFilter !== "all" && provider.verification_status !== verificationFilter) {
      return false;
    }
    
    if (roleFilter !== "all" && provider.provider_role !== roleFilter) {
      return false;
    }
    
    return true;
  });

  // Calculate provider stats
  const providerStats = {
    total: providers.length,
    active: providers.filter(p => p.is_active).length,
    avgRating: providers.length > 0 
      ? providers.reduce((sum, p) => sum + p.average_rating, 0) / providers.length 
      : 0,
    totalBookings: providers.reduce((sum, p) => sum + p.total_bookings, 0),
  };

  const handleProviderView = (provider: Provider) => {
    setSelectedProvider(provider);
    setIsProviderDetailsOpen(true);
  };

  const handleProviderToggleStatus = async (provider: Provider) => {
    try {
      const { error } = await supabase
        .from("providers")
        .update({ is_active: !provider.is_active })
        .eq("id", provider.id);

      if (error) {
        console.error("Error updating provider status:", error);
      } else {
        await fetchProviders(); // Refresh the list
      }
    } catch (err) {
      console.error("Error toggling provider status:", err);
    }
  };

  const handleBulkAction = async (action: string, providerIds: string[]) => {
    try {
      const updates = action === "activate" ? { is_active: true } : { is_active: false };
      
      const { error } = await supabase
        .from("providers")
        .update(updates)
        .in("id", providerIds);

      if (error) {
        console.error("Error performing bulk action:", error);
      } else {
        setSelectedProviders([]);
        await fetchProviders(); // Refresh the list
      }
    } catch (err) {
      console.error("Error performing bulk action:", err);
    }
  };

  const handleAddProvider = async () => {
    try {
      setSaving(true);
      
      const providerData = {
        ...newProvider,
        experience_years: newProvider.experience_years ? parseInt(newProvider.experience_years) : null,
        date_of_birth: newProvider.date_of_birth || null,
        notification_email: newProvider.notification_email || null,
        notification_phone: newProvider.notification_phone || null,
        bio: newProvider.bio || null,
      };

      const { error } = await supabase
        .from("providers")
        .insert([providerData]);

      if (error) {
        console.error("Error adding provider:", error);
      } else {
        setIsAddProviderOpen(false);
        setNewProvider({
          first_name: "",
          last_name: "",
          email: "",
          phone: "",
          bio: "",
          business_id: "",
          date_of_birth: "",
          experience_years: "",
          provider_role: "provider" as ProviderRole,
          business_managed: false,
          notification_email: "",
          notification_phone: "",
          is_active: true,
        });
        await fetchProviders(); // Refresh the list
      }
    } catch (err) {
      console.error("Error adding provider:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="Providers">
      <div className="space-y-8">
        {/* Stats Overview */}
        <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ROAMStatCard
            title="Total Providers"
            value={providerStats.total}
            icon={<UserCheck className="w-5 h-5" />}
            subtitle="3 new this month"
            changeType="positive"
            changeIcon={<TrendingUp className="w-3 h-3" />}
          />

          <ROAMStatCard
            title="Active Providers"
            value={providerStats.active}
            icon={<Users className="w-5 h-5" />}
            subtitle={`${Math.round((providerStats.active / providerStats.total) * 100)}% of total`}
            changeType="positive"
          />

          <ROAMStatCard
            title="Avg Rating"
            value={providerStats.avgRating.toFixed(1)}
            icon={<Star className="w-5 h-5" />}
            subtitle="Platform average"
            changeType="neutral"
          />

          <ROAMStatCard
            title="Total Bookings"
            value={providerStats.totalBookings.toLocaleString()}
            icon={<Calendar className="w-5 h-5" />}
            subtitle="All time bookings"
            changeType="positive"
          />
        </div>

        <div className="space-y-4">
          {/* Filter Controls */}
          <ProviderFilters
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            verificationFilter={verificationFilter}
            setVerificationFilter={setVerificationFilter}
            roleFilter={roleFilter}
            setRoleFilter={setRoleFilter}
            onRefresh={fetchProviders}
            isLoading={loading}
          />

          {/* Bulk Actions */}
          <BulkActions
            selectedProviders={selectedProviders}
            onAddProvider={() => setIsAddProviderOpen(true)}
            onBulkAction={handleBulkAction}
          />

          {/* Error Display */}
          {error && (
            <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
              {error}
            </div>
          )}

          {/* Provider List */}
          <ProviderList
            providers={filteredProviders}
            loading={loading}
            selectedProviders={selectedProviders}
            onSelectionChange={setSelectedProviders}
            onProviderView={handleProviderView}
            onProviderToggleStatus={handleProviderToggleStatus}
          />
        </div>

        {/* Provider Details Modal */}
        <ProviderDetails
          provider={selectedProvider}
          isOpen={isProviderDetailsOpen}
          onClose={() => setIsProviderDetailsOpen(false)}
          providerServices={providerServices}
        />

        {/* Add Provider Modal */}
        <Dialog open={isAddProviderOpen} onOpenChange={setIsAddProviderOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Provider</DialogTitle>
              <DialogDescription>
                Create a new provider account with their business details.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name *</Label>
                    <Input
                      id="first_name"
                      value={newProvider.first_name}
                      onChange={(e) =>
                        setNewProvider((prev) => ({
                          ...prev,
                          first_name: e.target.value,
                        }))
                      }
                      placeholder="Enter first name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name *</Label>
                    <Input
                      id="last_name"
                      value={newProvider.last_name}
                      onChange={(e) =>
                        setNewProvider((prev) => ({
                          ...prev,
                          last_name: e.target.value,
                        }))
                      }
                      placeholder="Enter last name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newProvider.email}
                      onChange={(e) =>
                        setNewProvider((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      placeholder="provider@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={newProvider.phone}
                      onChange={(e) =>
                        setNewProvider((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                      placeholder="+1-555-123-4567"
                    />
                  </div>
                </div>
              </div>

              {/* Professional Details */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Professional Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="business_id">Business *</Label>
                    <Select
                      value={newProvider.business_id}
                      onValueChange={(value) =>
                        setNewProvider((prev) => ({
                          ...prev,
                          business_id: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a business" />
                      </SelectTrigger>
                      <SelectContent>
                        {businesses.map((business) => (
                          <SelectItem key={business.id} value={business.id}>
                            {business.business_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="experience_years">Experience (Years)</Label>
                    <Input
                      id="experience_years"
                      type="number"
                      min="0"
                      max="50"
                      value={newProvider.experience_years}
                      onChange={(e) =>
                        setNewProvider((prev) => ({
                          ...prev,
                          experience_years: e.target.value,
                        }))
                      }
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="provider_role">Provider Role</Label>
                  <Select
                    value={newProvider.provider_role}
                    onValueChange={(value: ProviderRole) =>
                      setNewProvider((prev) => ({
                        ...prev,
                        provider_role: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="provider">Provider</SelectItem>
                      <SelectItem value="owner">Owner</SelectItem>
                      <SelectItem value="dispatcher">Dispatcher</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Professional Bio</Label>
                  <Textarea
                    id="bio"
                    value={newProvider.bio}
                    onChange={(e) =>
                      setNewProvider((prev) => ({ ...prev, bio: e.target.value }))
                    }
                    placeholder="Brief description of experience and specializations..."
                    rows={3}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsAddProviderOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddProvider} disabled={saving}>
                  {saving ? "Adding..." : "Add Provider"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}