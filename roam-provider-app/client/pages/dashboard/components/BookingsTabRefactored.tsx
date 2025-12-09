import React, { useState, lazy, Suspense } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

// Import modular components
import BookingStatsSection from "./bookings/BookingStatsSection";
import BookingFiltersSection from "./bookings/BookingFiltersSection";
import BookingListSection from "./bookings/BookingListSection";
import BookingDetailModal from "./bookings/BookingDetailModal";

// Import custom hook
import { useBookings } from "./bookings/hooks/useBookings";

// Lazy load calendar views - created outside component to avoid re-initialization
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

interface BookingsTabProps {
  providerData: any;
  business: any;
}

export function BookingsTab({ providerData, business }: BookingsTabProps) {
  const [viewType, setViewType] = useState<"list" | "week" | "month">("list");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    // Data
    bookings,
    bookingStats,
    activeBookings,
    closedBookings,
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
    showUnassignedOnly,
    setShowUnassignedOnly,
    activeTab,
    setActiveTab,
    selectedBooking,
    setSelectedBooking,
    
    // Pagination
    activePage,
    setActivePage,
    closedPage,
    setClosedPage,
    
    // Actions
    loadBookings,
    updateBookingStatus,
    formatDisplayTime,
  } = useBookings(providerData, business);

  // Handle manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadBookings();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Check if user can view unassigned bookings (owner or dispatcher)
  const canViewUnassigned = providerData?.provider_role === 'owner' || providerData?.provider_role === 'dispatcher';

  // Debug: Log tab data
  console.log('📊 BookingsTab render:', {
    activeTab,
    activeCount: activeBookings.length,
    closedCount: closedBookings.length,
    paginatedActive: paginatedData.active.items.length,
    paginatedClosed: paginatedData.closed.items.length,
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
        presentBookings={activeBookings}
        futureBookings={[]}
        pastBookings={closedBookings}
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
        showUnassignedOnly={showUnassignedOnly}
        setShowUnassignedOnly={setShowUnassignedOnly}
        canViewUnassigned={canViewUnassigned}
      />

        {/* View Toggle and Refresh Button */}
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
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
        activeBookings={activeBookings}
        closedBookings={closedBookings}
        paginatedData={paginatedData}
        activePage={activePage}
        setActivePage={setActivePage}
        closedPage={closedPage}
        setClosedPage={setClosedPage}
        onViewDetails={setSelectedBooking}
        onUpdateStatus={updateBookingStatus}
        formatDisplayTime={formatDisplayTime}
        unreadCounts={unreadCounts}
      />
      ) : viewType === "week" ? (
        <Suspense fallback={<div className="h-96 bg-gray-100 rounded-lg animate-pulse" />}>
          <WeekCalendarViewLazy
            bookings={[...activeBookings, ...closedBookings]}
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            onViewDetails={setSelectedBooking}
            formatDisplayTime={formatDisplayTime}
          />
        </Suspense>
      ) : (
        <Suspense fallback={<div className="h-96 bg-gray-100 rounded-lg animate-pulse" />}>
          <MonthCalendarViewLazy
            bookings={[...activeBookings, ...closedBookings]}
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            onViewDetails={setSelectedBooking}
            formatDisplayTime={formatDisplayTime}
          />
        </Suspense>
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