// Auth types (type-only exports)
export type * from './types/auth';
export * from './services/auth-service';
export * from './services/auth-api';
export * from './services/supabase-auth-service';
export * from './services/mfa-service';
export * from './contexts/UnifiedAuthContext';

// Types (type-only exports)
export type * from './types/database';
export type * from './types/twilio';
export type * from './types/booking-conversations';
export * from './branding/assets';
// Unified Service Types (explicit exports to avoid conflicts)
export type {
  UnifiedServiceBase,
  ServiceQueryOptions,
  ServiceApiResponse,
  ServiceError,
  ProviderService,
  CustomerService,
  AdminService,
  EligibleService,
  ProviderServiceStats,
  AdminServiceStats,
  ServiceBusinessProfile,
  ServiceProvider,
  ServiceStats,
  ServiceFormData,
  BusinessServiceFormData
} from './types/services';
// Unified Booking Types
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
} from './types/bookings';
export type { 
  Conversation,
  CreateConversationParams,
  SendMessageParams,
  AddParticipantParams
} from './types/conversations';

// Services
export * from './services/notification-api';
export * from './services/notification-service';
export * from './services/twilio-conversations';
export * from './services/twilio'; // New unified Twilio Conversations services
export * from './services/conversations';
export * from './services/booking-conversations-client';
export * from './api/twilio-conversations-api';
export { default as twilioConversationsHandler } from './api/twilio-conversations-handler';
export * from './services/stripe-service';
export * from './services/business-service-subcategories';

// Unified Service API
export { UnifiedServiceAPI, type UnifiedServiceAPIConfig } from './api';

// Unified Booking API
export { UnifiedBookingAPI, type UnifiedBookingAPIConfig } from './api/bookings';

// Hooks
export * from './hooks/useConversations';
export * from './hooks/useUnifiedServices';
export * from './hooks/useUnifiedBookings';

// Utils
export * from './utils/validation';
export * from './utils/formatting';
// Service utilities (explicit exports to avoid conflicts)
export {
  safeJsonParse,
  safeJsonParseString,
  transformToUnifiedService,
  validateServiceData,
  formatPrice,
  formatPriceRange,
  getServiceAvailabilityStatus,
  filterServicesBySearch,
  sortServices,
  groupServicesByCategory,
  createErrorResponse,
  debounce
} from './utils/serviceUtils';
