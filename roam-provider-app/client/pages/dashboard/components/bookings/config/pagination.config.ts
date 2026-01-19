// 🎯 OPTIMAL PAGINATION STRATEGY FOR ROAM

export const PAGINATION_CONFIG = {
  // Initial load settings
  defaultPageSize: 25,              // Show 25 bookings per page
  mobilePageSize: 20,                // Smaller for mobile
  
  // Date range defaults
  defaultDateRangePast: 60,          // Last 60 days on initial load
  defaultDateRangeFuture: 90,        // Next 90 days for future bookings
  maxDateRange: 365,                 // Max 1 year at a time
  
  // Performance limits
  maxItemsBeforeVirtualScroll: 100,  // Use virtual scrolling beyond this
  databaseQueryLimit: 1000,          // Hard limit on DB queries
} as const;

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
// Includes past bookings (for history) and future bookings (for upcoming)
export const getDateRange = (
  pastDays: number = PAGINATION_CONFIG.defaultDateRangePast,
  futureDays: number = PAGINATION_CONFIG.defaultDateRangeFuture
): { start: Date; end: Date } => {
  const today = new Date();
  const start = new Date();
  const end = new Date();
  
  // Go back in time for past bookings
  start.setDate(today.getDate() - Math.min(pastDays, PAGINATION_CONFIG.maxDateRange));
  
  // Go forward in time for future bookings
  end.setDate(today.getDate() + Math.min(futureDays, PAGINATION_CONFIG.maxDateRange));
  
  return { start, end };
};

