// Customer app specific booking interfaces
// Customer-facing booking views and interactions

import {
  UnifiedBookingBase,
  BookingCustomerProfile,
  BookingProviderProfile,
  BookingBusinessProfile,
  BookingServiceProfile,
  BookingLocation,
  BookingStats
} from './base';

// Customer view of their bookings
export interface CustomerBooking extends UnifiedBookingBase {
  // Enhanced customer context
  customer_profiles?: BookingCustomerProfile;
  providers?: BookingProviderProfile & {
    business_profiles?: BookingBusinessProfile;
  };
  services?: BookingServiceProfile;
  customer_locations?: BookingLocation;
  business_locations?: BookingLocation;
  
  // Customer-specific computed fields
  display_name: string; // Provider or business name
  service_name: string;
  business_name: string;
  formatted_date: string;
  formatted_time: string;
  formatted_duration: string;
  formatted_price: string;
  time_until_booking?: string;
  can_cancel: boolean;
  can_reschedule: boolean;
  can_tip: boolean;
  
  // Customer UI states
  is_upcoming: boolean;
  is_past: boolean;
  is_today: boolean;
  needs_review: boolean;
  needs_tip: boolean;
  
  // Customer actions available
  available_actions: ('cancel' | 'reschedule' | 'tip' | 'review' | 'contact' | 'directions')[];
}

// Customer booking with review data
export interface CustomerBookingWithReview extends CustomerBooking {
  reviews?: {
    id: string;
    overall_rating: number;
    service_rating: number | null;
    communication_rating: number | null;
    punctuality_rating: number | null;
    review_text: string | null;
    created_at: string;
  }[];
  has_reviewed: boolean;
  can_review: boolean;
}

// Customer booking statistics
export interface CustomerBookingStats extends BookingStats {
  upcoming_bookings: number;
  past_bookings: number;
  favorite_services: string[];
  favorite_providers: string[];
  favorite_businesses: string[];
  total_savings: number;
  loyalty_points: number;
  membership_tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

// Customer booking history item
export interface CustomerBookingHistoryItem {
  id: string;
  service_name: string;
  provider_name: string;
  business_name: string;
  booking_date: string;
  total_amount: number;
  booking_status: string;
  payment_status: string;
  has_reviewed: boolean;
  rating?: number;
  was_favourite: boolean;
  repeat_booking_count: number;
}

// Customer booking preferences
export interface CustomerBookingPreferences {
  preferred_time_slots: string[];
  preferred_days: string[];
  preferred_providers: string[];
  preferred_businesses: string[];
  preferred_delivery_types: string[];
  auto_tip_percentage: number | null;
  reminder_preferences: {
    email_24h: boolean;
    email_1h: boolean;
    sms_24h: boolean;
    sms_1h: boolean;
    push_24h: boolean;
    push_1h: boolean;
  };
  privacy_settings: {
    share_location: boolean;
    allow_photos: boolean;
    allow_reviews: boolean;
  };
}

// Customer booking search filters
export interface CustomerBookingFilters {
  status: ('upcoming' | 'past' | 'cancelled')[];
  date_range: {
    start: string;
    end: string;
  } | null;
  services: string[];
  providers: string[];
  businesses: string[];
  price_range: {
    min: number;
    max: number;
  } | null;
  rating_filter: number | null;
  has_review: boolean | null;
}

// Customer booking creation flow
export interface CustomerBookingRequest {
  service_id: string;
  provider_id?: string; // Optional - system can assign
  booking_date: string;
  start_time: string;
  delivery_type: 'customer_location' | 'business_location' | 'mobile';
  customer_location_id?: string;
  business_location_id?: string;
  guest_booking?: {
    guest_name: string;
    guest_email: string;
    guest_phone: string;
  };
  special_instructions?: string;
  promotion_code?: string;
  preferred_provider_attributes?: {
    gender?: 'male' | 'female' | 'any';
    experience_level?: 'entry' | 'experienced' | 'expert' | 'any';
    languages?: string[];
    ratings_min?: number;
  };
}

// Customer booking confirmation details
export interface CustomerBookingConfirmation {
  booking: CustomerBooking;
  confirmation_code: string;
  estimated_arrival: string;
  provider_contact: {
    name: string;
    phone?: string;
    email?: string;
  };
  business_contact: {
    name: string;
    phone?: string;
    address?: string;
  };
  cancellation_policy: {
    free_cancellation_hours: number;
    cancellation_fee_percentage: number;
    no_show_fee: number;
  };
  next_steps: string[];
}

// Customer booking recommendations
export interface CustomerBookingRecommendation {
  type: 'repeat_service' | 'similar_service' | 'same_provider' | 'popular_combo';
  service: {
    id: string;
    name: string;
    description: string;
    price: number;
    duration: number;
    image_url?: string;
  };
  provider: {
    id: string;
    name: string;
    rating: number;
    business_name: string;
  };
  reason: string;
  discount?: {
    type: 'percentage' | 'fixed';
    amount: number;
    code?: string;
  };
  urgency: 'low' | 'medium' | 'high';
}

// Customer booking communication
export interface CustomerBookingMessage {
  id: string;
  booking_id: string;
  sender_type: 'customer' | 'provider' | 'business' | 'system';
  sender_name: string;
  message: string;
  message_type: 'text' | 'image' | 'location' | 'system_update';
  sent_at: string;
  read_at?: string;
  is_automated: boolean;
}

// Customer booking tracking
export interface CustomerBookingTracking {
  booking_id: string;
  current_status: string;
  status_history: {
    status: string;
    timestamp: string;
    message: string;
    updated_by: 'customer' | 'provider' | 'business' | 'system';
  }[];
  provider_location?: {
    latitude: number;
    longitude: number;
    last_updated: string;
    estimated_arrival?: string;
  };
  timeline: {
    booking_confirmed: string;
    provider_assigned?: string;
    provider_en_route?: string;
    service_started?: string;
    service_completed?: string;
  };
}