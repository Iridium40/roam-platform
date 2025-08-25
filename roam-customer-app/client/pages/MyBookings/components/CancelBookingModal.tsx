import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, XCircle } from "lucide-react";
import type { BookingWithDetails } from "@/types/index";
import { calculateCancellationDetails } from "../utils/bookingCalculations";

interface CancelBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: BookingWithDetails | null;
  cancellationReason: string;
  onCancellationReasonChange: (reason: string) => void;
  onCancelBooking: () => void;
  isCancelling: boolean;
}

export const CancelBookingModal: React.FC<CancelBookingModalProps> = ({
  isOpen,
  onClose,
  booking,
  cancellationReason,
  onCancellationReasonChange,
  onCancelBooking,
  isCancelling,
}) => {
  if (!booking) return null;

  const cancellationDetails = calculateCancellationDetails(booking);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <XCircle className="w-5 h-5" />
            Cancel Booking
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-sm">
              {booking.service || "Service"}
            </h4>
            <p className="text-sm text-gray-600">
              Date: {booking.booking_date} at {booking.booking_time}
            </p>
            <p className="text-sm text-gray-600">
              Provider: {booking.providers?.first_name} {booking.providers?.last_name}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cancellation-reason" className="text-sm font-medium">
              Reason for Cancellation <span className="text-gray-500">(Optional)</span>
            </Label>
            <Textarea
              id="cancellation-reason"
              placeholder="Please let us know why you're cancelling this booking..."
              value={cancellationReason}
              onChange={(e) => onCancellationReasonChange(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-gray-500">
              This information helps us improve our service.
            </p>
          </div>

          {/* Cancellation Fee Breakdown */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <h4 className="font-medium text-sm mb-2">Cancellation Details</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Booking Total:</span>
                <span className="font-medium">
                  ${cancellationDetails.totalAmount.toFixed(2)}
                </span>
              </div>
              {(cancellationDetails.isWithin24Hours || cancellationDetails.isPastBooking) && (
                <>
                  <div className="flex justify-between text-red-600">
                    <span>Cancellation Fee:</span>
                    <span className="font-medium">
                      ${cancellationDetails.cancellationFee.toFixed(2)}
                    </span>
                  </div>
                  <div className="border-t pt-1 mt-1">
                    <div className="flex justify-between font-medium">
                      <span>Refund Amount:</span>
                      <span className="text-red-600">
                        ${cancellationDetails.refundAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </>
              )}
              {!cancellationDetails.isWithin24Hours && !cancellationDetails.isPastBooking && (
                <div className="flex justify-between font-medium text-green-600">
                  <span>Refund Amount:</span>
                  <span>${cancellationDetails.refundAmount.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          <div
            className={`border rounded-lg p-3 ${
              cancellationDetails.isPastBooking || cancellationDetails.isWithin24Hours
                ? "bg-red-50 border-red-200"
                : "bg-yellow-50 border-yellow-200"
            }`}
          >
            <div className="flex items-start gap-2">
              <AlertCircle
                className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                  cancellationDetails.isPastBooking || cancellationDetails.isWithin24Hours
                    ? "text-red-600"
                    : "text-yellow-600"
                }`}
              />
              <div
                className={`text-sm ${
                  cancellationDetails.isPastBooking || cancellationDetails.isWithin24Hours
                    ? "text-red-800"
                    : "text-yellow-800"
                }`}
              >
                <p className="font-medium">Cancellation Policy</p>
                {cancellationDetails.isPastBooking ? (
                  <p>
                    This booking is in the past. You may cancel it but no refund
                    will be provided as per our policy.
                  </p>
                ) : cancellationDetails.isWithin24Hours ? (
                  <p>
                    This booking is within 24 hours of the appointment time. You
                    may cancel it but no refund will be provided as per our
                    policy.
                  </p>
                ) : (
                  <p>
                    This booking can be cancelled with a full refund as it's more
                    than 24 hours away from the appointment time.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Keep Booking
            </Button>
            <Button
              onClick={onCancelBooking}
              disabled={isCancelling}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {isCancelling ? "Cancelling..." : "Cancel Booking"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
