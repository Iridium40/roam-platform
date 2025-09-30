import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth/AuthProvider';
import { BusinessService, EligibleService, ServiceStats, ServiceFormData } from '@/types/services';

export function useServices() {
  const { provider } = useAuth();
  const [businessServices, setBusinessServices] = useState<BusinessService[]>([]);
  const [eligibleServices, setEligibleServices] = useState<EligibleService[]>([]);
  const [serviceStats, setServiceStats] = useState<ServiceStats>({
    total_services: 0,
    active_services: 0,
    total_revenue: 0,
    avg_price: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Safe JSON parsing helper
  const safeJsonParse = async (response: Response, context: string) => {
    try {
      const text = await response.text();
      if (!text.trim()) {
        throw new Error(`Empty response from ${context}`);
      }
      return JSON.parse(text);
    } catch (parseError) {
      console.error(`JSON parsing error in ${context}:`, parseError);
      throw new Error(`Invalid JSON response from ${context}: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }
  };

  const loadServicesData = async () => {
    if (!provider?.provider?.business_id) {
      setError('Business ID not found');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const businessId = provider.provider.business_id;
      
      const [servicesRes, eligibleRes] = await Promise.all([
        fetch(`/api/business-services?business_id=${businessId}&page=1&limit=50`),
        fetch(`/api/eligible-services?business_id=${businessId}`)
      ]);

      if (!servicesRes.ok) {
        const errorData = await safeJsonParse(servicesRes, 'business services');
        throw new Error(errorData.error || 'Failed to load services');
      }

      const servicesJson = await safeJsonParse(servicesRes, 'business services');
      const { services, stats } = servicesJson;
      setBusinessServices(services || []);
      setServiceStats(stats || {
        total_services: 0,
        active_services: 0,
        total_revenue: 0,
        avg_price: 0,
      });

      if (eligibleRes.ok) {
        const eligibleJson = await safeJsonParse(eligibleRes, 'eligible services');
        const existingServiceIds = (services || []).map((bs: BusinessService) => bs.service_id);
        const eligible = (eligibleJson.eligible_services || []).filter(
          (svc: EligibleService) => !existingServiceIds.includes(svc.id)
        );
        setEligibleServices(eligible);
      }

    } catch (error) {
      console.error('Error loading services data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const loadEligibleServices = async (businessId: string) => {
    try {
      const response = await fetch(`/api/eligible-services?business_id=${businessId}`);
      
      if (!response.ok) {
        const errorData = await safeJsonParse(response, 'eligible services');
        throw new Error(errorData.error || 'Failed to load eligible services');
      }

      const { eligible_services } = await safeJsonParse(response, 'eligible services');
      
      const existingServiceIds = businessServices.map(bs => bs.service_id);
      const eligible = (eligible_services || []).filter(
        (svc: EligibleService) => !existingServiceIds.includes(svc.id)
      );
      setEligibleServices(eligible);

    } catch (error) {
      console.error('Error loading eligible services:', error);
      setError(error instanceof Error ? error.message : 'Failed to load eligible services');
    }
  };

  const addService = async (serviceForm: ServiceFormData): Promise<BusinessService> => {
    if (!provider?.provider?.business_id) {
      throw new Error('Business ID not found');
    }

    try {
      const response = await fetch('/api/business-services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_id: provider.provider.business_id,
          service_id: serviceForm.service_id,
          business_price: parseFloat(serviceForm.business_price),
          delivery_type: serviceForm.delivery_type,
          is_active: serviceForm.is_active
        }),
      });

      if (!response.ok) {
        const errorData = await safeJsonParse(response, 'add service');
        throw new Error(errorData.error || 'Failed to add service');
      }

      const { service } = await safeJsonParse(response, 'add service');

      // Update local state
      setBusinessServices(prev => [service, ...prev]);
      
      // Reload stats
      await loadServicesData();

      return service;

    } catch (error) {
      console.error('Error adding service:', error);
      throw error;
    }
  };

  const updateService = async (serviceId: string, updates: Partial<BusinessService>): Promise<BusinessService> => {
    try {
      const response = await fetch(`/api/business-services/${serviceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_price: updates.business_price,
          delivery_type: updates.delivery_type,
          is_active: updates.is_active
        }),
      });

      if (!response.ok) {
        const errorData = await safeJsonParse(response, 'update service');
        throw new Error(errorData.error || 'Failed to update service');
      }

      const { service } = await safeJsonParse(response, 'update service');

      // Update local state
      setBusinessServices(prev => prev.map(s => s.id === serviceId ? service : s));

      return service;

    } catch (error) {
      console.error('Error updating service:', error);
      throw error;
    }
  };

  const deleteService = async (serviceId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/business-services/${serviceId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await safeJsonParse(response, 'delete service');
        throw new Error(errorData.error || 'Failed to delete service');
      }

      // Update local state
      setBusinessServices(prev => prev.filter(s => s.id !== serviceId));

    } catch (error) {
      console.error('Error deleting service:', error);
      throw error;
    }
  };

  const toggleServiceStatus = async (serviceId: string, isActive: boolean): Promise<void> => {
    try {
      await updateService(serviceId, { is_active: isActive });
    } catch (error) {
      console.error('Error toggling service status:', error);
      throw error;
    }
  };

  useEffect(() => {
    loadServicesData();
  }, [provider?.provider?.business_id]);

  return {
    businessServices,
    eligibleServices,
    serviceStats,
    loading,
    error,
    actions: {
      loadServicesData,
      loadEligibleServices,
      addService,
      updateService,
      deleteService,
      toggleServiceStatus,
    }
  };
}