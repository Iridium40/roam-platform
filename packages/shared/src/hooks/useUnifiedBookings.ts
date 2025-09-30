// React hooks for unified booking management
// Reusable booking hooks that work across all ROAM applications

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  UnifiedBookingBase,
  BookingQueryOptions,
  BookingApiResponse,
  BookingStats,
  CustomerBookingRequest,
  BookingUpdateData
} from '../types/bookings';
import { 
  UnifiedBookingAPI, 
  UnifiedBookingAPIConfig
} from '../api/bookings';

// Hook for managing unified booking API instance
export function useUnifiedBookingAPI(config: UnifiedBookingAPIConfig) {
  const api = useMemo(() => new UnifiedBookingAPI(config), [
    config.baseURL,
    config.apiKey,
    config.role,
    config.timeout,
    config.retries
  ]);

  return api;
}

// Generic hook for fetching bookings with caching and error handling
export function useBookings<T extends UnifiedBookingBase>(
  fetchFunction: (options?: Partial<BookingQueryOptions>) => Promise<BookingApiResponse<T>>,
  options: Partial<BookingQueryOptions> = {},
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
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch bookings';
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

// Hook for customer bookings
export function useCustomerBookings(
  api: UnifiedBookingAPI,
  customerId: string,
  options: Partial<BookingQueryOptions> = {}
) {
  return useBookings(
    (opts?: Partial<BookingQueryOptions>) => api.getCustomerBookings(customerId, { ...options, ...opts }),
    options,
    [customerId, JSON.stringify(options)]
  );
}

// Hook for provider bookings
export function useProviderBookings(
  api: UnifiedBookingAPI,
  providerId: string,
  options: Partial<BookingQueryOptions> = {}
) {
  return useBookings(
    (opts?: Partial<BookingQueryOptions>) => api.getProviderBookings(providerId, { ...options, ...opts }),
    options,
    [providerId, JSON.stringify(options)]
  );
}

// Hook for business bookings
export function useBusinessBookings(
  api: UnifiedBookingAPI,
  businessId: string,
  options: Partial<BookingQueryOptions> = {}
) {
  return useBookings(
    (opts?: Partial<BookingQueryOptions>) => api.getBusinessBookings(businessId, { ...options, ...opts }),
    options,
    [businessId, JSON.stringify(options)]
  );
}

// Hook for admin bookings
export function useAdminBookings(
  api: UnifiedBookingAPI,
  options: Partial<BookingQueryOptions> = {}
) {
  return useBookings(
    (opts?: Partial<BookingQueryOptions>) => api.getAllBookingsWithAnalytics({ ...options, ...opts }),
    options,
    [JSON.stringify(options)]
  );
}

// Hook for booking statistics
export function useBookingStats(
  api: UnifiedBookingAPI,
  entityType: 'customer' | 'provider' | 'business' | 'platform',
  entityId?: string,
  dateRange?: { start: string; end: string }
) {
  const [stats, setStats] = useState<BookingStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.getBookingStats(entityType, entityId, dateRange);
      
      if (response.success && response.data.length > 0) {
        setStats(response.data[0]);
      } else {
        setError(response.error || 'Failed to fetch booking stats');
        setStats(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch booking stats';
      setError(errorMessage);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [api, entityType, entityId, JSON.stringify(dateRange)]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  };
}

// Hook for booking operations (create, update, cancel)
export function useBookingOperations(api: UnifiedBookingAPI) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createBooking = useCallback(async (bookingData: CustomerBookingRequest) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.createBooking(bookingData);
      if (!response.success) {
        setError(response.error || 'Failed to create booking');
        return null;
      }
      return response.data[0];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create booking';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [api]);

  const updateBooking = useCallback(async (bookingId: string, updates: BookingUpdateData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.updateBooking(bookingId, updates);
      if (!response.success) {
        setError(response.error || 'Failed to update booking');
        return null;
      }
      return response.data[0];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update booking';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [api]);

  const cancelBooking = useCallback(async (bookingId: string, reason: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.cancelBooking(bookingId, reason);
      if (!response.success) {
        setError(response.error || 'Failed to cancel booking');
        return false;
      }
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel booking';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [api]);

  const validateBooking = useCallback(async (bookingData: CustomerBookingRequest) => {
    try {
      return await api.validateBooking(bookingData);
    } catch (err) {
      return {
        is_valid: false,
        errors: [err instanceof Error ? err.message : 'Validation failed'],
        warnings: [],
        conflicts: {
          provider_conflict: false,
          time_conflict: false,
          service_unavailable: false,
          location_conflict: false,
        }
      };
    }
  }, [api]);

  return {
    createBooking,
    updateBooking,
    cancelBooking,
    validateBooking,
    loading,
    error
  };
}

// Hook for booking filtering and search
export function useBookingFilters<T extends UnifiedBookingBase>(
  bookings: T[],
  initialFilters: Partial<BookingQueryOptions> = {}
) {
  const [filters, setFilters] = useState(initialFilters);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBookings = useMemo(() => {
    let filtered = bookings;

    // Filter by status
    if (filters.bookingStatus) {
      const statuses = Array.isArray(filters.bookingStatus) ? filters.bookingStatus : [filters.bookingStatus];
      filtered = filtered.filter(booking => statuses.includes(booking.booking_status));
    }

    if (filters.paymentStatus) {
      const statuses = Array.isArray(filters.paymentStatus) ? filters.paymentStatus : [filters.paymentStatus];
      filtered = filtered.filter(booking => statuses.includes(booking.payment_status));
    }

    // Date range filtering
    if (filters.dateFrom || filters.dateTo) {
      filtered = filtered.filter(booking => {
        const bookingDate = new Date(booking.booking_date);
        if (filters.dateFrom && bookingDate < new Date(filters.dateFrom)) return false;
        if (filters.dateTo && bookingDate > new Date(filters.dateTo)) return false;
        return true;
      });
    }

    // Search query filtering
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(booking => 
        booking.booking_reference?.toLowerCase().includes(query) ||
        booking.guest_name?.toLowerCase().includes(query) ||
        booking.guest_email?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [bookings, filters, searchQuery]);

  const updateFilter = useCallback((key: keyof BookingQueryOptions, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
    setSearchQuery('');
  }, []);

  return {
    filteredBookings,
    filters,
    searchQuery,
    setSearchQuery,
    updateFilter,
    clearFilters
  };
}

// Hook for booking real-time updates
export function useBookingRealtime<T extends UnifiedBookingBase>(
  bookings: T[],
  onBookingUpdate?: (booking: T) => void
) {
  const [realtimeBookings, setRealtimeBookings] = useState<T[]>(bookings);

  useEffect(() => {
    setRealtimeBookings(bookings);
  }, [bookings]);

  const updateBookingInList = useCallback((updatedBooking: T) => {
    setRealtimeBookings(prev => 
      prev.map(booking => 
        booking.id === updatedBooking.id ? updatedBooking : booking
      )
    );
    onBookingUpdate?.(updatedBooking);
  }, [onBookingUpdate]);

  const addBookingToList = useCallback((newBooking: T) => {
    setRealtimeBookings(prev => [newBooking, ...prev]);
  }, []);

  const removeBookingFromList = useCallback((bookingId: string) => {
    setRealtimeBookings(prev => prev.filter(booking => booking.id !== bookingId));
  }, []);

  return {
    bookings: realtimeBookings,
    updateBooking: updateBookingInList,
    addBooking: addBookingToList,
    removeBooking: removeBookingFromList
  };
}

// Hook for booking calendar view
export function useBookingCalendar(
  bookings: UnifiedBookingBase[],
  viewType: 'day' | 'week' | 'month' = 'week'
) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const calendarData = useMemo(() => {
    const startOfPeriod = new Date(currentDate);
    const endOfPeriod = new Date(currentDate);

    switch (viewType) {
      case 'day':
        startOfPeriod.setHours(0, 0, 0, 0);
        endOfPeriod.setHours(23, 59, 59, 999);
        break;
      case 'week':
        const dayOfWeek = startOfPeriod.getDay();
        startOfPeriod.setDate(startOfPeriod.getDate() - dayOfWeek);
        startOfPeriod.setHours(0, 0, 0, 0);
        endOfPeriod.setDate(startOfPeriod.getDate() + 6);
        endOfPeriod.setHours(23, 59, 59, 999);
        break;
      case 'month':
        startOfPeriod.setDate(1);
        startOfPeriod.setHours(0, 0, 0, 0);
        endOfPeriod.setMonth(endOfPeriod.getMonth() + 1, 0);
        endOfPeriod.setHours(23, 59, 59, 999);
        break;
    }

    const periodBookings = bookings.filter(booking => {
      const bookingDate = new Date(booking.booking_date);
      return bookingDate >= startOfPeriod && bookingDate <= endOfPeriod;
    });

    // Group bookings by date
    const groupedBookings = periodBookings.reduce((groups, booking) => {
      const dateKey = booking.booking_date;
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(booking);
      return groups;
    }, {} as Record<string, UnifiedBookingBase[]>);

    return {
      startDate: startOfPeriod,
      endDate: endOfPeriod,
      bookingsByDate: groupedBookings,
      totalBookings: periodBookings.length
    };
  }, [bookings, currentDate, viewType]);

  const navigateToDate = useCallback((date: Date) => {
    setCurrentDate(date);
  }, []);

  const navigatePrevious = useCallback(() => {
    const newDate = new Date(currentDate);
    switch (viewType) {
      case 'day':
        newDate.setDate(newDate.getDate() - 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() - 7);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() - 1);
        break;
    }
    setCurrentDate(newDate);
  }, [currentDate, viewType]);

  const navigateNext = useCallback(() => {
    const newDate = new Date(currentDate);
    switch (viewType) {
      case 'day':
        newDate.setDate(newDate.getDate() + 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + 7);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + 1);
        break;
    }
    setCurrentDate(newDate);
  }, [currentDate, viewType]);

  const navigateToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  return {
    currentDate,
    calendarData,
    navigateToDate,
    navigatePrevious,
    navigateNext,
    navigateToday
  };
}

// Hook for booking analytics and insights
export function useBookingAnalytics(
  bookings: UnifiedBookingBase[],
  timeRange: { start: Date; end: Date }
) {
  const analytics = useMemo(() => {
    const filteredBookings = bookings.filter(booking => {
      const bookingDate = new Date(booking.booking_date);
      return bookingDate >= timeRange.start && bookingDate <= timeRange.end;
    });

    const totalBookings = filteredBookings.length;
    const totalRevenue = filteredBookings.reduce((sum, booking) => sum + booking.total_amount, 0);
    const avgBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

    const statusBreakdown = filteredBookings.reduce((breakdown, booking) => {
      breakdown[booking.booking_status] = (breakdown[booking.booking_status] || 0) + 1;
      return breakdown;
    }, {} as Record<string, number>);

    const completedBookings = filteredBookings.filter(b => b.booking_status === 'completed').length;
    const cancelledBookings = filteredBookings.filter(b => b.booking_status === 'cancelled').length;
    const completionRate = totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0;
    const cancellationRate = totalBookings > 0 ? (cancelledBookings / totalBookings) * 100 : 0;

    // Daily trends
    const dailyTrends = filteredBookings.reduce((trends, booking) => {
      const date = booking.booking_date;
      if (!trends[date]) {
        trends[date] = { bookings: 0, revenue: 0 };
      }
      trends[date].bookings += 1;
      trends[date].revenue += booking.total_amount;
      return trends;
    }, {} as Record<string, { bookings: number; revenue: number }>);

    return {
      totalBookings,
      totalRevenue,
      avgBookingValue,
      completionRate,
      cancellationRate,
      statusBreakdown,
      dailyTrends,
      insights: [
        totalBookings > 0 ? `${totalBookings} total bookings` : 'No bookings in this period',
        totalRevenue > 0 ? `$${totalRevenue.toFixed(2)} total revenue` : 'No revenue in this period',
        completionRate > 90 ? 'Excellent completion rate' : completionRate > 70 ? 'Good completion rate' : 'Low completion rate',
        cancellationRate < 10 ? 'Low cancellation rate' : 'High cancellation rate - investigate causes'
      ]
    };
  }, [bookings, timeRange]);

  return analytics;
}