// Core booking types shared across all ROAM applications
// Unified foundation for booking data handling

import type { 
  BookingStatus, 
  PaymentStatus, 
  TipStatus, 
  DeliveryType 
} from '../database/enums';

// Base booking interface - common fields across all contexts
export interface UnifiedBookingBase {
  id: string;
  customer_id: string | null;
  provider_id: string;
  service_id: string;
  business_id: string;
  booking_date: string;
  start_time: string;
  total_amount: number;
  service_fee: number;
  payment_status: PaymentStatus;
  booking_status: BookingStatus;
  delivery_type: DeliveryType;
  created_at: string;
  updated_at?: string | null;
  
  // Guest booking support
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  
  // Financial tracking
  service_fee_charged: boolean;
  service_fee_charged_at: string | null;
  remaining_balance: number;
  remaining_balance_charged: boolean;
  remaining_balance_charged_at: string | null;
  
  // Cancellation and refunds
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  cancellation_fee: number;
  refund_amount: number;
  
  // Tips
  tip_eligible: boolean;
  tip_amount: number;
  tip_status: TipStatus;
  tip_requested_at: string | null;
  tip_deadline: string | null;
  
  // Location context
  customer_location_id: string | null;
  business_location_id: string | null;
  
  // Admin and reference
  admin_notes: string | null;
  booking_reference: string | null;
  
  // Rescheduling
  rescheduled_at: string | null;
  rescheduled_by: string | null;
  reschedule_reason: string | null;
  original_booking_date: string | null;
  original_start_time: string | null;
  reschedule_count: number;
  decline_reason: string | null;
}

// Customer profile for booking context
export interface BookingCustomerProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
}

// Provider profile for booking context
export interface BookingProviderProfile {
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

// Business profile for booking context
export interface BookingBusinessProfile {
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

// Service profile for booking context
export interface BookingServiceProfile {
  id: string;
  name: string;
  description: string | null;
  min_price: number;
  max_price: number | null;
  duration_minutes: number;
  image_url: string | null;
  is_active: boolean;
}

// Location information for bookings
export interface BookingLocation {
  id: string;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  is_default: boolean;
}

// Booking statistics for analytics
export interface BookingStats {
  total_bookings: number;
  pending_bookings: number;
  confirmed_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  total_revenue: number;
  avg_booking_value: number;
  avg_service_duration: number;
  completion_rate: number;
  cancellation_rate: number;
  tip_rate: number;
  avg_tip_amount: number;
}

// Booking filtering and querying options
export interface BookingQueryOptions {
  // Filtering
  customerId?: string;
  providerId?: string;
  businessId?: string;
  serviceId?: string;
  bookingStatus?: BookingStatus | BookingStatus[];
  paymentStatus?: PaymentStatus | PaymentStatus[];
  deliveryType?: DeliveryType;
  tipStatus?: TipStatus;
  
  // Date filtering
  dateFrom?: string;
  dateTo?: string;
  createdFrom?: string;
  createdTo?: string;
  
  // Search
  searchQuery?: string;
  guestName?: string;
  bookingReference?: string;
  
  // Pagination
  page?: number;
  limit?: number;
  offset?: number;
  
  // Sorting
  sortBy?: 'booking_date' | 'created_at' | 'total_amount' | 'booking_status' | 'payment_status';
  sortOrder?: 'asc' | 'desc';
  
  // Includes for related data
  includeCustomer?: boolean;
  includeProvider?: boolean;
  includeBusiness?: boolean;
  includeService?: boolean;
  includeLocations?: boolean;
  includeReviews?: boolean;
  includeTips?: boolean;
  includeChanges?: boolean;
}

// API response wrapper for booking operations
export interface BookingApiResponse<T> {
  data: T[];
  total: number;
  page?: number;
  limit?: number;
  error?: string;
  success: boolean;
  message?: string;
}

// Form data interfaces for booking operations
export interface BookingFormData {
  service_id: string;
  provider_id: string;
  booking_date: string;
  start_time: string;
  delivery_type: DeliveryType;
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
  customer_location_id?: string;
  business_location_id?: string;
  special_instructions?: string;
}

export interface BookingUpdateData {
  booking_status?: BookingStatus;
  payment_status?: PaymentStatus;
  booking_date?: string;
  start_time?: string;
  delivery_type?: DeliveryType;
  admin_notes?: string;
  cancellation_reason?: string;
  reschedule_reason?: string;
}

// Error types for booking operations
export interface BookingError {
  code: string;
  message: string;
  field?: string;
  context?: string;
}

// Booking change tracking
export interface BookingChange {
  id: string;
  booking_id: string;
  change_type: 'status_change' | 'reschedule' | 'cancellation' | 'payment_update' | 'admin_note';
  old_value: string | null;
  new_value: string | null;
  changed_by: string;
  changed_at: string;
  reason: string | null;
}

// Booking notification preferences
export interface BookingNotificationPreferences {
  email_confirmation: boolean;
  email_reminders: boolean;
  sms_confirmation: boolean;
  sms_reminders: boolean;
  push_notifications: boolean;
  reminder_hours_before: number[];
}

// Booking availability slot
export interface BookingAvailabilitySlot {
  date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  is_available: boolean;
  provider_id: string;
  service_id: string;
  price: number;
}

// Booking validation result
export interface BookingValidationResult {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  conflicts: {
    provider_conflict?: boolean;
    time_conflict?: boolean;
    service_unavailable?: boolean;
    location_conflict?: boolean;
  };
}