// Main database schema combining all table types

// Import all available table type definitions
import { 
  BusinessProfilesTable, 
  BusinessLocationsTable, 
  ServicesTable,
  BusinessDocumentsTable,
  BusinessServiceCategoriesTable,
  BusinessServiceSubcategoriesTable
} from './tables/business';

import {
  BookingsTable,
  PromotionsTable,
  PromotionUsageTable,
  ReviewsTable
} from './tables/booking';

import {
  CustomerProfilesTable,
  CustomerLocationsTable,
  ProvidersTable,
  ProviderAvailabilityTable,
  UserRolesTable
} from './tables/user';

import {
  TransactionsTable,
  PlaidBankConnectionsTable,
  ManualBankAccountsTable,
  SubscriptionPlansTable,
  DeviceSubscriptionsTable
} from './tables/payment';

import {
  MessageNotificationsTable,
  AnnouncementsTable,
  MfaSessionsTable,
  UserDevicesTable,
  AuditLogTable,
  PushNotificationLogsTable
} from './tables/notification';

// Main Database interface
export type Database = {
  public: {
    Tables: {
      // Business tables
      business_profiles: BusinessProfilesTable;
      business_locations: BusinessLocationsTable;
      services: ServicesTable;
      business_documents: BusinessDocumentsTable;
      business_service_categories: BusinessServiceCategoriesTable;
      business_service_subcategories: BusinessServiceSubcategoriesTable;

      // Booking and service tables
      bookings: BookingsTable;
      user_roles: UserRolesTable;
      reviews: ReviewsTable;
      promotions: PromotionsTable;
      promotion_usage: PromotionUsageTable;

      // User tables
      customer_profiles: CustomerProfilesTable;
      customer_locations: CustomerLocationsTable;
      providers: ProvidersTable;
      provider_availability: ProviderAvailabilityTable;

      // Payment tables
      financial_transactions: TransactionsTable;
      plaid_bank_connections: PlaidBankConnectionsTable;
      business_manual_bank_accounts: ManualBankAccountsTable;
      subscription_plans: SubscriptionPlansTable;
      device_subscriptions: DeviceSubscriptionsTable;

      // Notification tables
      message_notifications: MessageNotificationsTable;
      announcements: AnnouncementsTable;
      mfa_sessions: MfaSessionsTable;
      user_devices: UserDevicesTable;
      audit_log: AuditLogTable;
      push_notification_logs: PushNotificationLogsTable;
    };
  };
};

// Type exports for convenience
export type TableRow<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type TableInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type TableUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];