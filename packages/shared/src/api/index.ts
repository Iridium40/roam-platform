// Unified API exports for ROAM platform service management
// Central access point for all service-related API functionality

export { UnifiedServiceAPI, type UnifiedServiceAPIConfig } from './UnifiedServiceAPI';

// Re-export service types for convenience
export type {
  UnifiedServiceBase,
  ServiceQueryOptions,
  ServiceApiResponse,
  ServiceError,
  ProviderService,
  CustomerService,
  AdminService,
  EligibleService,
  ServiceCategory,
  ServiceSubcategory,
  ProviderServiceStats,
  AdminServiceStats,
  ServiceBusinessProfile,
  ServiceProvider
} from '../types/services';