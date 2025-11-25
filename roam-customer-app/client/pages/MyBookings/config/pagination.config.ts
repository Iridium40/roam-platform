// 🎯 OPTIMAL PAGINATION STRATEGY FOR ROAM CUSTOMER APP

export const PAGINATION_CONFIG = {
  // Initial load settings
  defaultPageSize: 25,              // Show 25 bookings per page
  mobilePageSize: 20,               // Smaller for mobile

  // Date range defaults
  defaultDateRange: 30,              // Last 30 days on initial load
  maxDateRange: 365,                 // Max 1 year at a time

  // Performance limits
  maxItemsBeforeVirtualScroll: 100, // Use virtual scrolling beyond this
  databaseQueryLimit: 1000,          // Hard limit on DB queries
} as const;

export type PaginationConfig = typeof PAGINATION_CONFIG;

