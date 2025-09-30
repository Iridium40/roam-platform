// Unified service types for ROAM platform
// Consolidates all service-related interfaces and types

// Base types and interfaces
export * from './base';

// App-specific service types
export * from './provider';
export * from './customer';
export * from './admin';

// Re-export commonly used types for convenience
export type {
  UnifiedServiceBase,
  ServiceCategory,
  ServiceSubcategory,
  ServiceBusinessProfile,
  ServiceProvider,
  ServiceStats,
  ServiceQueryOptions,
  ServiceApiResponse,
  ServiceFormData,
  BusinessServiceFormData,
  ServiceError,
  DeliveryType,
  ServiceStatus
} from './base';

export type {
  ProviderService,
  EligibleService,
  ProviderServiceStats,
  ServiceAssignment,
  ProviderServiceFilters,
  ServicePerformance
} from './provider';

export type {
  CustomerService,
  FeaturedService,
  PopularService,
  ServiceSearchResult,
  ServiceBookingPreview,
  CustomerServiceFilters,
  ServiceRecommendation
} from './customer';

export type {
  AdminService,
  AdminServiceCategory,
  AdminServiceSubcategory,
  AdminServiceStats,
  AdminServiceFilters,
  ServiceApproval,
  AdminServiceAction
} from './admin';