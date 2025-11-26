import React, { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Package, Puzzle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSimplifiedServices } from '@/hooks/services/useSimplifiedServices';
import { ServiceFilters, EligibleService } from '@/types/services';
import { ServiceStatsSection } from './services/ServiceStatsSection';
import { ServiceFiltersSection } from './services/ServiceFiltersSection';
import { SimplifiedServiceListSection } from './services/SimplifiedServiceListSection';
import { EditServiceModal } from './services/EditServiceModal';
import AddonsTabSimplified from './AddonsTabSimplified';

interface ServicesTabSimplifiedProps {
  providerData?: any;
  business?: any;
}

export default function ServicesTabSimplified({
  providerData,
  business,
}: ServicesTabSimplifiedProps) {
  const {
    eligibleServices,
    serviceStats,
    loading,
    error,
    actions
  } = useSimplifiedServices();

  const [filters, setFilters] = useState<ServiceFilters>({
    searchQuery: '',
    filterStatus: 'all',
    page: 1,
    itemsPerPage: 50,
  });

  const [editingService, setEditingService] = useState<EligibleService | null>(null);
  const [activeTab, setActiveTab] = useState<'services' | 'addons'>('services');

  // Filter services based on current filters
  const filteredServices = eligibleServices.filter(service => {
    // Search filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const serviceName = service.name?.toLowerCase() || '';
      const serviceDesc = service.description?.toLowerCase() || '';
      const category = service.service_subcategories?.service_categories?.service_category_type?.toLowerCase() || '';
      
      if (!serviceName.includes(query) && !serviceDesc.includes(query) && !category.includes(query)) {
        return false;
      }
    }

    // Status filter
    if (filters.filterStatus === 'active' && !service.business_is_active) {
      return false;
    }
    if (filters.filterStatus === 'inactive' && service.business_is_active) {
      return false;
    }

    return true;
  });

  const handleEdit = (service: EligibleService) => {
    setEditingService(service);
  };


  const handleSaveService = async (serviceForm: any) => {
    try {
      const updateData: any = {
        business_price: parseFloat(serviceForm.business_price),
        delivery_type: serviceForm.delivery_type,
        is_active: serviceForm.is_active
      };

      // Add business_duration_minutes if provided
      if (serviceForm.business_duration_minutes !== undefined && serviceForm.business_duration_minutes !== null && serviceForm.business_duration_minutes !== '') {
        updateData.business_duration_minutes = parseInt(serviceForm.business_duration_minutes);
      }

      await actions.updateService(serviceForm.service_id, updateData);
      setEditingService(null);
    } catch (error) {
      console.error('Failed to update service:', error);
      throw error;
    }
  };

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Service Stats */}
      <ServiceStatsSection stats={serviceStats} />

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
          {/* Filters */}
          <ServiceFiltersSection
            filters={filters}
            onFiltersChange={setFilters}
            onRefresh={actions.loadServicesData}
          />

          {/* Service List */}
          <SimplifiedServiceListSection
            services={filteredServices}
            loading={loading}
            onEdit={handleEdit}
          />
        </TabsContent>

        {/* Add-ons Tab Content */}
        <TabsContent value="addons" className="space-y-4 mt-6">
          <AddonsTabSimplified providerData={providerData} business={business} />
        </TabsContent>
      </Tabs>

      {/* Edit Service Modal */}
      {editingService && (
        <EditServiceModal
          service={editingService}
          onSave={handleSaveService}
          onClose={() => setEditingService(null)}
          loading={false}
        />
      )}
    </div>
  );
}
