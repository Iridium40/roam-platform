// Pagination and date range configuration for Financials Tab

export const FINANCIALS_PAGINATION_CONFIG = {
  // Page sizes
  defaultPageSize: 20,
  mobilePageSize: 15,
  
  // Default date ranges (in days)
  defaultDateRangeDays: 30,      // Last 30 days by default
  maxDateRangeDays: 365,         // Max 1 year at a time
  
  // Quick filter presets (in days)
  datePresets: [
    { label: 'Last 7 days', value: 7 },
    { label: 'Last 30 days', value: 30 },
    { label: 'Last 90 days', value: 90 },
    { label: 'Last 6 months', value: 180 },
    { label: 'Last year', value: 365 },
    { label: 'All time', value: 0 }, // 0 = no date filter
  ],
  
  // Database query limits
  transactionQueryLimit: 100,    // Max transactions per query
  tipsQueryLimit: 100,           // Max tips per query
  payoutsQueryLimit: 50,         // Max payouts per query
} as const;

// Helper to detect mobile device
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
};

// Get appropriate page size based on device
export const getPageSize = (): number => {
  return isMobileDevice() 
    ? FINANCIALS_PAGINATION_CONFIG.mobilePageSize 
    : FINANCIALS_PAGINATION_CONFIG.defaultPageSize;
};

// Calculate date range for queries
export const getDefaultDateRange = (days: number = FINANCIALS_PAGINATION_CONFIG.defaultDateRangeDays): { 
  startDate: string; 
  endDate: string;
} => {
  const end = new Date();
  const start = new Date();
  
  if (days === 0) {
    // "All time" - return empty strings to indicate no filter
    return { startDate: '', endDate: '' };
  }
  
  start.setDate(end.getDate() - days);
  
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
};

// Format date for display
export const formatDateForDisplay = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
};
