// Common type definitions for the customer app

import type { Database } from "@roam/shared";

// Database table row types
export type BusinessProfile = Database['public']['Tables']['business_profiles']['Row'];
export type Service = Database['public']['Tables']['services']['Row'];
export type Booking = Database['public']['Tables']['bookings']['Row'];
export type CustomerProfile = Database['public']['Tables']['customer_profiles']['Row'];
export type Provider = Database['public']['Tables']['providers']['Row'];

// UI-specific types
export interface FeaturedService {
  id: string;
  name: string;
  category: string;
  description: string;
  price_min: number;
  price_max: number;
  duration: string;
  location_type: string;
  image_url?: string;
  rating?: number;
  reviews_count?: number;
  provider_name?: string;
  provider_id?: string;
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
  savingsType: string;
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
  // Additional computed properties for UI
  status?: string; // Alias for booking_status
  date?: string; // Alias for booking_date
  time?: string; // Alias for start_time
  serviceName?: string; // Computed from services.name
  provider?: Provider; // Alias for providers
  service?: Service; // Alias for services
  price?: string; // Alias for total_amount
  duration?: string; // Service duration
  booking_time?: string; // Alias for start_time
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
