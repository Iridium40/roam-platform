// Unified booking types exports for ROAM platform
// Central access point for all booking-related type definitions

// Base types
export type {
  UnifiedBookingBase,
  BookingCustomerProfile,
  BookingProviderProfile,
  BookingBusinessProfile,
  BookingServiceProfile,
  BookingLocation,
  BookingStats,
  BookingQueryOptions,
  BookingApiResponse,
  BookingFormData,
  BookingUpdateData,
  BookingError,
  BookingChange,
  BookingNotificationPreferences,
  BookingAvailabilitySlot,
  BookingValidationResult
} from './base';

// Customer app types
export type {
  CustomerBooking,
  CustomerBookingWithReview,
  CustomerBookingStats,
  CustomerBookingHistoryItem,
  CustomerBookingPreferences,
  CustomerBookingFilters,
  CustomerBookingRequest,
  CustomerBookingConfirmation,
  CustomerBookingRecommendation,
  CustomerBookingMessage,
  CustomerBookingTracking
} from './customer';

// Provider app types
export type {
  ProviderBooking,
  ProviderBookingWithEarnings,
  ProviderBookingStats,
  ProviderDailySchedule,
  ProviderBookingAssignment,
  ProviderAvailability,
  ProviderPerformanceMetrics,
  ProviderBookingWorkflow,
  ProviderBookingPreferences,
  BusinessProviderBooking
} from './provider';

// Admin app types
export type {
  AdminBooking,
  AdminBookingWithAudit,
  AdminBookingAnalytics,
  AdminBookingFilters,
  AdminBookingAction,
  AdminBookingInvestigation,
  AdminBookingReport,
  AdminBookingQualityCheck,
  AdminBookingSystemHealth
} from './admin';

// Re-export database types for convenience
export type {
  BookingStatus,
  PaymentStatus,
  TipStatus,
  DeliveryType
} from '../database/enums';

export type {
  Booking as DatabaseBooking,
  BookingsTable
} from '../database/tables/booking';