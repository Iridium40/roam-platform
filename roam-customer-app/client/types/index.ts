// Common type definitions for the customer app

import type { Database } from "@roam/shared";

// Database table row types
export type BusinessProfile = Database['public']['Tables']['business_profiles']['Row'];
export type Service = Database['public']['Tables']['services']['Row'];
export type Booking = Database['public']['Tables']['bookings']['Row'];
export type CustomerProfile = Database['public']['Tables']['customer_profiles']['Row'];
export type Provider = Database['public']['Tables']['providers']['Row'];
export type Review = Database['public']['Tables']['reviews']['Row'];
export type Tip = Database['public']['Tables']['tips']['Row'];

// UI-specific types
export interface FeaturedService {
  id: string;
  name?: string;
  title: string; // Display name for UI
  category: string;
  description: string;
  price: string; // Formatted price string (e.g., "$50")
  image: string; // Image URL for display
  duration: string;
  rating?: number;
  // Legacy/optional fields
  price_min?: number;
  price_max?: number;
  location_type?: string;
  image_url?: string;
  reviews_count?: number;
  provider_name?: string;
  provider_id?: string;
}

// Supabase query result types for Index page
export interface ServiceQueryResult {
  id: string;
  name: string;
  description: string | null;
  min_price: number | null;
  duration_minutes: number | null;
  image_url: string | null;
  is_active: boolean | null;
  is_featured?: boolean | null;
  is_popular?: boolean | null;
  subcategory_id: string | null;
  service_subcategories: {
    id: string;
    service_subcategory_type: string;
    service_categories: {
      id: string;
      service_category_type: string;
    } | null;
  } | null;
}

export interface BusinessServiceQueryResult {
  is_active: boolean;
  services: {
    service_subcategories: {
      service_subcategory_type: string;
    } | null;
  } | null;
}

export interface BusinessQueryResult {
  id: string;
  business_name: string;
  description: string | null;
  logo_url: string | null;
  image_url: string | null;
  business_type: string | null;
  is_featured: boolean | null;
  is_active: boolean | null;
  business_locations: Array<{
    city: string | null;
    state: string | null;
  }> | null;
  business_services: BusinessServiceQueryResult[] | null;
}

export interface PromotionQueryResult {
  id: string;
  title: string | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean | null;
  created_at: string | null;
  business_id: string | null;
  image_url: string | null;
  promo_code: string | null;
  discount_type: string | null;
  discount_value: number | null;
  max_discount: number | null;
  service_id: string | null;
  business_profiles: {
    id: string;
    business_name: string;
    logo_url: string | null;
    business_type: string | null;
  } | null;
  services: {
    id: string;
    name: string;
    min_price: number | null;
  } | null;
}

export interface PopularService extends FeaturedService {
  popularity_score?: number;
}

export interface FeaturedBusiness {
  id: string;
  name: string;
  type: string;
  description: string;
  image_url?: string;
  logo_url?: string;
  rating?: number;
  reviews_count?: number;
  services_count?: number;
  location?: string;
  is_verified?: boolean;
}

export interface Promotion {
  id: string;
  title: string;
  description: string;
  discount_type: 'percentage' | 'fixed_amount' | 'free_service';
  discount_value: number;
  valid_from: string;
  valid_until: string;
  image_url?: string;
  provider_name?: string;
  provider_id?: string;
  terms_conditions?: string;
}

// Transformed promotion data structure used in the UI
export interface TransformedPromotion {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  businessId: string;
  imageUrl: string;
  promoCode: string;
  savingsType: 'percentage_off' | 'fixed_amount';
  savingsAmount: number;
  savingsMaxAmount: number;
  serviceId: string;
  business?: {
    id: string;
    name: string;
    logo: string;
    type: string;
  };
  service?: {
    id: string;
    name: string;
    minPrice: number;
  };
}

// Component prop types
export interface ServiceCardProps {
  service: FeaturedService;
  onFavorite?: (serviceId: string) => void;
  isFavorite?: boolean;
}

export interface BusinessCardProps {
  business: FeaturedBusiness;
  onShare?: (business: FeaturedBusiness) => void;
  onFavorite?: (businessId: string) => void;
  isFavorite?: boolean;
}

export interface PromotionCardProps {
  promotion: Promotion;
  onClaim?: (promotionId: string) => void;
}

// Booking related types
export interface BookingWithDetails extends Booking {
  customer_profiles?: CustomerProfile;
  providers?: Provider;
  services?: Service;
  business_profiles?: BusinessProfile;
  reviews?: Review[];
  tips?: Tip[];
  // Additional computed properties for UI
  status?: string; // Alias for booking_status
  date?: string; // Alias for booking_date
  time?: string; // Alias for start_time
  service_name?: string; // Computed from services.name
  serviceName?: string; // Computed from services.name
  provider?: Provider; // Alias for providers
  service?: Service; // Alias for services
  price?: string; // Alias for total_amount
  duration?: string; // Service duration
  booking_time?: string; // Alias for start_time
  booking_reference?: string; // Alias for booking_reference
  admin_notes?: string; // Alias for admin_notes
  total_amount?: number; // Alias for total_amount
  business_id?: string; // Alias for business_id
  customer_id?: string; // Alias for customer_id
}

// Filter types
export interface ServiceFilters {
  searchQuery: string;
  category: string;
  deliveryType: string;
  priceRange?: {
    min: number;
    max: number;
  };
  rating?: number;
}

// Auth types
export interface AuthCustomer extends CustomerProfile {
  // Additional fields that might be added in auth context
  isVerified?: boolean;
  lastSignIn?: string;
}

// Pagination types
export interface PaginationState {
  upcoming: number;
  active: number;
  past: number;
}

// Modal types
export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab: 'signin' | 'signup';
}

export interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  providerName: string;
  providerTitle: string;
  pageUrl: string;
}

// Error types
export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

export interface FormErrors {
  [key: string]: string[];
}

// Generic component types
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface ComponentProps {
  className?: string;
  children?: React.ReactNode;
}

// Review and Tip form types
export interface ReviewFormData {
  overall_rating: number;
  service_rating?: number;
  communication_rating?: number;
  punctuality_rating?: number;
  review_text?: string;
}

export interface TipFormData {
  tip_amount: number;
  tip_percentage?: number;
  customer_message?: string;
}
