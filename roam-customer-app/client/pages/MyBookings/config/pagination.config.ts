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

// Helper to detect mobile
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768; // Tailwind md breakpoint
};

// Get appropriate page size based on device
export const getPageSize = (): number => {
  return isMobileDevice() ? PAGINATION_CONFIG.mobilePageSize : PAGINATION_CONFIG.defaultPageSize;
};

// Calculate date range for bookings query
// Includes past bookings (defaultDateRange days back) AND all future bookings
export const getDateRange = (days: number = PAGINATION_CONFIG.defaultDateRange): { start: Date; end: Date } => {
  const end = new Date();
  end.setFullYear(end.getFullYear() + 1); // Include bookings up to 1 year in the future
  const start = new Date();
  start.setDate(start.getDate() - Math.min(days, PAGINATION_CONFIG.maxDateRange));
  
  return { start, end };
};

