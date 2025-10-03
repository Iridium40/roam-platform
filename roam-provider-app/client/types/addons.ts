// Addon type definitions

export interface BusinessAddon {
  id: string;
  business_id: string;
  addon_id: string;
  custom_price: number | null;
  is_available: boolean;
  created_at: string;
  service_addons?: {
    id: string;
    name: string;
    description: string;
    image_url?: string;
    is_active: boolean;
  };
}

export interface EligibleAddon {
  id: string;
  name: string;
  description: string;
  image_url?: string;
  is_active: boolean;
  // Business configuration fields (when addon is configured for this business)
  is_configured?: boolean;
  custom_price?: number | null;
  is_available?: boolean | null;
  // Related services that can use this addon
  compatible_service_count?: number;
  compatible_services?: string[];
}

export interface AddonStats {
  total_addons: number;
  available_addons: number;
  total_revenue: number;
  avg_price: number;
}

export interface AddonFormData {
  addon_id: string;
  custom_price: string;
  is_available: boolean;
}

export interface AddonFilters {
  searchQuery: string;
  filterStatus: 'all' | 'active' | 'inactive';
  page: number;
  itemsPerPage: number;
}
