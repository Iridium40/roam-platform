import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth/AuthProvider';
import { EligibleService, ServiceStats } from '@/types/services';
import { getAuthHeaders } from '@/lib/api/authUtils';

export function useSimplifiedServices() {
  const { provider } = useAuth();
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
      console.log('Loading eligible services for business:', businessId);
      
      // Use cached auth headers (much faster - no Supabase call needed)
      const headers = await getAuthHeaders();
      
      const response = await fetch(`/api/business-eligible-services?business_id=${businessId}`, { headers });

      if (!response.ok) {
        let errorMessage = 'Failed to load services';
        try {
          const errorData = await safeJsonParse(response, 'eligible services error');
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          console.warn('Could not parse error response from services API');
        }
        throw new Error(errorMessage);
      }

      const data = await safeJsonParse(response, 'eligible services');
      const services = data.eligible_services || [];
      
      setEligibleServices(services);

      // Calculate stats from the eligible services
      const activeServices = services.filter((s: EligibleService) => s.business_is_active);
      const totalRevenue = activeServices.reduce((sum: number, s: EligibleService) => {
        return sum + (s.business_price || 0);
      }, 0);
      const avgPrice = activeServices.length > 0 ? totalRevenue / activeServices.length : 0;

      setServiceStats({
        total_services: services.length,
        active_services: activeServices.length,
        total_revenue: totalRevenue,
        avg_price: avgPrice,
      });

    } catch (error) {
      console.error('Error loading services data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const updateService = async (serviceId: string, updates: {
    business_price?: number;
    business_duration_minutes?: number;
    delivery_type?: string;
    is_active?: boolean;
  }): Promise<void> => {
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
          business_duration_minutes: updates.business_duration_minutes,
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

      // Reload services to get updated data
      await loadServicesData();

    } catch (error) {
      console.error('Error updating service:', error);
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
    eligibleServices,
    serviceStats,
    loading,
    error,
    actions: {
      loadServicesData,
      updateService,
      toggleServiceStatus,
    }
  };
}
