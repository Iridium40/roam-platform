import React, { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfWeek, addDays, addWeeks, isSameDay } from "date-fns";

interface WeekCalendarViewProps {
  bookings: any[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onViewDetails: (booking: any) => void;
  formatDisplayTime: (time: string) => string;
}

export default function WeekCalendarView({
  bookings,
  currentDate,
  onDateChange,
  onViewDetails,
  formatDisplayTime,
}: WeekCalendarViewProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 }); // Sunday start
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Group bookings by date
  const bookingsByDate = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    bookings.forEach((booking) => {
      if (booking.booking_date) {
        const dateKey = booking.booking_date;
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(booking);
      }
    });
    // Sort bookings within each day by time
    Object.keys(grouped).forEach((dateKey) => {
      grouped[dateKey].sort((a, b) => {
        const timeA = a.booking_time || "00:00";
        const timeB = b.booking_time || "00:00";
        return timeA.localeCompare(timeB);
      });
    });
    return grouped;
  }, [bookings]);

  const navigateWeek = (direction: "prev" | "next") => {
    const newDate = addWeeks(currentDate, direction === "next" ? 1 : -1);
    onDateChange(newDate);
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "confirmed":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "in_progress":
        return "bg-purple-100 text-purple-800 border-purple-300";
      case "completed":
        return "bg-green-100 text-green-800 border-green-300";
      case "cancelled":
      case "declined":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  return (
    <div className="space-y-4">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateWeek("prev")}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateWeek("next")}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <h3 className="text-lg font-semibold">
          {format(weekStart, "MMM d")} - {format(addDays(weekStart, 6), "MMM d, yyyy")}
        </h3>
      </div>

      {/* Week Grid */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day, index) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const dayBookings = bookingsByDate[dateKey] || [];
          const isToday = isSameDay(day, new Date());

          return (
            <Card
              key={index}
              className={`p-3 min-h-[200px] ${isToday ? "ring-2 ring-blue-500" : ""}`}
            >
              <div className="mb-2">
                <div className="text-xs font-medium text-gray-500 uppercase">
                  {format(day, "EEE")}
                </div>
                <div
                  className={`text-lg font-semibold ${
                    isToday ? "text-blue-600" : ""
                  }`}
                >
                  {format(day, "d")}
                </div>
              </div>
              <div className="space-y-1 max-h-[150px] overflow-y-auto">
                {dayBookings.length > 0 ? (
                  dayBookings.map((booking) => (
                    <button
                      key={booking.id}
                      onClick={() => onViewDetails(booking)}
                      className="w-full text-left"
                    >
                      <Card
                        className={`p-2 text-xs hover:shadow-md transition-shadow ${getStatusColor(
                          booking.status
                        )}`}
                      >
                        <div className="font-medium truncate">
                          {formatDisplayTime(booking.booking_time || "")}
                        </div>
                        <div className="truncate mt-1">
                          {booking.customer_profiles
                            ? `${booking.customer_profiles.first_name} ${booking.customer_profiles.last_name}`
                            : "Customer"}
                        </div>
                        <Badge
                          variant="outline"
                          className={`mt-1 text-xs ${getStatusColor(booking.status)}`}
                        >
                          {booking.status}
                        </Badge>
                      </Card>
                    </button>
                  ))
                ) : (
                  <div className="text-xs text-gray-400 text-center py-4">
                    No bookings
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

