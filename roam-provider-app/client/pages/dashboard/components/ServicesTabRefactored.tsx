import React, { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Package, Puzzle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useServices } from '@/hooks/services/useServices';
import { ServiceFilters, BusinessService } from '@/types/services';
import { ServiceFiltersSection } from './services/ServiceFiltersSection';
import { ServiceListSection } from './services/ServiceListSection';
import { AddServiceModal } from './services/AddServiceModal';

interface ServicesTabRefactoredProps {
  providerData?: any;
  business?: any;
}

export default function ServicesTabRefactored({
  providerData,
  business,
}: ServicesTabRefactoredProps) {
  const {
    businessServices,
    eligibleServices,
    loading,
    error,
    actions
  } = useServices();

  const [activeTab, setActiveTab] = useState<'services' | 'addons'>('services');
  const [filters, setFilters] = useState<ServiceFilters>({
    searchQuery: '',
    filterStatus: 'all',
    page: 1,
    itemsPerPage: 50,
  });

  // Filter services based on current filters
  const filteredServices = businessServices.filter(service => {
    // Search filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const serviceName = service.services?.name?.toLowerCase() || '';
      const serviceDesc = service.services?.description?.toLowerCase() || '';
      const category = service.services?.service_subcategories?.service_categories?.service_category_type?.toLowerCase() || '';
      
      if (!serviceName.includes(query) && !serviceDesc.includes(query) && !category.includes(query)) {
        return false;
      }
    }

    // Status filter
    if (filters.filterStatus === 'active' && !service.is_active) {
      return false;
    }
    if (filters.filterStatus === 'inactive' && service.is_active) {
      return false;
    }

    return true;
  });

  const handleEdit = (service: BusinessService) => {
    // TODO: Implement edit functionality
    console.log('Edit service:', service);
  };

  const handleDelete = async (serviceId: string) => {
    try {
      await actions.deleteService(serviceId);
    } catch (error) {
      console.error('Failed to delete service:', error);
    }
  };

  const handleToggleStatus = async (serviceId: string, isActive: boolean) => {
    try {
      await actions.toggleServiceStatus(serviceId, isActive);
    } catch (error) {
      console.error('Failed to toggle service status:', error);
    }
  };

  const handleAddService = async (serviceForm: any) => {
    try {
      await actions.addService(serviceForm);
    } catch (error) {
      console.error('Failed to add service:', error);
      throw error; // Re-throw to let the modal handle it
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Services</h3>
          <p className="text-sm text-foreground/60">
            Manage your business services and pricing.
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tabs for Services and Add-ons */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'services' | 'addons')} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="services" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Services
          </TabsTrigger>
          <TabsTrigger value="addons" className="flex items-center gap-2">
            <Puzzle className="h-4 w-4" />
            Add-ons
          </TabsTrigger>
        </TabsList>

        {/* Services Tab Content */}
        <TabsContent value="services" className="space-y-4 mt-6">
          {/* Filters and Actions */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end justify-between">
            <div className="flex-1 w-full sm:w-auto">
              <ServiceFiltersSection
                filters={filters}
                onFiltersChange={setFilters}
                onRefresh={actions.loadServicesData}
              />
            </div>
            <div className="shrink-0">
              <AddServiceModal
                eligibleServices={eligibleServices}
                onAddService={handleAddService}
                loading={loading}
              />
            </div>
          </div>

          {/* Service List */}
          <ServiceListSection
            services={filteredServices}
            loading={loading}
            onToggleStatus={handleToggleStatus}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </TabsContent>

        {/* Add-ons Tab Content */}
        <TabsContent value="addons" className="space-y-4 mt-6">
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <Puzzle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Add-ons Management
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Manage service add-ons and enhancements for your business. Add-ons can be added to services to increase revenue and provide more options for customers.
            </p>
            <div className="text-sm text-gray-500">
              Coming soon: Add-on creation, pricing, and assignment to services
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}