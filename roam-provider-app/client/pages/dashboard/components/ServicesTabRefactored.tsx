import React, { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useServices } from '@/hooks/services/useServices';
import { ServiceFilters, BusinessService } from '@/types/services';
import { ServiceStatsSection } from './services/ServiceStatsSection';
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
    serviceStats,
    loading,
    error,
    actions
  } = useServices();

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
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Service Stats */}
      <ServiceStatsSection stats={serviceStats} />

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
    </div>
  );
}