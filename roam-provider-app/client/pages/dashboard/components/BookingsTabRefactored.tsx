import React, { useState, lazy, Suspense } from "react";

// Import modular components
import BookingStatsSection from "./bookings/BookingStatsSection";
import BookingFiltersSection from "./bookings/BookingFiltersSection";
import BookingListSection from "./bookings/BookingListSection";

// Import custom hook
import { useBookings } from "./bookings/hooks/useBookings";

// Lazy load calendar views and modal - created outside component to avoid re-initialization
const WeekCalendarViewLazy = lazy(() => 
  import("./bookings/WeekCalendarView").catch((err) => {
    console.error("Failed to load WeekCalendarView:", err);
    // Return a fallback component
    return { default: () => <div className="p-4 text-red-600">Failed to load week calendar view</div> };
  })
);

const MonthCalendarViewLazy = lazy(() => 
  import("./bookings/MonthCalendarView").catch((err) => {
    console.error("Failed to load MonthCalendarView:", err);
    // Return a fallback component
    return { default: () => <div className="p-4 text-red-600">Failed to load month calendar view</div> };
  })
);

// Lazy load modal to avoid circular dependency with supabase
const BookingDetailModalLazy = lazy(() =>
  import("./bookings/BookingDetailModal").catch((err) => {
    console.error("Failed to load BookingDetailModal:", err);
    return { default: () => null };
  })
);

interface BookingsTabProps {
  providerData: any;
  business: any;
}

export function BookingsTab({ providerData, business }: BookingsTabProps) {
  const [viewType, setViewType] = useState<"list" | "week" | "month">("list");
  const [currentDate, setCurrentDate] = useState(new Date());

  const {
    // Data
    bookings,
    bookingStats,
    presentBookings,
    futureBookings,
    pastBookings,
    paginatedData,
    unreadCounts,
    
    // UI State
    loading,
    searchQuery,
    setSearchQuery,
    selectedStatusFilter,
    setSelectedStatusFilter,
    showUnreadOnly,
    setShowUnreadOnly,
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
        showUnreadOnly={showUnreadOnly}
        setShowUnreadOnly={setShowUnreadOnly}
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
        unreadCounts={unreadCounts}
      />
      ) : viewType === "week" ? (
        <Suspense fallback={<div className="h-96 bg-gray-100 rounded-lg animate-pulse" />}>
          <WeekCalendarViewLazy
            bookings={[...presentBookings, ...futureBookings, ...pastBookings]}
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            onViewDetails={setSelectedBooking}
            formatDisplayTime={formatDisplayTime}
          />
        </Suspense>
      ) : (
        <Suspense fallback={<div className="h-96 bg-gray-100 rounded-lg animate-pulse" />}>
          <MonthCalendarViewLazy
            bookings={[...presentBookings, ...futureBookings, ...pastBookings]}
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            onViewDetails={setSelectedBooking}
            formatDisplayTime={formatDisplayTime}
          />
        </Suspense>
      )}

      {/* Booking Detail Modal */}
      <Suspense fallback={null}>
        <BookingDetailModalLazy
          selectedBooking={selectedBooking}
          setSelectedBooking={setSelectedBooking}
          formatDisplayTime={formatDisplayTime}
          onBookingUpdate={loadBookings}
        />
      </Suspense>
    </div>
  );
}