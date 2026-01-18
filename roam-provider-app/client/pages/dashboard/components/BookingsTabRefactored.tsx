import React, { useState, lazy, Suspense, useEffect } from "react";

// Import modular components
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
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen size and force list view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640); // sm breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Effective view type - always list on mobile
  const effectiveViewType = isMobile ? "list" : viewType;

  const {
    // Data
    bookings,
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Bookings</h3>
          <p className="text-sm text-foreground/60">
            Manage and track all your bookings.
          </p>
        </div>
      </div>

      {/* Filters Section with all controls */}
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
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing || loading}
        viewType={viewType}
        setViewType={setViewType}
      />

      {/* Booking Views - Mobile always shows list view */}
      {effectiveViewType === "list" ? (
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
      ) : effectiveViewType === "week" ? (
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