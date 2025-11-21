import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import BookingCard from "./BookingCard";

interface PaginatedData {
  present: { items: any[]; totalPages: number; currentPage: number };
  future: { items: any[]; totalPages: number; currentPage: number };
  past: { items: any[]; totalPages: number; currentPage: number };
}

interface BookingListSectionProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  presentBookings: any[];
  futureBookings: any[];
  pastBookings: any[];
  paginatedData: PaginatedData;
  presentPage: number;
  setPresentPage: (page: number) => void;
  futurePage: number;
  setFuturePage: (page: number) => void;
  pastPage: number;
  setPastPage: (page: number) => void;
  onViewDetails: (booking: any) => void;
  onUpdateStatus: (bookingId: string, status: string) => Promise<void>;
  formatDisplayTime: (time: string) => string;
  unreadCounts: Record<string, number>;
}

export default function BookingListSection({
  activeTab,
  setActiveTab,
  presentBookings,
  futureBookings,
  pastBookings,
  paginatedData,
  presentPage,
  setPresentPage,
  futurePage,
  setFuturePage,
  pastPage,
  setPastPage,
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

  return (
    <Tabs value={activeTab} onValueChange={(value) => {
      console.log('🔄 Tab change requested:', { from: activeTab, to: value });
      setActiveTab(value);
    }} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger 
          value="present"
          onClick={() => console.log('🖱️ Present tab clicked')}
          className={activeTab === 'present' ? 'bg-blue-500 text-white' : ''}
        >
          Present ({presentBookings.length})
        </TabsTrigger>
        <TabsTrigger 
          value="future"
          onClick={() => console.log('🖱️ Future tab clicked')}
          className={activeTab === 'future' ? 'bg-blue-500 text-white' : ''}
        >
          Future ({futureBookings.length})
        </TabsTrigger>
        <TabsTrigger 
          value="past"
          onClick={() => console.log('🖱️ Past tab clicked')}
          className={activeTab === 'past' ? 'bg-blue-500 text-white' : ''}
        >
          Past ({pastBookings.length})
        </TabsTrigger>
      </TabsList>

      {/* Present Bookings Tab */}
      <TabsContent value="present" className="mt-6">
        <div className="space-y-4">
          {paginatedData.present.items.length > 0 ? (
            <>
              {paginatedData.present.items.map((booking) => (
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
                currentPage={presentPage}
                totalPages={paginatedData.present.totalPages}
                onPageChange={setPresentPage}
              />
            </>
          ) : (
            <EmptyState message="No current bookings. New bookings will appear here when they're scheduled for today or are in progress." />
          )}
        </div>
      </TabsContent>

      {/* Future Bookings Tab */}
      <TabsContent value="future" className="mt-6">
        <div className="space-y-4">
          {paginatedData.future.items.length > 0 ? (
            <>
              {paginatedData.future.items.map((booking) => (
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
                currentPage={futurePage}
                totalPages={paginatedData.future.totalPages}
                onPageChange={setFuturePage}
              />
            </>
          ) : (
            <EmptyState message="No upcoming bookings. Future bookings will appear here when customers schedule appointments." />
          )}
        </div>
      </TabsContent>

      {/* Past Bookings Tab */}
      <TabsContent value="past" className="mt-6">
        <div className="space-y-4">
          {paginatedData.past.items.length > 0 ? (
            <>
              {paginatedData.past.items.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onViewDetails={onViewDetails}
                  onUpdateStatus={onUpdateStatus}
                  formatDisplayTime={formatDisplayTime}
                  showActions={false} // Past bookings typically don't need status actions
                  unreadCount={unreadCounts[booking.id] || 0}
                />
              ))}
              <PaginationControls
                currentPage={pastPage}
                totalPages={paginatedData.past.totalPages}
                onPageChange={setPastPage}
              />
            </>
          ) : (
            <EmptyState message="No past bookings. Completed, cancelled, and declined bookings will appear here." />
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}