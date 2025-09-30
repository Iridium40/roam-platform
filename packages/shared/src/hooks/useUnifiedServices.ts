// React hooks for unified service management
// Reusable hooks that work across all ROAM applications

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  UnifiedServiceAPI, 
  UnifiedServiceAPIConfig,
  UnifiedServiceBase,
  ServiceQueryOptions,
  ServiceApiResponse,
  filterServicesBySearch,
  sortServices,
  debounce
} from '../index';
import { 
  ServiceCategory,
  ServiceSubcategory
} from '../types/services';

// Hook for managing unified service API instance
export function useUnifiedServiceAPI(config: UnifiedServiceAPIConfig) {
  const api = useMemo(() => new UnifiedServiceAPI(config), [
    config.baseURL,
    config.apiKey,
    config.role,
    config.timeout,
    config.retries
  ]);

  return api;
}

// Generic hook for fetching services with caching and error handling
export function useServices<T extends UnifiedServiceBase>(
  fetchFunction: (options?: Partial<ServiceQueryOptions>) => Promise<ServiceApiResponse<T>>,
  options: Partial<ServiceQueryOptions> = {},
  dependencies: any[] = []
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetchFunction(options);
      
      if (response.success) {
        setData(response.data);
        setTotal(response.total);
      } else {
        setError(response.error || 'Unknown error occurred');
        setData([]);
        setTotal(0);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch services';
      setError(errorMessage);
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [fetchFunction, ...dependencies]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    total,
    refetch
  };
}

// Hook for provider business services
export function useBusinessServices(
  api: UnifiedServiceAPI,
  businessId: string,
  options: Partial<ServiceQueryOptions> = {}
) {
  return useServices(
    (opts?: Partial<ServiceQueryOptions>) => api.getBusinessServices(businessId, { ...options, ...opts }),
    options,
    [businessId, JSON.stringify(options)]
  );
}

// Hook for customer featured services
export function useFeaturedServices(
  api: UnifiedServiceAPI,
  limit = 8
) {
  return useServices(
    () => api.getFeaturedServices(limit),
    {},
    [limit]
  );
}

// Hook for customer popular services
export function usePopularServices(
  api: UnifiedServiceAPI,
  limit = 12
) {
  return useServices(
    () => api.getPopularServices(limit),
    {},
    [limit]
  );
}

// Hook for admin services with stats
export function useAdminServices(
  api: UnifiedServiceAPI,
  options: Partial<ServiceQueryOptions> = {}
) {
  return useServices(
    (opts?: Partial<ServiceQueryOptions>) => api.getAllServicesWithStats({ ...options, ...opts }),
    options,
    [JSON.stringify(options)]
  );
}

// Hook for service search with debouncing
export function useServiceSearch<T extends UnifiedServiceBase>(
  services: T[],
  searchQuery: string,
  debounceMs = 300
) {
  const [filteredServices, setFilteredServices] = useState<T[]>(services);

  const debouncedSearch = useCallback(
    debounce((query: string) => {
      const filtered = filterServicesBySearch(services, query) as T[];
      setFilteredServices(filtered);
    }, debounceMs),
    [services, debounceMs]
  );

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredServices(services);
    } else {
      debouncedSearch(searchQuery);
    }
  }, [searchQuery, services, debouncedSearch]);

  return filteredServices;
}

// Hook for service sorting and filtering
export function useServiceFilters<T extends UnifiedServiceBase>(
  services: T[],
  initialSortBy: 'name' | 'price' | 'duration' | 'created_at' | 'popularity' = 'name',
  initialSortOrder: 'asc' | 'desc' = 'asc'
) {
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [sortOrder, setSortOrder] = useState(initialSortOrder);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [activeOnly, setActiveOnly] = useState(true);

  const filteredAndSortedServices = useMemo(() => {
    let filtered = services;

    // Filter by active status
    if (activeOnly) {
      filtered = filtered.filter(service => service.is_active);
    }

    // Filter by category if applicable
    if (categoryFilter) {
      filtered = filtered.filter(service => {
        const serviceWithCategory = service as T & { category?: string };
        return serviceWithCategory.category === categoryFilter;
      });
    }

    // Sort services
    return sortServices(filtered, sortBy, sortOrder);
  }, [services, sortBy, sortOrder, categoryFilter, activeOnly]);

  return {
    services: filteredAndSortedServices,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    categoryFilter,
    setCategoryFilter,
    activeOnly,
    setActiveOnly
  };
}

// Hook for service categories
export function useServiceCategories(api: UnifiedServiceAPI) {
  const [data, setData] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.getServiceCategories({ sortBy: 'sort_order', sortOrder: 'asc' });
      
      if (response.success) {
        setData(response.data);
      } else {
        setError(response.error || 'Failed to fetch categories');
        setData([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch categories';
      setError(errorMessage);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return { data, loading, error, refetch: fetchCategories };
}

// Hook for service subcategories
export function useServiceSubcategories(
  api: UnifiedServiceAPI,
  categoryId?: string
) {
  const [data, setData] = useState<ServiceSubcategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubcategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.getServiceSubcategories(categoryId);
      
      if (response.success) {
        setData(response.data);
      } else {
        setError(response.error || 'Failed to fetch subcategories');
        setData([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch subcategories';
      setError(errorMessage);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [api, categoryId]);

  useEffect(() => {
    fetchSubcategories();
  }, [fetchSubcategories]);

  return { data, loading, error, refetch: fetchSubcategories };
}

// Hook for service operations (create, update, delete)
export function useServiceOperations(api: UnifiedServiceAPI) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createService = useCallback(async (serviceData: any) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.createService(serviceData);
      if (!response.success) {
        setError(response.error || 'Failed to create service');
        return null;
      }
      return response.data[0];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create service';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [api]);

  const updateService = useCallback(async (serviceId: string, updates: Partial<UnifiedServiceBase>) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.updateService(serviceId, updates);
      if (!response.success) {
        setError(response.error || 'Failed to update service');
        return null;
      }
      return response.data[0];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update service';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [api]);

  const deleteService = useCallback(async (serviceId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.deleteService(serviceId);
      if (!response.success) {
        setError(response.error || 'Failed to delete service');
        return false;
      }
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete service';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [api]);

  return {
    createService,
    updateService,
    deleteService,
    loading,
    error
  };
}

// Hook for pagination
export function usePagination(
  totalItems: number,
  itemsPerPage: number = 20,
  initialPage: number = 1
) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  
  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  const prevPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  const goToFirstPage = useCallback(() => {
    goToPage(1);
  }, [goToPage]);

  const goToLastPage = useCallback(() => {
    goToPage(totalPages);
  }, [goToPage, totalPages]);

  return {
    currentPage,
    totalPages,
    itemsPerPage,
    startIndex,
    endIndex,
    goToPage,
    nextPage,
    prevPage,
    goToFirstPage,
    goToLastPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1
  };
}

// Hook for optimistic updates
export function useOptimisticServices<T extends UnifiedServiceBase>(
  initialServices: T[]
) {
  const [services, setServices] = useState<T[]>(initialServices);
  const [optimisticUpdates, setOptimisticUpdates] = useState<Map<string, Partial<T>>>(new Map());

  // Apply optimistic update
  const applyOptimisticUpdate = useCallback((serviceId: string, updates: Partial<T>) => {
    setOptimisticUpdates(prev => new Map(prev.set(serviceId, updates)));
  }, []);

  // Confirm update (remove from optimistic updates)
  const confirmUpdate = useCallback((serviceId: string) => {
    setOptimisticUpdates(prev => {
      const newMap = new Map(prev);
      newMap.delete(serviceId);
      return newMap;
    });
  }, []);

  // Rollback update (remove from optimistic updates and optionally revert)
  const rollbackUpdate = useCallback((serviceId: string) => {
    setOptimisticUpdates(prev => {
      const newMap = new Map(prev);
      newMap.delete(serviceId);
      return newMap;
    });
  }, []);

  // Get services with optimistic updates applied
  const servicesWithUpdates = useMemo(() => {
    return services.map(service => {
      const optimisticUpdate = optimisticUpdates.get(service.id);
      return optimisticUpdate ? { ...service, ...optimisticUpdate } : service;
    });
  }, [services, optimisticUpdates]);

  return {
    services: servicesWithUpdates,
    setServices,
    applyOptimisticUpdate,
    confirmUpdate,
    rollbackUpdate,
    hasOptimisticUpdates: optimisticUpdates.size > 0
  };
}