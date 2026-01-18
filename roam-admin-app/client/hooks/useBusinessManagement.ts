import { useState, useEffect, useCallback } from "react";
import { useDataCache } from "./useDataCache";
import { useToast } from "./use-toast";

// Local type definitions (matches database schema - avoids stale dist issue)
type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
type BusinessType = 'independent' | 'business';
type ServiceCategoryType = "beauty" | "fitness" | "therapy" | "healthcare";
type ServiceSubcategoryType = "hair_and_makeup" | "spray_tan" | "esthetician" | "massage_therapy" | "iv_therapy" | "physical_therapy" | "nurse_practitioner" | "physician" | "chiropractor" | "yoga_instructor" | "pilates_instructor" | "personal_trainer" | "injectables" | "health_coach";
type ProviderVerificationStatus = 'pending' | 'documents_submitted' | 'under_review' | 'approved' | 'rejected';
type BackgroundCheckStatus = 'under_review' | 'pending' | 'approved' | 'rejected' | 'expired';
type BusinessDocumentStatus = 'pending' | 'verified' | 'rejected' | 'under_review';
type ProviderRole = 'provider' | 'owner' | 'dispatcher';
type DeliveryType = 'business_location' | 'customer_location' | 'virtual' | 'both_locations';

// Local type aliases for convenience
type DocumentVerificationStatus = BusinessDocumentStatus;

// Interfaces
export interface BusinessProfile {
  id: string;
  business_name: string;
  contact_email: string | null;
  phone: string | null;
  verification_status: VerificationStatus;
  stripe_account_id: string | null;
  is_active: boolean;
  created_at: string;
  image_url: string | null;
  website_url: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  business_hours: Record<string, any> | string | null;
  social_media: Record<string, any> | null;
  verification_notes: string | null;
  business_type: BusinessType;
  service_categories: ServiceCategoryType[] | null;
  service_subcategories: ServiceSubcategoryType[] | null;
  is_featured: boolean | null;
  setup_completed: boolean | null;
  setup_step: number | null;
  identity_verified: boolean | null;
  identity_verified_at: string | null;
  bank_connected: boolean | null;
  bank_connected_at: string | null;
  application_submitted_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  approval_notes: string | null;
  business_description: string | null;
}

export interface BusinessLocation {
  id: string;
  business_id: string;
  location_name: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  created_at: string;
  is_primary: boolean | null;
  offers_mobile_services: boolean | null;
  mobile_service_radius: number | null;
}

export interface BusinessService {
  id: string;
  business_id: string;
  service_id: string;
  business_price: number;
  business_duration_minutes: number | null;
  is_active: boolean;
  created_at: string;
  delivery_type: DeliveryType | null;
  services?: {
    id: string;
    name: string;
    duration_minutes: number;
    min_price: number;
    description: string | null;
  };
}

export interface BusinessServiceCategory {
  id: string;
  business_id: string;
  category_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  service_categories?: {
    id: string;
    service_category_type: string;
    description: string | null;
  };
}

export interface BusinessServiceSubcategory {
  id: string;
  business_id: string;
  category_id: string | null;
  subcategory_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  service_categories?: {
    id: string;
    service_category_type: string;
    description: string | null;
  };
  service_subcategories?: {
    id: string;
    service_subcategory_type: string;
    description: string | null;
  };
}

export interface Provider {
  id: string;
  user_id?: string;
  business_id: string;
  business_name: string;
  location_id?: string;
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  bio?: string;
  image_url?: string;
  is_active: boolean;
  created_at: string;
  date_of_birth?: string;
  experience_years?: number;
  verification_status: ProviderVerificationStatus;
  background_check_status: BackgroundCheckStatus;
  provider_role: ProviderRole;
  business_managed: boolean;
  notification_email?: string | null;
  notification_phone?: string | null;
  total_bookings: number;
  completed_bookings: number;
  average_rating: number;
  total_reviews: number;
}

export interface BusinessDocument {
  id: string;
  business_id: string;
  business_name: string;
  document_type: string;
  document_name: string;
  file_url: string;
  file_size_bytes?: number;
  verification_status: DocumentVerificationStatus;
  verified_by?: string;
  verified_at?: string;
  rejection_reason?: string;
  expiry_date?: string;
  created_at: string;
}

// Filter types
export interface BusinessFilters {
  statusFilter: "all" | "active" | "inactive";
  verificationFilter: "all" | "verified" | "unverified";
  businessTypeFilter: "all" | BusinessType;
  featuredFilter: "all" | "featured" | "not_featured";
}

// Hook return type
export interface UseBusinessManagementReturn {
  // Data
  businesses: BusinessProfile[];
  businessLocations: BusinessLocation[];
  businessServices: BusinessService[];
  businessServiceCategories: BusinessServiceCategory[];
  businessServiceSubcategories: BusinessServiceSubcategory[];
  providers: Provider[];
  filteredBusinesses: BusinessProfile[];
  
  // Loading/error states
  loading: boolean;
  error: string | null;
  saving: boolean;
  
  // Selected items
  selectedBusinesses: string[];
  setSelectedBusinesses: React.Dispatch<React.SetStateAction<string[]>>;
  selectedBusiness: BusinessProfile | null;
  setSelectedBusiness: React.Dispatch<React.SetStateAction<BusinessProfile | null>>;
  
  // Filters
  filters: BusinessFilters;
  setStatusFilter: (status: "all" | "active" | "inactive") => void;
  setVerificationFilter: (status: "all" | "verified" | "unverified") => void;
  setBusinessTypeFilter: (type: "all" | BusinessType) => void;
  setFeaturedFilter: (status: "all" | "featured" | "not_featured") => void;
  
  // Actions
  fetchBusinesses: (forceRefresh?: boolean) => Promise<void>;
  fetchBusinessLocations: (forceRefresh?: boolean) => Promise<void>;
  fetchBusinessServices: (forceRefresh?: boolean) => Promise<void>;
  fetchProviders: (forceRefresh?: boolean) => Promise<void>;
  fetchBusinessServiceCategories: (businessId?: string) => Promise<void>;
  fetchBusinessServiceSubcategories: (businessId?: string) => Promise<void>;
  refreshAll: (forceRefresh?: boolean) => Promise<void>;
  
  // Business operations
  updateBusiness: (id: string, data: Partial<BusinessProfile>) => Promise<boolean>;
  toggleBusinessStatus: (business: BusinessProfile) => Promise<boolean>;
  toggleBusinessFeatured: (business: BusinessProfile) => Promise<boolean>;
  approveBusiness: (business: BusinessProfile, notes?: string) => Promise<boolean>;
  rejectBusiness: (business: BusinessProfile, reason: string) => Promise<boolean>;
  
  // Stats
  stats: {
    total: number;
    active: number;
    inactive: number;
    pending: number;
    approved: number;
    rejected: number;
    featured: number;
  };
}

export function useBusinessManagement(): UseBusinessManagementReturn {
  const { toast } = useToast();
  const cache = useDataCache();
  
  // Data states
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [businessLocations, setBusinessLocations] = useState<BusinessLocation[]>([]);
  const [businessServices, setBusinessServices] = useState<BusinessService[]>([]);
  const [businessServiceCategories, setBusinessServiceCategories] = useState<BusinessServiceCategory[]>([]);
  const [businessServiceSubcategories, setBusinessServiceSubcategories] = useState<BusinessServiceSubcategory[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  
  // Loading/error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Selection states
  const [selectedBusinesses, setSelectedBusinesses] = useState<string[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessProfile | null>(null);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [verificationFilter, setVerificationFilter] = useState<"all" | "verified" | "unverified">("all");
  const [businessTypeFilter, setBusinessTypeFilter] = useState<"all" | BusinessType>("all");
  const [featuredFilter, setFeaturedFilter] = useState<"all" | "featured" | "not_featured">("all");
  
  // Fetch functions
  const fetchBusinesses = useCallback(async (forceRefresh = false) => {
    try {
      if (!forceRefresh && !cache.shouldRefetch('businesses')) {
        const cached = cache.getCachedData('businesses');
        if (cached) {
          setBusinesses(cached);
          setLoading(false);
          return;
        }
      }

      setLoading(true);
      setError(null);

      const response = await fetch('/api/businesses');
      
      if (!response.ok) {
        const text = await response.text();
        let errorMessage = 'Failed to fetch businesses';
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          errorMessage = text || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const responseText = await response.text();
      if (!responseText || responseText.trim() === '') {
        throw new Error('Server returned empty response');
      }

      const result = JSON.parse(responseText);
      if (result.data) {
        setBusinesses(result.data || []);
        cache.setCachedData('businesses', result.data || []);
        if (result.data.length === 0) {
          setError("API connected successfully but no business records found.");
        }
      } else {
        setError("No data received from API");
        setBusinesses([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      setError(`Connection Error: ${errorMessage}`);
      setBusinesses([]);
    } finally {
      setLoading(false);
    }
  }, [cache]);

  const fetchBusinessLocations = useCallback(async (forceRefresh = false) => {
    try {
      if (!forceRefresh && !cache.shouldRefetch('businessLocations')) {
        const cached = cache.getCachedData('businessLocations');
        if (cached) {
          setBusinessLocations(cached);
          return;
        }
      }

      const response = await fetch('/api/business-locations');
      const result = await response.json();

      if (!response.ok) {
        console.error("Business locations error:", result.error);
        setBusinessLocations([]);
      } else {
        setBusinessLocations(result.data || []);
        cache.setCachedData('businessLocations', result.data || []);
      }
    } catch (err) {
      console.error("Unexpected error fetching business locations:", err);
      setBusinessLocations([]);
    }
  }, [cache]);

  const fetchBusinessServices = useCallback(async (forceRefresh = false) => {
    try {
      if (!forceRefresh && !cache.shouldRefetch('businessServices')) {
        const cached = cache.getCachedData('businessServices');
        if (cached) {
          setBusinessServices(cached);
          return;
        }
      }

      const response = await fetch('/api/business-services');
      const result = await response.json();

      if (!response.ok) {
        console.error("Business services error:", result.error);
        setBusinessServices([]);
      } else {
        setBusinessServices(result.data || []);
        cache.setCachedData('businessServices', result.data || []);
      }
    } catch (err) {
      console.error("Unexpected error fetching business services:", err);
      setBusinessServices([]);
    }
  }, [cache]);

  const fetchProviders = useCallback(async (forceRefresh = false) => {
    try {
      if (!forceRefresh && !cache.shouldRefetch('providers')) {
        const cached = cache.getCachedData('providers');
        if (cached) {
          setProviders(cached);
          return;
        }
      }

      const response = await fetch('/api/providers');
      const result = await response.json();

      if (!response.ok) {
        console.error("Providers error:", result.error);
        setProviders([]);
      } else {
        setProviders(result.data || []);
        cache.setCachedData('providers', result.data || []);
      }
    } catch (err) {
      console.error("Unexpected error fetching providers:", err);
      setProviders([]);
    }
  }, [cache]);

  const fetchBusinessServiceCategories = useCallback(async (businessId?: string) => {
    try {
      if (!businessId) {
        setBusinessServiceCategories([]);
        return;
      }

      const response = await fetch(`/api/business-service-categories?businessId=${businessId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch business service categories');
      }

      const { data } = await response.json();
      setBusinessServiceCategories(data || []);
    } catch (err) {
      console.error("Error fetching business service categories:", err);
      setBusinessServiceCategories([]);
    }
  }, []);

  const fetchBusinessServiceSubcategories = useCallback(async (businessId?: string) => {
    try {
      if (!businessId) {
        setBusinessServiceSubcategories([]);
        return;
      }

      const response = await fetch(`/api/business-service-subcategories?businessId=${businessId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch business service subcategories');
      }

      const { data } = await response.json();
      setBusinessServiceSubcategories(data || []);
    } catch (err) {
      console.error("Error fetching business service subcategories:", err);
      setBusinessServiceSubcategories([]);
    }
  }, []);

  const refreshAll = useCallback(async (forceRefresh = true) => {
    setLoading(true);
    await Promise.all([
      fetchBusinesses(forceRefresh),
      fetchBusinessLocations(forceRefresh),
      fetchBusinessServices(forceRefresh),
      fetchProviders(forceRefresh),
    ]);
    setLoading(false);
  }, [fetchBusinesses, fetchBusinessLocations, fetchBusinessServices, fetchProviders]);

  // Business operations
  const updateBusiness = useCallback(async (id: string, data: Partial<BusinessProfile>): Promise<boolean> => {
    setSaving(true);
    try {
      const response = await fetch(`/api/businesses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update business');
      }

      // Refresh businesses
      await fetchBusinesses(true);
      
      toast({
        title: "Success",
        description: "Business updated successfully",
      });
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    } finally {
      setSaving(false);
    }
  }, [fetchBusinesses, toast]);

  const toggleBusinessStatus = useCallback(async (business: BusinessProfile): Promise<boolean> => {
    return updateBusiness(business.id, { is_active: !business.is_active });
  }, [updateBusiness]);

  const toggleBusinessFeatured = useCallback(async (business: BusinessProfile): Promise<boolean> => {
    return updateBusiness(business.id, { is_featured: !business.is_featured });
  }, [updateBusiness]);

  const approveBusiness = useCallback(async (business: BusinessProfile, notes?: string): Promise<boolean> => {
    return updateBusiness(business.id, {
      verification_status: 'approved',
      approval_notes: notes,
      approved_at: new Date().toISOString(),
    });
  }, [updateBusiness]);

  const rejectBusiness = useCallback(async (business: BusinessProfile, reason: string): Promise<boolean> => {
    return updateBusiness(business.id, {
      verification_status: 'rejected',
      verification_notes: reason,
    });
  }, [updateBusiness]);

  // Filter businesses
  const filteredBusinesses = businesses.filter((business) => {
    // Status filter
    if (statusFilter === "active" && !business.is_active) return false;
    if (statusFilter === "inactive" && business.is_active) return false;

    // Verification filter
    if (verificationFilter === "verified" && business.verification_status !== "approved") return false;
    if (verificationFilter === "unverified" && business.verification_status === "approved") return false;

    // Business type filter
    if (businessTypeFilter !== "all" && business.business_type !== businessTypeFilter) return false;

    // Featured filter
    if (featuredFilter === "featured" && !business.is_featured) return false;
    if (featuredFilter === "not_featured" && business.is_featured) return false;

    return true;
  });

  // Calculate stats
  const stats = {
    total: businesses.length,
    active: businesses.filter(b => b.is_active).length,
    inactive: businesses.filter(b => !b.is_active).length,
    pending: businesses.filter(b => b.verification_status === 'pending').length,
    approved: businesses.filter(b => b.verification_status === 'approved').length,
    rejected: businesses.filter(b => b.verification_status === 'rejected').length,
    featured: businesses.filter(b => b.is_featured).length,
  };

  // Initial fetch
  useEffect(() => {
    refreshAll(false);
  }, []);

  return {
    // Data
    businesses,
    businessLocations,
    businessServices,
    businessServiceCategories,
    businessServiceSubcategories,
    providers,
    filteredBusinesses,
    
    // Loading/error states
    loading,
    error,
    saving,
    
    // Selected items
    selectedBusinesses,
    setSelectedBusinesses,
    selectedBusiness,
    setSelectedBusiness,
    
    // Filters
    filters: {
      statusFilter,
      verificationFilter,
      businessTypeFilter,
      featuredFilter,
    },
    setStatusFilter,
    setVerificationFilter,
    setBusinessTypeFilter,
    setFeaturedFilter,
    
    // Actions
    fetchBusinesses,
    fetchBusinessLocations,
    fetchBusinessServices,
    fetchProviders,
    fetchBusinessServiceCategories,
    fetchBusinessServiceSubcategories,
    refreshAll,
    
    // Business operations
    updateBusiness,
    toggleBusinessStatus,
    toggleBusinessFeatured,
    approveBusiness,
    rejectBusiness,
    
    // Stats
    stats,
  };
}

// Re-export types from @roam/shared for convenience
export type {
  VerificationStatus,
  DeliveryType,
  BusinessType,
  ServiceCategoryType,
  ServiceSubcategoryType,
  ProviderVerificationStatus,
  BackgroundCheckStatus,
  ProviderRole,
} from "@roam/shared";

// Helper functions
export const formatEnumDisplay = (enumValue: string): string => {
  return enumValue
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const getVerificationBadgeVariant = (status: VerificationStatus) => {
  switch (status) {
    case "approved":
      return "success" as const;
    case "pending":
      return "secondary" as const;
    case "suspended":
      return "warning" as const;
    case "rejected":
      return "danger" as const;
    default:
      return "secondary" as const;
  }
};

export const getBusinessTypeBadgeVariant = (type: BusinessType) => {
  switch (type) {
    case "business":
      return "secondary" as const;
    case "independent":
      return "outline" as const;
    default:
      return "secondary" as const;
  }
};

export const parseBusinessHours = (
  businessHours: Record<string, any> | string | null
): Record<string, any> | null => {
  if (!businessHours) return null;
  if (typeof businessHours === "string") {
    try {
      return JSON.parse(businessHours);
    } catch {
      return null;
    }
  }
  if (typeof businessHours === "object") {
    return businessHours;
  }
  return null;
};
