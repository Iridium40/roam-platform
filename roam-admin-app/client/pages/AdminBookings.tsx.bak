import React, { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { ROAMDataTable, Column } from "@/components/ui/roam-data-table";
import {
  ROAMCard,
  ROAMCardHeader,
  ROAMCardTitle,
  ROAMCardContent,
} from "@/components/ui/roam-card";
import { ROAMStatCard } from "@/components/ui/roam-stat-card";
import { ROAMBadge } from "@/components/ui/roam-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { getDeliveryTypeLabel, getDeliveryTypeIcon } from '@/utils/deliveryTypeHelpers';
import {
  Calendar,
  Clock,
  DollarSign,
  User,
  UserCheck,
  Building2,
  Truck,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Eye,
  Edit,
  TrendingUp,
  MapPin,
  Phone,
  Mail,
  Plus,
  Package,
  Heart,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

// Enum types based on database schema
type DeliveryType = "business_location" | "customer_location" | "virtual" | "both_locations";
type PaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "refunded"
  | "partially_refunded";
type BookingStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";
type ChangeType = "addon_added" | "addon_removed" | "rescheduled" | "cancelled";
type TipStatus = "none" | "pending" | "completed" | "declined";
type TipPaymentStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "refunded";
type TipPayoutStatus = "pending" | "processing" | "paid" | "failed";

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
  // Tip fields
  tip_eligible: boolean;
  tip_amount: number;
  tip_status: TipStatus;
  tip_requested_at?: string;
  tip_deadline?: string;
  // Joined data from related tables
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

interface BookingChange {
  id: string;
  booking_id: string;
  change_type: ChangeType;
  old_value?: any;
  new_value?: any;
  additional_cost: number;
  refund_amount: number;
  changed_by: string;
  changed_by_name: string; // Joined from users
  change_reason?: string;
  stripe_charge_id?: string;
  stripe_refund_id?: string;
  created_at: string;
}

interface Tip {
  id: string;
  booking_id: string;
  customer_id: string;
  customer_name: string; // Joined from customer_profiles
  provider_id: string;
  provider_name: string; // Joined from providers
  business_id: string;
  business_name: string; // Joined from business_profiles
  tip_amount: number;
  tip_percentage?: number;
  stripe_payment_intent_id?: string;
  payment_status: TipPaymentStatus;
  platform_fee_amount: number;
  provider_net_amount: number;
  customer_message?: string;
  provider_response?: string;
  provider_responded_at?: string;
  tip_given_at: string;
  payment_processed_at?: string;
  payout_status: TipPayoutStatus;
  payout_batch_id?: string;
  payout_date?: string;
  created_at: string;
  updated_at: string;
}

const sampleBookings: Booking[] = [
  {
    id: "booking_1",
    customer_id: "cust_1",
    customer_name: "Alice Johnson",
    provider_id: "prov_1",
    provider_name: "Sarah Martinez",
    service_id: "srv_1",
    service_name: "Premium Hair Cut & Style",
    business_name: "Miami Spa & Wellness",
    booking_date: "2025-07-15",
    start_time: "14:00:00",
    total_amount: 110.0,
    created_at: "2025-07-10T10:30:00Z",
    service_fee: 10.0,
    service_fee_charged: true,
    service_fee_charged_at: "2025-07-10T10:30:00Z",
    remaining_balance: 100.0,
    remaining_balance_charged: false,
    cancellation_fee: 0,
    refund_amount: 0,
    delivery_type: "business",
    payment_status: "paid",
    booking_status: "confirmed",
    admin_notes: "Customer requested early appointment",
    tip_eligible: false,
    tip_amount: 0,
    tip_status: "none",
  },
  {
    id: "booking_2",
    customer_id: "cust_2",
    customer_name: "Bob Smith",
    provider_id: "prov_2",
    provider_name: "Marcus Johnson",
    service_id: "srv_3",
    service_name: "1-on-1 Personal Training Session",
    business_name: "Elite Fitness Center",
    booking_date: "2025-08-05",
    start_time: "09:00:00",
    total_amount: 115.0,
    created_at: "2025-07-28T14:20:00Z",
    service_fee: 15.0,
    service_fee_charged: true,
    service_fee_charged_at: "2025-07-28T14:20:00Z",
    remaining_balance: 100.0,
    remaining_balance_charged: true,
    remaining_balance_charged_at: "2025-08-02T16:00:00Z",
    cancellation_fee: 0,
    refund_amount: 0,
    delivery_type: "mobile",
    payment_status: "paid",
    booking_status: "completed",
    tip_eligible: true,
    tip_amount: 20.0,
    tip_status: "completed",
    tip_requested_at: "2025-08-05T17:30:00Z",
    tip_deadline: "2025-08-08T17:30:00Z",
  },
  {
    id: "booking_3",
    customer_name: "Carol Davis",
    customer_id: "cust_3",
    provider_id: "prov_3",
    provider_name: "Lisa Chen",
    service_id: "srv_4",
    service_name: "Swedish Relaxation Massage",
    business_name: "Zen Massage Therapy",
    booking_date: "2025-09-12",
    start_time: "16:30:00",
    total_amount: 130.0,
    created_at: "2025-09-05T11:15:00Z",
    service_fee: 15.0,
    service_fee_charged: true,
    service_fee_charged_at: "2025-09-05T11:15:00Z",
    remaining_balance: 115.0,
    remaining_balance_charged: false,
    cancellation_fee: 25.0,
    refund_amount: 90.0,
    cancelled_at: "2025-09-10T09:30:00Z",
    cancelled_by: "cust_3",
    cancellation_reason: "Personal emergency",
    delivery_type: "business",
    payment_status: "partially_refunded",
    booking_status: "cancelled",
    tip_eligible: false,
    tip_amount: 0,
    tip_status: "none",
  },
  {
    id: "booking_4",
    guest_name: "David Wilson",
    guest_email: "david.w@email.com",
    guest_phone: "+1-305-555-9999",
    customer_id: "guest_1",
    customer_name: "David Wilson (Guest)",
    provider_id: "prov_1",
    provider_name: "Sarah Martinez",
    service_id: "srv_2",
    service_name: "Deep Cleansing Facial",
    business_name: "Miami Spa & Wellness",
    booking_date: "2025-10-18",
    start_time: "11:00:00",
    total_amount: 120.0,
    created_at: "2025-10-10T16:45:00Z",
    service_fee: 0.0,
    service_fee_charged: false,
    remaining_balance: 120.0,
    remaining_balance_charged: false,
    cancellation_fee: 0,
    refund_amount: 0,
    delivery_type: "business",
    payment_status: "pending",
    booking_status: "pending",
    tip_eligible: false,
    tip_amount: 0,
    tip_status: "none",
  },
];

const sampleChanges: BookingChange[] = [
  {
    id: "change_1",
    booking_id: "booking_2",
    change_type: "addon_added",
    old_value: null,
    new_value: { addon_name: "Extended Time (30 min)", addon_price: 45.0 },
    additional_cost: 45.0,
    refund_amount: 0,
    changed_by: "prov_2",
    changed_by_name: "Marcus Johnson",
    change_reason: "Customer requested longer session",
    stripe_charge_id: "ch_1234567890",
    created_at: "2025-08-02T08:30:00Z",
  },
  {
    id: "change_2",
    booking_id: "booking_3",
    change_type: "cancelled",
    old_value: { booking_status: "confirmed" },
    new_value: {
      booking_status: "cancelled",
      cancellation_reason: "Personal emergency",
    },
    additional_cost: 0,
    refund_amount: 90.0,
    changed_by: "cust_3",
    changed_by_name: "Carol Davis",
    change_reason: "Personal emergency",
    stripe_refund_id: "re_0987654321",
    created_at: "2025-09-10T09:30:00Z",
  },
];

const sampleTips: Tip[] = [
  {
    id: "tip_1",
    booking_id: "booking_2",
    customer_id: "cust_2",
    customer_name: "Bob Smith",
    provider_id: "prov_2",
    provider_name: "Marcus Johnson",
    business_id: "biz_2",
    business_name: "Elite Fitness Center",
    tip_amount: 20.0,
    tip_percentage: 17.39, // $20 on $115 service
    stripe_payment_intent_id: "pi_1234567890",
    payment_status: "completed",
    platform_fee_amount: 0,
    provider_net_amount: 20.0,
    customer_message: "Great workout session! Really pushed me to my limits.",
    provider_response:
      "Thank you so much! It was great working with you. Looking forward to our next session!",
    provider_responded_at: "2024-01-22T20:15:00Z",
    tip_given_at: "2024-01-22T18:45:00Z",
    payment_processed_at: "2024-01-22T18:45:30Z",
    payout_status: "paid",
    payout_batch_id: "po_batch_001",
    payout_date: "2024-01-24",
    created_at: "2024-01-22T18:45:00Z",
    updated_at: "2024-01-22T20:15:00Z",
  },
];

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatTime = (timeString: string) => {
  return new Date(`2000-01-01T${timeString}`).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const formatDateTime = (dateTimeString: string) => {
  return new Date(dateTimeString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const formatEnumDisplay = (value: string): string => {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getPaymentStatusVariant = (status: PaymentStatus) => {
  switch (status) {
    case "paid":
      return "success" as const;
    case "pending":
      return "warning" as const;
    case "failed":
      return "danger" as const;
    case "refunded":
      return "secondary" as const;
    case "partially_refunded":
      return "warning" as const;
    default:
      return "secondary" as const;
  }
};

const getBookingStatusVariant = (status: BookingStatus) => {
  switch (status) {
    case "confirmed":
      return "success" as const;
    case "completed":
      return "success" as const;
    case "pending":
      return "warning" as const;
    case "in_progress":
      return "warning" as const;
    case "cancelled":
      return "danger" as const;
    case "no_show":
      return "danger" as const;
    default:
      return "secondary" as const;
  }
};

const getChangeTypeVariant = (type: ChangeType) => {
  switch (type) {
    case "addon_added":
      return "success" as const;
    case "addon_removed":
      return "warning" as const;
    case "rescheduled":
      return "secondary" as const;
    case "cancelled":
      return "danger" as const;
    default:
      return "secondary" as const;
  }
};

const getBookingStatusBadgeVariant = (status: BookingStatus) => {
  switch (status) {
    case "confirmed":
      return "success" as const;
    case "completed":
      return "success" as const;
    case "pending":
      return "warning" as const;
    case "in_progress":
      return "warning" as const;
    case "cancelled":
      return "danger" as const;
    case "no_show":
      return "danger" as const;
    default:
      return "secondary" as const;
  }
};

const getPaymentStatusBadgeVariant = (status: PaymentStatus) => {
  switch (status) {
    case "paid":
      return "success" as const;
    case "pending":
      return "warning" as const;
    case "failed":
      return "danger" as const;
    case "refunded":
      return "secondary" as const;
    case "partially_refunded":
      return "warning" as const;
    default:
      return "secondary" as const;
  }
};

const getTipStatusVariant = (status: TipStatus) => {
  switch (status) {
    case "completed":
      return "success" as const;
    case "pending":
      return "warning" as const;
    case "declined":
      return "danger" as const;
    case "none":
    default:
      return "secondary" as const;
  }
};

const formatTipStatus = (status: TipStatus) => {
  switch (status) {
    case "completed":
      return "Tipped";
    case "pending":
      return "Tip Pending";
    case "declined":
      return "Declined";
    case "none":
    default:
      return "No Tip";
  }
};

export default function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingChanges, setBookingChanges] = useState<BookingChange[]>([]);
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"bookings" | "changes">(
    "bookings",
  );
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isBookingDetailsOpen, setIsBookingDetailsOpen] = useState(false);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<
    "all" | PaymentStatus
  >("all");
  const [bookingStatusFilter, setBookingStatusFilter] = useState<
    "all" | BookingStatus
  >("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Helper functions to get display names from joined data
  const getCustomerName = (booking: Booking) => {
    if (booking.guest_name) return booking.guest_name;
    if (booking.customer_profiles) {
      const { first_name, last_name } = booking.customer_profiles;
      return `${first_name} ${last_name}`;
    }
    return "Unknown Customer";
  };

  const getProviderName = (booking: Booking) => {
    if (booking.providers) {
      const { first_name, last_name } = booking.providers;
      return `${first_name} ${last_name}`;
    }
    return "Unassigned Provider";
  };

  const getBusinessName = (booking: Booking) => {
    return (
      booking.providers?.business_profiles?.business_name || "Unknown Business"
    );
  };

  const getServiceName = (booking: Booking) => {
    return booking.services?.name || "Unknown Service";
  };

  // Fetch bookings from Supabase with related data
  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("bookings")
        .select(
          `
          *,
          customer_profiles (
            id,
            first_name,
            last_name,
            email,
            phone
          ),
          providers (
            id,
            first_name,
            last_name,
            business_profiles (
              id,
              business_name
            )
          ),
          services (
            id,
            name,
            duration_minutes,
            min_price
          )
        `,
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching bookings:", error);
        setError(
          `Bookings Query Error: ${error.message}. You may need to create RLS policy: CREATE POLICY "Allow anon read access" ON public.bookings FOR SELECT USING (true);`,
        );
        return;
      }

      console.log(`Fetched ${data?.length || 0} bookings`);
      setBookings(data || []);
    } catch (error) {
      console.error("Error in fetchBookings:", error);
      setError("Failed to fetch bookings data");
    }
  };

  // Fetch booking changes
  const fetchBookingChanges = async () => {
    try {
      const { data, error } = await supabase
        .from("booking_changes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching booking changes:", error);
        return;
      }

      console.log(`Fetched ${data?.length || 0} booking changes`);
      setBookingChanges(data || []);
    } catch (error) {
      console.error("Error in fetchBookingChanges:", error);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([fetchBookings(), fetchBookingChanges()]);
    setLoading(false);
  };

  const refreshData = async () => {
    await fetchAllData();
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Filter bookings based on selected filters
  const filteredBookings = bookings.filter((booking) => {
    const paymentMatch =
      paymentStatusFilter === "all" ||
      booking.payment_status === paymentStatusFilter;

    const statusMatch =
      bookingStatusFilter === "all" ||
      booking.booking_status === bookingStatusFilter;

    // Automatic 90-day filter: only show bookings from 90 days ago and all future bookings
    const bookingDate = new Date(booking.booking_date);
    const today = new Date();
    const ninetyDaysAgo = new Date(today);
    ninetyDaysAgo.setDate(today.getDate() - 90);

    const withinDateRange = bookingDate >= ninetyDaysAgo;

    // Additional user-selected date range filter
    let customDateMatch = true;
    if (startDate || endDate) {
      if (startDate) {
        const start = new Date(startDate);
        if (bookingDate < start) {
          customDateMatch = false;
        }
      }

      if (endDate) {
        const end = new Date(endDate);
        // Set end date to end of day (23:59:59)
        end.setHours(23, 59, 59, 999);
        if (bookingDate > end) {
          customDateMatch = false;
        }
      }
    }

    return paymentMatch && statusMatch && withinDateRange && customDateMatch;
  });

  // Calculate stats based on 90-day filtered bookings
  const today = new Date();
  const ninetyDaysAgo = new Date(today);
  ninetyDaysAgo.setDate(today.getDate() - 90);

  const filteredForStats = bookings.filter((booking) => {
    const bookingDate = new Date(booking.booking_date);
    return bookingDate >= ninetyDaysAgo;
  });

  const bookingStats = {
    totalBookings: filteredForStats.length,
    confirmedBookings: filteredForStats.filter(
      (b) => b.booking_status === "confirmed",
    ).length,
    completedBookings: filteredForStats.filter(
      (b) => b.booking_status === "completed",
    ).length,
    cancelledBookings: filteredForStats.filter(
      (b) => b.booking_status === "cancelled",
    ).length,
    pendingPayments: filteredForStats.filter(
      (b) => b.payment_status === "pending",
    ).length,
    totalRevenue: filteredForStats
      .filter((b) => b.payment_status === "paid")
      .reduce((sum, b) => sum + b.total_amount, 0),
    mobileBookings: filteredForStats.filter((b) => b.delivery_type === "mobile")
      .length,
    guestBookings: filteredForStats.filter((b) => b.guest_name).length,
    totalChanges: bookingChanges.length,
    tipEligibleBookings: filteredForStats.filter((b) => b.tip_eligible).length,
    tippedBookings: filteredForStats.filter((b) => b.tip_status === "completed")
      .length,
    totalTipAmount: tips.reduce((sum, t) => sum + t.tip_amount, 0),
    averageTipAmount:
      tips.length > 0
        ? tips.reduce((sum, t) => sum + t.tip_amount, 0) / tips.length
        : 0,
  };

  // Booking columns
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
            variant={row.delivery_type === "customer_location" ? "success" : "outline"}
            size="sm"
            className="flex items-center gap-1 w-fit"
          >
            {React.createElement(getDeliveryTypeIcon(row.delivery_type) as any, { className: "w-3 h-3" })}
            {getDeliveryTypeLabel(row.delivery_type)}
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
            onClick={() => {
              setSelectedBooking(row);
              setIsBookingDetailsOpen(true);
            }}
            title="View Booking Details"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Changes columns
  const changesColumns: Column[] = [
    {
      key: "booking_change",
      header: "Booking & Change",
      render: (value: any, row: BookingChange) => (
        <div className="space-y-1">
          <div className="font-medium">Booking #{row.booking_id.slice(-6)}</div>
          <ROAMBadge variant={getChangeTypeVariant(row.change_type)} size="sm">
            {formatEnumDisplay(row.change_type)}
          </ROAMBadge>
        </div>
      ),
    },
    {
      key: "changed_by_name",
      header: "Changed By",
      render: (value: string) => <span className="font-medium">{value}</span>,
    },
    {
      key: "financial_impact",
      header: "Financial Impact",
      render: (value: any, row: BookingChange) => (
        <div className="space-y-1">
          {row.additional_cost > 0 && (
            <div className="text-sm text-roam-success">
              +{formatPrice(row.additional_cost)}
            </div>
          )}
          {row.refund_amount > 0 && (
            <div className="text-sm text-destructive">
              -{formatPrice(row.refund_amount)}
            </div>
          )}
          {row.additional_cost === 0 && row.refund_amount === 0 && (
            <span className="text-sm text-muted-foreground">No cost</span>
          )}
        </div>
      ),
    },
    {
      key: "change_reason",
      header: "Reason",
      render: (value: string) => (
        <span className="text-sm text-muted-foreground">
          {value || "No reason provided"}
        </span>
      ),
    },
    {
      key: "created_at",
      header: "Date",
      sortable: true,
      render: (value: string) => (
        <span className="text-sm text-muted-foreground">
          {formatDateTime(value)}
        </span>
      ),
    },
  ];

  if (loading) {
    return (
      <AdminLayout title="Bookings">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-roam-blue" />
            <p className="text-muted-foreground">Loading bookings...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="Bookings">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Failed to Load Bookings
              </h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md">
                {error}
              </p>
              <Button onClick={refreshData} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Bookings">
      <div className="space-y-8">
        {/* Header with Refresh Button */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Bookings Management</h1>
          <Button onClick={refreshData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Data
          </Button>
        </div>
        {/* Stats Overview */}
        <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ROAMStatCard
            title="Total Bookings"
            value={bookingStats.totalBookings}
            icon={<Calendar className="w-5 h-5" />}
            changeText={`${bookingStats.confirmedBookings} confirmed`}
            changeType="positive"
            changeIcon={<TrendingUp className="w-3 h-3" />}
          />

          <ROAMStatCard
            title="Completed"
            value={bookingStats.completedBookings}
            icon={<CheckCircle className="w-5 h-5" />}
            changeText={`${Math.round((bookingStats.completedBookings / bookingStats.totalBookings) * 100)}% completion rate`}
            changeType="positive"
          />

          <ROAMStatCard
            title="Total Revenue"
            value={formatPrice(bookingStats.totalRevenue)}
            icon={<DollarSign className="w-5 h-5" />}
            changeText={`${bookingStats.pendingPayments} pending payments`}
            changeType="neutral"
          />

          <ROAMStatCard
            title="Tips Received"
            value={formatPrice(bookingStats.totalTipAmount)}
            icon={<Heart className="w-5 h-5" />}
            changeText={`${bookingStats.tippedBookings} of ${bookingStats.tipEligibleBookings} eligible`}
            changeType="positive"
            changeIcon={<TrendingUp className="w-3 h-3" />}
          />
        </div>

        {/* Booking Status Overview */}
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
                    {bookingStats.confirmedBookings}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-roam-success" />
                    <span className="text-sm font-medium">Completed</span>
                  </div>
                  <span className="text-lg font-bold">
                    {bookingStats.completedBookings}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-destructive" />
                    <span className="text-sm font-medium">Cancelled</span>
                  </div>
                  <span className="text-lg font-bold">
                    {bookingStats.cancelledBookings}
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
                    <span className="text-sm font-medium">Paid</span>
                  </div>
                  <span className="text-lg font-bold">
                    {bookings.filter((b) => b.payment_status === "paid").length}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-roam-warning" />
                    <span className="text-sm font-medium">Pending</span>
                  </div>
                  <span className="text-lg font-bold">
                    {bookingStats.pendingPayments}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Refunded</span>
                  </div>
                  <span className="text-lg font-bold">
                    {
                      bookings.filter(
                        (b) =>
                          b.payment_status === "refunded" ||
                          b.payment_status === "partially_refunded",
                      ).length
                    }
                  </span>
                </div>
              </div>
            </ROAMCardContent>
          </ROAMCard>

          <ROAMCard>
            <ROAMCardHeader>
              <ROAMCardTitle>Booking Insights</ROAMCardTitle>
            </ROAMCardHeader>
            <ROAMCardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Guest Bookings</span>
                  <span className="text-lg font-bold">
                    {bookingStats.guestBookings}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Changes Made</span>
                  <span className="text-lg font-bold">
                    {bookingStats.totalChanges}
                  </span>
                </div>

                <div className="pt-2 border-t">
                  <div className="text-xs text-muted-foreground">
                    {Math.round(
                      (bookingStats.guestBookings /
                        bookingStats.totalBookings) *
                        100,
                    )}
                    % are guest bookings
                  </div>
                </div>
              </div>
            </ROAMCardContent>
          </ROAMCard>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-border">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab("bookings")}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "bookings"
                  ? "border-roam-blue text-roam-blue"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Bookings ({bookingStats.totalBookings})
            </button>
            <button
              onClick={() => setActiveTab("changes")}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "changes"
                  ? "border-roam-blue text-roam-blue"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Changes ({bookingStats.totalChanges})
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "bookings" && (
          <div className="space-y-4">
            {/* Filter Controls */}
            <div className="space-y-4">
              <div className="flex gap-4 items-center bg-muted/30 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Status:</label>
                  <select
                    value={bookingStatusFilter}
                    onChange={(e) =>
                      setBookingStatusFilter(
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
                      setPaymentStatusFilter(
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
                  Showing {filteredBookings.length} of {filteredForStats.length}{" "}
                  bookings (last 90 days + future)
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
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-3 py-1 border border-border rounded-md text-sm bg-background"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">To:</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-3 py-1 border border-border rounded-md text-sm bg-background"
                  />
                </div>

                {(startDate || endDate) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                    }}
                    className="text-xs"
                  >
                    Clear Dates
                  </Button>
                )}

                <div className="text-xs text-muted-foreground ml-auto">
                  {startDate || endDate ? (
                    <span>
                      {startDate && endDate
                        ? `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`
                        : startDate
                          ? `From ${new Date(startDate).toLocaleDateString()}`
                          : `Until ${new Date(endDate).toLocaleDateString()}`}
                    </span>
                  ) : (
                    "All dates"
                  )}
                </div>
              </div>
            </div>

            <ROAMDataTable
              title="All Bookings"
              columns={bookingColumns}
              data={filteredBookings}
              searchable={true}
              filterable={false}
              addable={false}
              onRowClick={(booking) => console.log("View booking:", booking)}
              pageSize={10}
            />
          </div>
        )}

        {activeTab === "changes" && (
          <ROAMDataTable
            title="Booking Changes"
            columns={changesColumns}
            data={bookingChanges}
            searchable={true}
            filterable={false}
            addable={false}
            onRowClick={(change) => console.log("View change:", change)}
            pageSize={10}
          />
        )}
      </div>

      {/* Booking Details Modal */}
      <Dialog
        open={isBookingDetailsOpen}
        onOpenChange={setIsBookingDetailsOpen}
      >
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-6 h-6 text-roam-blue" />
              Booking Details -{" "}
              {selectedBooking?.booking_reference ||
                `#${selectedBooking?.id.slice(-6)}`}
            </DialogTitle>
            <DialogDescription>
              View comprehensive booking information including customer details,
              service information, and payment status.
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-6">
              {/* Basic Booking Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ROAMCard>
                  <ROAMCardHeader>
                    <ROAMCardTitle className="text-base">
                      Booking Information
                    </ROAMCardTitle>
                  </ROAMCardHeader>
                  <ROAMCardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Booking Reference
                        </div>
                        <div className="font-medium font-mono">
                          {selectedBooking.booking_reference ||
                            `#${selectedBooking.id.slice(-6)}`}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Package className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Service
                        </div>
                        <div className="font-medium">
                          {getServiceName(selectedBooking)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Business
                        </div>
                        <div className="font-medium">
                          {getBusinessName(selectedBooking)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <UserCheck className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Provider
                        </div>
                        <div className="font-medium">
                          {getProviderName(selectedBooking)}
                        </div>
                      </div>
                    </div>
                  </ROAMCardContent>
                </ROAMCard>

                <ROAMCard>
                  <ROAMCardHeader>
                    <ROAMCardTitle className="text-base">
                      Customer Information
                    </ROAMCardTitle>
                  </ROAMCardHeader>
                  <ROAMCardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Customer
                        </div>
                        <div className="font-medium">
                          {getCustomerName(selectedBooking)}
                        </div>
                      </div>
                    </div>

                    {selectedBooking.guest_name && (
                      <div className="flex items-center gap-3">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm text-muted-foreground">
                            Guest Name
                          </div>
                          <div className="font-medium">
                            {selectedBooking.guest_name}
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedBooking.guest_email && (
                      <div className="flex items-center gap-3">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm text-muted-foreground">
                            Guest Email
                          </div>
                          <div className="font-medium">
                            {selectedBooking.guest_email}
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedBooking.guest_phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm text-muted-foreground">
                            Guest Phone
                          </div>
                          <div className="font-medium">
                            {selectedBooking.guest_phone}
                          </div>
                        </div>
                      </div>
                    )}
                  </ROAMCardContent>
                </ROAMCard>
              </div>

              {/* Scheduling & Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ROAMCard>
                  <ROAMCardHeader>
                    <ROAMCardTitle className="text-base">
                      Schedule & Location
                    </ROAMCardTitle>
                  </ROAMCardHeader>
                  <ROAMCardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Date & Time
                        </div>
                        <div className="font-medium">
                          {new Date(
                            selectedBooking.booking_date,
                          ).toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </div>
                        <div className="text-sm text-roam-blue">
                          {selectedBooking.start_time}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {selectedBooking.delivery_type === "mobile" ? (
                        <Truck className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                      )}
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Service Type
                        </div>
                        <ROAMBadge
                          variant={
                            selectedBooking.delivery_type === "mobile"
                              ? "warning"
                              : "secondary"
                          }
                          className="mt-1"
                        >
                          {selectedBooking.delivery_type === "mobile"
                            ? "Mobile Service"
                            : "In-Business"}
                        </ROAMBadge>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Created
                        </div>
                        <div className="font-medium">
                          {formatDateTime(selectedBooking.created_at)}
                        </div>
                      </div>
                    </div>
                  </ROAMCardContent>
                </ROAMCard>

                <ROAMCard>
                  <ROAMCardHeader>
                    <ROAMCardTitle className="text-base">Status</ROAMCardTitle>
                  </ROAMCardHeader>
                  <ROAMCardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Booking Status
                        </div>
                        <ROAMBadge
                          variant={getBookingStatusBadgeVariant(
                            selectedBooking.booking_status,
                          )}
                          className="mt-1"
                        >
                          {formatEnumDisplay(selectedBooking.booking_status)}
                        </ROAMBadge>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <CreditCard className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Payment Status
                        </div>
                        <ROAMBadge
                          variant={getPaymentStatusBadgeVariant(
                            selectedBooking.payment_status,
                          )}
                          className="mt-1"
                        >
                          {formatEnumDisplay(selectedBooking.payment_status)}
                        </ROAMBadge>
                      </div>
                    </div>

                    {selectedBooking.cancelled_at && (
                      <div className="flex items-center gap-3">
                        <XCircle className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm text-muted-foreground">
                            Cancelled
                          </div>
                          <div className="font-medium">
                            {formatDateTime(selectedBooking.cancelled_at)}
                          </div>
                          {selectedBooking.cancelled_by && (
                            <div className="text-xs text-muted-foreground">
                              By: {selectedBooking.cancelled_by}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </ROAMCardContent>
                </ROAMCard>
              </div>

              {/* Financial Information */}
              <ROAMCard>
                <ROAMCardHeader>
                  <ROAMCardTitle className="text-base">
                    Financial Details
                  </ROAMCardTitle>
                </ROAMCardHeader>
                <ROAMCardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-lg font-bold text-roam-blue">
                        {formatPrice(selectedBooking.total_amount)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Total Amount
                      </div>
                    </div>

                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-lg font-bold text-roam-success">
                        {formatPrice(selectedBooking.service_fee)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Service Fee
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {selectedBooking.service_fee_charged
                          ? "Charged"
                          : "Pending"}
                      </div>
                    </div>

                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-lg font-bold text-roam-warning">
                        {formatPrice(selectedBooking.remaining_balance)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Remaining Balance
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {selectedBooking.remaining_balance_charged
                          ? "Charged"
                          : "Pending"}
                      </div>
                    </div>

                    {(selectedBooking.cancellation_fee > 0 ||
                      selectedBooking.refund_amount > 0) && (
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        {selectedBooking.cancellation_fee > 0 && (
                          <>
                            <div className="text-lg font-bold text-destructive">
                              {formatPrice(selectedBooking.cancellation_fee)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Cancellation Fee
                            </div>
                          </>
                        )}
                        {selectedBooking.refund_amount > 0 && (
                          <>
                            <div className="text-lg font-bold text-roam-success">
                              {formatPrice(selectedBooking.refund_amount)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Refund Amount
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </ROAMCardContent>
              </ROAMCard>

              {/* Cancellation Details */}
              {selectedBooking.cancellation_reason && (
                <ROAMCard>
                  <ROAMCardHeader>
                    <ROAMCardTitle className="text-base">
                      Cancellation Details
                    </ROAMCardTitle>
                  </ROAMCardHeader>
                  <ROAMCardContent>
                    <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <XCircle className="w-4 h-4 text-destructive" />
                        <span className="font-medium text-destructive">
                          Cancellation Reason
                        </span>
                      </div>
                      <p className="text-sm">
                        {selectedBooking.cancellation_reason}
                      </p>
                    </div>
                  </ROAMCardContent>
                </ROAMCard>
              )}

              {/* Admin Notes */}
              {selectedBooking.admin_notes && (
                <ROAMCard>
                  <ROAMCardHeader>
                    <ROAMCardTitle className="text-base">
                      Admin Notes
                    </ROAMCardTitle>
                  </ROAMCardHeader>
                  <ROAMCardContent>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm">{selectedBooking.admin_notes}</p>
                    </div>
                  </ROAMCardContent>
                </ROAMCard>
              )}

              {/* Tip Information */}
              {selectedBooking.tip_eligible && (
                <ROAMCard>
                  <ROAMCardHeader>
                    <ROAMCardTitle className="text-base flex items-center gap-2">
                      <Heart className="w-4 h-4 text-roam-success" />
                      Tip Information
                    </ROAMCardTitle>
                  </ROAMCardHeader>
                  <ROAMCardContent>
                    {(() => {
                      const bookingTip = tips.find(
                        (t) => t.booking_id === selectedBooking.id,
                      );

                      if (
                        selectedBooking.tip_status === "completed" &&
                        bookingTip
                      ) {
                        return (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="text-center p-4 bg-roam-success/10 rounded-lg">
                                <div className="text-2xl font-bold text-roam-success">
                                  {formatPrice(bookingTip.tip_amount)}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Tip Amount
                                </div>
                              </div>
                              <div className="text-center p-4 bg-muted/50 rounded-lg">
                                <div className="text-2xl font-bold text-foreground">
                                  {bookingTip.tip_percentage?.toFixed(1)}%
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Tip Percentage
                                </div>
                              </div>
                            </div>

                            {bookingTip.customer_message && (
                              <div className="p-3 border rounded-lg bg-muted/30">
                                <div className="text-sm font-medium mb-1">
                                  Customer Message:
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  "{bookingTip.customer_message}"
                                </p>
                              </div>
                            )}

                            {bookingTip.provider_response && (
                              <div className="p-3 border rounded-lg bg-roam-blue/10">
                                <div className="text-sm font-medium mb-1">
                                  Provider Response:
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  "{bookingTip.provider_response}"
                                </p>
                                <div className="text-xs text-muted-foreground mt-1">
                                  Responded on{" "}
                                  {formatDateTime(
                                    bookingTip.provider_responded_at!,
                                  )}
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <div className="font-medium">
                                  Payment Status
                                </div>
                                <ROAMBadge
                                  variant="success"
                                  size="sm"
                                  className="mt-1"
                                >
                                  {formatEnumDisplay(bookingTip.payment_status)}
                                </ROAMBadge>
                              </div>
                              <div>
                                <div className="font-medium">Payout Status</div>
                                <ROAMBadge
                                  variant={
                                    bookingTip.payout_status === "paid"
                                      ? "success"
                                      : "warning"
                                  }
                                  size="sm"
                                  className="mt-1"
                                >
                                  {formatEnumDisplay(bookingTip.payout_status)}
                                </ROAMBadge>
                              </div>
                            </div>

                            <div className="text-xs text-muted-foreground border-t pt-2">
                              Tip given on{" "}
                              {formatDateTime(bookingTip.tip_given_at)}
                            </div>
                          </div>
                        );
                      } else if (selectedBooking.tip_status === "pending") {
                        return (
                          <div className="text-center py-6">
                            <Heart className="w-12 h-12 text-roam-warning mx-auto mb-3" />
                            <h4 className="font-medium mb-2">
                              Tip Request Pending
                            </h4>
                            <p className="text-sm text-muted-foreground mb-3">
                              Customer has been invited to leave a tip for this
                              completed service.
                            </p>
                            {selectedBooking.tip_deadline && (
                              <div className="text-xs text-muted-foreground">
                                Tip window expires:{" "}
                                {formatDateTime(selectedBooking.tip_deadline)}
                              </div>
                            )}
                          </div>
                        );
                      } else {
                        return (
                          <div className="text-center py-6">
                            <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">
                              This booking is eligible for tips once completed.
                            </p>
                          </div>
                        );
                      }
                    })()}
                  </ROAMCardContent>
                </ROAMCard>
              )}

              {/* Related Changes and Add-ons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ROAMCard>
                  <ROAMCardHeader>
                    <ROAMCardTitle className="text-base">
                      Booking Changes
                    </ROAMCardTitle>
                  </ROAMCardHeader>
                  <ROAMCardContent>
                    <div className="space-y-3">
                      {bookingChanges.filter(
                        (change) => change.booking_id === selectedBooking.id,
                      ).length > 0 ? (
                        bookingChanges
                          .filter(
                            (change) =>
                              change.booking_id === selectedBooking.id,
                          )
                          .map((change) => (
                            <div
                              key={change.id}
                              className="p-3 border rounded-lg space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <ROAMBadge
                                  variant={getChangeTypeVariant(
                                    change.change_type,
                                  )}
                                  size="sm"
                                >
                                  {formatEnumDisplay(change.change_type)}
                                </ROAMBadge>
                                <span className="text-xs text-muted-foreground">
                                  {formatDateTime(change.created_at)}
                                </span>
                              </div>

                              <div className="text-sm">
                                <div>By: {change.changed_by_name}</div>
                                {change.change_reason && (
                                  <div className="text-muted-foreground">
                                    {change.change_reason}
                                  </div>
                                )}
                              </div>

                              {(change.additional_cost > 0 ||
                                change.refund_amount > 0) && (
                                <div className="flex gap-2 text-sm">
                                  {change.additional_cost > 0 && (
                                    <span className="text-roam-success">
                                      +{formatPrice(change.additional_cost)}
                                    </span>
                                  )}
                                  {change.refund_amount > 0 && (
                                    <span className="text-destructive">
                                      -{formatPrice(change.refund_amount)}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          ))
                      ) : (
                        <div className="text-center py-6 text-muted-foreground">
                          No changes made to this booking
                        </div>
                      )}
                    </div>
                  </ROAMCardContent>
                </ROAMCard>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
