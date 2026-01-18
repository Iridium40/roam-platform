/**
 * React Query hooks for admin data fetching
 * 
 * These hooks provide automatic caching, background refetching, and 
 * proper loading/error states with minimal boilerplate.
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

// Providers hook
export function useProviders() {
  return useQuery({
    queryKey: queryKeys.providers,
    queryFn: () => fetchApi<any[]>('/api/providers'),
    staleTime: DEFAULT_STALE_TIME,
  });
}

// Customers hook with optional status filter
export function useCustomers(statusFilter: string = 'all') {
  return useQuery({
    queryKey: [...queryKeys.customers, statusFilter],
    queryFn: () => fetchApi<any[]>(`/api/customers?status=${statusFilter}`),
    staleTime: DEFAULT_STALE_TIME,
  });
}

// Businesses hook with optional filters
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

// Bookings hook
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
