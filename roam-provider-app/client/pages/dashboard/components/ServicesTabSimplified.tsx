import React, { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useSimplifiedServices } from '@/hooks/services/useSimplifiedServices';
import { ServiceFilters, EligibleService } from '@/types/services';
import { ServiceStatsSection } from './services/ServiceStatsSection';
import { ServiceFiltersSection } from './services/ServiceFiltersSection';
import { SimplifiedServiceListSection } from './services/SimplifiedServiceListSection';
import { EditServiceModal } from './services/EditServiceModal';

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

  const handleToggleStatus = async (serviceId: string, isActive: boolean) => {
    try {
      await actions.toggleServiceStatus(serviceId, isActive);
    } catch (error) {
      console.error('Failed to toggle service status:', error);
    }
  };

  const handleSaveService = async (serviceForm: any) => {
    try {
      await actions.updateService(serviceForm.service_id, {
        business_price: parseFloat(serviceForm.business_price),
        delivery_type: serviceForm.delivery_type,
        is_active: serviceForm.is_active
      });
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
        onToggleStatus={handleToggleStatus}
        onEdit={handleEdit}
      />

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
