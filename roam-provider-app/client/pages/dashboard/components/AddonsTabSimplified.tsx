import React, { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Puzzle } from 'lucide-react';
import { useSimplifiedAddons } from '@/hooks/addons/useSimplifiedAddons';
import { AddonFilters, EligibleAddon } from '@/types/addons';
import { AddonStatsSection } from './addons/AddonStatsSection';
import { AddonFiltersSection } from './addons/AddonFiltersSection';
import { SimplifiedAddonListSection } from './addons/SimplifiedAddonListSection';
import { EditAddonModal } from './addons/EditAddonModal';

interface AddonsTabSimplifiedProps {
  providerData?: any;
  business?: any;
}

export default function AddonsTabSimplified({
  providerData,
  business,
}: AddonsTabSimplifiedProps) {
  const {
    eligibleAddons,
    addonStats,
    loading,
    error,
    actions
  } = useSimplifiedAddons();

  const [filters, setFilters] = useState<AddonFilters>({
    searchQuery: '',
    filterStatus: 'all',
    page: 1,
    itemsPerPage: 50,
  });

  const [editingAddon, setEditingAddon] = useState<EligibleAddon | null>(null);

  // Filter addons based on current filters
  const filteredAddons = eligibleAddons.filter(addon => {
    // Search filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const addonName = addon.name?.toLowerCase() || '';
      const addonDesc = addon.description?.toLowerCase() || '';
      
      if (!addonName.includes(query) && !addonDesc.includes(query)) {
        return false;
      }
    }

    // Status filter
    if (filters.filterStatus === 'active' && !addon.is_available) {
      return false;
    }
    if (filters.filterStatus === 'inactive' && addon.is_available) {
      return false;
    }

    return true;
  });

  const handleEdit = (addon: EligibleAddon) => {
    setEditingAddon(addon);
  };

  const handleToggleStatus = async (addonId: string, isAvailable: boolean) => {
    try {
      await actions.toggleAddonStatus(addonId, isAvailable);
    } catch (error) {
      console.error('Failed to toggle addon status:', error);
    }
  };

  const handleSaveAddon = async (addonForm: any) => {
    try {
      await actions.updateAddon(addonForm.addon_id, {
        custom_price: parseFloat(addonForm.custom_price),
        is_available: addonForm.is_available
      });
      setEditingAddon(null);
    } catch (error) {
      console.error('Failed to update addon:', error);
      throw error;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 rounded-lg p-3">
          <Puzzle className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Service Add-ons</h2>
          <p className="text-muted-foreground">
            Manage add-ons available for your services
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

      {/* Addon Stats */}
      <AddonStatsSection stats={addonStats} />

      {/* Filters */}
      <AddonFiltersSection
        filters={filters}
        onFiltersChange={setFilters}
        onRefresh={actions.loadAddonsData}
      />

      {/* Addon List */}
      <SimplifiedAddonListSection
        addons={filteredAddons}
        loading={loading}
        onToggleStatus={handleToggleStatus}
        onEdit={handleEdit}
      />

      {/* Edit Addon Modal */}
      {editingAddon && (
        <EditAddonModal
          addon={editingAddon}
          onSave={handleSaveAddon}
          onClose={() => setEditingAddon(null)}
          loading={false}
        />
      )}
    </div>
  );
}
