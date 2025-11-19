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
        const timeA = a.start_time || a.booking_time || "00:00";
        const timeB = b.start_time || b.booking_time || "00:00";
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
        return "bg-red-100 text-red-800 border-red-300";
      case "declined":
        return "bg-orange-100 text-orange-800 border-orange-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getStatusIndicatorColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500";
      case "confirmed":
        return "bg-blue-500";
      case "in_progress":
        return "bg-purple-500";
      case "completed":
        return "bg-green-500";
      case "cancelled":
        return "bg-red-500";
      case "declined":
        return "bg-orange-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "Pending";
      case "confirmed":
        return "Confirmed";
      case "in_progress":
        return "In Progress";
      case "completed":
        return "Completed";
      case "cancelled":
        return "Cancelled";
      case "declined":
        return "Declined";
      default:
        return "Unknown";
    }
  };

  const getStatusBorderColor = (status: string) => {
    switch (status) {
      case "pending":
        return "#eab308"; // yellow-500
      case "confirmed":
        return "#3b82f6"; // blue-500
      case "in_progress":
        return "#a855f7"; // purple-500
      case "completed":
        return "#22c55e"; // green-500
      case "cancelled":
        return "#ef4444"; // red-500
      case "declined":
        return "#f97316"; // orange-500
      default:
        return "#6b7280"; // gray-500
    }
  };

  // Get unique statuses for legend
  const uniqueStatuses = useMemo(() => {
    const statusSet = new Set<string>();
    bookings.forEach((booking) => {
      const status = booking.booking_status || booking.status;
      if (status) {
        statusSet.add(status);
      }
    });
    return Array.from(statusSet).sort();
  }, [bookings]);

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

      {/* Status Legend */}
      {uniqueStatuses.length > 0 && (
        <Card className="p-3">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Status:</span>
            {uniqueStatuses.map((status) => (
              <div key={status} className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${getStatusIndicatorColor(status)}`}
                />
                <span className="text-xs text-gray-600">{getStatusLabel(status)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

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
                        className={`p-2 text-xs hover:shadow-md transition-shadow border-l-4 ${getStatusColor(
                          booking.booking_status || booking.status || "default"
                        )}`}
                        style={{
                          borderLeftColor: getStatusBorderColor(booking.booking_status || booking.status || "default")
                        }}
                      >
                        <div className="flex items-start gap-2">
                          <div
                            className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${getStatusIndicatorColor(
                              booking.booking_status || booking.status || "default"
                            )}`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">
                              {formatDisplayTime(booking.booking_time || booking.start_time || "")}
                            </div>
                            <div className="truncate mt-1">
                              {booking.customer_profiles
                                ? `${booking.customer_profiles.first_name} ${booking.customer_profiles.last_name}`
                                : "Customer"}
                            </div>
                            <Badge
                              variant="outline"
                              className={`mt-1 text-xs ${getStatusColor(booking.booking_status || booking.status || "default")}`}
                            >
                              {getStatusLabel(booking.booking_status || booking.status || "default")}
                            </Badge>
                          </div>
                        </div>
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

