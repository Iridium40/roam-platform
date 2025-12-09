import { useState, useMemo, useEffect } from "react";
import type { BookingWithDetails } from "@/types/index";
import { PAGINATION_CONFIG, getPageSize } from "../config/pagination.config";

export const useBookingFilters = (bookings: BookingWithDetails[]) => {
  const [currentPage, setCurrentPage] = useState({
    active: 1,
    closed: 1,
  });
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Reset pagination when search or filter changes
  useEffect(() => {
    setCurrentPage({ active: 1, closed: 1 });
  }, [searchQuery, statusFilter]);
  
  // Use dynamic page size based on device (mobile vs desktop)
  const [itemsPerPage, setItemsPerPage] = useState(getPageSize());
  
  // Update page size on window resize
  useEffect(() => {
    const handleResize = () => {
      setItemsPerPage(getPageSize());
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const ITEMS_PER_PAGE = itemsPerPage;

  // Filter bookings by status, search, and category
  // ACTIVE: All non-final bookings (pending, confirmed, in_progress) regardless of date
  // CLOSED: All final state bookings (completed, cancelled, no_show, declined) regardless of date
  const filteredBookings = useMemo(() => {
    // Ensure bookings is an array
    const safeBookings = Array.isArray(bookings) ? bookings : [];
    
    // First, apply search and status filters
    let filtered = safeBookings;
    
    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((booking) => {
        return booking.booking_status === statusFilter;
      });
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((booking) => {
        // Search by service name
        const serviceName = booking.services?.name?.toLowerCase() || "";
        
        // Search by booking reference
        const bookingReference = booking.booking_reference?.toLowerCase() || "";
        
        // Search by business/provider name
        const businessName = booking.business_profiles?.business_name?.toLowerCase() || "";
        
        // Search by provider name
        const providerName = booking.providers
          ? `${booking.providers.first_name || ""} ${booking.providers.last_name || ""}`.toLowerCase()
          : "";
        
        return (
          serviceName.includes(query) ||
          bookingReference.includes(query) ||
          businessName.includes(query) ||
          providerName.includes(query)
        );
      });
    }
    
    // Then categorize into active and closed
    const result = {
      // ACTIVE TAB:
      // - All bookings that are NOT in a final state (completed, cancelled, no_show, declined)
      // - Includes pending, confirmed, in_progress regardless of date
      active: filtered.filter((booking) => {
        const status = booking.booking_status || 'pending';
        
        // Exclude final states: completed, cancelled, no_show, declined
        const excludedStatuses = new Set(['completed', 'cancelled', 'no_show', 'declined']);
        const isFinalState = excludedStatuses.has(status);
        
        // Show all non-final state bookings
        return !isFinalState;
      }).sort((a, b) => {
        // Sort active bookings by date ascending (earliest first)
        const dateA = a.booking_date || '';
        const dateB = b.booking_date || '';
        return dateA.localeCompare(dateB);
      }),
      
      // CLOSED TAB:
      // - All bookings in final states (completed, cancelled, no_show, declined) regardless of date
      closed: filtered.filter((booking) => {
        const status = booking.booking_status || 'pending';
        
        // Show all final state bookings regardless of date
        const finalStates = new Set(['completed', 'cancelled', 'no_show', 'declined']);
        const isFinalState = finalStates.has(status);
        
        return isFinalState;
      }).sort((a, b) => {
        // Sort closed bookings by date ascending (earliest first)
        const dateA = a.booking_date || '';
        const dateB = b.booking_date || '';
        return dateA.localeCompare(dateB);
      }),
    };

    console.log("Filtered bookings result:", {
      active: result.active.length,
      closed: result.closed.length,
      activeStatuses: result.active.map(b => ({ id: b.id, date: b.booking_date, status: b.booking_status })).slice(0, 3),
      closedStatuses: result.closed.map(b => ({ id: b.id, date: b.booking_date, status: b.booking_status })).slice(0, 3)
    });

    return result;
  }, [bookings, searchQuery, statusFilter]);

  // Pagination logic
  const getPaginatedBookings = (bookings: BookingWithDetails[], page: number) => {
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return bookings.slice(startIndex, endIndex);
  };

  const getTotalPages = (totalItems: number) => {
    return Math.ceil(totalItems / ITEMS_PER_PAGE);
  };

  // Page navigation functions
  const goToPage = (category: "active" | "closed", page: number) => {
    setCurrentPage((prev) => ({
      ...prev,
      [category]: page,
    }));
  };

  const nextPage = (category: "active" | "closed") => {
    const currentBookings = filteredBookings[category];
    const totalPages = getTotalPages(currentBookings.length);
    const currentPageNum = currentPage[category];

    if (currentPageNum < totalPages) {
      goToPage(category, currentPageNum + 1);
    }
  };

  const prevPage = (category: "active" | "closed") => {
    const currentPageNum = currentPage[category];
    if (currentPageNum > 1) {
      goToPage(category, currentPageNum - 1);
    }
  };

  // Get paginated results
  const paginatedBookings = {
    active: getPaginatedBookings(filteredBookings.active, currentPage.active),
    closed: getPaginatedBookings(filteredBookings.closed, currentPage.closed),
  };

  console.log("Pagination results:", {
    active: {
      filtered: filteredBookings.active.length,
      paginated: paginatedBookings.active.length,
      currentPage: currentPage.active,
      totalPages: getTotalPages(filteredBookings.active.length)
    },
    closed: {
      filtered: filteredBookings.closed.length,
      paginated: paginatedBookings.closed.length,
      currentPage: currentPage.closed,
      totalPages: getTotalPages(filteredBookings.closed.length)
    }
  });

  // Get total pages for each category
  const totalPages = {
    active: getTotalPages(filteredBookings.active.length),
    closed: getTotalPages(filteredBookings.closed.length),
  };

  return {
    filteredBookings,
    paginatedBookings,
    currentPage,
    totalPages,
    goToPage,
    nextPage,
    prevPage,
    ITEMS_PER_PAGE,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
  };
};
