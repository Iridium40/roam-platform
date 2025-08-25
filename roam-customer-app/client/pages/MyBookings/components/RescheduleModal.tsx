import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Edit } from "lucide-react";
import type { BookingWithDetails } from "@/types/index";
import { formatBookingDate } from "../utils/bookingCalculations";

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: BookingWithDetails | null;
  newBookingDate: string;
  newBookingTime: string;
  rescheduleReason: string;
  onNewDateChange: (date: string) => void;
  onNewTimeChange: (time: string) => void;
  onRescheduleReasonChange: (reason: string) => void;
  onRescheduleBooking: () => void;
  isRescheduling: boolean;
}

export const RescheduleModal: React.FC<RescheduleModalProps> = ({
  isOpen,
  onClose,
  booking,
  newBookingDate,
  newBookingTime,
  rescheduleReason,
  onNewDateChange,
  onNewTimeChange,
  onRescheduleReasonChange,
  onRescheduleBooking,
  isRescheduling,
}) => {
  if (!booking) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-roam-blue">
            <Edit className="w-5 h-5" />
            Reschedule Booking
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-sm">
              {booking.service || "Service"}
            </h4>
            <p className="text-sm text-gray-600">
              Current Date: {formatBookingDate(booking.booking_date)} at {booking.booking_time}
            </p>
            <p className="text-sm text-gray-600">
              Provider: {booking.providers?.first_name} {booking.providers?.last_name}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="new-booking-date" className="text-sm font-medium">
                New Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="new-booking-date"
                type="date"
                value={newBookingDate}
                onChange={(e) => onNewDateChange(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-booking-time" className="text-sm font-medium">
                New Time <span className="text-red-500">*</span>
              </Label>
              <Input
                id="new-booking-time"
                type="time"
                value={newBookingTime}
                onChange={(e) => onNewTimeChange(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reschedule-reason" className="text-sm font-medium">
              Reason for Reschedule <span className="text-gray-500">(Optional)</span>
            </Label>
            <Textarea
              id="reschedule-reason"
              placeholder="Please let us know why you need to reschedule..."
              value={rescheduleReason}
              onChange={(e) => onRescheduleReasonChange(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Reschedule Policy</p>
                <p>
                  Reschedule requests are subject to provider availability and
                  approval. Please allow 24-48 hours for confirmation.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Keep Original
            </Button>
            <Button
              onClick={onRescheduleBooking}
              disabled={isRescheduling || !newBookingDate || !newBookingTime}
              className="flex-1 bg-roam-blue hover:bg-roam-blue/90 text-white"
            >
              {isRescheduling ? "Sending Request..." : "Request Reschedule"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
