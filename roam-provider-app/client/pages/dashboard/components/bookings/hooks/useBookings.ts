import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api/endpoints";
import { useAuth } from "@/contexts/auth/AuthProvider";
import { supabase } from "@/lib/supabase";
import { PAGINATION_CONFIG, getPageSize, getDateRange } from "../config/pagination.config";
import { getAuthHeaders } from "@/lib/api/authUtils";

interface BookingStats {
  totalBookings: number;
  completionRate: number;
  totalRevenue: number;
  averageBookingValue: number;
  pendingBookings: number;
  inProgressBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  confirmedBookings: number;
}

export function useBookings(providerData: any, business: any) {
  const { toast } = useToast();
  const { provider } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // State management
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState("active");
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  
  // Pagination state
  const [activePage, setActivePage] = useState(1);
  const [closedPage, setClosedPage] = useState(1);
  
  // Date range state - separate for past and future
  const [dateRangePastDays, setDateRangePastDays] = useState(PAGINATION_CONFIG.defaultDateRangePast);
  const [dateRangeFutureDays, setDateRangeFutureDays] = useState(PAGINATION_CONFIG.defaultDateRangeFuture);
  
  // Dynamic page size based on device (responsive)
  const [pageSize, setPageSize] = useState(getPageSize());
  
  // Check URL params for filters and sync with state
  useEffect(() => {
    const unassignedFromUrl = searchParams.get('unassigned') === 'true';
    const unreadFromUrl = searchParams.get('unread') === 'true';
    const statusFromUrl = searchParams.get('status');
    const dateFromUrl = searchParams.get('date');
    const searchFromUrl = searchParams.get('search');
    
    if (unassignedFromUrl && !showUnassignedOnly) {
      setShowUnassignedOnly(true);
      // Remove the query param after setting the state to keep URL clean
      searchParams.delete('unassigned');
      setSearchParams(searchParams, { replace: true });
    }
    
    if (unreadFromUrl && !showUnreadOnly) {
      setShowUnreadOnly(true);
      // Remove the query param after setting the state to keep URL clean
      searchParams.delete('unread');
      setSearchParams(searchParams, { replace: true });
    }
    
    if (statusFromUrl && statusFromUrl !== selectedStatusFilter) {
      setSelectedStatusFilter(statusFromUrl);
      // Remove the query param after setting the state to keep URL clean
      searchParams.delete('status');
      setSearchParams(searchParams, { replace: true });
    }
    
    // Handle date filter for "Today's Schedule"
    if (dateFromUrl && dateFromUrl !== selectedDateFilter) {
      setSelectedDateFilter(dateFromUrl);
      // Remove the query param after setting the state to keep URL clean
      searchParams.delete('date');
      setSearchParams(searchParams, { replace: true });
    }
    
    // Handle search query from URL (for booking reference search)
    if (searchFromUrl && searchFromUrl !== searchQuery) {
      setSearchQuery(searchFromUrl);
      // Remove the query param after setting the state to keep URL clean
      searchParams.delete('search');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, showUnassignedOnly, showUnreadOnly, selectedStatusFilter, selectedDateFilter, searchQuery]);
  
  // Update page size on window resize
  useEffect(() => {
    const handleResize = () => {
      setPageSize(getPageSize());
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load bookings data with date range filtering using optimized API
  // Note: We load bookings from past AND future, then let categorization handle grouping
  const loadBookings = useCallback(async () => {
    if (!business?.id) return;

    setLoading(true);
    try {
      // Calculate date range for query (includes past and future)
      const { start, end } = getDateRange(dateRangePastDays, dateRangeFutureDays);
      const startDateStr = start.toISOString().split('T')[0];
      const endDateStr = end.toISOString().split('T')[0];
      
      // Use optimized API endpoint with server-side filtering
      const headers = await getAuthHeaders();
      const queryParams = new URLSearchParams({
        business_id: business.id,
        date_from: startDateStr,
        date_to: endDateStr,
        limit: PAGINATION_CONFIG.databaseQueryLimit.toString(),
      });
      
      const response = await fetch(`/api/bookings-optimized?${queryParams}`, {
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to load bookings: ${response.status}`);
      }

      const data = await response.json();
      
      // The optimized API returns { bookings, stats, pagination }
      const bookingsData = data.bookings || [];
      setBookings(bookingsData);
      
    } catch (error: any) {
      console.error("Error loading bookings:", error);
      toast({
        title: "Error",
        description: error?.response?.data?.error || error?.message || "Failed to load bookings. Please try again.",
        variant: "destructive",
      });
      // Set empty array on error to prevent UI from breaking
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [business?.id, dateRangePastDays, dateRangeFutureDays, toast]);

  // Load bookings on mount and when business or date range changes
  useEffect(() => {
    loadBookings();
  }, [business?.id, dateRangePastDays, dateRangeFutureDays]);

  // Auto-refresh bookings every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      loadBookings();
    }, 5 * 60 * 1000); // 5 minutes in milliseconds

    return () => clearInterval(interval);
  }, [loadBookings]);

  // Fetch unread message counts for all bookings
  // Note: provider from useAuth() has nested structure: provider.provider.user_id
  const providerUserId = provider?.provider?.user_id || provider?.provider?.id;
  
  useEffect(() => {
    if (!bookings.length || !providerUserId) {
      return;
    }

    const fetchUnreadCounts = async () => {
      try {
        // Get all conversation IDs for these bookings
        const bookingIds = bookings.map(b => b.id);
        const { data: conversations, error: convError } = await supabase
          .from('conversation_metadata')
          .select('id, booking_id')
          .in('booking_id', bookingIds)
          .eq('is_active', true);

        if (convError || !conversations) {
          return;
        }

        // Get unread counts for all conversations
        const conversationIds = conversations.map(c => c.id);
        if (conversationIds.length === 0) {
          return;
        }

        const { data: notifications, error: notifError } = await supabase
          .from('message_notifications')
          .select('conversation_id')
          .in('conversation_id', conversationIds)
          .eq('user_id', providerUserId)
          .eq('is_read', false);

        if (notifError) {
          return;
        }

        // Count unread messages per conversation
        const counts: Record<string, number> = {};
        notifications?.forEach(notif => {
          counts[notif.conversation_id] = (counts[notif.conversation_id] || 0) + 1;
        });

        // Map conversation IDs to booking IDs
        const unreadByBooking: Record<string, number> = {};
        conversations.forEach(conv => {
          const count = counts[conv.id] || 0;
          if (count > 0) {
            unreadByBooking[conv.booking_id] = count;
          }
        });

        setUnreadCounts(unreadByBooking);
      } catch (error) {
        // Silent failure - unread counts are not critical
      }
    };

    fetchUnreadCounts();

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchUnreadCounts, 30000);
    return () => clearInterval(interval);
  }, [bookings, providerUserId, provider]);

  // Reset pagination when tab changes
  useEffect(() => {
    if (activeTab === "active") setActivePage(1);
    if (activeTab === "closed") setClosedPage(1);
  }, [activeTab]);

  // Note: Auto-redirect functionality removed since we now use Active/Closed tabs
  // Active tab shows all non-final bookings regardless of date, so no redirect needed

  // Filter bookings based on search, status, unread messages, and assignment
  const filteredBookings = useMemo(() => {
    let filtered = bookings;

    // Apply status filter
    if (selectedStatusFilter !== "all") {
      filtered = filtered.filter(booking => booking.booking_status === selectedStatusFilter);
    }

    // Apply unread messages filter
    if (showUnreadOnly) {
      filtered = filtered.filter(booking => {
        const unreadCount = unreadCounts[booking.id] || 0;
        return unreadCount > 0;
      });
    }

    // Apply unassigned filter
    if (showUnassignedOnly) {
      filtered = filtered.filter(booking => !booking.provider_id || booking.provider_id === 'unassigned');
    }

    // Apply date filter (for "Today's Schedule")
    if (selectedDateFilter) {
      filtered = filtered.filter(booking => {
        const bookingDate = booking.booking_date ? new Date(booking.booking_date).toISOString().split('T')[0] : null;
        return bookingDate === selectedDateFilter;
      });
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(booking => {
        const customerName = booking.customer_profiles 
          ? `${booking.customer_profiles.first_name || ""} ${booking.customer_profiles.last_name || ""}`.toLowerCase()
          : "";
        const serviceName = booking.services?.name?.toLowerCase() || "";
        const reference = booking.booking_reference?.toLowerCase() || "";
        
        return customerName.includes(query) || serviceName.includes(query) || reference.includes(query);
      });
    }

    // Sort by date and time
    return filtered.sort((a, b) => {
      const dateA = new Date(`${a.booking_date} ${a.start_time}`);
      const dateB = new Date(`${b.booking_date} ${b.start_time}`);
      return dateB.getTime() - dateA.getTime();
    });
  }, [bookings, searchQuery, selectedStatusFilter, showUnreadOnly, showUnassignedOnly, selectedDateFilter, unreadCounts]);

  // Categorize bookings into active and closed
  const categorizedBookings = useMemo(() => {
    const active: any[] = [];
    const closed: any[] = [];
    const finalStatuses = new Set(['completed', 'cancelled', 'declined', 'no_show']);
    
    filteredBookings.forEach((b: any) => {
      const status = b.booking_status;
      
      // CLOSED = Final status states (completed, cancelled, declined, no_show)
      if (finalStatuses.has(status)) {
        closed.push(b);
        return;
      }
      
      // ACTIVE = All non-final bookings (pending, confirmed, in_progress)
      active.push(b);
    });

    // Sort active bookings by date ascending (earliest first)
    active.sort((a, b) => {
      const dateA = a.booking_date || '';
      const dateB = b.booking_date || '';
      return dateA.localeCompare(dateB);
    });

    // Sort closed bookings by date ascending (earliest first)
    closed.sort((a, b) => {
      const dateA = a.booking_date || '';
      const dateB = b.booking_date || '';
      return dateA.localeCompare(dateB);
    });

    return { active, closed };
  }, [filteredBookings]);

  // Calculate pagination data
  // Note: For lists exceeding PAGINATION_CONFIG.maxItemsBeforeVirtualScroll (100 items),
  // consider implementing virtual scrolling for better performance
  const paginatedData = useMemo(() => {
    const calculatePagination = (items: any[], currentPage: number) => {
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedItems = items.slice(startIndex, endIndex);
      const totalPages = Math.ceil(items.length / pageSize);


      return {
        items: paginatedItems,
        totalPages,
        currentPage,
        totalItems: items.length,
      };
    };

    return {
      active: calculatePagination(categorizedBookings.active, activePage),
      closed: calculatePagination(categorizedBookings.closed, closedPage),
    };
  }, [categorizedBookings, activePage, closedPage, pageSize]);

  // Calculate booking statistics
  const bookingStats = useMemo((): BookingStats => {
    const totalBookings = bookings.length;
    const completedBookings = bookings.filter(b => b.booking_status === 'completed').length;
    const cancelledBookings = bookings.filter(b => b.booking_status === 'cancelled').length;
    const pendingBookings = bookings.filter(b => b.booking_status === 'pending').length;
    const confirmedBookings = bookings.filter(b => b.booking_status === 'confirmed').length;
    const inProgressBookings = bookings.filter(b => b.booking_status === 'in_progress').length;
    
    const completionRate = totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0;
    
    const totalRevenue = bookings
      .filter(b => b.booking_status === 'completed' && b.total_amount)
      .reduce((sum, b) => sum + parseFloat(b.total_amount || '0'), 0);
    
    const averageBookingValue = completedBookings > 0 ? totalRevenue / completedBookings : 0;

    return {
      totalBookings,
      completionRate,
      totalRevenue,
      averageBookingValue,
      pendingBookings,
      inProgressBookings,
      completedBookings,
      cancelledBookings,
      confirmedBookings,
    };
  }, [bookings]);

  // Track in-flight requests to prevent duplicates
  const updatingStatuses = useRef<Set<string>>(new Set());

  // Update booking status
  const updateBookingStatus = async (bookingId: string, newStatus: string, reason?: string) => {
    // Prevent duplicate requests for the same booking
    const requestKey = `${bookingId}-${newStatus}`;
    if (updatingStatuses.current.has(requestKey)) {
      return; // Request already in progress
    }

    updatingStatuses.current.add(requestKey);

    try {
      const userId = provider?.provider?.user_id || provider?.provider?.id || 'provider';
      
      // Use API endpoint instead of direct Supabase call
      // Wrap in Promise.race to handle potential Stripe timeout issues
      // For declines, use the provided reason; otherwise use a generic message
      const statusReason = reason || (newStatus === 'declined' 
        ? 'Booking declined by provider' 
        : `Status updated to ${newStatus}`);
      
      const apiCall = api.bookings.updateStatus({
        bookingId,
        status: newStatus,
        updatedBy: userId,
        reason: statusReason
      });

      // Set a timeout to prevent hanging on network issues
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout - please try again')), 30000)
      );

      const response = await Promise.race([apiCall, timeoutPromise]) as any;

      // Check if the response indicates success (handle both response.data.success and response.success)
      const isSuccess = (response?.data as any)?.success || (response as any)?.success;
      
      if (isSuccess) {
        // Update local state
        setBookings(prev => prev.map(booking => 
          booking.id === bookingId 
            ? { ...booking, booking_status: newStatus }
            : booking
        ));

        toast({
          title: "Success",
          description: "Booking status updated successfully.",
        });
      } else {
        throw new Error('Failed to update booking status');
      }
    } catch (error: any) {
      console.error("Error updating booking status:", error);
      
      // Extract error details from various possible locations in the response
      const responseData = error?.response?.data || error?.data || {};
      const apiErrorMessage = responseData?.details || responseData?.error || '';
      const errorMessage = error?.message || '';
      
      // Check for specific provider assignment error
      const isProviderAssignmentError = 
        apiErrorMessage.toLowerCase().includes('provider') ||
        apiErrorMessage.toLowerCase().includes('assigned') ||
        responseData?.error === 'Cannot accept booking without assigned provider';
      
      // Filter out Stripe-related errors that are not relevant to booking status updates
      const isStripeError = errorMessage.includes('stripe') || 
                           errorMessage.includes('Stripe') ||
                           responseData?.error?.includes?.('stripe');
      
      // Ignore Stripe timeout errors as they're likely unrelated to the booking update
      if (isStripeError && (errorMessage.includes('timeout') || errorMessage.includes('TIMED_OUT'))) {
        // Still update local state optimistically if it's a decline action
        if (newStatus === 'declined') {
          setBookings(prev => prev.map(booking => 
            booking.id === bookingId 
              ? { ...booking, booking_status: newStatus }
              : booking
          ));
          toast({
            title: "Success",
            description: "Booking declined successfully.",
          });
          return; // Exit early - don't show error for Stripe timeout
        }
      }
      
      // Determine the best error message to show
      let displayMessage = "Failed to update booking status. Please try again.";
      
      if (isProviderAssignmentError) {
        displayMessage = "Please assign a provider to this booking before accepting it. Use 'Details & Assignment' to assign a provider.";
      } else if (apiErrorMessage) {
        displayMessage = apiErrorMessage;
      } else if (isStripeError) {
        displayMessage = "Booking status may have been updated. Please refresh to confirm.";
      } else if (errorMessage && errorMessage !== 'Failed to update booking status') {
        displayMessage = errorMessage;
      }
      
      // Show error with descriptive message
      toast({
        title: isProviderAssignmentError ? "Provider Required" : "Error",
        description: displayMessage,
        variant: "destructive",
      });
      
      // Only re-throw if it's not a Stripe error
      if (!isStripeError) {
        throw error;
      }
    } finally {
      // Remove from in-flight set after a delay to allow for any retries
      setTimeout(() => {
        updatingStatuses.current.delete(requestKey);
      }, 2000);
    }
  };

  // Utility function to format time display
  const formatDisplayTime = (time: string): string => {
    if (!time) return '';
    try {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch {
      return time;
    }
  };

  return {
    // Data
    bookings: filteredBookings,
    bookingStats,
    activeBookings: categorizedBookings.active,
    closedBookings: categorizedBookings.closed,
    // Keep old names for backward compatibility with stats section
    presentBookings: categorizedBookings.active,
    futureBookings: [],
    pastBookings: categorizedBookings.closed,
    paginatedData,
    unreadCounts,
    
    // UI State
    loading,
    searchQuery,
    setSearchQuery,
    selectedStatusFilter,
    setSelectedStatusFilter,
    showUnreadOnly,
    setShowUnreadOnly,
    showUnassignedOnly,
    setShowUnassignedOnly,
    activeTab,
    setActiveTab,
    selectedBooking,
    setSelectedBooking,
    
    // Pagination
    activePage,
    setActivePage,
    closedPage,
    setClosedPage,
    // Keep old names for backward compatibility
    presentPage: activePage,
    setPresentPage: setActivePage,
    futurePage: 1,
    setFuturePage: () => {},
    pastPage: closedPage,
    setPastPage: setClosedPage,
    
    // Actions
    loadBookings,
    updateBookingStatus,
    formatDisplayTime,
  };
}