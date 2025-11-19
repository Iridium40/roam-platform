import React, { useState, useEffect } from "react";

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
  const [viewType, setViewType] = useState<"list" | "week" | "month">("list");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [WeekView, setWeekView] = useState<React.ComponentType<any> | null>(null);
  const [MonthView, setMonthView] = useState<React.ComponentType<any> | null>(null);
  const [loadingCalendar, setLoadingCalendar] = useState(false);

  // Dynamically load calendar views to avoid initialization issues
  useEffect(() => {
    if (viewType === "week" && !WeekView) {
      setLoadingCalendar(true);
      import("./bookings/WeekCalendarView")
        .then((module) => {
          setWeekView(() => module.default);
          setLoadingCalendar(false);
        })
        .catch((err) => {
          console.error("Failed to load WeekCalendarView:", err);
          setLoadingCalendar(false);
        });
    } else if (viewType === "month" && !MonthView) {
      setLoadingCalendar(true);
      import("./bookings/MonthCalendarView")
        .then((module) => {
          setMonthView(() => module.default);
          setLoadingCalendar(false);
        })
        .catch((err) => {
          console.error("Failed to load MonthCalendarView:", err);
          setLoadingCalendar(false);
        });
    }
  }, [viewType, WeekView, MonthView]);

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
    loadBookings,
    updateBookingStatus,
    formatDisplayTime,
  } = useBookings(providerData, business);

  // Debug: Log tab data
  console.log('📊 BookingsTab render:', {
    activeTab,
    presentCount: presentBookings.length,
    futureCount: futureBookings.length,
    pastCount: pastBookings.length,
    paginatedPresent: paginatedData.present.items.length,
    paginatedFuture: paginatedData.future.items.length,
    paginatedPast: paginatedData.past.items.length,
  });

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

      {/* Filters and View Toggle */}
      <div className="space-y-4">
      <BookingFiltersSection
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedStatusFilter={selectedStatusFilter}
        setSelectedStatusFilter={setSelectedStatusFilter}
      />

        {/* View Toggle */}
        <div className="flex items-center justify-end gap-2">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewType("list")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewType === "list"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewType("week")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewType === "week"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewType("month")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewType === "month"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Month
            </button>
          </div>
        </div>
      </div>

      {/* Booking Views */}
      {viewType === "list" ? (
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
      ) : viewType === "week" ? (
        loadingCalendar || !WeekView ? (
          <div className="h-96 bg-gray-100 rounded-lg animate-pulse" />
        ) : (
          <WeekView
            bookings={[...presentBookings, ...futureBookings, ...pastBookings]}
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            onViewDetails={setSelectedBooking}
            formatDisplayTime={formatDisplayTime}
          />
        )
      ) : (
        loadingCalendar || !MonthView ? (
          <div className="h-96 bg-gray-100 rounded-lg animate-pulse" />
        ) : (
          <MonthView
            bookings={[...presentBookings, ...futureBookings, ...pastBookings]}
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            onViewDetails={setSelectedBooking}
            formatDisplayTime={formatDisplayTime}
          />
        )
      )}

      {/* Booking Detail Modal */}
      <BookingDetailModal
        selectedBooking={selectedBooking}
        setSelectedBooking={setSelectedBooking}
        formatDisplayTime={formatDisplayTime}
        onBookingUpdate={loadBookings}
      />
    </div>
  );
}