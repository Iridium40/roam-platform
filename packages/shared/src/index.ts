// Auth types (type-only exports)
export type * from './types/auth';
export * from './services/auth-service';
export * from './services/auth-api';
export * from './services/supabase-auth-service';
export * from './services/mfa-service';
export * from './contexts/UnifiedAuthContext';

// Types (type-only exports)
export type * from './types/database';
// Note: Twilio types are now exported from ./services/twilio to avoid conflicts
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
// Export only non-conflicting types from old twilio-conversations
export type {
  ConversationMetadata,
  DatabaseConversationParticipant,
  ConversationServiceWithDB,
} from './services/twilio-conversations';

// ⚠️ SERVER-SIDE ONLY: Twilio service classes (contain Node.js dependencies)
// DO NOT export these from main index - they should only be imported in API routes
// Available at: @roam/shared/dist/services/twilio/* for server-side use

// Export Twilio TYPES only (safe for client-side)
export type {
  TwilioConfig,
  CreateConversationData,
  ConversationData,
  ParticipantData,
  MessageData,
  WebhookData,
  TwilioAction,
  TwilioResponse,
  ConversationParticipant,
  ConversationMessage,
  ConversationDetails,
  TwilioError,
  WebhookEventType,
  ParticipantRole,
  DeliveryStatus,
  ConversationState,
  EnvironmentConfig,
} from './services/twilio/types';

// Client-safe exports
export * from './services/conversations';
export * from './services/booking-conversations-client';

// ⚠️ API handlers are SERVER-SIDE ONLY - DO NOT export from main index
// Import directly in API routes: import handler from '@roam/shared/dist/api/twilio-conversations-handler'
// export type * from './api/twilio-conversations-api';  // REMOVED - causes twilio import
// export { default as twilioConversationsHandler } from './api/twilio-conversations-handler';  // REMOVED - causes twilio import

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
