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

      const { error } = await supabase
        .from("bookings")
        .update({
          booking_status: "cancelled",
          cancelled_at: new Date().toISOString(),
          cancelled_by: currentUser.id,
          cancellation_reason: cancellationReason.trim() || "Cancelled by customer",
          cancellation_fee: cancellationFee,
          refund_amount: refundAmount,
        })
        .eq("id", selectedBookingForCancel.id);

      if (error) {
        throw error;
      }

      // Update local state
      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === selectedBookingForCancel.id
            ? {
                ...booking,
                status: "cancelled",
                booking_status: "cancelled",
                cancelled_at: new Date().toISOString(),
                cancelled_by: currentUser.id,
                cancellation_reason: cancellationReason.trim() || "Cancelled by customer",
                cancellation_fee: cancellationFee,
                refund_amount: refundAmount,
              }
            : booking,
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

      const rescheduleData = {
        booking_date: newBookingDate,
        start_time: newBookingTime,
        reschedule_reason: rescheduleReason.trim() || "Rescheduled by customer",
        rescheduled_at: new Date().toISOString(),
        rescheduled_by: currentUser.id,
        original_booking_date: originalBookingDate,
        original_start_time: originalStartTime,
        reschedule_count: (selectedBookingForReschedule.reschedule_count || 0) + 1,
        last_reschedule_date: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("bookings")
        .update(rescheduleData)
        .eq("id", selectedBookingForReschedule.id);

      if (error) {
        throw error;
      }

      // Update local state with reschedule tracking
      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === selectedBookingForReschedule.id
            ? {
                ...booking,
                booking_date: newBookingDate,
                start_time: newBookingTime,
                booking_time: newBookingTime,
                reschedule_reason: rescheduleReason.trim() || "Rescheduled by customer",
                rescheduled_at: new Date().toISOString(),
                rescheduled_by: currentUser.id,
                // Update reschedule tracking fields in local state
                original_booking_date: originalBookingDate,
                original_start_time: originalStartTime,
                reschedule_count: (selectedBookingForReschedule.reschedule_count || 0) + 1,
                last_reschedule_date: new Date().toISOString(),
              }
            : booking,
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
