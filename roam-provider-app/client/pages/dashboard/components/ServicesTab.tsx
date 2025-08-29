import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  DollarSign,
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Package,
  Settings,
  Search,
  Filter,
  Loader2,
  MapPin,
  Home,
  Car
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '@/contexts/auth/AuthProvider';

interface BusinessService {
  id: string;
  business_id: string;
  service_id: string;
  business_price: number;
  is_active: boolean;
  delivery_type: 'customer_location' | 'business_location' | 'mobile' | null;
  created_at: string;
  services?: {
    id: string;
    name: string;
    description: string;
    min_price: number;
    duration_minutes: number;
    image_url?: string;
    service_subcategories?: {
      service_subcategory_type: string;
      service_categories?: {
        service_category_type: string;
      };
    };
  };
}

interface EligibleService {
  id: string;
  name: string;
  description: string;
  min_price: number;
  duration_minutes: number;
  image_url?: string;
  is_active: boolean;
  subcategory_id: string;
  service_subcategories?: {
    service_subcategory_type: string;
    service_categories?: {
      service_category_type: string;
    };
  };
}

interface ServiceStats {
  total_services: number;
  active_services: number;
  total_bookings: number;
  total_revenue: number;
  avg_price: number;
}

const supabase = createClient(
  import.meta.env.VITE_PUBLIC_SUPABASE_URL!,
  import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ServicesTab() {
  const { provider } = useAuth();
  const [businessServices, setBusinessServices] = useState<BusinessService[]>([]);
  const [eligibleServices, setEligibleServices] = useState<EligibleService[]>([]);
  const [serviceStats, setServiceStats] = useState<ServiceStats>({
    total_services: 0,
    active_services: 0,
    total_bookings: 0,
    total_revenue: 0,
    avg_price: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedService, setSelectedService] = useState<BusinessService | null>(null);
  const [editingService, setEditingService] = useState<EligibleService | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state for adding/editing services
  const [serviceForm, setServiceForm] = useState({
    service_id: '',
    business_price: '',
    delivery_type: 'customer_location' as const,
    is_active: true
  });

  useEffect(() => {
    if (provider?.business_id) {
      loadServicesData();
    }
  }, [provider?.business_id]);

  const loadServicesData = async () => {
    try {
      setLoading(true);
      setError(null);

      const businessId = provider?.business_id;
      if (!businessId) throw new Error('Business ID not found');

      // Load business services using API endpoint
      const response = await fetch(`/api/business/services?business_id=${businessId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load services');
      }

      const { services, stats } = await response.json();
      setBusinessServices(services || []);
      setServiceStats(stats);

      // Load eligible services (services not yet added)
      await loadEligibleServices(businessId);

    } catch (error) {
      console.error('Error loading services data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load services data');
    } finally {
      setLoading(false);
    }
  };

  const loadEligibleServices = async (businessId: string) => {
    try {
      // Use existing API endpoint for eligible services
      const response = await fetch(`/api/business-eligible-services?business_id=${businessId}`);
      if (!response.ok) {
        throw new Error('Failed to load eligible services');
      }

      const { eligible_services } = await response.json();

      // Filter out services already added to business
      const existingServiceIds = businessServices.map(bs => bs.service_id);
      const eligible = (eligible_services || []).filter((service: any) =>
        !existingServiceIds.includes(service.id)
      );

      setEligibleServices(eligible);
    } catch (error) {
      console.error('Error loading eligible services:', error);
    }
  };

  const calculateServiceStats = (services: BusinessService[]): ServiceStats => {
    const activeServices = services.filter(s => s.is_active);
    const totalPrice = services.reduce((sum, s) => sum + s.business_price, 0);
    
    return {
      total_services: services.length,
      active_services: activeServices.length,
      total_bookings: 0, // Would come from bookings data
      total_revenue: 0, // Would come from bookings data
      avg_price: services.length > 0 ? totalPrice / services.length : 0
    };
  };

  const handleAddService = async () => {
    try {
      setSubmitting(true);
      setError(null);

      const businessId = provider?.business_id;
      if (!businessId) throw new Error('Business ID not found');

      if (!serviceForm.service_id || !serviceForm.business_price) {
        throw new Error('Please fill in all required fields');
      }

      const price = parseFloat(serviceForm.business_price);
      if (isNaN(price) || price <= 0) {
        throw new Error('Please enter a valid price');
      }

      // Use API endpoint to add service
      const response = await fetch('/api/business/services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_id: businessId,
          service_id: serviceForm.service_id,
          business_price: price,
          delivery_type: serviceForm.delivery_type,
          is_active: serviceForm.is_active
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add service');
      }

      const { service } = await response.json();

      // Update local state
      setBusinessServices(prev => [service, ...prev]);

      // Reset form and close modal
      setServiceForm({
        service_id: '',
        business_price: '',
        delivery_type: 'customer_location',
        is_active: true
      });
      setShowAddServiceModal(false);

      // Reload data to update eligible services
      await loadServicesData();

    } catch (error) {
      console.error('Error adding service:', error);
      setError(error instanceof Error ? error.message : 'Failed to add service');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateService = async (serviceId: string, updates: Partial<BusinessService>) => {
    try {
      setSubmitting(true);
      setError(null);

      const businessId = provider?.business_id;
      if (!businessId) throw new Error('Business ID not found');

      if (updates.business_price && updates.business_price <= 0) {
        throw new Error('Price must be greater than 0');
      }

      // Use API endpoint to update service
      const response = await fetch('/api/business/services', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_id: businessId,
          service_id: serviceId,
          ...updates
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update service');
      }

      const { service } = await response.json();

      // Update local state
      setBusinessServices(prev =>
        prev.map(bs => bs.service_id === serviceId ? service : bs)
      );

      setShowEditModal(false);
      setSelectedService(null);

    } catch (error) {
      console.error('Error updating service:', error);
      setError(error instanceof Error ? error.message : 'Failed to update service');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    try {
      setSubmitting(true);
      setError(null);

      const businessId = provider?.business_id;
      if (!businessId) throw new Error('Business ID not found');

      // Use API endpoint to delete service
      const response = await fetch(`/api/business/services?business_id=${businessId}&service_id=${serviceId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete service');
      }

      // Update local state
      setBusinessServices(prev => prev.filter(bs => bs.service_id !== serviceId));

      // Reload eligible services
      await loadEligibleServices(businessId);

    } catch (error) {
      console.error('Error deleting service:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete service');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (serviceId: string, isActive: boolean) => {
    await handleUpdateService(serviceId, { is_active: isActive });
  };

  const getDeliveryTypeIcon = (deliveryType: string | null) => {
    switch (deliveryType) {
      case 'customer_location': return <MapPin className="w-4 h-4" />;
      case 'business_location': return <Home className="w-4 h-4" />;
      case 'mobile': return <Car className="w-4 h-4" />;
      default: return <MapPin className="w-4 h-4" />;
    }
  };

  const getDeliveryTypeLabel = (deliveryType: string | null) => {
    switch (deliveryType) {
      case 'customer_location': return 'Customer Location';
      case 'business_location': return 'Business Location';
      case 'mobile': return 'Mobile Service';
      default: return 'Customer Location';
    }
  };

  const filteredServices = businessServices.filter(service => {
    const matchesSearch = service.services?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         service.services?.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'active' && service.is_active) ||
                         (filterStatus === 'inactive' && !service.is_active);
    
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading services...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Service Management</h2>
          <p className="text-gray-600">Manage your service offerings and pricing</p>
        </div>
        <Button 
          onClick={() => setShowAddServiceModal(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Service
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Services</p>
                <p className="text-3xl font-bold text-gray-900">{serviceStats.total_services}</p>
              </div>
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Services</p>
                <p className="text-3xl font-bold text-green-600">{serviceStats.active_services}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Average Price</p>
                <p className="text-3xl font-bold text-gray-900">${serviceStats.avg_price.toFixed(2)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-3xl font-bold text-gray-900">${serviceStats.total_revenue.toFixed(2)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
          <SelectTrigger className="w-[180px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Services</SelectItem>
            <SelectItem value="active">Active Only</SelectItem>
            <SelectItem value="inactive">Inactive Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Services Table */}
      <Card>
        <CardHeader>
          <CardTitle>Services ({filteredServices.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredServices.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {businessServices.length === 0 ? 'No Services Added' : 'No Services Found'}
              </h3>
              <p className="text-gray-600 mb-4">
                {businessServices.length === 0 
                  ? 'Start by adding services to your business offering'
                  : 'Try adjusting your search or filter criteria'
                }
              </p>
              {businessServices.length === 0 && (
                <Button onClick={() => setShowAddServiceModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Service
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServices.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        {service.services?.image_url && (
                          <img 
                            src={service.services.image_url} 
                            alt={service.services.name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        )}
                        <div>
                          <p className="font-medium">{service.services?.name}</p>
                          <p className="text-sm text-gray-600">{service.services?.description}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p className="font-medium">
                          {service.services?.service_subcategories?.service_categories?.service_category_type}
                        </p>
                        <p className="text-gray-600">
                          {service.services?.service_subcategories?.service_subcategory_type}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p className="font-bold text-green-600">${service.business_price}</p>
                        <p className="text-gray-600">Min: ${service.services?.min_price}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="w-4 h-4 mr-1" />
                        {service.services?.duration_minutes} min
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm">
                        {getDeliveryTypeIcon(service.delivery_type)}
                        <span className="ml-1">{getDeliveryTypeLabel(service.delivery_type)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={service.is_active}
                          onCheckedChange={(checked) => handleToggleActive(service.service_id, checked)}
                        />
                        <Badge 
                          variant={service.is_active ? "default" : "secondary"}
                          className={service.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}
                        >
                          {service.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedService(service);
                              setShowEditModal(true);
                            }}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Service
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleToggleActive(service.service_id, !service.is_active)}
                          >
                            {service.is_active ? (
                              <>
                                <EyeOff className="w-4 h-4 mr-2" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <Eye className="w-4 h-4 mr-2" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteService(service.service_id)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remove Service
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Service Modal */}
      <Dialog open={showAddServiceModal} onOpenChange={setShowAddServiceModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Service</DialogTitle>
            <DialogDescription>
              Select a service to add to your business offering and set your pricing.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="service">Service *</Label>
              <Select value={serviceForm.service_id} onValueChange={(value) => 
                setServiceForm(prev => ({ ...prev, service_id: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Select a service to add" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleServices.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      <div className="flex items-center space-x-2">
                        <span>{service.name}</span>
                        <Badge variant="outline">${service.min_price} min</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="price">Your Price *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={serviceForm.business_price}
                  onChange={(e) => setServiceForm(prev => ({ ...prev, business_price: e.target.value }))}
                  className="pl-10"
                />
              </div>
              {serviceForm.service_id && (
                <p className="text-sm text-gray-600 mt-1">
                  Minimum price: ${eligibleServices.find(s => s.id === serviceForm.service_id)?.min_price}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="delivery_type">Delivery Type</Label>
              <Select value={serviceForm.delivery_type} onValueChange={(value: any) => 
                setServiceForm(prev => ({ ...prev, delivery_type: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer_location">
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2" />
                      Customer Location
                    </div>
                  </SelectItem>
                  <SelectItem value="business_location">
                    <div className="flex items-center">
                      <Home className="w-4 h-4 mr-2" />
                      Business Location
                    </div>
                  </SelectItem>
                  <SelectItem value="mobile">
                    <div className="flex items-center">
                      <Car className="w-4 h-4 mr-2" />
                      Mobile Service
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={serviceForm.is_active}
                onCheckedChange={(checked) => setServiceForm(prev => ({ ...prev, is_active: checked }))}
              />
              <Label>Active (available for booking)</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddServiceModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddService} 
              disabled={submitting || !serviceForm.service_id || !serviceForm.business_price}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Service'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Service Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Service</DialogTitle>
            <DialogDescription>
              Update pricing and settings for {selectedService?.services?.name}.
            </DialogDescription>
          </DialogHeader>
          
          {selectedService && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit_price">Price *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="edit_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={selectedService.business_price}
                    onChange={(e) => setSelectedService(prev => prev ? { 
                      ...prev, 
                      business_price: parseFloat(e.target.value) || 0 
                    } : null)}
                    className="pl-10"
                  />
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Minimum price: ${selectedService.services?.min_price}
                </p>
              </div>

              <div>
                <Label htmlFor="edit_delivery_type">Delivery Type</Label>
                <Select 
                  value={selectedService.delivery_type || 'customer_location'} 
                  onValueChange={(value: any) => setSelectedService(prev => prev ? {
                    ...prev,
                    delivery_type: value
                  } : null)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer_location">
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-2" />
                        Customer Location
                      </div>
                    </SelectItem>
                    <SelectItem value="business_location">
                      <div className="flex items-center">
                        <Home className="w-4 h-4 mr-2" />
                        Business Location
                      </div>
                    </SelectItem>
                    <SelectItem value="mobile">
                      <div className="flex items-center">
                        <Car className="w-4 h-4 mr-2" />
                        Mobile Service
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={selectedService.is_active}
                  onCheckedChange={(checked) => setSelectedService(prev => prev ? {
                    ...prev,
                    is_active: checked
                  } : null)}
                />
                <Label>Active (available for booking)</Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => selectedService && handleUpdateService(selectedService.service_id, {
                business_price: selectedService.business_price,
                delivery_type: selectedService.delivery_type,
                is_active: selectedService.is_active
              })}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Service'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
