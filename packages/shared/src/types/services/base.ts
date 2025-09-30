// Core service types shared across all ROAM applications
// This provides a unified foundation for service data handling

export type DeliveryType = 'customer_location' | 'business_location' | 'mobile';
export type ServiceStatus = 'active' | 'inactive' | 'draft' | 'archived';

// Base service interface - common fields across all contexts
export interface UnifiedServiceBase {
  id: string;
  name: string;
  description: string | null;
  min_price: number;
  max_price?: number | null;
  duration_minutes: number;
  image_url: string | null;
  is_active: boolean;
  is_featured: boolean;
  is_popular: boolean;
  created_at: string;
  updated_at: string | null;
}

// Service category structure
export interface ServiceCategory {
  id: string;
  service_category_type: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number | null;
  image_url: string | null;
  created_at: string;
}

// Service subcategory structure  
export interface ServiceSubcategory {
  id: string;
  category_id: string;
  service_subcategory_type: string;
  name: string;
  description: string | null;
  is_active: boolean;
  image_url: string | null;
  created_at: string;
  service_categories?: ServiceCategory;
}

// Business profile structure for service context
export interface ServiceBusinessProfile {
  id: string;
  business_name: string;
  business_type: string;
  logo_url: string | null;
  image_url: string | null;
  verification_status: string;
  is_active: boolean;
  contact_email: string | null;
  phone: string | null;
  website_url: string | null;
}

// Provider profile for customer-facing services
export interface ServiceProvider {
  id: string;
  user_id: string;
  business_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  image_url: string | null;
  bio: string | null;
  is_active: boolean;
  provider_role: 'owner' | 'dispatcher' | 'provider';
}

// Service statistics for analytics
export interface ServiceStats {
  total_services: number;
  active_services: number;
  inactive_services: number;
  featured_services: number;
  total_bookings: number;
  total_revenue: number;
  avg_price: number;
  avg_duration: number;
}

// Pagination and filtering options
export interface ServiceQueryOptions {
  // Filtering
  businessId?: string;
  categoryId?: string;
  subcategoryId?: string;
  featured?: boolean;
  popular?: boolean;
  active?: boolean;
  deliveryType?: DeliveryType;
  
  // Search
  searchQuery?: string;
  
  // Pagination
  page?: number;
  limit?: number;
  offset?: number;
  
  // Sorting
  sortBy?: 'name' | 'price' | 'duration' | 'created_at' | 'popularity' | 'sort_order';
  sortOrder?: 'asc' | 'desc';
  
  // Includes
  includeBusinessProfile?: boolean;
  includeProviders?: boolean;
  includeCategories?: boolean;
  includeStats?: boolean;
}

// API response wrapper
export interface ServiceApiResponse<T> {
  data: T[];
  total: number;
  page?: number;
  limit?: number;
  error?: string;
  success: boolean;
  message?: string;
}

// Form data interfaces
export interface ServiceFormData {
  name: string;
  description: string;
  min_price: number;
  max_price?: number;
  duration_minutes: number;
  image_url?: string;
  is_active: boolean;
  is_featured: boolean;
  subcategory_id: string;
}

export interface BusinessServiceFormData {
  service_id: string;
  business_price: number;
  delivery_type: DeliveryType;
  is_active: boolean;
  custom_duration?: number;
}

// Error types
export interface ServiceError {
  code: string;
  message: string;
  field?: string;
  context?: string;
}