import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import BookingCard from "./BookingCard";

interface PaginatedData {
  active: { items: any[]; totalPages: number; currentPage: number };
  closed: { items: any[]; totalPages: number; currentPage: number };
}

interface BookingListSectionProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeBookings: any[];
  closedBookings: any[];
  paginatedData: PaginatedData;
  activePage: number;
  setActivePage: (page: number) => void;
  closedPage: number;
  setClosedPage: (page: number) => void;
  onViewDetails: (booking: any) => void;
  onUpdateStatus: (bookingId: string, status: string) => Promise<void>;
  formatDisplayTime: (time: string) => string;
  unreadCounts: Record<string, number>;
}

export default function BookingListSection({
  activeTab,
  setActiveTab,
  activeBookings,
  closedBookings,
  paginatedData,
  activePage,
  setActivePage,
  closedPage,
  setClosedPage,
  onViewDetails,
  onUpdateStatus,
  formatDisplayTime,
  unreadCounts,
}: BookingListSectionProps) {
  const PaginationControls = ({ 
    currentPage, 
    totalPages, 
    onPageChange 
  }: { 
    currentPage: number; 
    totalPages: number; 
    onPageChange: (page: number) => void; 
  }) => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-center space-x-2 mt-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </Button>
        <span className="text-sm text-gray-600">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    );
  };

  const EmptyState = ({ message }: { message: string }) => (
    <div className="text-center py-12">
      <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg
          className="w-12 h-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings found</h3>
      <p className="text-gray-500">{message}</p>
    </div>
  );

  // Debug: Log when component renders with current tab
  console.log('📋 BookingListSection render:', { activeTab, activeCount: activeBookings.length, closedCount: closedBookings.length });

  return (
    <Tabs value={activeTab} onValueChange={(value) => {
      console.log('🔄 Tab change requested:', { from: activeTab, to: value });
      if (value !== activeTab) {
        setActiveTab(value);
        console.log('✅ setActiveTab called with:', value);
      }
    }} className="w-full">
      <TabsList className="grid w-full grid-cols-2 h-12">
        <TabsTrigger 
          value="active"
          className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
        >
          Active Bookings ({activeBookings.length})
        </TabsTrigger>
        <TabsTrigger 
          value="closed"
          className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
        >
          Closed Bookings ({closedBookings.length})
        </TabsTrigger>
      </TabsList>

      {/* Active Bookings Tab */}
      <TabsContent value="active" className="mt-6">
        <div className="space-y-4">
          {paginatedData.active.items.length > 0 ? (
            <>
              {paginatedData.active.items.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onViewDetails={onViewDetails}
                  onUpdateStatus={onUpdateStatus}
                  formatDisplayTime={formatDisplayTime}
                  showActions={true}
                  unreadCount={unreadCounts[booking.id] || 0}
                />
              ))}
              <PaginationControls
                currentPage={activePage}
                totalPages={paginatedData.active.totalPages}
                onPageChange={setActivePage}
              />
            </>
          ) : (
            <EmptyState message="No active bookings. All bookings that are pending, confirmed, or in progress will appear here." />
          )}
        </div>
      </TabsContent>

      {/* Closed Bookings Tab */}
      <TabsContent value="closed" className="mt-6">
        <div className="space-y-4">
          {paginatedData.closed.items.length > 0 ? (
            <>
              {paginatedData.closed.items.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onViewDetails={onViewDetails}
                  onUpdateStatus={onUpdateStatus}
                  formatDisplayTime={formatDisplayTime}
                  showActions={false} // Closed bookings typically don't need status actions
                  unreadCount={unreadCounts[booking.id] || 0}
                />
              ))}
              <PaginationControls
                currentPage={closedPage}
                totalPages={paginatedData.closed.totalPages}
                onPageChange={setClosedPage}
              />
            </>
          ) : (
            <EmptyState message="No closed bookings. Completed, cancelled, declined, and no-show bookings will appear here." />
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}