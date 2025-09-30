// Main export file for modular database types

// Re-export all enums and core types
export * from './enums';

// Re-export table types with explicit naming to avoid conflicts
export * from './tables/business';
export * from './tables/booking';
export type {
  CustomerProfilesTable,
  CustomerLocationsTable, 
  ProvidersTable,
  ProviderAvailabilityTable,
  UserRolesTable,
  AdminUsersTable,
  CustomerProfile,
  CustomerLocation,
  Provider,
  ProviderAvailability,
  AdminUser
} from './tables/user';
export * from './tables/payment';
export * from './tables/notification';

// Re-export business logic models with renamed conflicts
export type { 
  Review as ReviewModel, 
  Tip as TipModel, 
  ReviewFormData, 
  TipFormData 
} from './models';

// Re-export main database schema (Database type only)
export type { Database, TableRow, TableInsert, TableUpdate } from './schema';