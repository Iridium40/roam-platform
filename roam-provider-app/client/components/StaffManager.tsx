import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Plus,
  Mail,
  Phone,
  MapPin,
  Star,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  Crown,
  Shield,
  User,
  AlertCircle,
  CheckCircle,
  Calendar,
  DollarSign,
  Settings,
  Package,
  Loader2,
} from "lucide-react";
import { useProviderAuth } from "@/contexts/auth/ProviderAuthContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import type { Provider, BusinessLocation } from "@roam/shared";
import type { ProviderRole, ProviderVerificationStatus } from "@roam/shared";
import type { BusinessService } from "@/types/services";

interface StaffManagerProps {
  businessId: string;
  locations: BusinessLocation[];
}


interface StaffMemberWithStats extends Provider {
  location_name?: string;
  total_revenue?: number;
  recent_bookings?: number;
  customer_rating?: number;
  assigned_services_count?: number;
}

const roleOptions = [
  {
    value: "owner" as ProviderRole,
    label: "Owner",
    description: "Full business management access",
    icon: Crown,
    permissions: [
      "All dispatcher permissions",
      "Manage staff",
      "Business settings",
      "Financial reports",
    ],
  },
  {
    value: "dispatcher" as ProviderRole,
    label: "Dispatcher",
    description: "Manages bookings and coordinates providers",
    icon: Shield,
    permissions: [
      "Manage all bookings",
      "View provider schedules",
      "Customer communication",
    ],
  },
  {
    value: "provider" as ProviderRole,
    label: "Provider",
    description: "Delivers services to customers",
    icon: User,
    permissions: [
      "View own bookings",
      "Update own profile",
      "Manage own schedule",
    ],
  },
];

export const StaffManager: React.FC<StaffManagerProps> = ({
  businessId,
  locations,
}) => {
  const { provider: user, isOwner, isDispatcher } = useProviderAuth();
  const { toast } = useToast();
  const [staff, setStaff] = useState<StaffMemberWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] =
    useState<StaffMemberWithStats | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  // Staff creation state
  const [showManualAddDialog, setShowManualAddDialog] = useState(false);
  const [manualStaffData, setManualStaffData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "provider" as ProviderRole,
    locationId: "no-location",
  });

  // Service assignment state
  const [businessServices, setBusinessServices] = useState<BusinessService[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [businessAddons, setBusinessAddons] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [editDialogTab, setEditDialogTab] = useState("details");

  // Image upload state
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [coverImageUploading, setCoverImageUploading] = useState(false);

  // Safely handle locations prop - ensure it's always an array
  const safeLocations = Array.isArray(locations) ? locations : [];

  useEffect(() => {
    fetchStaff();
    fetchBusinessServices();
  }, [businessId]);

  useEffect(() => {
    if (selectedStaff && isEditDialogOpen && (selectedStaff.provider_role === 'provider' || selectedStaff.provider_role === 'owner')) {
      fetchProviderServices(selectedStaff.id);
    }
  }, [selectedStaff, isEditDialogOpen]);

  // Debug: Log location dropdown data when edit dialog opens
  useEffect(() => {
    if (isEditDialogOpen && selectedStaff) {
      console.log('🔍 Edit Dialog Opened - Location Data:', {
        selected_staff_location_id: selectedStaff.location_id,
        selected_staff_location_name: selectedStaff.location_name,
        available_locations_count: safeLocations.length,
        available_locations: safeLocations,
        dropdown_value: selectedStaff.location_id || "no-location"
      });
    }
  }, [isEditDialogOpen, selectedStaff, safeLocations]);

  const fetchBusinessServices = async () => {
    try {
      const response = await fetch(
        `/api/business/services?business_id=${businessId}`
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch business services");
      }

      const data = await response.json();
      
      // Filter only active services
      const activeServices = (data.services || []).filter(
        (service: BusinessService) => service.is_active
      );
      
      setBusinessServices(activeServices);

      // Also fetch business addons for these services
      await fetchBusinessAddons();
    } catch (error: any) {
      console.error("Error fetching business services:", error);
      toast({
        title: "Error",
        description: "Failed to load business services",
        variant: "destructive",
      });
    }
  };

  const fetchBusinessAddons = async () => {
    try {
      const userId = user?.provider?.user_id;
      // Backend uses service role key - no auth headers needed, pass user_id for permission check
      const url = userId 
        ? `/api/business-eligible-addons?business_id=${businessId}&user_id=${userId}`
        : `/api/business-eligible-addons?business_id=${businessId}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.warn("Could not fetch business addons, continuing without them");
        setBusinessAddons([]);
        return;
      }

      const data = await response.json();
      setBusinessAddons(data.eligible_addons || []);
    } catch (error: any) {
      console.warn("Error fetching business addons, continuing without them:", error);
      setBusinessAddons([]);
    }
  };

  const fetchProviderServices = async (providerId: string) => {
    setLoadingServices(true);
    try {
      // Fetch provider services
      const { data: providerServices, error } = await supabase
        .from('provider_services')
        .select('service_id, is_active')
        .eq('provider_id', providerId)
        .eq('is_active', true);

      if (error) {
        console.error("Error fetching provider services:", error);
        setSelectedServices([]);
        return;
      }

      // Get the service IDs that are assigned and active
      const assignedServiceIds = (providerServices || []).map((ps: any) => ps.service_id);
      
      setSelectedServices(assignedServiceIds);
    } catch (error: any) {
      console.error("Error fetching provider services:", error);
      toast({
        title: "Error",
        description: "Failed to load provider services",
        variant: "destructive",
      });
      setSelectedServices([]);
    } finally {
      setLoadingServices(false);
    }
  };

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServices(prev => 
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleUpdateProviderServices = async () => {
    if (!selectedStaff) return;

    try {
      // Step 1: Deactivate all existing services for this provider
      const { error: deactivateError } = await supabase
        .from('provider_services')
        .update({ is_active: false })
        .eq('provider_id', selectedStaff.id);

      if (deactivateError) {
        throw deactivateError;
      }

      // Step 2: Upsert selected services (insert new or reactivate existing)
      if (selectedServices.length > 0) {
        const serviceAssignments = selectedServices.map(serviceId => ({
          provider_id: selectedStaff.id,
          service_id: serviceId,
          is_active: true,
        }));

        // Use upsert to handle both new and existing services
        const { error: upsertError } = await supabase
          .from('provider_services')
          .upsert(serviceAssignments, {
            onConflict: 'provider_id,service_id',
            ignoreDuplicates: false
          });

        if (upsertError) {
          throw upsertError;
        }
      }

      // Step 3: If all services removed and active_for_bookings is true, disable it
      if (selectedServices.length === 0 && selectedStaff.active_for_bookings) {
        const { error: bookingsError } = await supabase
          .from('providers')
          .update({ active_for_bookings: false })
          .eq('id', selectedStaff.id);

        if (bookingsError) {
          console.error("Error disabling active_for_bookings:", bookingsError);
        } else {
          // Update local state
          setSelectedStaff({
            ...selectedStaff,
            active_for_bookings: false,
          });
          toast({
            title: "Bookings Disabled",
            description: "Staff member is no longer bookable as all services have been removed.",
            variant: "default",
          });
        }
      }

      // Auto-assign eligible addons based on selected services
      await handleAutoAssignAddons();

      toast({
        title: "Success",
        description: "Provider services updated successfully",
      });
    } catch (error: any) {
      console.error("Error updating provider services:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update provider services",
        variant: "destructive",
      });
    }
  };

  const handleAutoAssignAddons = async () => {
    if (!selectedStaff || selectedServices.length === 0) return;

    try {
      // Step 1: Deactivate all existing addons for this provider
      const { error: deactivateError } = await supabase
        .from('provider_addons')
        .update({ is_active: false })
        .eq('provider_id', selectedStaff.id);

      if (deactivateError) {
        console.error('Error deactivating provider addons:', deactivateError);
        return;
      }

      // Step 2: Find all eligible addons for the selected services
      const { data: addonEligibility, error: eligibilityError } = await supabase
        .from('service_addon_eligibility')
        .select('addon_id')
        .in('service_id', selectedServices);

      if (eligibilityError) {
        console.error('Error fetching addon eligibility:', eligibilityError);
        return;
      }

      const eligibleAddonIds = Array.from(
        new Set(addonEligibility?.map((ae: any) => ae.addon_id) || [])
      );

      // Step 3: Filter to only business-available addons
      if (eligibleAddonIds.length > 0) {
        const { data: businessAddons, error: businessAddonsError } = await supabase
          .from('business_addons')
          .select('addon_id')
          .eq('business_id', businessId)
          .eq('is_available', true)
          .in('addon_id', eligibleAddonIds);

        if (businessAddonsError) {
          console.error('Error fetching business addons:', businessAddonsError);
          return;
        }

        const addonsToAssign = businessAddons?.map((ba: any) => ba.addon_id) || [];

        // Step 4: Upsert eligible addons (insert new or reactivate existing)
        if (addonsToAssign.length > 0) {
          const addonAssignments = addonsToAssign.map(addonId => ({
            provider_id: selectedStaff.id,
            addon_id: addonId,
            is_active: true,
          }));

          const { error: upsertError } = await supabase
            .from('provider_addons')
            .upsert(addonAssignments, {
              onConflict: 'provider_id,addon_id',
              ignoreDuplicates: false
            });

          if (upsertError) {
            console.error('Error upserting provider addons:', upsertError);
          } else {
            console.log(`Auto-assigned ${addonsToAssign.length} addons to provider`);
          }
        }
      }
    } catch (error: any) {
      console.error("Error auto-assigning addons:", error);
    }
  };

  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase
        .from("providers")
        .select(
          `
          *,
          business_locations(location_name)
        `,
        )
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch additional stats for each staff member
      const staffWithStats = await Promise.all(
        (data || []).map(async (member) => {
          // Get booking stats (simplified - in real app would use more complex queries)
          const { data: bookingStats } = await supabase
            .from("bookings")
            .select("total_amount, booking_status")
            .eq("provider_id", member.id);

          const totalRevenue =
            bookingStats?.reduce(
              (sum, booking) =>
                sum +
                (booking.booking_status === "completed"
                  ? booking.total_amount
                  : 0),
              0,
            ) || 0;

          const recentBookings =
            bookingStats?.filter(
              (booking) =>
                new Date(booking.created_at).getTime() >
                Date.now() - 30 * 24 * 60 * 60 * 1000,
            ).length || 0;

          // Get assigned services count for providers and owners
          let assignedServicesCount = 0;
          if (member.provider_role === 'provider' || member.provider_role === 'owner') {
            const { count } = await supabase
              .from('provider_services')
              .select('*', { count: 'exact', head: true })
              .eq('provider_id', member.id)
              .eq('is_active', true);
            assignedServicesCount = count || 0;
          }

          return {
            ...member,
            location_name: member.business_locations?.location_name,
            total_revenue: totalRevenue,
            recent_bookings: recentBookings,
            customer_rating: member.average_rating || 0,
            assigned_services_count: assignedServicesCount,
          };
        }),
      );

      setStaff(staffWithStats);
    } catch (error) {
      console.error("Error fetching staff:", error);
    } finally {
      setLoading(false);
    }
  };


    const handleUpdateStaff = async () => {
    if (!selectedStaff) return;

    // Validation: If active_for_bookings is true, must have at least 1 service
    if (selectedStaff.active_for_bookings && selectedServices.length === 0) {
      toast({
        title: "Validation Error",
        description: "Cannot enable bookings without at least 1 active service assigned.",
        variant: "destructive",
      });
      return;
    }

    console.log('💾 Updating staff member:', {
      staff_id: selectedStaff.id,
      location_id: selectedStaff.location_id,
      location_id_type: typeof selectedStaff.location_id,
      all_updates: {
        first_name: selectedStaff.first_name,
        last_name: selectedStaff.last_name,
        email: selectedStaff.email,
        phone: selectedStaff.phone,
        provider_role: selectedStaff.provider_role,
        location_id: selectedStaff.location_id,
        bio: selectedStaff.bio,
        experience_years: selectedStaff.experience_years,
        verification_status: selectedStaff.verification_status,
        active_for_bookings: selectedStaff.active_for_bookings,
      }
    });

    try {
      const { error } = await supabase
        .from("providers")
        .update({
          first_name: selectedStaff.first_name,
          last_name: selectedStaff.last_name,
          email: selectedStaff.email,
          phone: selectedStaff.phone,
          provider_role: selectedStaff.provider_role,
          location_id: selectedStaff.location_id,
          bio: selectedStaff.bio,
          experience_years: selectedStaff.experience_years,
          verification_status: selectedStaff.verification_status,
          active_for_bookings: selectedStaff.active_for_bookings,
        })
        .eq("id", selectedStaff.id);

      if (error) throw error;

      console.log('✅ Staff member updated successfully');

      // If provider or owner role, also update services
      if (selectedStaff.provider_role === 'provider' || selectedStaff.provider_role === 'owner') {
        await handleUpdateProviderServices();
      }

      toast({
        title: "Success",
        description: "Staff member updated successfully",
      });

      setIsEditDialogOpen(false);
      fetchStaff();
    } catch (error: any) {
      console.error('❌ Error updating staff:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedStaff || !event.target.files || event.target.files.length === 0) {
      return;
    }

    const file = event.target.files[0];
    
    try {
      setAvatarUploading(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedStaff.id}-avatar-${Date.now()}.${fileExt}`;
      const filePath = `provider-avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('roam-file-storage')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('roam-file-storage')
        .getPublicUrl(filePath);

      // Update the provider record with the new avatar URL
      const { error: updateError } = await supabase
        .from('providers')
        .update({ image_url: publicUrl })
        .eq('id', selectedStaff.id);

      if (updateError) throw updateError;

      // Update local state
      setSelectedStaff({ ...selectedStaff, image_url: publicUrl });

      toast({
        title: "Avatar Updated",
        description: "Avatar image has been uploaded successfully.",
      });

      // Refresh staff list
      await fetchStaff();
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload avatar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleCoverImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedStaff || !event.target.files || event.target.files.length === 0) {
      return;
    }

    const file = event.target.files[0];
    
    try {
      setCoverImageUploading(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedStaff.id}-cover-${Date.now()}.${fileExt}`;
      const filePath = `provider-covers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('roam-file-storage')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('roam-file-storage')
        .getPublicUrl(filePath);

      // Update the provider record with the new cover image URL
      const { error: updateError } = await supabase
        .from('providers')
        .update({ cover_image_url: publicUrl })
        .eq('id', selectedStaff.id);

      if (updateError) throw updateError;

      // Update local state
      setSelectedStaff({ ...selectedStaff, cover_image_url: publicUrl });

      toast({
        title: "Cover Image Updated",
        description: "Cover image has been uploaded successfully.",
      });

      // Refresh staff list
      await fetchStaff();
    } catch (error) {
      console.error('Error uploading cover image:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload cover image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCoverImageUploading(false);
    }
  };

  const handleToggleActive = async (staffId: string, isActive: boolean) => {
    // Find the staff member to check their role
    const staffMember = staff.find(s => s.id === staffId);
    
    // Prevent deactivation of owners
    if (staffMember?.provider_role === 'owner' && !isActive) {
      toast({
        title: "Cannot Deactivate Owner",
        description: "Business owners cannot be deactivated. Transfer ownership first if needed.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const { error } = await supabase
        .from("providers")
        .update({ is_active: isActive })
        .eq("id", staffId);

      if (error) throw error;
      await fetchStaff();
    } catch (error) {
      console.error("Error updating staff status:", error);
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    try {
      const { error } = await supabase
        .from("providers")
        .delete()
        .eq("id", staffId);

      if (error) throw error;
      await fetchStaff();
    } catch (error) {
      console.error("Error deleting staff member:", error);
    }
  };

  const createStaffManually = async () => {
    if (!manualStaffData.firstName || !manualStaffData.lastName || !manualStaffData.email || !manualStaffData.phone) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      // Call the manual staff creation API
      const response = await fetch('/api/staff/create-manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId: businessId,
          firstName: manualStaffData.firstName,
          lastName: manualStaffData.lastName,
          email: manualStaffData.email,
          phone: manualStaffData.phone,
          role: manualStaffData.role,
          locationId: manualStaffData.locationId === "no-location" ? null : manualStaffData.locationId,
        }),
      });

      // Read response as text first, then parse as JSON
      // This allows us to handle both JSON and non-JSON responses
      const responseText = await response.text();
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (jsonError) {
        // If response is not JSON, use the text as error message
        console.error('❌ Non-JSON response:', responseText);
        throw new Error(`Server error: ${response.status} ${response.statusText}. ${responseText.substring(0, 200)}`);
      }

      if (!response.ok) {
        const errorMessage = result?.error || result?.details || `Failed to create staff member (${response.status})`;
        const errorDetails = result?.code ? `Error code: ${result.code}. ` : '';
        console.error('❌ API Error:', {
          status: response.status,
          error: result?.error,
          details: result?.details,
          code: result?.code,
          fullResponse: result
        });
        throw new Error(`${errorDetails}${errorMessage}`);
      }

      // Show success message
      if (result.emailSent) {
        toast({
          title: "Staff Member Created",
          description: `${manualStaffData.firstName} ${manualStaffData.lastName} has been added. A welcome email with login credentials has been sent to ${manualStaffData.email}.`,
          duration: 8000,
        });
      } else if (result.temporaryPassword) {
        // Fallback: show password if email wasn't sent
        toast({
          title: "Staff Member Created",
          description: `${manualStaffData.firstName} ${manualStaffData.lastName} has been added. Temporary password: ${result.temporaryPassword}`,
          duration: 10000, // Show for 10 seconds so they can copy the password
        });
      } else if (result.existingUser) {
        toast({
          title: "Staff Member Added",
          description: `${manualStaffData.firstName} ${manualStaffData.lastName} already has an account and has been added to your business.`,
          duration: 6000,
        });
      } else {
        toast({
          title: "Staff Member Created",
          description: `${manualStaffData.firstName} ${manualStaffData.lastName} has been added successfully.`,
          duration: 6000,
        });
      }

      // Reset form
      setManualStaffData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        role: "provider",
        locationId: "no-location",
      });
      setShowManualAddDialog(false);

      // Refresh staff list
      await fetchStaff();
    } catch (error: any) {
      console.error('Error creating staff member:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to create staff member',
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (member: StaffMemberWithStats) => {
    if (!member.is_active) {
      return <Badge className="bg-red-100 text-red-800">Inactive</Badge>;
    }

    switch (member.verification_status) {
      case "approved":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
  };

  const getRoleIcon = (role: ProviderRole) => {
    const roleConfig = roleOptions.find((r) => r.value === role);
    return roleConfig ? (
      <roleConfig.icon className="w-4 h-4" />
    ) : (
      <User className="w-4 h-4" />
    );
  };

  const filteredStaff = staff.filter((member) => {
    switch (activeTab) {
      case "owners":
        return member.provider_role === "owner";
      case "dispatchers":
        return member.provider_role === "dispatcher";
      case "providers":
        return member.provider_role === "provider";
      case "pending":
        return member.verification_status === "pending";
      default:
        return true;
    }
  });

  const getLocationName = (locationId: string) => {
    const location = safeLocations.find((l) => l.id === locationId);
    return location?.location_name || "Unknown Location";
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Users className="w-6 h-6 animate-pulse mx-auto mb-2" />
          <p>Loading staff members...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Staff Management</h3>
          <p className="text-sm text-foreground/60">
            Manage your team members, roles, and permissions.
          </p>
        </div>
        {(isOwner || isDispatcher) && (
          <Button
            onClick={() => setShowManualAddDialog(true)}
            className="gap-2 bg-roam-blue hover:bg-roam-blue/90"
          >
            <Plus className="w-4 h-4" />
            Add Staff
          </Button>
        )}
      </div>

      {/* Staff Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* Mobile Dropdown */}
        <div className="lg:hidden">
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ({staff.length})</SelectItem>
              <SelectItem value="owners">
                Owners ({staff.filter((s) => s.provider_role === "owner").length})
              </SelectItem>
              <SelectItem value="dispatchers">
                Dispatchers ({staff.filter((s) => s.provider_role === "dispatcher").length})
              </SelectItem>
              <SelectItem value="providers">
                Providers ({staff.filter((s) => s.provider_role === "provider").length})
              </SelectItem>
              <SelectItem value="pending">
                Pending ({staff.filter((s) => s.verification_status === "pending").length})
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Desktop Tabs */}
        <TabsList className="hidden lg:inline-grid lg:w-auto lg:grid-cols-5">
          <TabsTrigger value="all" className="data-[state=active]:bg-[#f88221] data-[state=active]:text-white">All ({staff.length})</TabsTrigger>
          <TabsTrigger value="owners" className="data-[state=active]:bg-[#f88221] data-[state=active]:text-white">
            Owners ({staff.filter((s) => s.provider_role === "owner").length})
          </TabsTrigger>
          <TabsTrigger value="dispatchers" className="data-[state=active]:bg-[#f88221] data-[state=active]:text-white">
            Dispatchers (
            {staff.filter((s) => s.provider_role === "dispatcher").length})
          </TabsTrigger>
          <TabsTrigger value="providers" className="data-[state=active]:bg-[#f88221] data-[state=active]:text-white">
            Providers (
            {staff.filter((s) => s.provider_role === "provider").length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="data-[state=active]:bg-[#f88221] data-[state=active]:text-white">
            Pending (
            {staff.filter((s) => s.verification_status === "pending").length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {filteredStaff.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Users className="w-12 h-12 text-foreground/40 mx-auto mb-4" />
                <h4 className="font-medium mb-2">No Staff Members</h4>
                <p className="text-sm text-foreground/60">
                  {activeTab === "all"
                    ? "Add your first staff member to get started."
                    : `No ${activeTab} found.`}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStaff.map((member) => (
                <Card
                  key={member.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage
                            src={member.image_url}
                            alt={`${member.first_name} ${member.last_name}`}
                          />
                          <AvatarFallback>
                            {member.first_name[0]}
                            {member.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-semibold">
                            {member.first_name} {member.last_name}
                          </h4>
                          <div className="flex items-center gap-1 text-sm text-foreground/60">
                            {getRoleIcon(member.provider_role)}
                            {member.provider_role.charAt(0).toUpperCase() +
                              member.provider_role.slice(1)}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {getStatusBadge(member)}
                        {(member.provider_role === "provider" || member.provider_role === "owner") && (
                          member.assigned_services_count === 0 ? (
                            <Badge
                              variant="outline"
                              className="text-xs bg-amber-50 text-amber-700 border-amber-300"
                            >
                              <AlertCircle className="w-3 h-3 mr-1" />
                              No Services
                            </Badge>
                          ) : (
                            <Badge
                              variant={member.active_for_bookings ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {member.active_for_bookings ? "Bookable" : "Not Bookable"}
                            </Badge>
                          )
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-foreground/60" />
                        <span className="truncate">{member.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-foreground/60" />
                        <span>{member.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-foreground/60" />
                        <span>{member.location_name}</span>
                      </div>
                    </div>

                    {(member.provider_role === "provider" || member.provider_role === "owner") && 
                      member.assigned_services_count === 0 && (
                      <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-md">
                        <div className="flex items-center gap-2 text-amber-700">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          <p className="text-xs">
                            <span className="font-medium">Setup incomplete:</span> Assign services to enable bookings.
                          </p>
                        </div>
                      </div>
                    )}

                    {member.provider_role === "provider" && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <div className="text-lg font-semibold text-roam-blue">
                              {member.customer_rating.toFixed(1)}
                            </div>
                            <div className="text-xs text-foreground/60">
                              Rating
                            </div>
                          </div>
                          <div>
                            <div className="text-lg font-semibold text-roam-blue">
                              {member.recent_bookings}
                            </div>
                            <div className="text-xs text-foreground/60">
                              Recent
                            </div>
                          </div>
                          <div>
                            <div className="text-lg font-semibold text-roam-blue">
                              ${(member.total_revenue || 0).toFixed(2)}
                            </div>
                            <div className="text-xs text-foreground/60">
                              Revenue
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {(isOwner || isDispatcher) && member.id !== user?.provider_id && (
                      <div className="mt-3 pt-3 border-t flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={member.is_active}
                            onCheckedChange={(checked) =>
                              handleToggleActive(member.id, checked)
                            }
                            className="scale-75"
                            disabled={member.provider_role === 'owner'}
                          />
                          <Label className="text-xs">
                            {member.provider_role === 'owner' ? 'Owner (Always Active)' : 'Active'}
                          </Label>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              console.log('📝 Opening edit dialog for staff member:', {
                                staff_id: member.id,
                                staff_name: `${member.first_name} ${member.last_name}`,
                                current_location_id: member.location_id,
                                location_name: member.location_name,
                                available_locations_count: safeLocations.length,
                                available_locations: safeLocations.map(loc => ({
                                  id: loc.id,
                                  name: loc.location_name
                                }))
                              });
                              setSelectedStaff(member);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Remove Staff Member
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently remove{" "}
                                  {member.first_name} {member.last_name} from
                                  your team. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteStaff(member.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Staff Dialog */}
      {selectedStaff && (
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) {
            setEditDialogTab("details");
            setSelectedServices([]);
          }
        }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Staff Member</DialogTitle>
              <DialogDescription>
                Update {selectedStaff.first_name} {selectedStaff.last_name}'s
                information.
              </DialogDescription>
            </DialogHeader>

            <Tabs value={editDialogTab} onValueChange={setEditDialogTab}>
              <TabsList className={`grid w-full ${(selectedStaff.provider_role === 'provider' || selectedStaff.provider_role === 'owner') ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <TabsTrigger value="details" className="data-[state=active]:bg-[#f88221] data-[state=active]:text-white">Details</TabsTrigger>
                {(selectedStaff.provider_role === 'provider' || selectedStaff.provider_role === 'owner') && (
                  <TabsTrigger value="services" className="data-[state=active]:bg-[#f88221] data-[state=active]:text-white">Services</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="details" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editFirstName">First Name *</Label>
                    <Input
                      id="editFirstName"
                      value={selectedStaff.first_name}
                      onChange={(e) =>
                        setSelectedStaff({
                          ...selectedStaff,
                          first_name: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editLastName">Last Name *</Label>
                    <Input
                      id="editLastName"
                      value={selectedStaff.last_name}
                      onChange={(e) =>
                        setSelectedStaff({
                          ...selectedStaff,
                          last_name: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editEmail">Email Address *</Label>
                  <Input
                    id="editEmail"
                    type="email"
                    value={selectedStaff.email}
                    onChange={(e) =>
                      setSelectedStaff({
                        ...selectedStaff,
                        email: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editRole">Role *</Label>
                    <Select
                      value={selectedStaff.provider_role}
                      onValueChange={(value) =>
                        setSelectedStaff({
                          ...selectedStaff,
                          provider_role: value as ProviderRole,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            <div className="flex items-center gap-2">
                              <role.icon className="w-4 h-4" />
                              {role.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="editLocation">Location *</Label>
                    <Select
                      value={selectedStaff.location_id || "no-location"}
                      onValueChange={(value) =>
                        setSelectedStaff({ 
                          ...selectedStaff, 
                          location_id: value === "no-location" ? null : value 
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a location" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no-location">No specific location</SelectItem>
                        {safeLocations.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.location_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editVerificationStatus">Identity Verification Status</Label>
                  <Select
                    value={selectedStaff.verification_status}
                    onValueChange={(value) =>
                      setSelectedStaff({
                        ...selectedStaff,
                        verification_status: value as ProviderVerificationStatus,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select verification status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="documents_submitted">Documents Submitted</SelectItem>
                      <SelectItem value="under_review">Under Review</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Identity verification status for background checks and compliance
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="editBookable">Active for Bookings</Label>
                      <p className="text-xs text-muted-foreground">
                        Allow customers to book this staff member for services
                        {selectedServices.length === 0 && (
                          <span className="text-destructive font-medium"> (Requires at least 1 active service)</span>
                        )}
                      </p>
                    </div>
                    <Switch
                      id="editBookable"
                      checked={selectedStaff.active_for_bookings || false}
                      disabled={selectedServices.length === 0}
                      onCheckedChange={(checked) => {
                        // If trying to enable bookings, check if at least 1 service is assigned
                        if (checked && selectedServices.length === 0) {
                          toast({
                            title: "Cannot Enable Bookings",
                            description: "Staff member must have at least 1 active service assigned before they can be bookable.",
                            variant: "destructive",
                          });
                          return;
                        }
                        
                        setSelectedStaff({
                          ...selectedStaff,
                          active_for_bookings: checked,
                        });
                      }}
                    />
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Avatar Image Upload */}
                <div className="space-y-2">
                  <Label>Avatar Image</Label>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={selectedStaff.image_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-roam-blue to-roam-light-blue text-white text-xl">
                        {selectedStaff.first_name[0]}{selectedStaff.last_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        disabled={avatarUploading}
                        className="cursor-pointer"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Upload a profile photo (JPG, PNG, or GIF)
                      </p>
                    </div>
                    {avatarUploading && (
                      <Loader2 className="h-5 w-5 animate-spin text-roam-blue" />
                    )}
                  </div>
                </div>

                {/* Cover Image Upload */}
                <div className="space-y-2">
                  <Label>Cover Image</Label>
                  <div className="space-y-2">
                    {selectedStaff.cover_image_url && (
                      <div className="relative w-full h-32 rounded-lg overflow-hidden">
                        <img
                          src={selectedStaff.cover_image_url}
                          alt="Cover"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleCoverImageUpload}
                        disabled={coverImageUploading}
                        className="cursor-pointer flex-1"
                      />
                      {coverImageUploading && (
                        <Loader2 className="h-5 w-5 animate-spin text-roam-blue" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Upload a cover photo (JPG, PNG, or GIF)
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="services" className="space-y-4 mt-4">
                {loadingServices ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-roam-blue"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium">Assign Services</h3>
                        <p className="text-sm text-muted-foreground">
                          Select services this staff member can offer. All active business services and add-ons are available.
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {selectedServices.length} selected
                      </Badge>
                    </div>

                    {businessServices.length === 0 ? (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          No active services available. Please add and activate services in the Business Services tab first.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-2">
                        {businessServices.map((service) => (
                          <Card key={service.id} className="p-4">
                            <div className="flex items-start gap-3">
                              <Checkbox
                                id={`service-${service.id}`}
                                checked={selectedServices.includes(service.service_id)}
                                onCheckedChange={() => handleServiceToggle(service.service_id)}
                              />
                              <div className="flex-1 space-y-1">
                                <label
                                  htmlFor={`service-${service.id}`}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                >
                                  {service.services?.name || 'Unknown Service'}
                                </label>
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {service.services?.description}
                                </p>
                                <div className="flex items-center gap-4 mt-2">
                                  <Badge variant="outline" className="text-xs">
                                    <DollarSign className="w-3 h-3 mr-1" />
                                    ${service.business_price}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    <Calendar className="w-3 h-3 mr-1" />
                                    {service.services?.duration_minutes} min
                                  </Badge>
                                  {service.delivery_type && (
                                    <Badge variant="outline" className="text-xs">
                                      <MapPin className="w-3 h-3 mr-1" />
                                      {service.delivery_type.replace(/_/g, ' ')}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}

                    <Alert>
                      <Package className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Add-ons will be auto-assigned:</strong> When you assign services, 
                        compatible add-ons from your business will automatically be assigned to this provider.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateStaff}
                className="bg-roam-blue hover:bg-roam-blue/90"
              >
                Update Staff Member
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Role Permissions Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {roleOptions.map((role) => (
              <div key={role.value} className="space-y-2">
                <div className="flex items-center gap-2">
                  <role.icon className="w-4 h-4 text-roam-blue" />
                  <h4 className="font-medium">{role.label}</h4>
                </div>
                <p className="text-sm text-foreground/60">{role.description}</p>
                <ul className="text-xs text-foreground/50 space-y-1">
                  {role.permissions.map((permission, index) => (
                    <li key={index}>• {permission}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Manual Staff Creation Dialog */}
      <Dialog open={showManualAddDialog} onOpenChange={setShowManualAddDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add Staff Member</DialogTitle>
            <DialogDescription>
              Create a new staff member account. They will receive a welcome email with login credentials and instructions.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={manualStaffData.firstName}
                  onChange={(e) => setManualStaffData({ ...manualStaffData, firstName: e.target.value })}
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={manualStaffData.lastName}
                  onChange={(e) => setManualStaffData({ ...manualStaffData, lastName: e.target.value })}
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={manualStaffData.email}
                onChange={(e) => setManualStaffData({ ...manualStaffData, email: e.target.value })}
                placeholder="john.doe@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                value={manualStaffData.phone}
                onChange={(e) => setManualStaffData({ ...manualStaffData, phone: e.target.value })}
                placeholder="5551234567"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select
                  value={manualStaffData.role}
                  onValueChange={(value) => setManualStaffData({ ...manualStaffData, role: value as ProviderRole })}
                >
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        <div className="flex items-center gap-2">
                          <role.icon className="w-4 h-4" />
                          {role.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Select
                  value={manualStaffData.locationId}
                  onValueChange={(value) => setManualStaffData({ ...manualStaffData, locationId: value })}
                >
                  <SelectTrigger id="location">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-location">No specific location</SelectItem>
                    {safeLocations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.location_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                A temporary password will be generated. The staff member must change it on their first login.
              </AlertDescription>
            </Alert>

            {(manualStaffData.role === "provider" || manualStaffData.role === "owner") && (
              <Alert className="bg-amber-50 border-amber-200">
                <Package className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-700">
                  <span className="font-medium">Next step:</span> After creating this staff member, you'll need to assign services before they can accept bookings.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowManualAddDialog(false);
                setManualStaffData({
                  firstName: "",
                  lastName: "",
                  email: "",
                  phone: "",
                  role: "provider",
                  locationId: "no-location",
                });
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={createStaffManually}
              disabled={!manualStaffData.firstName || !manualStaffData.lastName || !manualStaffData.email || !manualStaffData.phone}
              className="bg-roam-blue hover:bg-roam-blue/90"
            >
              <UserCheck className="w-4 h-4 mr-2" />
              Create Staff Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
