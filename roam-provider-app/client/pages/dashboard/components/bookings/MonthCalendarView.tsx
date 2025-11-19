import React, { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, isSameDay, isSameMonth, startOfWeek, endOfWeek } from "date-fns";

interface MonthCalendarViewProps {
  bookings: any[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onViewDetails: (booking: any) => void;
  formatDisplayTime: (time: string) => string;
}

export default function MonthCalendarView({
  bookings,
  currentDate,
  onDateChange,
  onViewDetails,
  formatDisplayTime,
}: MonthCalendarViewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

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

  const navigateMonth = (direction: "prev" | "next") => {
    const newDate = addMonths(currentDate, direction === "next" ? 1 : -1);
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

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth("prev")}
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
            onClick={() => navigateMonth("next")}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <h3 className="text-lg font-semibold">
          {format(currentDate, "MMMM yyyy")}
        </h3>
      </div>

      {/* Calendar Grid */}
      <div className="border rounded-lg overflow-hidden">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 bg-gray-50 border-b">
          {weekDays.map((day) => (
            <div
              key={day}
              className="p-2 text-center text-sm font-medium text-gray-700"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const dayBookings = bookingsByDate[dateKey] || [];
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, currentDate);

            return (
              <div
                key={index}
                className={`min-h-[120px] border-r border-b p-2 ${
                  !isCurrentMonth ? "bg-gray-50" : "bg-white"
                } ${isToday ? "ring-2 ring-blue-500" : ""}`}
              >
                <div className="mb-1">
                  <span
                    className={`text-sm font-medium ${
                      isToday
                        ? "bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                        : isCurrentMonth
                        ? "text-gray-900"
                        : "text-gray-400"
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                </div>
                <div className="space-y-1 max-h-[80px] overflow-y-auto">
                  {dayBookings.slice(0, 3).map((booking) => (
                    <button
                      key={booking.id}
                      onClick={() => onViewDetails(booking)}
                      className="w-full text-left"
                    >
                      <Card
                        className={`p-1.5 text-xs hover:shadow-md transition-shadow ${getStatusColor(
                          booking.status
                        )}`}
                      >
                        <div className="font-medium truncate">
                          {formatDisplayTime(booking.booking_time || "")}
                        </div>
                        <div className="truncate text-[10px] mt-0.5">
                          {booking.customer_profiles
                            ? `${booking.customer_profiles.first_name} ${booking.customer_profiles.last_name}`
                            : "Customer"}
                        </div>
                      </Card>
                    </button>
                  ))}
                  {dayBookings.length > 3 && (
                    <div className="text-xs text-gray-500 text-center py-1">
                      +{dayBookings.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

