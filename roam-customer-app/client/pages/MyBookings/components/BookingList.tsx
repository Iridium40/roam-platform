import React from "react";
import { Card } from "@/components/ui/card";
import { Calendar, Clock, MessageCircle } from "lucide-react";
import type { BookingWithDetails } from "@/types/index";
import { BookingCard } from "./BookingCard";
import { Pagination } from "./Pagination";

interface BookingListProps {
  bookings: BookingWithDetails[];
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  onCancel: (booking: BookingWithDetails) => void;
  onReschedule: (booking: BookingWithDetails) => void;
  onMessage: (booking: BookingWithDetails) => void;
  onRefresh?: () => void;
  onNextPage: () => void;
  onPrevPage: () => void;
  onPageChange: (page: number) => void;
  emptyStateMessage: string;
  emptyStateIcon: React.ComponentType<{ className?: string }>;
}

export const BookingList: React.FC<BookingListProps> = ({
  bookings,
  currentPage,
  totalPages,
  itemsPerPage,
  onCancel,
  onReschedule,
  onMessage,
  onRefresh,
  onNextPage,
  onPrevPage,
  onPageChange,
  emptyStateMessage,
  emptyStateIcon: EmptyStateIcon,
}) => {
  console.log("BookingList component - received bookings:", {
    bookingsLength: bookings.length,
    currentPage,
    totalPages,
    sampleBooking: bookings[0]
  });
  console.log("BookingList - full bookings array:", bookings);
  if (bookings.length === 0) {
    return (
      <Card className="p-12 text-center">
        <EmptyStateIcon className="w-16 h-16 mx-auto mb-4 text-foreground/40" />
        <h3 className="text-lg font-semibold mb-2">No Bookings Found</h3>
        <p className="text-foreground/60 mb-4">{emptyStateMessage}</p>
        <div className="flex items-center justify-center gap-4 text-sm text-foreground/40">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>Check your booking history</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>View upcoming appointments</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageCircle className="w-4 h-4" />
            <span>Contact providers</span>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {bookings.map((booking) => (
          <BookingCard
            key={booking.id}
            booking={booking}
            onCancel={onCancel}
            onReschedule={onReschedule}
            onMessage={onMessage}
            onRefresh={onRefresh}
          />
        ))}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={bookings.length}
        itemsPerPage={itemsPerPage}
        onPageChange={onPageChange}
        onNext={onNextPage}
        onPrev={onPrevPage}
      />
    </>
  );
};
