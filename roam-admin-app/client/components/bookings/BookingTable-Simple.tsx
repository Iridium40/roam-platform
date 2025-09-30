import React from 'react';
import { ROAMDataTable, Column } from "@/components/ui/roam-data-table";
import { ROAMBadge } from "@/components/ui/roam-badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

// Types
type DeliveryType = "business" | "customer" | "mobile";
type PaymentStatus = "pending" | "paid" | "failed" | "refunded" | "partially_refunded";
type BookingStatus = "pending" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show";

interface Booking {
  id: string;
  booking_date: string;
  start_time: string;
  total_amount: number;
  delivery_type: DeliveryType;
  payment_status: PaymentStatus;
  booking_status: BookingStatus;
  customer_profiles?: {
    first_name: string;
    last_name: string;
  };
  providers?: {
    first_name: string;
    last_name: string;
  };
  guest_name?: string;
}

interface BookingTableProps {
  bookings: Booking[];
  onBookingClick: (booking: Booking) => void;
  formatDate: (date: string) => string;
  formatTime: (time: string) => string;
  formatPrice: (amount: number) => string;
  formatEnumDisplay: (value: string) => string;
  getCustomerName: (booking: Booking) => string;
  getProviderName: (booking: Booking) => string;
  getBookingStatusBadgeVariant: (status: BookingStatus) => "default" | "secondary" | "success" | "warning" | "danger" | "neutral" | "outline";
  getPaymentStatusBadgeVariant: (status: PaymentStatus) => "default" | "secondary" | "success" | "warning" | "danger" | "neutral" | "outline";
}

export function BookingTable({
  bookings,
  onBookingClick,
  formatDate,
  formatTime,
  formatPrice,
  formatEnumDisplay,
  getCustomerName,
  getProviderName,
  getBookingStatusBadgeVariant,
  getPaymentStatusBadgeVariant,
}: BookingTableProps) {

  const columns: Column[] = [
    {
      key: "booking_date",
      header: "Date",
      render: (value: string) => formatDate(value),
      sortable: true,
    },
    {
      key: "start_time",
      header: "Time",
      render: (value: string) => formatTime(value),
      sortable: true,
    },
    {
      key: "customer_name",
      header: "Customer",
      render: (value: any, row: Booking) => getCustomerName(row),
      sortable: false,
    },
    {
      key: "provider_name",
      header: "Provider",
      render: (value: any, row: Booking) => getProviderName(row),
      sortable: false,
    },
    {
      key: "total_amount",
      header: "Amount",
      render: (value: number) => formatPrice(value),
      sortable: true,
    },
    {
      key: "booking_status",
      header: "Status",
      render: (value: BookingStatus) => (
        <ROAMBadge variant={getBookingStatusBadgeVariant(value)}>
          {formatEnumDisplay(value)}
        </ROAMBadge>
      ),
      sortable: true,
    },
    {
      key: "payment_status",
      header: "Payment",
      render: (value: PaymentStatus) => (
        <ROAMBadge variant={getPaymentStatusBadgeVariant(value)}>
          {formatEnumDisplay(value)}
        </ROAMBadge>
      ),
      sortable: true,
    },
    {
      key: "delivery_type",
      header: "Service Type",
      render: (value: DeliveryType) => (
        <ROAMBadge variant={value === "mobile" ? "warning" : "secondary"}>
          {value === "mobile" ? "Mobile" : "In-Business"}
        </ROAMBadge>
      ),
      sortable: true,
    },
    {
      key: "actions",
      header: "Actions",
      render: (value: any, row: Booking) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onBookingClick(row)}
        >
          <Eye className="w-4 h-4" />
        </Button>
      ),
      sortable: false,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">All Bookings</h2>
        <span className="text-sm text-muted-foreground">
          {bookings.length} total bookings
        </span>
      </div>
      
      <ROAMDataTable
        data={bookings}
        columns={columns}
      />
    </div>
  );
}