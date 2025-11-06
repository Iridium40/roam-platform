import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth/AuthProvider';
import { EligibleAddon, AddonStats } from '@/types/addons';

export function useSimplifiedAddons() {
  const { provider } = useAuth();
  const [eligibleAddons, setEligibleAddons] = useState<EligibleAddon[]>([]);
  const [addonStats, setAddonStats] = useState<AddonStats>({
    total_addons: 0,
    available_addons: 0,
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

  const loadAddonsData = async () => {
    if (!isProviderReady()) {
      setError('Business profile setup required. Please complete your business registration.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const businessId = provider!.provider!.business_id!;
      const userId = provider!.provider!.user_id!;
      console.log('Loading eligible addons for business:', businessId);
      
      // Backend uses service role key - no auth headers needed, pass user_id for permission check
      const response = await fetch(`/api/business-eligible-addons?business_id=${businessId}&user_id=${userId}`);

      if (!response.ok) {
        let errorMessage = 'Failed to load addons';
        try {
          const errorData = await safeJsonParse(response, 'eligible addons error');
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          console.warn('Could not parse error response from addons API');
        }
        throw new Error(errorMessage);
      }

      const data = await safeJsonParse(response, 'eligible addons');
      const addons = data.eligible_addons || [];
      
      setEligibleAddons(addons);

      // Calculate stats from the eligible addons
      const availableAddons = addons.filter((a: EligibleAddon) => a.is_available);
      const totalRevenue = availableAddons.reduce((sum: number, a: EligibleAddon) => {
        return sum + (a.custom_price || 0);
      }, 0);
      const avgPrice = availableAddons.length > 0 ? totalRevenue / availableAddons.length : 0;

      setAddonStats({
        total_addons: addons.length,
        available_addons: availableAddons.length,
        total_revenue: totalRevenue,
        avg_price: avgPrice,
      });

    } catch (error) {
      console.error('Error loading addons data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load addons');
    } finally {
      setLoading(false);
    }
  };

  const updateAddon = async (addonId: string, updates: {
    custom_price?: number;
    is_available?: boolean;
  }): Promise<void> => {
    if (!isProviderReady()) {
      throw new Error('Business profile setup required. Please complete your business registration.');
    }

    try {
      const response = await fetch(`/api/business/addons`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_id: provider!.provider!.business_id!,
          addon_id: addonId,
          custom_price: updates.custom_price,
          is_available: updates.is_available
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to update addon';
        try {
          const errorData = await safeJsonParse(response, 'update addon error');
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          console.warn('Could not parse error response from update addon API');
        }
        throw new Error(errorMessage);
      }

      // Reload addons to get updated data
      await loadAddonsData();

    } catch (error) {
      console.error('Error updating addon:', error);
      throw error;
    }
  };

  const toggleAddonStatus = async (addonId: string, isAvailable: boolean): Promise<void> => {
    try {
      await updateAddon(addonId, { is_available: isAvailable });
    } catch (error) {
      console.error('Error toggling addon status:', error);
      throw error;
    }
  };

  useEffect(() => {
    // Only load addons data if the provider is ready
    if (isProviderReady()) {
      loadAddonsData();
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
    eligibleAddons,
    addonStats,
    loading,
    error,
    actions: {
      loadAddonsData,
      updateAddon,
      toggleAddonStatus,
    }
  };
}
