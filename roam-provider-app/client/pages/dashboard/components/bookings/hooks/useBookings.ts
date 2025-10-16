import { useState, useMemo, useEffect } from "react";
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
              phone
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
    const presentSet = new Set(['pending','confirmed','in_progress']);
    const futureSet = new Set(['pending','confirmed']);
    const pastSet = new Set(['completed','cancelled','declined','no_show']);
    const todayStr = new Date().toLocaleDateString('en-CA');

    filteredBookings.forEach(b => {
      const status = b.booking_status;
      const dateStr: string = b.booking_date || '';
      
      if (dateStr === todayStr && presentSet.has(status)) {
        present.push(b);
      } else if (dateStr > todayStr && futureSet.has(status)) {
        future.push(b);
      } else if (dateStr < todayStr || pastSet.has(status)) {
        past.push(b);
      } else {
        past.push(b);
      }
    });

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

  // Update booking status
  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
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

      if (response.data) {
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
      
      // Fallback to direct Supabase call if API fails
      try {
        const { error: supabaseError } = await (supabase as any)
          .from("bookings")
          .update({ booking_status: newStatus })
          .eq("id", bookingId);

        if (supabaseError) {
          throw supabaseError;
        }

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
      } catch (fallbackError) {
        console.error("Fallback error updating booking status:", fallbackError);
        toast({
          title: "Error",
          description: "Failed to update booking status. Please try again.",
          variant: "destructive",
        });
      }
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
    setActiveTab,
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