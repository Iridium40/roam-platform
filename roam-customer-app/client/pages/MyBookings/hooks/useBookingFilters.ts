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
    
    const finalStatuses = new Set(['completed', 'cancelled', 'declined', 'no_show']);
    const todayStr = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD

    console.log("Filtering bookings:", {
      totalBookings: safeBookings.length,
      currentTime: new Date().toISOString(),
      todayStr,
      sampleBooking: safeBookings[0]
    });
    console.log("Filtering - full bookings array:", safeBookings);

    const result = {
      // PRESENT = Today's date or in the past (including final status bookings from today)
      present: safeBookings.filter((booking) => {
        const status = booking.status || booking.booking_status || 'pending';
        const dateStr = booking.date || booking.booking_date || '';
        
        // If date is today or past, include in present (regardless of status)
        return dateStr <= todayStr;
      }).sort((a, b) => {
        // Sort present bookings: 'in_progress' first, then by date
        const statusA = a.status || a.booking_status || 'pending';
        const statusB = b.status || b.booking_status || 'pending';
        
        // If one is 'in_progress' and the other isn't, prioritize 'in_progress'
        if (statusA === 'in_progress' && statusB !== 'in_progress') return -1;
        if (statusB === 'in_progress' && statusA !== 'in_progress') return 1;
        
        // Otherwise, sort by date (most recent first)
        const dateA = a.date || a.booking_date || '';
        const dateB = b.date || b.booking_date || '';
        return dateB.localeCompare(dateA);
      }),
      
      // FUTURE = Future dates (not in final status)
      future: safeBookings.filter((booking) => {
        const status = booking.status || booking.booking_status || 'pending';
        const dateStr = booking.date || booking.booking_date || '';
        
        // If status is final, don't include in future
        if (finalStatuses.has(status)) {
          return false;
        }
        
        // If date is in the future, include in future
        return dateStr > todayStr;
      }).sort((a, b) => {
        // Sort future bookings by date (earliest first)
        const dateA = a.date || a.booking_date || '';
        const dateB = b.date || b.booking_date || '';
        return dateA.localeCompare(dateB);
      }),
      
      // PAST = Final status states with past dates only
      past: safeBookings.filter((booking) => {
        const status = booking.status || booking.booking_status || 'pending';
        const dateStr = booking.date || booking.booking_date || '';
        
        // Only include final status bookings that have past dates
        return finalStatuses.has(status) && dateStr < todayStr;
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
