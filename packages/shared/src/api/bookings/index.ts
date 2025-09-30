// Unified Booking API exports for ROAM platform
// Central access point for all booking-related API functionality

export { UnifiedBookingAPI, type UnifiedBookingAPIConfig } from './UnifiedBookingAPI';

// Re-export booking types for convenience
export type {
  UnifiedBookingBase,
  BookingQueryOptions,
  BookingApiResponse,
  BookingError,
  CustomerBooking,
  ProviderBooking,
  AdminBooking,
  BookingFormData,
  BookingUpdateData,
  BookingValidationResult,
  CustomerBookingRequest,
  CustomerBookingStats,
  ProviderBookingStats,
  AdminBookingAnalytics,
  BookingStats
} from '../../types/bookings';