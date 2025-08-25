import { useState, useMemo } from "react";
import type { BookingWithDetails } from "@/types/index";

export const useBookingFilters = (bookings: BookingWithDetails[]) => {
  const [currentPage, setCurrentPage] = useState({
    upcoming: 1,
    active: 1,
    past: 1,
  });
  const ITEMS_PER_PAGE = 10;

  // Filter bookings by status
  const filteredBookings = useMemo(() => {
    const now = new Date();
    const currentTime = now.getTime();

    return {
      upcoming: bookings.filter((booking) => {
        const bookingDateTime = new Date(`${booking.booking_date} ${booking.booking_time}`);
        return bookingDateTime.getTime() > currentTime && booking.status !== "cancelled";
      }),
      active: bookings.filter((booking) => {
        const bookingDateTime = new Date(`${booking.booking_date} ${booking.booking_time}`);
        const bookingEndTime = new Date(bookingDateTime.getTime() + (parseInt(booking.duration || "60") * 60 * 1000));
        return bookingDateTime.getTime() <= currentTime && bookingEndTime.getTime() > currentTime && booking.status !== "cancelled";
      }),
      past: bookings.filter((booking) => {
        const bookingDateTime = new Date(`${booking.booking_date} ${booking.booking_time}`);
        const bookingEndTime = new Date(bookingDateTime.getTime() + (parseInt(booking.duration || "60") * 60 * 1000));
        return bookingEndTime.getTime() <= currentTime || booking.status === "cancelled";
      }),
    };
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
  const goToPage = (category: "upcoming" | "active" | "past", page: number) => {
    setCurrentPage((prev) => ({
      ...prev,
      [category]: page,
    }));
  };

  const nextPage = (category: "upcoming" | "active" | "past") => {
    const currentBookings = filteredBookings[category];
    const totalPages = getTotalPages(currentBookings.length);
    const currentPageNum = currentPage[category];

    if (currentPageNum < totalPages) {
      goToPage(category, currentPageNum + 1);
    }
  };

  const prevPage = (category: "upcoming" | "active" | "past") => {
    const currentPageNum = currentPage[category];
    if (currentPageNum > 1) {
      goToPage(category, currentPageNum - 1);
    }
  };

  // Get paginated results
  const paginatedBookings = {
    upcoming: getPaginatedBookings(filteredBookings.upcoming, currentPage.upcoming),
    active: getPaginatedBookings(filteredBookings.active, currentPage.active),
    past: getPaginatedBookings(filteredBookings.past, currentPage.past),
  };

  // Get total pages for each category
  const totalPages = {
    upcoming: getTotalPages(filteredBookings.upcoming.length),
    active: getTotalPages(filteredBookings.active.length),
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
