import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth/AuthProvider';
import { BusinessService, EligibleService, ServiceStats, ServiceFormData } from '@/types/services';
import { getAuthHeaders } from '@/lib/api/authUtils';

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

  // Helper to check if provider data is ready for API calls
  const isProviderReady = (): boolean => {
    if (!provider?.provider) {
      console.log('Provider context not yet loaded');
      return false;
    }
    
    if (!provider.provider.business_id) {
      console.log('Provider has no business_id');
      return false;
    }

    // Validate business_id is a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(provider.provider.business_id)) {
      console.log('Provider business_id is not a valid UUID:', provider.provider.business_id);
      return false;
    }

    return true;
  };

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
    if (!isProviderReady()) {
      setError('Business profile setup required. Please complete your business registration.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const businessId = provider!.provider!.business_id!;
      console.log('Loading services for business:', businessId);
      
      // Use cached auth headers (much faster - no Supabase call needed)
      const headers = await getAuthHeaders();
      
      const [servicesRes, eligibleRes] = await Promise.all([
        fetch(`/api/business/services?business_id=${businessId}&page=1&limit=50`, { headers }),
        fetch(`/api/business-eligible-services?business_id=${businessId}`, { headers })
      ]);

      // Handle services response
      if (!servicesRes.ok) {
        let errorMessage = 'Failed to load services';
        try {
          const errorData = await safeJsonParse(servicesRes, 'business services error');
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          console.warn('Could not parse error response from services API');
        }
        throw new Error(errorMessage);
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
        try {
          const eligibleJson = await safeJsonParse(eligibleRes, 'eligible services');
          const existingServiceIds = (services || []).map((bs: BusinessService) => bs.service_id);
          const eligible = (eligibleJson.eligible_services || []).filter(
            (svc: EligibleService) => !existingServiceIds.includes(svc.id)
          );
          setEligibleServices(eligible);
        } catch (eligibleError) {
          console.warn('Failed to parse eligible services, but continuing with business services:', eligibleError);
          setEligibleServices([]); // Set to empty array instead of failing
        }
      } else {
        console.warn('Failed to load eligible services, but continuing with business services');
        try {
          const errorData = await safeJsonParse(eligibleRes, 'eligible services error');
          console.warn('Eligible services error:', errorData);
        } catch (parseError) {
          console.warn('Could not parse eligible services error response');
        }
        setEligibleServices([]); // Set to empty array instead of failing
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
      // Use cached auth headers
      const headers = await getAuthHeaders();

      const response = await fetch(`/api/business-eligible-services?business_id=${businessId}`, { headers });
      
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
    if (!isProviderReady()) {
      throw new Error('Business profile setup required. Please complete your business registration.');
    }

    try {
      const response = await fetch('/api/business/services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_id: provider!.provider!.business_id!,
          service_id: serviceForm.service_id,
          business_price: parseFloat(serviceForm.business_price),
          delivery_type: serviceForm.delivery_type,
          is_active: serviceForm.is_active
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to add service';
        try {
          const errorData = await safeJsonParse(response, 'add service error');
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          console.warn('Could not parse error response from add service API');
        }
        throw new Error(errorMessage);
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
    if (!isProviderReady()) {
      throw new Error('Business profile setup required. Please complete your business registration.');
    }

    try {
      const response = await fetch(`/api/business/services`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_id: provider!.provider!.business_id!,
          service_id: serviceId,
          business_price: updates.business_price,
          delivery_type: updates.delivery_type,
          is_active: updates.is_active
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to update service';
        try {
          const errorData = await safeJsonParse(response, 'update service error');
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          console.warn('Could not parse error response from update service API');
        }
        throw new Error(errorMessage);
      }

      const { service } = await safeJsonParse(response, 'update service');

      // Update local state
      setBusinessServices(prev => prev.map(s => s.service_id === serviceId ? service : s));

      return service;

    } catch (error) {
      console.error('Error updating service:', error);
      throw error;
    }
  };

  const deleteService = async (serviceId: string): Promise<void> => {
    try {
      // Find the business service to get both business_id and service_id
      const businessService = businessServices.find(s => s.service_id === serviceId);
      if (!businessService) {
        throw new Error('Business service not found');
      }

      const response = await fetch(`/api/business/services?business_id=${businessService.business_id}&service_id=${serviceId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        let errorMessage = 'Failed to delete service';
        try {
          const errorData = await safeJsonParse(response, 'delete service error');
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          console.warn('Could not parse error response from delete service API');
        }
        throw new Error(errorMessage);
      }

      // Update local state
      setBusinessServices(prev => prev.filter(s => s.service_id !== serviceId));

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
    // Only load services data if the provider is ready
    if (isProviderReady()) {
      loadServicesData();
    } else if (provider?.provider && !provider.provider.business_id) {
      // Provider is loaded but has no business_id
      setError('Business profile setup required. Please complete your business registration.');
      setLoading(false);
    } else {
      // Provider context is still loading
      console.log('Waiting for provider context to load...');
    }
  }, [provider?.provider?.business_id, provider?.provider]);

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