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
      
      const isFinalStatus = finalStatuses.has(status);
      const isActiveStatus = activeStatuses.has(status);
      const isInProgress = status === 'in_progress';
      
      // Use proper date comparison - comparing date strings for accuracy
      const isToday = dateStr === todayStr;
      const isYesterday = dateStr === yesterdayStr;
      const isTodayOrYesterday = isToday || isYesterday;
      const isBeforeYesterday = dateStr && dateStr < yesterdayStr;
      const isAfterToday = dateStr && dateStr > todayStr;
      
      // Special debug for the problematic booking
      if (dateStr === '2025-10-17' || dateStr === '2025-10-14' || booking.id?.includes('BK25TEST11111')) {
        console.log("🚨 PROBLEMATIC BOOKING DEBUG:", {
          id: booking.id,
          booking_date: booking.booking_date,
          date: booking.date,
          status: status,
          dateStr,
          todayStr,
          yesterdayStr,
          isFinalStatus,
          isActiveStatus,
          isInProgress,
          isToday,
          isYesterday,
          isTodayOrYesterday,
          isBeforeYesterday,
          isAfterToday,
          stringComparison: {
            dateStr_less_than_yesterday: dateStr < yesterdayStr,
            dateStr_greater_than_today: dateStr > todayStr,
            dateStr_equals_today: dateStr === todayStr,
            dateStr_equals_yesterday: dateStr === yesterdayStr
          },
          shouldBeInPresent: isInProgress || (isFinalStatus && isTodayOrYesterday) || (isActiveStatus && isTodayOrYesterday),
          shouldBeInFuture: isActiveStatus && isAfterToday,
          shouldBeInPast: (isFinalStatus && isBeforeYesterday) || (isActiveStatus && isBeforeYesterday),
          // Add specific tab logic checks
          presentLogic: {
            isInProgress,
            isFinalStatusAndTodayOrYesterday: isFinalStatus && isTodayOrYesterday,
            isActiveStatusAndTodayOrYesterday: isActiveStatus && isTodayOrYesterday,
            result: isInProgress || (isFinalStatus && isTodayOrYesterday) || (isActiveStatus && isTodayOrYesterday)
          },
          futureLogic: {
            isActiveStatus,
            isAfterToday,
            result: isActiveStatus && isAfterToday
          },
          pastLogic: {
            isFinalStatusAndBeforeYesterday: isFinalStatus && isBeforeYesterday,
            isActiveStatusAndBeforeYesterday: isActiveStatus && isBeforeYesterday,
            result: (isFinalStatus && isBeforeYesterday) || (isActiveStatus && isBeforeYesterday)
          }
        });
      }
      
      console.log(`Booking ${index}:`, {
        id: booking.id,
        booking_date: booking.booking_date,
        date: booking.date,
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
        const status = booking.booking_status || 'pending';
        const dateStr = booking.booking_date || '';
        
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
      // - COMPLETED, CANCELLED, DECLINED, NO_SHOW scheduled BEFORE YESTERDAY
      // - PENDING or ACCEPTED scheduled BEFORE YESTERDAY
      past: safeBookings.filter((booking) => {
        const status = booking.booking_status || 'pending';
        const dateStr = booking.booking_date || '';
        
        const isFinalStatus = finalStatuses.has(status);
        const isActiveStatus = activeStatuses.has(status);
        const isBeforeYesterday = dateStr && dateStr < yesterdayStr;
        
        // Debug for the problematic booking
        if (dateStr === '2025-10-17') {
          console.log("🔍 PAST FILTER DEBUG:", {
            id: booking.id,
            status,
            dateStr,
            isFinalStatus,
            isActiveStatus,
            isBeforeYesterday,
            yesterdayStr,
            finalStatuses: Array.from(finalStatuses),
            activeStatuses: Array.from(activeStatuses),
            shouldBeInPast: (isFinalStatus && isBeforeYesterday) || (isActiveStatus && isBeforeYesterday)
          });
        }
        
        // COMPLETED, CANCELLED, DECLINED, NO_SHOW scheduled BEFORE YESTERDAY
        if (isFinalStatus && isBeforeYesterday) return true;
        
        // PENDING or ACCEPTED scheduled BEFORE YESTERDAY
        if (isActiveStatus && isBeforeYesterday) return true;
        
        return false;
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
      samplePresent: result.present[0],
      sampleFuture: result.future[0],
      samplePast: result.past[0]
    });

    // Debug: Check if the problematic booking is in any of the filtered results
    const problematicBooking = safeBookings.find(b => b.booking_date === '2025-10-17');
    if (problematicBooking) {
      console.log("🔍 FINAL RESULT DEBUG:", {
        bookingId: problematicBooking.id,
        bookingDate: problematicBooking.booking_date,
        bookingStatus: problematicBooking.booking_status,
        isInPresent: result.present.some(b => b.id === problematicBooking.id),
        isInFuture: result.future.some(b => b.id === problematicBooking.id),
        isInPast: result.past.some(b => b.id === problematicBooking.id),
        presentIds: result.present.map(b => ({ id: b.id, date: b.booking_date, status: b.booking_status })),
        futureIds: result.future.map(b => ({ id: b.id, date: b.booking_date, status: b.booking_status })),
        pastIds: result.past.map(b => ({ id: b.id, date: b.booking_date, status: b.booking_status }))
      });
    }

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

  // Debug: Check if the problematic booking is in the paginated results
  const problematicBooking = filteredBookings.present.find(b => b.booking_date === '2025-10-17');
  if (problematicBooking) {
    console.log("🔍 PAGINATION DEBUG:", {
      bookingId: problematicBooking.id,
      bookingDate: problematicBooking.booking_date,
      isInPaginatedPresent: paginatedBookings.present.some(b => b.id === problematicBooking.id),
      presentFilteredCount: filteredBookings.present.length,
      presentPaginatedCount: paginatedBookings.present.length,
      currentPagePresent: currentPage.present,
      itemsPerPage: ITEMS_PER_PAGE,
      presentFilteredIds: filteredBookings.present.map(b => ({ id: b.id, date: b.booking_date })),
      presentPaginatedIds: paginatedBookings.present.map(b => ({ id: b.id, date: b.booking_date }))
    });
  }

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
