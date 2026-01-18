/**
 * React Query hooks for admin data fetching
 * 
 * These hooks provide automatic caching, background refetching, and 
 * proper loading/error states with minimal boilerplate.
 * 
 * Paginated hooks return: { data, total, page, limit, totalPages }
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Query keys for consistent cache invalidation
export const queryKeys = {
  providers: ['providers'] as const,
  customers: ['customers'] as const,
  businesses: ['businesses'] as const,
  services: ['services'] as const,
  bookings: ['bookings'] as const,
  promotions: ['promotions'] as const,
  reviews: ['reviews'] as const,
  dashboardStats: ['dashboard-stats'] as const,
};

// Default stale time (5 minutes)
const DEFAULT_STALE_TIME = 5 * 60 * 1000;

// Default page size
const DEFAULT_PAGE_SIZE = 20;

// Paginated response type
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Pagination params type
export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Generic fetch function
async function fetchApi<T>(endpoint: string): Promise<T> {
  const response = await fetch(endpoint);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `Failed to fetch ${endpoint}`);
  }
  const result = await response.json();
  return result.data || result;
}

// Generic paginated fetch function
async function fetchPaginatedApi<T>(endpoint: string): Promise<PaginatedResponse<T>> {
  const response = await fetch(endpoint);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `Failed to fetch ${endpoint}`);
  }
  const result = await response.json();
  
  // Handle different response formats from server
  return {
    data: result.data || [],
    total: result.total || result.count || 0,
    page: result.page || 1,
    limit: result.limit || DEFAULT_PAGE_SIZE,
    totalPages: result.totalPages || Math.ceil((result.total || result.count || 0) / (result.limit || DEFAULT_PAGE_SIZE)),
  };
}

// ============================================================================
// PAGINATED HOOKS (recommended for large datasets)
// ============================================================================

/**
 * Paginated customers hook with search
 * @param params - Pagination and filter params
 * @returns Paginated response with customers data
 */
export function useCustomersPaginated(params: PaginationParams & { status?: string } = {}) {
  const { page = 1, limit = DEFAULT_PAGE_SIZE, search = '', status = 'all' } = params;
  
  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    status,
  });
  if (search) queryParams.set('search', search);
  
  return useQuery({
    queryKey: [...queryKeys.customers, 'paginated', { page, limit, search, status }],
    queryFn: () => fetchPaginatedApi<any>(`/api/customers?${queryParams.toString()}`),
    staleTime: DEFAULT_STALE_TIME,
    placeholderData: (previousData) => previousData, // Keep previous data while loading
  });
}

/**
 * Paginated providers hook with search
 * @param params - Pagination and filter params
 * @returns Paginated response with providers data
 */
export function useProvidersPaginated(params: PaginationParams & { status?: string } = {}) {
  const { page = 1, limit = DEFAULT_PAGE_SIZE, search = '', status = 'all' } = params;
  
  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    status,
  });
  if (search) queryParams.set('search', search);
  
  return useQuery({
    queryKey: [...queryKeys.providers, 'paginated', { page, limit, search, status }],
    queryFn: () => fetchPaginatedApi<any>(`/api/providers?${queryParams.toString()}`),
    staleTime: DEFAULT_STALE_TIME,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Paginated businesses hook with search and filters
 * @param params - Pagination and filter params
 * @returns Paginated response with businesses data
 */
export function useBusinessesPaginated(params: PaginationParams & {
  verificationStatus?: string;
  businessType?: string;
  useApprovalsView?: boolean;
} = {}) {
  const { 
    page = 1, 
    limit = DEFAULT_PAGE_SIZE, 
    search = '', 
    sortBy = 'created_at',
    sortOrder = 'desc',
    verificationStatus = 'all',
    businessType = 'all',
    useApprovalsView = false,
  } = params;
  
  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    sortBy,
    sortOrder,
  });
  if (search) queryParams.set('search', search);
  if (verificationStatus !== 'all') queryParams.set('verification_status', verificationStatus);
  if (businessType !== 'all') queryParams.set('business_type', businessType);
  if (useApprovalsView) queryParams.set('use_approvals_view', 'true');
  
  return useQuery({
    queryKey: [...queryKeys.businesses, 'paginated', { page, limit, search, sortBy, sortOrder, verificationStatus, businessType, useApprovalsView }],
    queryFn: () => fetchPaginatedApi<any>(`/api/businesses?${queryParams.toString()}`),
    staleTime: DEFAULT_STALE_TIME,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Paginated bookings hook with search and filters
 * @param params - Pagination and filter params
 * @returns Paginated response with bookings data
 */
export function useBookingsPaginated(params: PaginationParams & {
  status?: string;
  paymentStatus?: string;
  startDate?: string;
  endDate?: string;
} = {}) {
  const { 
    page = 1, 
    limit = 25, // Bookings default to 25 per page
    search = '', 
    sortBy = 'created_at',
    sortOrder = 'desc',
    status = 'all',
    paymentStatus = 'all',
    startDate,
    endDate,
  } = params;
  
  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    sortBy,
    sortOrder,
  });
  if (search) queryParams.set('search', search);
  if (status !== 'all') queryParams.set('status', status);
  if (paymentStatus !== 'all') queryParams.set('payment_status', paymentStatus);
  if (startDate) queryParams.set('start_date', startDate);
  if (endDate) queryParams.set('end_date', endDate);
  
  return useQuery({
    queryKey: [...queryKeys.bookings, 'paginated', { page, limit, search, sortBy, sortOrder, status, paymentStatus, startDate, endDate }],
    queryFn: () => fetchPaginatedApi<any>(`/api/bookings?${queryParams.toString()}`),
    staleTime: DEFAULT_STALE_TIME,
    placeholderData: (previousData) => previousData,
  });
}

// ============================================================================
// LEGACY HOOKS (for backward compatibility - fetch all records)
// ============================================================================

// Providers hook (legacy - fetches all)
export function useProviders() {
  return useQuery({
    queryKey: queryKeys.providers,
    queryFn: () => fetchApi<any[]>('/api/providers'),
    staleTime: DEFAULT_STALE_TIME,
  });
}

// Customers hook with optional status filter (legacy - fetches all)
export function useCustomers(statusFilter: string = 'all') {
  return useQuery({
    queryKey: [...queryKeys.customers, statusFilter],
    queryFn: () => fetchApi<any[]>(`/api/customers?status=${statusFilter}`),
    staleTime: DEFAULT_STALE_TIME,
  });
}

// Businesses hook with optional filters (legacy - fetches all)
export function useBusinesses(options?: {
  verificationStatus?: string;
  businessType?: string;
  search?: string;
  useApprovalsView?: boolean;
}) {
  const params = new URLSearchParams();
  if (options?.verificationStatus) params.set('verification_status', options.verificationStatus);
  if (options?.businessType) params.set('business_type', options.businessType);
  if (options?.search) params.set('search', options.search);
  if (options?.useApprovalsView) params.set('use_approvals_view', 'true');

  return useQuery({
    queryKey: [...queryKeys.businesses, options],
    queryFn: () => fetchApi<any[]>(`/api/businesses?${params.toString()}`),
    staleTime: DEFAULT_STALE_TIME,
  });
}

// Services hook
export function useServices() {
  return useQuery({
    queryKey: queryKeys.services,
    queryFn: () => fetchApi<any>('/api/services/all-data'),
    staleTime: DEFAULT_STALE_TIME,
  });
}

// Bookings hook (legacy - fetches all)
export function useBookings() {
  return useQuery({
    queryKey: queryKeys.bookings,
    queryFn: () => fetchApi<any[]>('/api/bookings'),
    staleTime: DEFAULT_STALE_TIME,
  });
}

// Promotions hook
export function usePromotions() {
  return useQuery({
    queryKey: queryKeys.promotions,
    queryFn: () => fetchApi<any[]>('/api/promotions'),
    staleTime: DEFAULT_STALE_TIME,
  });
}

// Reviews hook
export function useReviews() {
  return useQuery({
    queryKey: queryKeys.reviews,
    queryFn: () => fetchApi<any[]>('/api/reviews'),
    staleTime: DEFAULT_STALE_TIME,
  });
}

// Mutation hook for updating provider status
export function useUpdateProviderStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ providerId, updates }: { providerId: string; updates: Record<string, any> }) => {
      const response = await fetch('/api/providers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: providerId, ...updates }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update provider');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.providers });
    },
  });
}

// Mutation hook for updating business
export function useUpdateBusiness() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ businessId, updates }: { businessId: string; updates: Record<string, any> }) => {
      const response = await fetch('/api/businesses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: businessId, ...updates }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update business');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.businesses });
    },
  });
}

// Mutation hook for updating customer status
export function useUpdateCustomerStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ customerId, isActive }: { customerId: string; isActive: boolean }) => {
      const response = await fetch('/api/customers/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, isActive }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update customer');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers });
    },
  });
}

// Hook to invalidate queries (useful for manual refresh)
export function useInvalidateQueries() {
  const queryClient = useQueryClient();
  
  return {
    invalidateProviders: () => queryClient.invalidateQueries({ queryKey: queryKeys.providers }),
    invalidateCustomers: () => queryClient.invalidateQueries({ queryKey: queryKeys.customers }),
    invalidateBusinesses: () => queryClient.invalidateQueries({ queryKey: queryKeys.businesses }),
    invalidateServices: () => queryClient.invalidateQueries({ queryKey: queryKeys.services }),
    invalidateBookings: () => queryClient.invalidateQueries({ queryKey: queryKeys.bookings }),
    invalidateAll: () => queryClient.invalidateQueries(),
  };
}
