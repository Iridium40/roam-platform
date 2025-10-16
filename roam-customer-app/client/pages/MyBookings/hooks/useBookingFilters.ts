import { useState, useMemo } from "react";
import type { BookingWithDetails } from "@/types/index";

export const useBookingFilters = (bookings: BookingWithDetails[]) => {
  const [currentPage, setCurrentPage] = useState({
    present: 1,
    future: 1,
    past: 1,
  });
  const ITEMS_PER_PAGE = 10;

  // Filter bookings by status - Updated to match provider app logic
  const filteredBookings = useMemo(() => {
    // Ensure bookings is an array
    const safeBookings = Array.isArray(bookings) ? bookings : [];
    
    console.log("🔄 FILTERING BOOKINGS - useMemo triggered", {
      bookingsLength: safeBookings.length,
      timestamp: new Date().toISOString()
    });
    
    const finalStatuses = new Set(['completed', 'cancelled', 'declined', 'no_show']);
    const activeStatuses = new Set(['pending', 'confirmed']); // PENDING or ACCEPTED (confirmed = accepted)
    
    // Calculate date strings
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const todayStr = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    const yesterdayStr = yesterday.toISOString().split('T')[0]; // Format: YYYY-MM-DD

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
      const status = booking.booking_status || booking.booking_status || 'pending';
      const dateStr = booking.date || booking.booking_date || '';
      const isFinalStatus = finalStatuses.has(status);
      const isActiveStatus = activeStatuses.has(status);
      const isInProgress = status === 'in_progress';
      const isToday = dateStr === todayStr;
      const isYesterday = dateStr === yesterdayStr;
      const isTodayOrYesterday = isToday || isYesterday;
      const isBeforeYesterday = dateStr < yesterdayStr;
      const isAfterToday = dateStr > todayStr;
      
      console.log(`Booking ${index}:`, {
        id: booking.id,
        date: dateStr,
        status: status,
        isFinalStatus,
        isActiveStatus,
        isInProgress,
        isToday,
        isYesterday,
        isTodayOrYesterday,
        isBeforeYesterday,
        isAfterToday,
        shouldBeInPresent: isInProgress || (isFinalStatus && isTodayOrYesterday) || (isActiveStatus && isTodayOrYesterday),
        shouldBeInFuture: isActiveStatus && isAfterToday,
        shouldBeInPast: (isFinalStatus && isBeforeYesterday) || (isActiveStatus && isBeforeYesterday)
      });
    });

    const result = {
      // PRESENT TAB:
      // - IN_PROGRESS (any date)
      // - COMPLETED, CANCELLED, DECLINED, NO_SHOW scheduled for TODAY or YESTERDAY
      // - PENDING or ACCEPTED scheduled for TODAY or YESTERDAY
      present: safeBookings.filter((booking) => {
        const status = booking.booking_status || booking.booking_status || 'pending';
        const dateStr = booking.date || booking.booking_date || '';
        
        const isInProgress = status === 'in_progress';
        const isFinalStatus = finalStatuses.has(status);
        const isActiveStatus = activeStatuses.has(status);
        const isToday = dateStr === todayStr;
        const isYesterday = dateStr === yesterdayStr;
        const isTodayOrYesterday = isToday || isYesterday;
        
        // IN_PROGRESS (any date)
        if (isInProgress) return true;
        
        // COMPLETED, CANCELLED, DECLINED, NO_SHOW scheduled for TODAY or YESTERDAY
        if (isFinalStatus && isTodayOrYesterday) return true;
        
        // PENDING or ACCEPTED scheduled for TODAY or YESTERDAY
        if (isActiveStatus && isTodayOrYesterday) return true;
        
        return false;
      }).sort((a, b) => {
        // Sort present bookings: 'in_progress' first, then by date
        const statusA = a.booking_status || 'pending';
        const statusB = b.booking_status || 'pending';
        
        // If one is 'in_progress' and the other isn't, prioritize 'in_progress'
        if (statusA === 'in_progress' && statusB !== 'in_progress') return -1;
        if (statusB === 'in_progress' && statusA !== 'in_progress') return 1;
        
        // Otherwise, sort by date (most recent first)
        const dateA = a.date || a.booking_date || '';
        const dateB = b.date || b.booking_date || '';
        return dateB.localeCompare(dateA);
      }),
      
      // FUTURE TAB:
      // - PENDING or ACCEPTED scheduled AFTER TODAY
      future: safeBookings.filter((booking) => {
        const status = booking.booking_status || booking.booking_status || 'pending';
        const dateStr = booking.date || booking.booking_date || '';
        
        const isActiveStatus = activeStatuses.has(status);
        const isAfterToday = dateStr > todayStr;
        
        // PENDING or ACCEPTED scheduled AFTER TODAY
        return isActiveStatus && isAfterToday;
      }).sort((a, b) => {
        // Sort future bookings by date (earliest first)
        const dateA = a.date || a.booking_date || '';
        const dateB = b.date || b.booking_date || '';
        return dateA.localeCompare(dateB);
      }),
      
      // PAST TAB:
      // - COMPLETED, CANCELLED, DECLINED, NO_SHOW scheduled BEFORE YESTERDAY
      // - PENDING or ACCEPTED scheduled BEFORE YESTERDAY
      past: safeBookings.filter((booking) => {
        const status = booking.booking_status || booking.booking_status || 'pending';
        const dateStr = booking.date || booking.booking_date || '';
        
        const isFinalStatus = finalStatuses.has(status);
        const isActiveStatus = activeStatuses.has(status);
        const isBeforeYesterday = dateStr < yesterdayStr;
        
        // COMPLETED, CANCELLED, DECLINED, NO_SHOW scheduled BEFORE YESTERDAY
        if (isFinalStatus && isBeforeYesterday) return true;
        
        // PENDING or ACCEPTED scheduled BEFORE YESTERDAY
        if (isActiveStatus && isBeforeYesterday) return true;
        
        return false;
      }).sort((a, b) => {
        // Sort past bookings by date (most recent first)
        const dateA = a.date || a.booking_date || '';
        const dateB = b.date || b.booking_date || '';
        return dateB.localeCompare(dateA);
      }),
    };

    console.log("Filtered bookings result:", {
      present: result.present.length,
      future: result.future.length,
      past: result.past.length,
      samplePresent: result.present[0],
      sampleFuture: result.future[0],
      samplePast: result.past[0]
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
