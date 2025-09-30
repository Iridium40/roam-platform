import React from "react";
import { Card } from "@/components/ui/card";
import {
  Calendar,
  Clock,
  DollarSign,
  CheckCircle,
  TrendingUp,
  Activity,
} from "lucide-react";

interface BookingStats {
  totalBookings: number;
  completionRate: number;
  totalRevenue: number;
  averageBookingValue: number;
  pendingBookings: number;
  inProgressBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  confirmedBookings: number;
}

interface BookingStatsSectionProps {
  bookingStats: BookingStats;
  presentBookings: any[];
  futureBookings: any[];
  pastBookings: any[];
}

export default function BookingStatsSection({
  bookingStats,
  presentBookings,
  futureBookings,
  pastBookings,
}: BookingStatsSectionProps) {
  return (
    <div className="space-y-6">
      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Bookings</p>
              <p className="text-3xl font-bold text-gray-900">{bookingStats.totalBookings}</p>
              <p className="text-sm text-gray-500 mt-1">
                {bookingStats.completionRate.toFixed(1)}% completion rate
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-3xl font-bold text-gray-900">${bookingStats.totalRevenue.toFixed(2)}</p>
              <p className="text-sm text-gray-500 mt-1">
                ${bookingStats.averageBookingValue.toFixed(2)} avg per booking
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Actions</p>
              <p className="text-3xl font-bold text-gray-900">{bookingStats.pendingBookings}</p>
              <p className="text-sm text-gray-500 mt-1">
                {bookingStats.inProgressBookings} in progress
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-3xl font-bold text-gray-900">{bookingStats.completedBookings}</p>
              <p className="text-sm text-gray-500 mt-1">
                {bookingStats.cancelledBookings} cancelled
              </p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="p-4 text-center">
          <p className="text-sm text-gray-600">Present</p>
          <p className="text-2xl font-bold text-blue-600">{presentBookings.length}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm text-gray-600">Future</p>
          <p className="text-2xl font-bold text-green-600">{futureBookings.length}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm text-gray-600">Past</p>
          <p className="text-2xl font-bold text-purple-600">{pastBookings.length}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm text-gray-600">Pending</p>
          <p className="text-2xl font-bold text-orange-600">{bookingStats.pendingBookings}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm text-gray-600">Confirmed</p>
          <p className="text-2xl font-bold text-green-600">{bookingStats.confirmedBookings}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm text-gray-600">Completed</p>
          <p className="text-2xl font-bold text-emerald-600">{bookingStats.completedBookings}</p>
        </Card>
      </div>
    </div>
  );
}