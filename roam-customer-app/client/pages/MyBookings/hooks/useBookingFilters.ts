import { useState, useMemo, useEffect } from "react";
import type { BookingWithDetails } from "@/types/index";
import { PAGINATION_CONFIG, getPageSize } from "../config/pagination.config";

export const useBookingFilters = (bookings: BookingWithDetails[]) => {
  const [currentPage, setCurrentPage] = useState({
    present: 1,
    future: 1,
    past: 1,
  });
  
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

  // Filter bookings by status
  // PRESENT: All non-final bookings PLUS completed bookings from today or future (excludes declined)
  // FUTURE: Active bookings (pending, confirmed) scheduled after today
  // PAST: Final state bookings (completed, cancelled, no_show, declined) ONLY if booking date is before today
  const filteredBookings = useMemo(() => {
    // Ensure bookings is an array
    const safeBookings = Array.isArray(bookings) ? bookings : [];
    
    console.log("🔄 FILTERING BOOKINGS - useMemo triggered", {
      bookingsLength: safeBookings.length,
      timestamp: new Date().toISOString()
    });
    
    const activeStatuses = new Set(['pending', 'confirmed']); // For future tab filtering
    
    // Calculate date objects for proper comparison in CST timezone
    const now = new Date();
    
    // Get current date in CST (UTC-6 for CST or UTC-5 for CDT)
    const cstFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    const cstDateParts = cstFormatter.format(now).split('/'); // Format: MM/DD/YYYY
    const todayStr = `${cstDateParts[2]}-${cstDateParts[0]}-${cstDateParts[1]}`; // Convert to YYYY-MM-DD
    
    // Calculate yesterday in CST
    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayParts = cstFormatter.format(yesterdayDate).split('/');
    const yesterdayStr = `${yesterdayParts[2]}-${yesterdayParts[0]}-${yesterdayParts[1]}`; // Convert to YYYY-MM-DD
    
    console.log("📅 DATE COMPARISON DEBUG (CST):", {
      todayStr,
      yesterdayStr,
      currentTime: new Date().toISOString(),
      cstTime: cstFormatter.format(now)
    });
    
    console.log("Filtering bookings:", {
      totalBookings: safeBookings.length,
      currentTime: new Date().toISOString(),
      todayStr,
      yesterdayStr,
      sampleBooking: safeBookings[0]
    });
    console.log("Filtering - full bookings array:", safeBookings);
    
    // Debug: Log each booking's categorization decision
    safeBookings.forEach((booking, index) => {
      const status = booking.booking_status || 'pending';
      const dateStr = booking.booking_date || '';
      
      const excludedStatuses = new Set(['completed', 'cancelled', 'no_show']);
      const isActiveStatus = activeStatuses.has(status);
      const isFinalState = excludedStatuses.has(status);
      const isAfterToday = dateStr && dateStr > todayStr;
      
      console.log(`Booking ${index}:`, {
        id: booking.id,
        booking_date: booking.booking_date,
        status: status,
        isFinalState,
        isActiveStatus,
        isAfterToday,
        shouldBeInPresent: !isFinalState,
        shouldBeInFuture: isActiveStatus && isAfterToday,
        shouldBeInPast: isFinalState
      });
    });

    const result = {
      // PRESENT TAB:
      // - All bookings that are NOT in a final state (completed, cancelled, no_show, declined)
      // - PLUS final state bookings if booking date is TODAY or FUTURE
      // - This keeps completed bookings visible until the day after
      present: safeBookings.filter((booking) => {
        const status = booking.booking_status || 'pending';
        const dateStr = booking.booking_date || '';
        
        // Exclude final states: completed, cancelled, no_show, declined
        const excludedStatuses = new Set(['completed', 'cancelled', 'no_show', 'declined']);
        const isFinalState = excludedStatuses.has(status);
        
        // If not a final state, always show in present
        if (!isFinalState) return true;
        
        // If it IS a final state, only show if booking date is today or future
        // This keeps completed bookings visible until the next day
        return dateStr >= todayStr;
      }).sort((a, b) => {
        // Sort present bookings: 'in_progress' first, then by date (most recent first)
        const statusA = a.booking_status || 'pending';
        const statusB = b.booking_status || 'pending';
        
        // If one is 'in_progress' and the other isn't, prioritize 'in_progress'
        if (statusA === 'in_progress' && statusB !== 'in_progress') return -1;
        if (statusB === 'in_progress' && statusA !== 'in_progress') return 1;
        
        // Otherwise, sort by date (most recent first)
        const dateA = a.booking_date || '';
        const dateB = b.booking_date || '';
        return dateB.localeCompare(dateA);
      }),
      
      // FUTURE TAB:
      // - PENDING or ACCEPTED scheduled AFTER TODAY
      future: safeBookings.filter((booking) => {
        const status = booking.booking_status || 'pending';
        const dateStr = booking.booking_date || '';
        
        const isActiveStatus = activeStatuses.has(status);
        const isAfterToday = dateStr && dateStr > todayStr;
        
        // PENDING or ACCEPTED scheduled AFTER TODAY
        return isActiveStatus && isAfterToday;
      }).sort((a, b) => {
        // Sort future bookings by date (earliest first)
        const dateA = a.booking_date || '';
        const dateB = b.booking_date || '';
        return dateA.localeCompare(dateB);
      }),
      
      // PAST TAB:
      // - Only bookings in final states (completed, cancelled, no_show, declined) where booking date is BEFORE today
      // - This way completed bookings stay in "Present" until the day after
      past: safeBookings.filter((booking) => {
        const status = booking.booking_status || 'pending';
        const dateStr = booking.booking_date || '';
        
        // Show only final state bookings that occurred BEFORE today
        const finalStates = new Set(['completed', 'cancelled', 'no_show', 'declined']);
        const isFinalState = finalStates.has(status);
        const isBeforeToday = dateStr < todayStr;
        
        return isFinalState && isBeforeToday;
      }).sort((a, b) => {
        // Sort past bookings by date (most recent first)
        const dateA = a.booking_date || '';
        const dateB = b.booking_date || '';
        return dateB.localeCompare(dateA);
      }),
    };

    console.log("Filtered bookings result:", {
      present: result.present.length,
      future: result.future.length,
      past: result.past.length,
      presentStatuses: result.present.map(b => ({ id: b.id, date: b.booking_date, status: b.booking_status })).slice(0, 3),
      futureStatuses: result.future.map(b => ({ id: b.id, date: b.booking_date, status: b.booking_status })).slice(0, 3),
      pastStatuses: result.past.map(b => ({ id: b.id, date: b.booking_date, status: b.booking_status })).slice(0, 3)
    });

    return result;
  }, [bookings]);

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
  const goToPage = (category: "present" | "future" | "past", page: number) => {
    setCurrentPage((prev) => ({
      ...prev,
      [category]: page,
    }));
  };

  const nextPage = (category: "present" | "future" | "past") => {
    const currentBookings = filteredBookings[category];
    const totalPages = getTotalPages(currentBookings.length);
    const currentPageNum = currentPage[category];

    if (currentPageNum < totalPages) {
      goToPage(category, currentPageNum + 1);
    }
  };

  const prevPage = (category: "present" | "future" | "past") => {
    const currentPageNum = currentPage[category];
    if (currentPageNum > 1) {
      goToPage(category, currentPageNum - 1);
    }
  };

  // Get paginated results
  const paginatedBookings = {
    present: getPaginatedBookings(filteredBookings.present, currentPage.present),
    future: getPaginatedBookings(filteredBookings.future, currentPage.future),
    past: getPaginatedBookings(filteredBookings.past, currentPage.past),
  };

  console.log("Pagination results:", {
    present: {
      filtered: filteredBookings.present.length,
      paginated: paginatedBookings.present.length,
      currentPage: currentPage.present,
      totalPages: getTotalPages(filteredBookings.present.length)
    },
    future: {
      filtered: filteredBookings.future.length,
      paginated: paginatedBookings.future.length,
      currentPage: currentPage.future,
      totalPages: getTotalPages(filteredBookings.future.length)
    },
    past: {
      filtered: filteredBookings.past.length,
      paginated: paginatedBookings.past.length,
      currentPage: currentPage.past,
      totalPages: getTotalPages(filteredBookings.past.length)
    }
  });

  // Get total pages for each category
  const totalPages = {
    present: getTotalPages(filteredBookings.present.length),
    future: getTotalPages(filteredBookings.future.length),
    past: getTotalPages(filteredBookings.past.length),
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
  };
};
