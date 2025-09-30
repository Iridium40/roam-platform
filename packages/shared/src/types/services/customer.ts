// Customer app specific service interfaces
import {
  UnifiedServiceBase,
  DeliveryType,
  ServiceBusinessProfile,
  ServiceProvider,
  ServiceSubcategory
} from './base';

// Customer-facing service interface
export interface CustomerService extends UnifiedServiceBase {
  // Business information
  business_profiles: ServiceBusinessProfile;
  
  // Delivery and availability
  location_type: string;
  delivery_types: DeliveryType[];
  available_providers?: ServiceProvider[];
  
  // Customer-specific metrics
  popularity_score?: number;
  avg_rating?: number;
  total_reviews?: number;
  completion_rate?: number;
  
  // Pricing for customer display
  price_range: {
    min: number;
    max: number;
  };
  
  // Availability
  is_available: boolean;
  next_available_slot?: string;
  estimated_wait_time?: number;
  
  // Category information
  category: string;
  subcategory: string;
  service_subcategories?: ServiceSubcategory;
}

// Featured service for homepage display
export interface FeaturedService extends CustomerService {
  featured_rank: number;
  featured_image_url?: string;
  promotional_text?: string;
  discount_percentage?: number;
}

// Popular service with trending data
export interface PopularService extends CustomerService {
  popularity_rank: number;
  weekly_bookings: number;
  trending_score: number;
  growth_rate: number;
}

// Service search result
export interface ServiceSearchResult extends CustomerService {
  relevance_score: number;
  matched_fields: string[];
  distance_km?: number;
  estimated_travel_time?: number;
}

// Service booking preview
export interface ServiceBookingPreview {
  service_id: string;
  service_name: string;
  business_id: string;
  business_name: string;
  provider_id?: string;
  provider_name?: string;
  price: number;
  duration_minutes: number;
  delivery_type: DeliveryType;
  estimated_total: number;
  taxes_fees: number;
  available_slots: string[];
  cancellation_policy: string;
  terms_conditions: string;
}

// Customer service filters
export interface CustomerServiceFilters {
  location: {
    latitude?: number;
    longitude?: number;
    radius_km?: number;
    address?: string;
  };
  price_range: {
    min?: number;
    max?: number;
  };
  availability: {
    date?: string;
    time_slots?: string[];
    flexible?: boolean;
  };
  categories: string[];
  delivery_types: DeliveryType[];
  rating_min?: number;
  sort_by: 'price' | 'rating' | 'distance' | 'popularity' | 'availability';
  sort_order: 'asc' | 'desc';
}

// Service recommendation
export interface ServiceRecommendation extends CustomerService {
  recommendation_score: number;
  recommendation_reason: 'previous_booking' | 'similar_customers' | 'location_based' | 'trending';
  confidence_level: 'high' | 'medium' | 'low';
}