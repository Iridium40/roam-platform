import { useState, useMemo, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api/endpoints";
import { useAuth } from "@/contexts/auth/AuthProvider";
import { supabase } from "@/lib/supabase";

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
  
  // Debug wrapper for setActiveTab
  const handleSetActiveTab = (tab: string) => {
    console.log('🎯 setActiveTab called:', { from: activeTab, to: tab });
    setActiveTab(tab);
  };
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  
  // Pagination state
  const [presentPage, setPresentPage] = useState(1);
  const [futurePage, setFuturePage] = useState(1);
  const [pastPage, setPastPage] = useState(1);
  
  const pageSize = 20;

  // Load bookings data
  const loadBookings = async () => {
    if (!business?.id) return;

    setLoading(true);
    try {
      // Use API endpoint - no fallback to avoid circular dependency issues
      const response = await api.bookings.getBookings({
        business_id: business.id,
        limit: 1000 // Load all bookings for now
      });

      if (response.data && typeof response.data === 'object' && 'bookings' in response.data) {
        const apiData = response.data as { bookings: any[]; stats?: any };
        setBookings(apiData.bookings || []);
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

  // Load bookings on mount and when business changes
  useEffect(() => {
    loadBookings();
  }, [business?.id]);

  // Fetch unread message counts for all bookings
  useEffect(() => {
    if (!bookings.length || !provider?.user_id) return;

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
          .eq('user_id', provider.user_id)
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
  }, [bookings, provider?.user_id]);

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
        console.log('📅 Auto-redirecting due to time transitions:', bookingsToMove.length, 'bookings');
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
    
    console.log('=== BOOKING CATEGORIZATION START ===');
    console.log('Today is:', todayStr);
    console.log('Total filtered bookings:', filteredBookings.length);

    filteredBookings.forEach((b: any, index: number) => {
      const status = b.booking_status;
      const dateStr: string = b.booking_date || '';
      
      console.log(`\n[Booking ${index + 1}]`, {
        id: b.id,
        service: b.services?.name,
        status,
        dateStr,
        todayStr,
      });
      
      // PAST = Final status states (completed, cancelled, declined, no_show)
      if (finalStatuses.has(status)) {
        console.log(`  ✓ PAST - Final status: ${status}`);
        past.push(b);
        return;
      }
      
      // FUTURE = Future dates (not in final status)
      if (dateStr > todayStr) {
        console.log('  ✓ FUTURE - Date is in the future');
        future.push(b);
        return;
      }
      
      // PRESENT = Today's date or in the past (not in final status)
      if (dateStr <= todayStr) {
        console.log(`  ✓ PRESENT - Date is ${dateStr === todayStr ? 'today' : 'past'}`);
        present.push(b);
        return;
      }
      
      // Fallback (should never reach here)
      console.log('  ⚠ FALLBACK - Defaulting to PRESENT');
      present.push(b);
    });
    
    console.log('\n=== CATEGORIZATION RESULTS ===');
    console.log(`Present: ${present.length} bookings`);
    console.log(`Future: ${future.length} bookings`);
    console.log(`Past: ${past.length} bookings`);
    console.log('===========================\n');

    return { present, future, past };
  }, [filteredBookings]);

  // Calculate pagination data
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
  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    // Prevent duplicate requests for the same booking
    const requestKey = `${bookingId}-${newStatus}`;
    if (updatingStatuses.current.has(requestKey)) {
      console.log('Request already in progress, skipping duplicate:', requestKey);
      return;
    }

    updatingStatuses.current.add(requestKey);

    try {
      const userId = provider?.provider?.user_id || provider?.provider?.id || 'provider';
      console.log('Frontend: Updating booking status', {
        bookingId,
        newStatus,
        updatedBy: userId,
        reason: `Status updated to ${newStatus}`
      });
      
      // Use API endpoint instead of direct Supabase call
      // Wrap in Promise.race to handle potential Stripe timeout issues
      const apiCall = api.bookings.updateStatus({
        bookingId,
        status: newStatus,
        updatedBy: userId,
        reason: `Status updated to ${newStatus}`
      });

      // Set a timeout to prevent hanging on network issues
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout - please try again')), 30000)
      );

      const response = await Promise.race([apiCall, timeoutPromise]) as any;
      
      console.log('Frontend: API response', response);

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
      
      // Filter out Stripe-related errors that are not relevant to booking status updates
      const errorMessage = error?.message || '';
      const isStripeError = errorMessage.includes('stripe') || 
                           errorMessage.includes('Stripe') ||
                           error?.response?.data?.error?.includes('stripe');
      
      // Ignore Stripe timeout errors as they're likely unrelated to the booking update
      if (isStripeError && (errorMessage.includes('timeout') || errorMessage.includes('TIMED_OUT'))) {
        console.warn('⚠️ Stripe-related error detected but ignoring (likely browser extension):', errorMessage);
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
      
      // Show error for non-Stripe errors or if optimistic update didn't work
      toast({
        title: "Error",
        description: error?.response?.data?.details || 
                   error?.response?.data?.error ||
                   (isStripeError ? "Booking status may have been updated. Please refresh to confirm." : errorMessage) ||
                   "Failed to update booking status. Please try again.",
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