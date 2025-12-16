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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectLabel, SelectGroup } from "@/components/ui/select";
import { AlertCircle, Edit, Clock } from "lucide-react";
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

  // Time slots data (matching BookService.tsx)
  const timeSlots = [
    { value: '09:00', label: '9:00 AM', period: 'Morning' },
    { value: '09:30', label: '9:30 AM', period: 'Morning' },
    { value: '10:00', label: '10:00 AM', period: 'Morning' },
    { value: '10:30', label: '10:30 AM', period: 'Morning' },
    { value: '11:00', label: '11:00 AM', period: 'Morning' },
    { value: '11:30', label: '11:30 AM', period: 'Morning' },
    { value: '12:00', label: '12:00 PM', period: 'Afternoon' },
    { value: '12:30', label: '12:30 PM', period: 'Afternoon' },
    { value: '13:00', label: '1:00 PM', period: 'Afternoon' },
    { value: '13:30', label: '1:30 PM', period: 'Afternoon' },
    { value: '14:00', label: '2:00 PM', period: 'Afternoon' },
    { value: '14:30', label: '2:30 PM', period: 'Afternoon' },
    { value: '15:00', label: '3:00 PM', period: 'Afternoon' },
    { value: '15:30', label: '3:30 PM', period: 'Afternoon' },
    { value: '16:00', label: '4:00 PM', period: 'Afternoon' },
    { value: '16:30', label: '4:30 PM', period: 'Afternoon' },
    { value: '17:00', label: '5:00 PM', period: 'Evening' },
    { value: '17:30', label: '5:30 PM', period: 'Evening' },
    { value: '18:00', label: '6:00 PM', period: 'Evening' },
    { value: '18:30', label: '6:30 PM', period: 'Evening' },
  ];

  // Group time slots by period
  const groupedTimeSlots = timeSlots.reduce((acc, slot) => {
    if (!acc[slot.period]) {
      acc[slot.period] = [];
    }
    acc[slot.period].push(slot);
    return acc;
  }, {} as Record<string, typeof timeSlots>);

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

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-booking-date" className="text-sm font-medium">
                New Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="new-booking-date"
                type="date"
                value={newBookingDate}
                onChange={(e) => onNewDateChange(e.target.value)}
                min={(() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  return tomorrow.toISOString().split("T")[0];
                })()}
                max={(() => {
                  const oneYearFromToday = new Date();
                  oneYearFromToday.setFullYear(oneYearFromToday.getFullYear() + 1);
                  return oneYearFromToday.toISOString().split("T")[0];
                })()}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-booking-time" className="text-sm font-medium">
                New Time <span className="text-red-500">*</span>
              </Label>
              <Select value={newBookingTime} onValueChange={onNewTimeChange}>
                <SelectTrigger className="w-full h-12">
                  <Clock className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Select a time slot" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(groupedTimeSlots).map(([period, slots]) => (
                    <SelectGroup key={period}>
                      <SelectLabel className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {period}
                      </SelectLabel>
                      {slots.map((slot) => (
                        <SelectItem key={slot.value} value={slot.value}>
                          {slot.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
              {newBookingTime && (
                <div className="text-sm text-gray-600 bg-green-50 p-3 rounded-lg">
                  <Clock className="w-4 h-4 inline mr-2" />
                  You selected: {timeSlots.find(slot => slot.value === newBookingTime)?.label}
                </div>
              )}
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
