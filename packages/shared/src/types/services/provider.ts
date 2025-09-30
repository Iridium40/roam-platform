// Provider app specific service interfaces
import {
  UnifiedServiceBase,
  DeliveryType,
  ServiceSubcategory,
  ServiceStats
} from './base';

// Business service interface for provider management
export interface ProviderService extends UnifiedServiceBase {
  business_id: string;
  service_id: string;
  business_price: number;
  delivery_type: DeliveryType | null;
  custom_duration?: number | null;
  is_available: boolean;
  created_at: string;
  updated_at: string | null;
  
  // Joined data
  services?: UnifiedServiceBase & {
    service_subcategories?: ServiceSubcategory;
  };
}

// Eligible service interface for adding new services
export interface EligibleService extends UnifiedServiceBase {
  subcategory_id: string;
  service_subcategories?: ServiceSubcategory;
  
  // Provider-specific flags
  is_already_offered?: boolean;
  recommended_price?: number;
}

// Provider service statistics
export interface ProviderServiceStats extends ServiceStats {
  business_id: string;
  revenue_this_month: number;
  revenue_last_month: number;
  bookings_this_month: number;
  bookings_last_month: number;
  top_performing_service?: {
    id: string;
    name: string;
    revenue: number;
    bookings: number;
  };
}

// Service assignment interface
export interface ServiceAssignment {
  id: string;
  business_id: string;
  service_id: string;
  provider_id?: string;
  business_price: number;
  delivery_type: DeliveryType;
  is_active: boolean;
  is_available: boolean;
  custom_duration?: number;
  notes?: string;
  created_at: string;
  updated_at: string | null;
}

// Provider service filters specific to business management
export interface ProviderServiceFilters {
  searchQuery: string;
  status: 'all' | 'active' | 'inactive';
  deliveryType: 'all' | DeliveryType;
  category: string;
  subcategory: string;
  priceRange: {
    min?: number;
    max?: number;
  };
}

// Service performance metrics
export interface ServicePerformance {
  service_id: string;
  service_name: string;
  total_bookings: number;
  total_revenue: number;
  avg_rating: number;
  completion_rate: number;
  cancellation_rate: number;
  repeat_customer_rate: number;
  avg_booking_value: number;
  trend: 'up' | 'down' | 'stable';
  period: {
    start_date: string;
    end_date: string;
  };
}