import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/auth/AuthProvider';
import { EligibleService, ServiceStats } from '@/types/services';
import { getAuthHeaders } from '@/lib/api/authUtils';
import { getCached, setCache, invalidateCache, CacheKeys } from '@/lib/cache';

// Cache TTL: 5 minutes
const CACHE_TTL_MS = 5 * 60 * 1000;

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

  const loadServicesData = async (forceRefresh: boolean = false) => {
    if (!isProviderReady()) {
      setError('Business profile setup required. Please complete your business registration.');
      setLoading(false);
      return;
    }

    const businessId = provider!.provider!.business_id!;
    const cacheKey = CacheKeys.services(businessId);

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = getCached<{ services: EligibleService[]; stats: ServiceStats }>(cacheKey, CACHE_TTL_MS);
      if (cached) {
        setEligibleServices(cached.services);
        setServiceStats(cached.stats);
        setLoading(false);
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);

      const userId = provider!.provider!.user_id!;
      
      // Use optimized services API for better performance (server-side filtering and stats)
      const queryParams = new URLSearchParams({
        business_id: businessId,
        user_id: userId,
      });
      
      const response = await fetch(`/api/services-optimized?${queryParams}`);

      if (!response.ok) {
        let errorMessage = 'Failed to load services';
        try {
          const errorData = await safeJsonParse(response, 'services optimized error');
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          console.warn('Could not parse error response from services API');
        }
        throw new Error(errorMessage);
      }

      const data = await safeJsonParse(response, 'services optimized');
      const services = data.eligible_services || [];
      
      setEligibleServices(services);

      // Use server-side calculated stats (already optimized)
      const serverStats = data.stats || {};
      const stats: ServiceStats = {
        total_services: serverStats.total_services || services.length,
        active_services: serverStats.active_services || 0,
        total_revenue: serverStats.total_value || 0,
        avg_price: serverStats.avg_price || 0,
      };
      setServiceStats(stats);

      // Cache the data
      setCache(cacheKey, { services, stats });
      
      console.log("✅ Services loaded via optimized API:", {
        count: services.length,
        stats: serverStats,
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

      // Invalidate cache and reload services to get updated data
      invalidateCache(CacheKeys.services(provider!.provider!.business_id!));
      await loadServicesData(true);

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
