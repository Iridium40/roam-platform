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
  Send,
  Package,
} from "lucide-react";
import { useProviderAuth } from "@/contexts/auth/ProviderAuthContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import type {
  Provider,
  BusinessLocation,
  ProviderRole,
  ProviderVerificationStatus,
} from "@roam/shared";
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
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<ProviderRole>("provider");
  const [inviteLocation, setInviteLocation] = useState("no-location");

  // Service assignment state
  const [businessServices, setBusinessServices] = useState<BusinessService[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [businessAddons, setBusinessAddons] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [editDialogTab, setEditDialogTab] = useState("details");

  // Safely handle locations prop - ensure it's always an array
  const safeLocations = Array.isArray(locations) ? locations : [];

  // Debug: Log locations when component mounts or locations change
  useEffect(() => {
    console.log('🏢 StaffManager - Locations received:', {
      locationsCount: safeLocations.length,
      locations: safeLocations
    });
  }, [locations]);

  useEffect(() => {
    fetchStaff();
    fetchBusinessServices();
  }, [businessId]);

  useEffect(() => {
    if (selectedStaff && isEditDialogOpen && selectedStaff.provider_role === 'provider') {
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
      const response = await fetch(
        `/api/business-eligible-addons?business_id=${businessId}`
      );
      
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
      const response = await fetch(`/api/provider/services/${providerId}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch provider services");
      }

      const data = await response.json();
      const activeServiceIds = (data.services || [])
        .filter((ps: any) => ps.is_active)
        .map((ps: any) => ps.service_id);
      
      setSelectedServices(activeServiceIds);
    } catch (error: any) {
      console.error("Error fetching provider services:", error);
      toast({
        title: "Error",
        description: "Failed to load provider services",
        variant: "destructive",
      });
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
      // Update provider services
      const servicesResponse = await fetch("/api/provider/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider_id: selectedStaff.id,
          service_ids: selectedServices,
        }),
      });

      if (!servicesResponse.ok) {
        throw new Error("Failed to update provider services");
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
      // Find all eligible addons for the selected services
      const eligibleAddonIds = new Set<string>();
      
      // Get addon eligibility from service_addon_eligibility
      const { data: addonEligibility, error } = await supabase
        .from('service_addon_eligibility')
        .select('addon_id')
        .in('service_id', selectedServices);

      if (error) {
        console.error('Error fetching addon eligibility:', error);
        return;
      }

      addonEligibility?.forEach((ae: any) => eligibleAddonIds.add(ae.addon_id));

      // Filter to only business-available addons
      const businessAddonIds = businessAddons.map((ba: any) => ba.id);
      const addonsToAssign = Array.from(eligibleAddonIds).filter(
        addonId => businessAddonIds.includes(addonId)
      );

      // Assign addons to provider
      if (addonsToAssign.length > 0) {
        const addonsResponse = await fetch("/api/provider/addons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider_id: selectedStaff.id,
            addon_ids: addonsToAssign,
          }),
        });

        if (!addonsResponse.ok) {
          console.error("Failed to auto-assign addons");
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

          return {
            ...member,
            location_name: member.business_locations?.location_name,
            total_revenue: totalRevenue,
            recent_bookings: recentBookings,
            customer_rating: member.average_rating || 0,
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
        })
        .eq("id", selectedStaff.id);

      if (error) throw error;

      console.log('✅ Staff member updated successfully');

      // If provider role, also update services
      if (selectedStaff.provider_role === 'provider') {
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

  const handleToggleActive = async (staffId: string, isActive: boolean) => {
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

  const sendInvite = async () => {
    if (!inviteEmail || !inviteRole) return;

    try {
      // Get current user info for the invitation
      const currentUser = user;
      const invitedBy = currentUser
        ? `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim()
        : 'ROAM Team';

      // Call the staff invitation API
      const response = await fetch('/api/staff/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId: businessId,
          email: inviteEmail,
          role: inviteRole,
          locationId: inviteLocation === "no-location" ? null : inviteLocation,
          invitedBy: invitedBy || 'ROAM Team',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.details || 'Failed to send invitation');
      }

      // Show success message (with warning if email didn't send)
      const successMessage = result.emailSent 
        ? `Staff invitation has been sent to ${inviteEmail}`
        : `Invitation created for ${inviteEmail}. Note: Email may not have been delivered - please check server logs.`;
      
      toast({
        title: result.emailSent ? "Invitation Sent!" : "Invitation Created",
        description: successMessage,
        variant: result.emailSent ? "default" : "default",
      });

      if (result.warning) {
        console.warn('Invitation email warning:', result.warning);
      }

      // Reset form
      setInviteEmail("");
      setInviteRole("provider");
      setInviteLocation("no-location");

      // Refresh staff list
      await fetchStaff();
    } catch (error) {
      console.error("Error sending invite:", error);
      toast({
        title: "Failed to Send Invitation",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
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

      </div>

      {/* Add Staff */}
      {(isOwner || isDispatcher) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Add Staff Member</CardTitle>
            <p className="text-sm text-foreground/60">
              Send an invitation email to add a new team member
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Enter email address..."
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1"
              />
              <Select
                value={inviteRole}
                onValueChange={(value) => setInviteRole(value as ProviderRole)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={inviteLocation} onValueChange={setInviteLocation}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Location" />
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
              <Button
                onClick={sendInvite}
                disabled={!inviteEmail || !inviteRole}
                className="bg-roam-blue hover:bg-roam-blue/90"
              >
                <Send className="w-4 h-4 mr-2" />
                Invite
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Staff Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="all">All ({staff.length})</TabsTrigger>
          <TabsTrigger value="owners">
            Owners ({staff.filter((s) => s.provider_role === "owner").length})
          </TabsTrigger>
          <TabsTrigger value="dispatchers">
            Dispatchers (
            {staff.filter((s) => s.provider_role === "dispatcher").length})
          </TabsTrigger>
          <TabsTrigger value="providers">
            Providers (
            {staff.filter((s) => s.provider_role === "provider").length})
          </TabsTrigger>
          <TabsTrigger value="pending">
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
                      {getStatusBadge(member)}
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
                              ${member.total_revenue?.toLocaleString()}
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
                          />
                          <Label className="text-xs">Active</Label>
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
              <TabsList className="grid w-full grid-cols-1">
                <TabsTrigger value="details">Details</TabsTrigger>
                {/* Services tab temporarily disabled - will be enabled after server restart */}
                {/* {selectedStaff.provider_role === 'provider' && (
                  <TabsTrigger value="services">Services</TabsTrigger>
                )} */}
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
                          Select services this provider can offer. Only active business services are shown.
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
    </div>
  );
};
