import { useState, useMemo, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api/endpoints";
import { useAuth } from "@/contexts/auth/AuthProvider";
import { supabase } from "@/lib/supabase";
import { PAGINATION_CONFIG, getPageSize, getDateRange } from "../config/pagination.config";

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
  
  // State management
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState("present");
  
  // Wrapper for setActiveTab
  const handleSetActiveTab = (tab: string) => {
    setActiveTab(tab);
  };
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  
  // Pagination state
  const [presentPage, setPresentPage] = useState(1);
  const [futurePage, setFuturePage] = useState(1);
  const [pastPage, setPastPage] = useState(1);
  
  // Date range state - separate for past and future
  const [dateRangePastDays, setDateRangePastDays] = useState(PAGINATION_CONFIG.defaultDateRangePast);
  const [dateRangeFutureDays, setDateRangeFutureDays] = useState(PAGINATION_CONFIG.defaultDateRangeFuture);
  
  // Dynamic page size based on device (responsive)
  const [pageSize, setPageSize] = useState(getPageSize());
  
  // Update page size on window resize
  useEffect(() => {
    const handleResize = () => {
      setPageSize(getPageSize());
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load bookings data with date range filtering
  // Note: We load bookings from past AND future, then let categorization handle grouping
  const loadBookings = async () => {
    if (!business?.id) return;

    setLoading(true);
    try {
      // Calculate date range for query (includes past and future)
      const { start, end } = getDateRange(dateRangePastDays, dateRangeFutureDays);
      const startDateStr = start.toISOString().split('T')[0];
      const endDateStr = end.toISOString().split('T')[0];
      
      // Use API endpoint with limit
      // We don't filter by date on the API side to ensure we get future bookings
      const response = await api.bookings.getBookings({
        business_id: business.id,
        limit: PAGINATION_CONFIG.databaseQueryLimit,
      });

      if (response.data && typeof response.data === 'object' && 'bookings' in response.data) {
        const apiData = response.data as { bookings: any[]; stats?: any };
        let bookingsData = apiData.bookings || [];
        
        // Filter by date range client-side to include past and future bookings
        bookingsData = bookingsData.filter((booking: any) => {
          if (!booking.booking_date) return false;
          // Include bookings within our date range (past and future)
          return booking.booking_date >= startDateStr && booking.booking_date <= endDateStr;
        });
        
        setBookings(bookingsData);
      } else {
        throw new Error('No data received from API');
      }
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
  };

  // Load bookings on mount and when business or date range changes
  useEffect(() => {
    loadBookings();
  }, [business?.id, dateRangePastDays, dateRangeFutureDays]);

  // Fetch unread message counts for all bookings
  // Note: provider from useAuth() has nested structure: provider.provider.user_id
  const providerUserId = provider?.provider?.user_id || provider?.provider?.id;
  
  useEffect(() => {
    if (!bookings.length || !providerUserId) return;

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
          console.error('Error fetching conversations:', convError);
          return;
        }

        // Get unread counts for all conversations
        const conversationIds = conversations.map(c => c.id);
        if (conversationIds.length === 0) return;

        const { data: notifications, error: notifError } = await supabase
          .from('message_notifications')
          .select('conversation_id')
          .in('conversation_id', conversationIds)
          .eq('user_id', providerUserId)
          .eq('is_read', false);

        if (notifError) {
          console.error('Error fetching notifications:', notifError);
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
        console.error('Error fetching unread counts:', error);
      }
    };

    fetchUnreadCounts();

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchUnreadCounts, 30000);
    return () => clearInterval(interval);
  }, [bookings, providerUserId]);

  // Reset pagination when tab changes
  useEffect(() => {
    if (activeTab === "present") setPresentPage(1);
    if (activeTab === "future") setFuturePage(1);
    if (activeTab === "past") setPastPage(1);
  }, [activeTab]);

  // Auto-redirect functionality: Move bookings from Future to Present when date arrives
  useEffect(() => {
    const checkForTimeTransitions = () => {
      const todayStr = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
      const finalStatuses = new Set(['completed', 'cancelled', 'declined', 'no_show']);
      
      // Only check for transitions if we're currently on the future tab
      if (activeTab !== 'future') return;
      
      // Check if any future bookings should move to present (when date becomes today or past)
      const bookingsToMove = bookings.filter((booking: any) => {
        const bookingDate = booking.booking_date;
        const bookingStatus = booking.booking_status;
        
        if (!bookingDate || !bookingStatus) return false;
        
        // If booking date is today or past, and NOT in final status, it should be in present
        return (bookingDate <= todayStr) && !finalStatuses.has(bookingStatus);
      });

      // Only redirect if there are actually bookings that need to move
      if (bookingsToMove.length > 0) {
        handleSetActiveTab('present');
        toast({
          title: "Bookings Updated",
          description: "Some bookings have moved to the Present tab.",
        });
      }
    };

    // Only run the check on an interval, not immediately on every render
    const interval = setInterval(checkForTimeTransitions, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [bookings, activeTab, toast]);

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
  }, [bookings, searchQuery, selectedStatusFilter, showUnreadOnly, showUnassignedOnly, unreadCounts]);

  // Categorize bookings into present, future, and past
  const categorizedBookings = useMemo(() => {
    const present: any[] = [];
    const future: any[] = [];
    const past: any[] = [];
    const finalStatuses = new Set(['completed', 'cancelled', 'declined', 'no_show']);
    const todayStr = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
    
    filteredBookings.forEach((b: any) => {
      const status = b.booking_status;
      const dateStr: string = b.booking_date || '';
      
      // PAST = Final status states (completed, cancelled, declined, no_show)
      if (finalStatuses.has(status)) {
        past.push(b);
        return;
      }
      
      // FUTURE = Future dates (not in final status)
      if (dateStr > todayStr) {
        future.push(b);
        return;
      }
      
      // PRESENT = Today's date or in the past (not in final status)
      if (dateStr <= todayStr) {
        present.push(b);
        return;
      }
      
      // Fallback (should never reach here)
      present.push(b);
    });

    return { present, future, past };
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
      present: calculatePagination(categorizedBookings.present, presentPage),
      future: calculatePagination(categorizedBookings.future, futurePage),
      past: calculatePagination(categorizedBookings.past, pastPage),
    };
  }, [categorizedBookings, presentPage, futurePage, pastPage, pageSize]);

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
    presentBookings: categorizedBookings.present,
    futureBookings: categorizedBookings.future,
    pastBookings: categorizedBookings.past,
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
    setActiveTab: handleSetActiveTab,
    selectedBooking,
    setSelectedBooking,
    
    // Pagination
    presentPage,
    setPresentPage,
    futurePage,
    setFuturePage,
    pastPage,
    setPastPage,
    
    // Actions
    loadBookings,
    updateBookingStatus,
    formatDisplayTime,
  };
}