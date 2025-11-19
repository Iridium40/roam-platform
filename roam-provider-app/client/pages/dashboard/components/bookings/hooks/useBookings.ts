import { useState, useMemo, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api/endpoints";
import { useAuth } from "@/contexts/auth/AuthProvider";

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
  const { user } = useAuth();
  
  // State management
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
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
      // Use API endpoint instead of direct Supabase call
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
      
      // Fallback to direct Supabase call if API fails
      try {
        const { data, error: supabaseError } = await supabase
          .from("bookings")
          .select(`
            *,
            customer_profiles (
              id,
              first_name,
              last_name,
              email,
              phone,
              image_url
            ),
            customer_locations (
              id,
              location_name,
              street_address,
              unit_number,
              city,
              state,
              zip_code,
              latitude,
              longitude,
              is_primary,
              is_active,
              access_instructions,
              location_type
            ),
            business_locations (
              id,
              location_name,
              address_line1,
              address_line2,
              city,
              state,
              postal_code
            ),
            services (
              id,
              name,
              description,
              duration_minutes,
              min_price
            ),
            providers (
              id,
              first_name,
              last_name
            )
          `)
          .eq("business_id", business.id)
          .order("booking_date", { ascending: false })
          .order("start_time", { ascending: false });

        if (supabaseError) {
          throw supabaseError;
        }

        setBookings(data || []);
      } catch (fallbackError) {
        console.error("Fallback error loading bookings:", fallbackError);
        toast({
          title: "Error",
          description: "Failed to load bookings. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Load bookings on mount and when business changes
  useEffect(() => {
    loadBookings();
  }, [business?.id]);

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

  // Filter bookings based on search and status
  const filteredBookings = useMemo(() => {
    let filtered = bookings;

    // Apply status filter
    if (selectedStatusFilter !== "all") {
      filtered = filtered.filter(booking => booking.booking_status === selectedStatusFilter);
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
  }, [bookings, searchQuery, selectedStatusFilter]);

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
      console.log('Frontend: Updating booking status', {
        bookingId,
        newStatus,
        updatedBy: user?.id || 'provider',
        reason: `Status updated to ${newStatus}`
      });
      
      // Use API endpoint instead of direct Supabase call
      const response = await api.bookings.updateStatus({
        bookingId,
        status: newStatus,
        updatedBy: user?.id || 'provider',
        reason: `Status updated to ${newStatus}`
      });
      
      console.log('Frontend: API response', response);

      // Check if the response indicates success (handle both response.data.success and response.success)
      const isSuccess = response?.data?.success || response?.success;
      
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
      
      // Don't use fallback - let the error propagate so user knows it failed
        toast({
          title: "Error",
        description: error?.response?.data?.details || error?.message || "Failed to update booking status. Please try again.",
          variant: "destructive",
        });
      throw error; // Re-throw to prevent fallback
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
    
    // UI State
    loading,
    searchQuery,
    setSearchQuery,
    selectedStatusFilter,
    setSelectedStatusFilter,
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