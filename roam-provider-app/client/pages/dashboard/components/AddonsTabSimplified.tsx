import React, { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useSimplifiedAddons } from '@/hooks/addons/useSimplifiedAddons';
import { AddonFilters, EligibleAddon } from '@/types/addons';
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
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

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
