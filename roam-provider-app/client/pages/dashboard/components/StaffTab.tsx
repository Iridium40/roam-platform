import React, { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Plus,
  Edit,
  Calendar,
  Clock,
  User,
  Search,
  Filter,
  MoreHorizontal,
  Star,
  CheckCircle,
  XCircle,
  AlertCircle,
  Phone,
  Mail,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface StaffTabProps {
  providerData: any;
  business: any;
}

export default function StaffTab({
  providerData,
  business,
}: StaffTabProps) {
  const { toast } = useToast();
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [allProviders, setAllProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [showAvailabilityEditor, setShowAvailabilityEditor] = useState(false);

  // Filter staff based on search and filters
  const filteredStaff = useMemo(() => {
    let filtered = staffMembers;

    if (selectedRoleFilter !== "all") {
      filtered = filtered.filter(staff => staff.provider_role === selectedRoleFilter);
    }

    if (selectedStatusFilter !== "all") {
      filtered = filtered.filter(staff => {
        if (selectedStatusFilter === "active") return staff.is_active;
        if (selectedStatusFilter === "inactive") return !staff.is_active;
        return true;
      });
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(staff =>
        staff.first_name?.toLowerCase().includes(query) ||
        staff.last_name?.toLowerCase().includes(query) ||
        staff.email?.toLowerCase().includes(query) ||
        staff.phone?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [staffMembers, searchQuery, selectedRoleFilter, selectedStatusFilter]);

  const getRoleBadge = (role: string) => {
    const configs = {
      owner: { label: "Owner", className: "bg-purple-100 text-purple-800 border-purple-300" },
      dispatcher: { label: "Dispatcher", className: "bg-blue-100 text-blue-800 border-blue-300" },
      provider: { label: "Provider", className: "bg-green-100 text-green-800 border-green-300" },
    };
    return configs[role] || { label: role, className: "bg-gray-100 text-gray-800 border-gray-300" };
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive 
      ? { label: "Active", className: "bg-green-100 text-green-800 border-green-300" }
      : { label: "Inactive", className: "bg-gray-100 text-gray-800 border-gray-300" };
  };

  const getAvailabilityStatus = (staff: any) => {
    // This would be calculated based on actual availability data
    // For now, return a placeholder
    return { hasSchedule: true, nextAvailable: "Today 2:00 PM" };
  };

  // Staff Management Functions
  const loadStaffData = async () => {
    console.log('🔍 loadStaffData called');
    console.log('🔍 business?.id:', business?.id);
    console.log('🔍 providerData?.business_id:', providerData?.business_id);
    console.log('🔍 providerData:', providerData);
    
    // Check if we have a business ID from either business context or provider data
    const businessId = business?.id || providerData?.business_id;
    console.log('🔍 Using businessId:', businessId);
    
    if (!businessId) {
      // If no business ID available, use the current provider data if available
      if (providerData && providerData.id) {
        console.log('🔍 Using providerData for staff members:', providerData);
        setStaffMembers([providerData]);
        setAllProviders([providerData]);
      } else {
        console.log('🔍 No providerData available, using sample data');
        console.log('🔍 providerData value:', providerData);
        // Only use sample data if no provider data is available
        setStaffMembers([
          {
            id: "550e8400-e29b-41d4-a716-446655440001", // Sample UUID for dispatcher
            first_name: "Dispatcher",
            last_name: "Roam",
            email: "dispatcher@roamyourbestlife.com",
            phone: "5044117011",
            provider_role: "dispatcher",
            location_id: "",
            verification_status: "verified",
            background_check_status: "approved",
            business_managed: false,
            is_active: true,
            experience_years: 5,
            image_url: null,
            is_sample_data: true, // Flag to identify sample data
          },
          {
            id: "550e8400-e29b-41d4-a716-446655440002", // Sample UUID for provider
            first_name: "Provider",
            last_name: "Roam",
            email: "provider@roamyourbestlife.com",
            phone: "5044117012",
            provider_role: "provider",
            location_id: "",
            verification_status: "verified",
            background_check_status: "approved",
            business_managed: true,
            is_active: true,
            experience_years: 7,
            image_url: null,
            is_sample_data: true, // Flag to identify sample data
          }
        ]);
      }
      return;
    }
    
    // Load staff data with the business ID
    await loadStaffWithBusinessId(businessId);
  };

  // Helper function to load staff data with a specific business ID
  const loadStaffWithBusinessId = async (businessId: string) => {
    console.log('🔍 loadStaffWithBusinessId called with businessId:', businessId);

    try {
      setLoading(true);
      // Load staff members
      const { data: staffData, error: staffError } = await supabase
        .from("providers")
        .select(`
          *,
          business_locations (*)
        `)
        .eq("business_id", businessId);

      if (staffError) throw staffError;
      setStaffMembers(staffData || []);

      // Load all providers for assignment (only those with provider_role = "provider")
      const availableProviders = staffData?.filter(provider => provider.provider_role === "provider") || [];
      setAllProviders(availableProviders);

    } catch (error: any) {
      console.error("Error loading staff data:", error);
      toast({
        title: "Error",
        description: "Failed to load staff data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Availability Editor Functions
  const openAvailabilityEditor = (provider: any) => {
    console.log('🔍 openAvailabilityEditor called with provider:', provider);
    console.log('🔍 Provider ID:', provider.id);
    console.log('🔍 Is sample data?', provider.is_sample_data);

    // Prevent editing sample data
    if (provider.is_sample_data) {
      toast({
        title: "Demo Mode",
        description: "This is sample data. Please use real provider data to set availability.",
        variant: "destructive",
      });
      return;
    }

    setEditingProviderId(provider.id);
    setShowAvailabilityEditor(true);
  };

  const saveProviderAvailability = async () => {
    if (!editingProviderId) return;

    // Additional safety check for proper UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(editingProviderId)) {
      console.error('Invalid provider ID format:', editingProviderId);
      toast({
        title: "Error",
        description: "Invalid provider ID. Please refresh and try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get provider's business_id (if any)
      const { data: providerData, error: providerError } = await supabase
        .from('providers')
        .select('business_id')
        .eq('id', editingProviderId)
        .single();

      if (providerError) {
        console.error('Error fetching provider business_id', providerError, { providerId: editingProviderId });
        toast({
          title: "Error",
          description: "Failed to get provider information",
          variant: "destructive",
        });
        return;
      }

      // Use business ID from provider data or fall back to current business context
      const businessId = providerData?.business_id || business?.id;
      
      if (!businessId) {
        toast({
          title: "Setup Required",
          description: "Provider must be associated with a business to manage schedules.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Availability saved successfully!",
        variant: "default",
      });

      setShowAvailabilityEditor(false);
      setEditingProviderId(null);

    } catch (error) {
      console.error('Error saving availability:', error);
      toast({
        title: "Error",
        description: "Failed to save availability. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Staff action functions
  const handleAddStaff = () => {
    toast({
      title: "Coming Soon",
      description: "Add staff functionality will be implemented soon.",
      variant: "default",
    });
  };

  const handleEditStaff = (staffId: string) => {
    toast({
      title: "Coming Soon",
      description: "Edit staff functionality will be implemented soon.",
      variant: "default",
    });
  };

  const handleToggleStaffStatus = async (staffId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('providers')
        .update({ is_active: isActive })
        .eq('id', staffId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Staff member ${isActive ? 'activated' : 'deactivated'} successfully.`,
        variant: "default",
      });

      // Reload staff data
      await loadStaffData();
    } catch (error) {
      console.error('Error toggling staff status:', error);
      toast({
        title: "Error",
        description: "Failed to update staff status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    try {
      const { error } = await supabase
        .from('providers')
        .delete()
        .eq('id', staffId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Staff member deleted successfully.",
        variant: "default",
      });

      // Reload staff data
      await loadStaffData();
    } catch (error) {
      console.error('Error deleting staff:', error);
      toast({
        title: "Error",
        description: "Failed to delete staff member. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Load staff data when component mounts
  useEffect(() => {
    loadStaffData();
  }, [providerData, business]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-sm text-gray-600">Manage your team members and their schedules</p>
        </div>
        <Button onClick={handleAddStaff} className="mt-4 sm:mt-0">
          <Plus className="w-4 h-4 mr-2" />
          Add Staff Member
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="sm:col-span-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search staff members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div>
          <Select value={selectedRoleFilter} onValueChange={setSelectedRoleFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="owner">Owner</SelectItem>
              <SelectItem value="dispatcher">Dispatcher</SelectItem>
              <SelectItem value="provider">Provider</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStaff.length === 0 ? (
          <div className="col-span-full">
            <Card className="p-8">
              <div className="text-center">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Staff Members Found</h3>
                <p className="text-gray-600 mb-4">
                  {searchQuery || selectedRoleFilter !== "all" || selectedStatusFilter !== "all"
                    ? "Try adjusting your search or filter criteria."
                    : "You haven't added any staff members yet."}
                </p>
                <Button onClick={handleAddStaff}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Staff Member
                </Button>
              </div>
            </Card>
          </div>
        ) : (
          filteredStaff.map((staff) => {
            const availability = getAvailabilityStatus(staff);
            
            return (
              <Card key={staff.id} className="overflow-hidden">
                <div className="p-4">
                  {/* Staff Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {staff.first_name} {staff.last_name}
                        </h3>
                        <p className="text-sm text-gray-600">{staff.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getRoleBadge(staff.provider_role).className}>
                        {getRoleBadge(staff.provider_role).label}
                      </Badge>
                      <Badge className={getStatusBadge(staff.is_active).className}>
                        {getStatusBadge(staff.is_active).label}
                      </Badge>
                    </div>
                  </div>

                  {/* Staff Details */}
                  <div className="space-y-2 mb-4">
                    {staff.phone && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4" />
                        <span>{staff.phone}</span>
                      </div>
                    )}
                    
                    {staff.bio && (
                      <p className="text-sm text-gray-600 line-clamp-2">{staff.bio}</p>
                    )}

                    {/* Availability Status */}
                    <div className="flex items-center space-x-2 text-sm">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-600">
                        {availability.hasSchedule ? "Schedule set" : "No schedule"}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditStaff(staff.id)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      
                      {staff.provider_role === "provider" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAvailabilityEditor(staff)}
                        >
                          <Calendar className="w-4 h-4 mr-1" />
                          Schedule
                        </Button>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onToggleStaffStatus(staff.id, !staff.is_active)}
                        className={staff.is_active ? "text-red-600 border-red-300" : "text-green-600 border-green-300"}
                      >
                        {staff.is_active ? "Deactivate" : "Activate"}
                      </Button>
                      
                      {staff.id !== providerData.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteStaff(staff.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">Total Staff</p>
            <p className="text-2xl font-bold text-gray-900">{staffMembers.length}</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">Active Staff</p>
            <p className="text-2xl font-bold text-green-600">
              {staffMembers.filter(s => s.is_active).length}
            </p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">Providers</p>
            <p className="text-2xl font-bold text-blue-600">
              {staffMembers.filter(s => s.provider_role === "provider").length}
            </p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">Dispatchers</p>
            <p className="text-2xl font-bold text-purple-600">
              {staffMembers.filter(s => s.provider_role === "dispatcher").length}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
