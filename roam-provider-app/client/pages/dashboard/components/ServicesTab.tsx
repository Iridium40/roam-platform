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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Star,
  Tag,
  DollarSign,
  Clock,
  MapPin,
  Filter,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface ServicesTabProps {
  providerData: any;
  business: any;
}

export default function ServicesTab({
  providerData,
  business,
}: ServicesTabProps) {
  const { toast } = useToast();
  const [businessServices, setBusinessServices] = useState<any[]>([]);
  const [eligibleServices, setEligibleServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [showEditServiceModal, setShowEditServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [serviceForm, setServiceForm] = useState({
    business_price: '',
    delivery_type: 'business_location'
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");

  // Load services data
  const loadServicesData = async () => {
    if (!providerData) return;

    try {
      setLoading(true);
      const businessId = business?.id || providerData?.business_id;

      // Load current business services with proper relationships
      const { data: currentBusinessServices, error: businessServicesError } = await supabase
        .from('business_services')
        .select(`
          *,
          services:service_id(
            *,
            service_subcategories(
              service_subcategory_type,
              service_categories(service_category_type)
            )
          )
        `)
        .eq('business_id', businessId);

      if (businessServicesError) throw businessServicesError;
      setBusinessServices(currentBusinessServices || []);

      // Load eligible services (placeholder - implement when edge function is ready)
      setEligibleServices([]);

    } catch (error) {
      console.error('Error loading services data:', error);
      toast({
        title: "Error",
        description: "Failed to load services data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Service Management Functions (from original ProviderDashboard.tsx)
  const addServiceToBusiness = async (service: any) => {
    if (!business?.id || !providerData?.id) return;

    try {
      const { error } = await supabase
        .from('business_services')
        .insert({
          business_id: business.id,
          service_id: service.id,
          business_price: service.base_price, // Start with the base price as default
          delivery_type: 'business_location', // Default delivery type
          is_active: true
        });

      if (error) throw error;

      toast({
        title: "Service Added",
        description: `${service.name} has been added to your services.`,
      });

      // Refresh services data
      await loadServicesData();
    } catch (error) {
      console.error('Error adding service to business:', error);
      toast({
        title: "Error",
        description: "Failed to add service. Please try again.",
        variant: "destructive",
      });
    }
  };

  const removeServiceFromBusiness = async (serviceId: string, serviceName: string) => {
    if (!business?.id || !confirm(`Are you sure you want to remove "${serviceName}" from your services?`)) return;

    try {
      const { error } = await supabase
        .from('business_services')
        .delete()
        .eq('business_id', business.id)
        .eq('service_id', serviceId);

      if (error) throw error;

      toast({
        title: "Service Removed",
        description: `${serviceName} has been removed from your services.`,
      });

      // Refresh services data
      await loadServicesData();
    } catch (error) {
      console.error('Error removing service from business:', error);
      toast({
        title: "Error",
        description: "Failed to remove service. Please try again.",
        variant: "destructive",
      });
    }
  };

  const openEditServiceModal = (service: any) => {
    setEditingService(service);
    setServiceForm({
      business_price: (service.business_price || service.services?.min_price || 0).toString(),
      delivery_type: service.delivery_type || 'business_location'
    });
    setShowEditServiceModal(true);
  };

  const saveServiceEdits = async () => {
    if (!editingService || !business?.id) return;

    try {
      const businessPrice = parseFloat(serviceForm.business_price);

      if (isNaN(businessPrice) || businessPrice < (editingService.services?.min_price || 0)) {
        toast({
          title: "Invalid Price",
          description: `Business price must be at least $${editingService.services?.min_price || 0} (service minimum).`,
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('business_services')
        .update({
          business_price: businessPrice,
          delivery_type: serviceForm.delivery_type
        })
        .eq('business_id', business.id)
        .eq('service_id', editingService.service_id || editingService.services?.id);

      if (error) throw error;

      toast({
        title: "Service Updated",
        description: `${editingService.services?.name || 'Service'} has been updated successfully.`,
      });

      setShowEditServiceModal(false);
      setEditingService(null);

      // Refresh services data
      await loadServicesData();
    } catch (error) {
      console.error('Error updating service:', error);
      toast({
        title: "Error",
        description: "Failed to update service. Please try again.",
        variant: "destructive",
      });
    }
  };

  const toggleServiceStatus = async (serviceId: string, isActive: boolean) => {
    if (!business?.id) return;

    try {
      const { error } = await supabase
        .from('business_services')
        .update({ is_active: isActive })
        .eq('business_id', business.id)
        .eq('service_id', serviceId);

      if (error) throw error;

      toast({
        title: "Service Updated",
        description: `Service has been ${isActive ? 'activated' : 'deactivated'}.`,
      });

      // Refresh services data
      await loadServicesData();
    } catch (error) {
      console.error('Error toggling service status:', error);
      toast({
        title: "Error",
        description: "Failed to update service status. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadServicesData();
  }, [providerData, business]);

  // Filter services based on search and filters
  const filteredServices = useMemo(() => {
    let filtered = businessServices;

    if (selectedCategoryFilter !== "all") {
      filtered = filtered.filter(service => 
        service.services?.service_subcategories?.service_categories?.service_category_type === selectedCategoryFilter
      );
    }

    if (selectedStatusFilter !== "all") {
      filtered = filtered.filter(service => {
        if (selectedStatusFilter === "active") return service.is_active;
        if (selectedStatusFilter === "inactive") return !service.is_active;
        return true;
      });
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(service =>
        service.services?.name?.toLowerCase().includes(query) ||
        service.services?.description?.toLowerCase().includes(query) ||
        service.services?.service_subcategories?.service_categories?.service_category_type?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [businessServices, searchQuery, selectedCategoryFilter, selectedStatusFilter]);

  const getStatusBadge = (isActive: boolean) => {
    return isActive 
      ? { label: "Active", className: "bg-green-100 text-green-800 border-green-300" }
      : { label: "Inactive", className: "bg-gray-100 text-gray-800 border-gray-300" };
  };

  const getCategoryBadge = (categoryType: string) => {
    const configs = {
      beauty: { label: "Beauty", className: "bg-pink-100 text-pink-800 border-pink-300" },
      fitness: { label: "Fitness", className: "bg-blue-100 text-blue-800 border-blue-300" },
      therapy: { label: "Therapy", className: "bg-purple-100 text-purple-800 border-purple-300" },
      healthcare: { label: "Healthcare", className: "bg-green-100 text-green-800 border-green-300" },
    };
    return configs[categoryType] || { label: categoryType, className: "bg-gray-100 text-gray-800 border-gray-300" };
  };

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Services</h1>
          <p className="text-sm text-gray-600">Loading services data...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Services</h1>
          <p className="text-sm text-gray-600">Manage your business services and offerings</p>
        </div>
        <Button onClick={() => setShowAddServiceModal(true)} className="mt-4 sm:mt-0">
          <Plus className="w-4 h-4 mr-2" />
          Add Service
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="sm:col-span-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div>
          <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="beauty">Beauty</SelectItem>
              <SelectItem value="fitness">Fitness</SelectItem>
              <SelectItem value="therapy">Therapy</SelectItem>
              <SelectItem value="healthcare">Healthcare</SelectItem>
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

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServices.length === 0 ? (
          <div className="col-span-full">
            <Card className="p-8">
              <div className="text-center">
                <Tag className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Services Found</h3>
                <p className="text-gray-600 mb-4">
                  {searchQuery || selectedCategoryFilter !== "all" || selectedStatusFilter !== "all"
                    ? "Try adjusting your search or filter criteria."
                    : "You haven't added any services yet."}
                </p>
                <Button onClick={() => setShowAddServiceModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Service
                </Button>
              </div>
            </Card>
          </div>
        ) : (
          filteredServices.map((service) => (
            <Card key={service.id} className="overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-lg">
                      {service.services?.name || "Service Name"}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {service.services?.description || "No description available"}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <Badge className={getStatusBadge(service.is_active).className}>
                      {getStatusBadge(service.is_active).label}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Category:</span>
                    <Badge className={getCategoryBadge(service.service_categories?.service_category_type).className}>
                      {getCategoryBadge(service.service_categories?.service_category_type).label}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Price:</span>
                    <span className="font-semibold text-gray-900">
                      ${service.business_price || service.services?.min_price || "0"}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Duration:</span>
                    <span className="text-sm text-gray-900">
                      {service.services?.duration_minutes || "60"} min
                    </span>
                  </div>

                  {service.delivery_type && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Delivery:</span>
                      <span className="text-sm text-gray-900 capitalize">
                        {service.delivery_type.replace('_', ' ')}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditServiceModal(service)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleServiceStatus(service.id, !service.is_active)}
                      className={service.is_active ? "text-red-600 border-red-300" : "text-green-600 border-green-300"}
                    >
                      {service.is_active ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeServiceFromBusiness(service.id, service.services?.name || 'Service')}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Available Services Section */}
      {eligibleServices.length > 0 && (
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Plus className="w-5 h-5" />
                <span>Available Services to Add</span>
              </CardTitle>
              <p className="text-sm text-gray-600">
                These services are available for your business category
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {eligibleServices.slice(0, 6).map((service) => (
                  <div
                    key={service.id}
                    className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => addServiceToBusiness(service)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm">{service.name}</h4>
                      <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                        Add
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">{service.description}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>From ${service.min_price}</span>
                      <span>{service.duration_minutes} min</span>
                    </div>
                  </div>
                ))}
              </div>
              {eligibleServices.length > 6 && (
                <div className="text-center mt-4">
                  <Button variant="outline" onClick={() => setShowAddServiceModal(true)}>
                    View All {eligibleServices.length} Available Services
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
