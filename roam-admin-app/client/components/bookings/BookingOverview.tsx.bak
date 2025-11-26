import React from 'react';
import {
  ROAMCard,
  ROAMCardHeader,
  ROAMCardTitle,
  ROAMCardContent,
} from "@/components/ui/roam-card";
import {
  CheckCircle,
  XCircle,
  CreditCard,
  Truck,
  Building2,
  Heart,
} from "lucide-react";

// Types
type BookingStatus = "pending" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show";
type PaymentStatus = "pending" | "paid" | "failed" | "refunded" | "partially_refunded";
type DeliveryType = "business" | "customer" | "mobile";

interface Booking {
  id: string;
  booking_status: BookingStatus;
  payment_status: PaymentStatus;
  delivery_type: DeliveryType;
  total_amount: number;
  tip_amount: number;
  guest_name?: string;
}

interface BookingOverviewProps {
  bookings: Booking[];
}

export function BookingOverview({ bookings }: BookingOverviewProps) {
  // Calculate stats from bookings data
  const confirmedBookings = bookings.filter(b => b.booking_status === "confirmed").length;
  const completedBookings = bookings.filter(b => b.booking_status === "completed").length;
  const cancelledBookings = bookings.filter(b => b.booking_status === "cancelled").length;
  const pendingPayments = bookings.filter(b => b.payment_status === "pending").length;
  const totalRevenue = bookings.reduce((sum, booking) => sum + booking.total_amount, 0);
  const totalTipAmount = bookings.reduce((sum, booking) => sum + booking.tip_amount, 0);
  const mobileBookings = bookings.filter(b => b.delivery_type === "mobile").length;
  const guestBookings = bookings.filter(b => b.guest_name).length;

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <div className="hidden md:grid grid-cols-1 md:grid-cols-3 gap-6">
      <ROAMCard>
        <ROAMCardHeader>
          <ROAMCardTitle>Booking Status</ROAMCardTitle>
        </ROAMCardHeader>
        <ROAMCardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-roam-success" />
                <span className="text-sm font-medium">Confirmed</span>
              </div>
              <span className="text-lg font-bold">
                {confirmedBookings}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-roam-success" />
                <span className="text-sm font-medium">Completed</span>
              </div>
              <span className="text-lg font-bold">
                {completedBookings}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-destructive" />
                <span className="text-sm font-medium">Cancelled</span>
              </div>
              <span className="text-lg font-bold">
                {cancelledBookings}
              </span>
            </div>
          </div>
        </ROAMCardContent>
      </ROAMCard>

      <ROAMCard>
        <ROAMCardHeader>
          <ROAMCardTitle>Payment Status</ROAMCardTitle>
        </ROAMCardHeader>
        <ROAMCardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-roam-success" />
                <span className="text-sm font-medium">Total Revenue</span>
              </div>
              <span className="text-lg font-bold">
                {formatPrice(totalRevenue)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-medium">Pending Payments</span>
              </div>
              <span className="text-lg font-bold">
                {pendingPayments}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-pink-600" />
                <span className="text-sm font-medium">Tips Received</span>
              </div>
              <span className="text-lg font-bold">
                {formatPrice(totalTipAmount)}
              </span>
            </div>
          </div>
        </ROAMCardContent>
      </ROAMCard>

      <ROAMCard>
        <ROAMCardHeader>
          <ROAMCardTitle>Service Delivery</ROAMCardTitle>
        </ROAMCardHeader>
        <ROAMCardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-roam-blue" />
                <span className="text-sm font-medium">Mobile Services</span>
              </div>
              <span className="text-lg font-bold">
                {mobileBookings}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">In-Business</span>
              </div>
              <span className="text-lg font-bold">
                {bookings.length - mobileBookings}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium">Guest Bookings</span>
              </div>
              <span className="text-lg font-bold">
                {guestBookings}
              </span>
            </div>
          </div>
        </ROAMCardContent>
      </ROAMCard>
    </div>
  );
}