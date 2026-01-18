import React from 'react';
import { ROAMDataTable, Column } from "@/components/ui/roam-data-table";
import { ROAMBadge } from "@/components/ui/roam-badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  DollarSign,
  User,
  UserCheck,
  Building2,
  Truck,
  Heart,
  Eye,
} from "lucide-react";

// Types
type DeliveryType = "business" | "customer" | "mobile";
type PaymentStatus = "pending" | "paid" | "failed" | "refunded" | "partially_refunded";
type BookingStatus = "pending" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show";
type TipStatus = "none" | "pending" | "completed" | "declined";

interface Booking {
  id: string;
  customer_id: string;
  provider_id: string;
  service_id: string;
  booking_date: string;
  start_time: string;
  total_amount: number;
  created_at: string;
  service_fee: number;
  service_fee_charged: boolean;
  service_fee_charged_at?: string;
  remaining_balance: number;
  remaining_balance_charged: boolean;
  remaining_balance_charged_at?: string;
  cancellation_fee: number;
  refund_amount: number;
  cancelled_at?: string;
  cancelled_by?: string;
  cancellation_reason?: string;
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
  customer_location_id?: string;
  business_location_id?: string;
  delivery_type: DeliveryType;
  payment_status: PaymentStatus;
  booking_status: BookingStatus;
  admin_notes?: string;
  booking_reference?: string;
  tip_eligible: boolean;
  tip_amount: number;
  tip_status: TipStatus;
  tip_requested_at?: string;
  tip_deadline?: string;
  customer_profiles?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  providers?: {
    id: string;
    first_name: string;
    last_name: string;
    business_profiles?: {
      id: string;
      business_name: string;
    };
  };
  services?: {
    id: string;
    name: string;
    duration_minutes: number;
    min_price: number;
  };
}

type BadgeVariant = "default" | "secondary" | "success" | "warning" | "danger" | "neutral" | "outline";

interface BookingTableProps {
  bookings: Booking[];
  onBookingClick: (booking: Booking) => void;
  onViewBooking?: (booking: Booking) => void;
  formatDate: (date: string) => string;
  formatTime: (time: string) => string;
  formatDateTime?: (dateStr: string) => string;
  formatPrice: (amount: number) => string;
  formatEnumDisplay: (value: string) => string;
  formatTipStatus?: (status: TipStatus) => string;
  getCustomerName: (booking: Booking) => string;
  getProviderName: (booking: Booking) => string;
  getServiceName?: (booking: Booking) => string;
  getBusinessName?: (booking: Booking) => string;
  getBookingStatusBadgeVariant: (status: BookingStatus) => BadgeVariant;
  getBookingStatusVariant?: (status: BookingStatus) => BadgeVariant;
  getPaymentStatusBadgeVariant: (status: PaymentStatus) => BadgeVariant;
  getPaymentStatusVariant?: (status: PaymentStatus) => BadgeVariant;
  getTipStatusVariant?: (status: TipStatus) => BadgeVariant;
  // Filters
  bookingStatusFilter?: BookingStatus | 'all';
  onBookingStatusFilterChange?: (status: BookingStatus | 'all') => void;
  paymentStatusFilter?: PaymentStatus | 'all';
  onPaymentStatusFilterChange?: (status: PaymentStatus | 'all') => void;
  startDate?: string;
  endDate?: string;
  onStartDateChange?: (date: string) => void;
  onEndDateChange?: (date: string) => void;
}

export function BookingTable({
  bookings,
  onBookingClick,
  onViewBooking,
  formatDate,
  formatTime,
  formatDateTime = (d) => formatDate(d),
  formatPrice,
  formatEnumDisplay,
  formatTipStatus = (s) => formatEnumDisplay(s),
  getCustomerName,
  getProviderName,
  getServiceName = (b) => b.services?.name || 'N/A',
  getBusinessName = (b) => b.providers?.business_profiles?.business_name || 'N/A',
  getBookingStatusBadgeVariant,
  getBookingStatusVariant = getBookingStatusBadgeVariant,
  getPaymentStatusBadgeVariant,
  getPaymentStatusVariant = getPaymentStatusBadgeVariant,
  getTipStatusVariant = () => 'secondary',
  bookingStatusFilter = 'all',
  onBookingStatusFilterChange,
  paymentStatusFilter = 'all',
  onPaymentStatusFilterChange,
  startDate = '',
  endDate = '',
  onStartDateChange = () => {},
  onEndDateChange = () => {},
}: BookingTableProps) {
  
  const bookingColumns: Column[] = [
    {
      key: "customer_service",
      header: "Customer & Service",
      render: (value: any, row: Booking) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{getCustomerName(row)}</span>
            {row.guest_name && (
              <ROAMBadge variant="outline" size="sm">
                Guest
              </ROAMBadge>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            {getServiceName(row)}
          </div>
          <div className="text-xs text-muted-foreground">
            {getBusinessName(row)}
          </div>
        </div>
      ),
    },
    {
      key: "appointment",
      header: "Appointment",
      sortable: true,
      render: (value: any, row: Booking) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-roam-blue" />
            <span className="font-medium">{formatDate(row.booking_date)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{formatTime(row.start_time)}</span>
          </div>
        </div>
      ),
    },
    {
      key: "provider_delivery",
      header: "Provider & Type",
      render: (value: any, row: Booking) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{getProviderName(row)}</span>
          </div>
          <ROAMBadge
            variant={row.delivery_type === "mobile" ? "success" : "outline"}
            size="sm"
            className="flex items-center gap-1 w-fit"
          >
            {row.delivery_type === "mobile" ? (
              <Truck className="w-3 h-3" />
            ) : (
              <Building2 className="w-3 h-3" />
            )}
            {formatEnumDisplay(row.delivery_type)}
          </ROAMBadge>
        </div>
      ),
    },
    {
      key: "payment",
      header: "Payment",
      render: (value: any, row: Booking) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-roam-success" />
            <span className="font-semibold">
              {formatPrice(row.total_amount)}
            </span>
          </div>
          <ROAMBadge
            variant={getPaymentStatusVariant(row.payment_status)}
            size="sm"
          >
            {formatEnumDisplay(row.payment_status)}
          </ROAMBadge>
          {row.remaining_balance > 0 && !row.remaining_balance_charged && (
            <div className="text-xs text-roam-warning">
              Balance: {formatPrice(row.remaining_balance)}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "tip_status",
      header: "Tip",
      render: (value: any, row: Booking) => (
        <div className="space-y-1">
          {row.tip_eligible ? (
            <>
              <div className="flex items-center gap-2">
                <Heart
                  className={`w-4 h-4 ${
                    row.tip_status === "completed"
                      ? "text-roam-success fill-roam-success"
                      : "text-muted-foreground"
                  }`}
                />
                {row.tip_amount > 0 && (
                  <span className="font-semibold text-roam-success">
                    {formatPrice(row.tip_amount)}
                  </span>
                )}
              </div>
              <ROAMBadge
                variant={getTipStatusVariant(row.tip_status)}
                size="sm"
              >
                {formatTipStatus(row.tip_status)}
              </ROAMBadge>
            </>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Heart className="w-4 h-4" />
              <span className="text-xs">Not eligible</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: "booking_reference",
      header: "Reference",
      sortable: true,
      render: (value: any, row: Booking) => (
        <div className="font-mono text-sm text-muted-foreground">
          {row.booking_reference || `#${row.id.slice(-6)}`}
        </div>
      ),
    },
    {
      key: "booking_status",
      header: "Status",
      sortable: true,
      render: (value: BookingStatus) => (
        <ROAMBadge variant={getBookingStatusVariant(value)}>
          {formatEnumDisplay(value)}
        </ROAMBadge>
      ),
    },
    {
      key: "created_at",
      header: "Booked",
      sortable: true,
      render: (value: string) => (
        <span className="text-sm text-muted-foreground">
          {formatDateTime(value)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (value: any, row: Booking) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onViewBooking(row)}
            title="View Booking Details"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <div className="space-y-4">
        <div className="flex gap-4 items-center bg-muted/30 p-4 rounded-lg">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Status:</label>
            <select
              value={bookingStatusFilter}
              onChange={(e) =>
                onBookingStatusFilterChange(
                  e.target.value as "all" | BookingStatus,
                )
              }
              className="px-3 py-1 border border-border rounded-md text-sm bg-background"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No Show</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Payment Status:</label>
            <select
              value={paymentStatusFilter}
              onChange={(e) =>
                onPaymentStatusFilterChange(
                  e.target.value as "all" | PaymentStatus,
                )
              }
              className="px-3 py-1 border border-border rounded-md text-sm bg-background"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
              <option value="partially_refunded">
                Partially Refunded
              </option>
            </select>
          </div>

          <div className="text-sm text-muted-foreground ml-auto">
            Showing {bookings.length} bookings
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="flex gap-4 items-center bg-roam-blue/5 p-4 rounded-lg border border-roam-blue/20">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-roam-blue" />
            <label className="text-sm font-medium text-roam-blue">
              Appointment Date Range:
            </label>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">From:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="px-3 py-1 border border-border rounded-md text-sm bg-background"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">To:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="px-3 py-1 border border-border rounded-md text-sm bg-background"
            />
          </div>

          {(startDate || endDate) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onStartDateChange("");
                onEndDateChange("");
              }}
              className="text-xs"
            >
              Clear Dates
            </Button>
          )}
        </div>
      </div>

      {/* Booking Table */}
      <ROAMDataTable
        data={bookings}
        columns={bookingColumns}
      />
    </div>
  );
}