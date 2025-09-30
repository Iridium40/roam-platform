import React from "react";

// Import modular components
import BookingStatsSection from "./bookings/BookingStatsSection";
import BookingFiltersSection from "./bookings/BookingFiltersSection";
import BookingListSection from "./bookings/BookingListSection";
import BookingDetailModal from "./bookings/BookingDetailModal";

// Import custom hook
import { useBookings } from "./bookings/hooks/useBookings";

interface BookingsTabProps {
  providerData: any;
  business: any;
}

export function BookingsTab({ providerData, business }: BookingsTabProps) {
  const {
    // Data
    bookings,
    bookingStats,
    presentBookings,
    futureBookings,
    pastBookings,
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
    updateBookingStatus,
    formatDisplayTime,
  } = useBookings(providerData, business);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Booking Statistics */}
      <BookingStatsSection
        bookingStats={bookingStats}
        presentBookings={presentBookings}
        futureBookings={futureBookings}
        pastBookings={pastBookings}
      />

      {/* Filters */}
      <BookingFiltersSection
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedStatusFilter={selectedStatusFilter}
        setSelectedStatusFilter={setSelectedStatusFilter}
      />

      {/* Booking Lists with Tabs */}
      <BookingListSection
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        presentBookings={presentBookings}
        futureBookings={futureBookings}
        pastBookings={pastBookings}
        paginatedData={paginatedData}
        presentPage={presentPage}
        setPresentPage={setPresentPage}
        futurePage={futurePage}
        setFuturePage={setFuturePage}
        pastPage={pastPage}
        setPastPage={setPastPage}
        onViewDetails={setSelectedBooking}
        onUpdateStatus={updateBookingStatus}
        formatDisplayTime={formatDisplayTime}
      />

      {/* Booking Detail Modal */}
      <BookingDetailModal
        selectedBooking={selectedBooking}
        setSelectedBooking={setSelectedBooking}
        formatDisplayTime={formatDisplayTime}
      />
    </div>
  );
}