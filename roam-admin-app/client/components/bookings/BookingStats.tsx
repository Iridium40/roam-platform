import React from 'react';
import { ROAMStatCard } from "@/components/ui/roam-stat-card";
import {
  Calendar,
  CheckCircle,
  DollarSign,
  Heart,
  TrendingUp,
} from "lucide-react";

// Types
type BookingStatus = "pending" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show";

interface Booking {
  id: string;
  total_amount: number;
  booking_status: BookingStatus;
  tip_amount: number;
  tip_eligible: boolean;
}

interface BookingStatsProps {
  bookings: Booking[];
  formatPrice: (amount: number) => string;
}

export function BookingStats({ bookings, formatPrice }: BookingStatsProps) {
  // Calculate stats from bookings data
  const totalBookings = bookings.length;
  const completedBookings = bookings.filter(b => b.booking_status === "completed").length;
  const confirmedBookings = bookings.filter(b => b.booking_status === "confirmed").length;
  const totalRevenue = bookings.reduce((sum, booking) => sum + booking.total_amount, 0);
  const totalTipAmount = bookings.reduce((sum, booking) => sum + booking.tip_amount, 0);
  const tipEligibleBookings = bookings.filter(b => b.tip_eligible).length;
  const tippedBookings = bookings.filter(b => b.tip_amount > 0).length;

  return (
    <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <ROAMStatCard
        title="Total Bookings"
        value={totalBookings}
        icon={<Calendar className="w-5 h-5" />}
        subtitle={`${confirmedBookings} confirmed`}
        changeType="positive"
        changeIcon={<TrendingUp className="w-3 h-3" />}
      />

      <ROAMStatCard
        title="Completed"
        value={completedBookings}
        icon={<CheckCircle className="w-5 h-5" />}
        subtitle={totalBookings > 0 ? `${Math.round((completedBookings / totalBookings) * 100)}% completion rate` : "0% completion rate"}
        changeType="positive"
      />

      <ROAMStatCard
        title="Total Revenue"
        value={formatPrice(totalRevenue)}
        icon={<DollarSign className="w-5 h-5" />}
        subtitle={`Average: ${formatPrice(totalBookings > 0 ? totalRevenue / totalBookings : 0)}`}
        changeType="neutral"
      />

      <ROAMStatCard
        title="Tips Received"
        value={formatPrice(totalTipAmount)}
        icon={<Heart className="w-5 h-5" />}
        subtitle={`${tippedBookings} of ${tipEligibleBookings} eligible`}
        changeType="positive"
        changeIcon={<TrendingUp className="w-3 h-3" />}
      />
    </div>
  );
}