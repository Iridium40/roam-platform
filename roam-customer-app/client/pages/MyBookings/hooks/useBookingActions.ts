import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import type { BookingWithDetails } from "@/types/index";
import { calculateCancellationDetails } from "../utils/bookingCalculations";

export const useBookingActions = (
  currentUser: any,
  setBookings: React.Dispatch<React.SetStateAction<BookingWithDetails[]>>,
  refreshBookings?: () => void
) => {
  const { toast } = useToast();
  const [isCancelling, setIsCancelling] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);

  // Cancel booking function
  const cancelBooking = async (
    selectedBookingForCancel: BookingWithDetails,
    cancellationReason: string
  ) => {
    if (!selectedBookingForCancel || !currentUser) {
      toast({
        title: "Error",
        description: "Unable to cancel booking. Please try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsCancelling(true);

      // Calculate cancellation fee and refund amount using the same logic as the modal
      const cancellationDetails = calculateCancellationDetails(selectedBookingForCancel);
      const { totalAmount, cancellationFee, refundAmount } = cancellationDetails;

      // Use API endpoint to cancel booking (handles notifications)
      const response = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId: selectedBookingForCancel.id,
          cancellationReason: cancellationReason.trim() || "Cancelled by customer",
          cancellationFee,
          refundAmount,
          cancelledBy: currentUser.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel booking');
      }

      const { booking } = await response.json();

      // Update local state with returned booking data
      setBookings((prev) =>
        prev.map((b) =>
          b.id === selectedBookingForCancel.id
            ? {
                ...b,
                ...booking,
                status: "cancelled",
                booking_status: "cancelled",
              }
            : b,
        ),
      );

      // Force refresh bookings to ensure we get the latest status from database
      if (refreshBookings) {
        setTimeout(() => refreshBookings(), 100);
      }

      // Show appropriate cancellation message based on refund amount
      const refundMessage =
        refundAmount > 0
          ? `Booking cancelled successfully. Refund of $${refundAmount.toFixed(2)} will be processed.`
          : "Booking cancelled successfully. No refund available due to cancellation policy.";

      toast({
        title: "Booking Cancelled",
        description: refundMessage,
      });
    } catch (error: unknown) {
      // Handle cancellation error
      let errorMessage = "Unknown error occurred";

      if (error) {
        if (typeof error === "string") {
          errorMessage = error;
        } else if (error && typeof error === "object" && "message" in error) {
          errorMessage = error.message as string;
        } else {
          try {
            errorMessage = JSON.stringify(error);
          } catch {
            errorMessage = "Unable to parse error details";
          }
        }
      }

      toast({
        title: "Error Cancelling Booking",
        description: `Failed to cancel booking: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  // Reschedule booking function
  const rescheduleBooking = async (
    selectedBookingForReschedule: BookingWithDetails,
    newBookingDate: string,
    newBookingTime: string,
    rescheduleReason: string
  ) => {
    if (!selectedBookingForReschedule || !currentUser) {
      toast({
        title: "Error",
        description: "Unable to reschedule booking. Please try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsRescheduling(true);

      // Prepare reschedule data with new schema fields
      const originalBookingDate =
        selectedBookingForReschedule.original_booking_date ||
        selectedBookingForReschedule.booking_date;

      const originalStartTime =
        selectedBookingForReschedule.original_start_time ||
        selectedBookingForReschedule.start_time ||
        selectedBookingForReschedule.booking_time ||
        newBookingTime;

      // Use API endpoint to reschedule booking (handles notifications)
      const response = await fetch('/api/bookings/reschedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId: selectedBookingForReschedule.id,
          bookingDate: newBookingDate,
          startTime: newBookingTime,
          rescheduleReason: rescheduleReason.trim() || "Rescheduled by customer",
          rescheduledBy: currentUser.id,
          originalBookingDate: originalBookingDate,
          originalStartTime: originalStartTime,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reschedule booking');
      }

      const { booking } = await response.json();

      // Update local state with returned booking data
      setBookings((prev) =>
        prev.map((b) =>
          b.id === selectedBookingForReschedule.id
            ? {
                ...b,
                ...booking,
                booking_date: newBookingDate,
                start_time: newBookingTime,
                booking_time: newBookingTime,
              }
            : b,
        ),
      );

      // Force refresh bookings to ensure we get the latest status from database
      if (refreshBookings) {
        setTimeout(() => refreshBookings(), 100);
      }

      toast({
        title: "Reschedule Request Sent",
        description: "Your reschedule request has been sent to the provider for approval.",
      });
    } catch (error: unknown) {
      // Handle rescheduling error
      let errorMessage = "Unknown error occurred";

      if (error) {
        // Handle different error object structures
        if (typeof error === "string") {
          errorMessage = error;
        } else if (error && typeof error === "object" && "message" in error) {
          errorMessage = error.message as string;
        } else {
          try {
            errorMessage = JSON.stringify(error);
          } catch {
            errorMessage = "Unable to parse error details";
          }
        }
      }

      toast({
        title: "Error Rescheduling Booking",
        description: `Failed to reschedule booking: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsRescheduling(false);
    }
  };

  return {
    cancelBooking,
    rescheduleBooking,
    isCancelling,
    isRescheduling,
  };
};
