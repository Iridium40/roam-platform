import React, { useState, useEffect } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import LoadingScreen from "@/components/ui/LoadingScreen";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { toast } from "sonner";
import { BookingStats } from "@/components/bookings/BookingStats";
import { BookingOverview } from "@/components/bookings/BookingOverview";
import { BookingTable } from "@/components/bookings/BookingTable-Simple";
import { BookingDetailsModal } from "@/components/bookings/BookingDetailsModal";
import { BookingChangesAndTips } from "@/components/bookings/BookingChangesAndTips";

// Types
type DeliveryType = "business" | "customer" | "mobile";
type PaymentStatus = "pending" | "paid" | "failed" | "refunded" | "partially_refunded";
type BookingStatus = "pending" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show";
type TipStatus = "none" | "pending" | "completed" | "declined";
type ChangeType = "reschedule" | "cancellation" | "modification" | "add_on" | "refund";
type PayoutStatus = "pending" | "processing" | "paid" | "failed";

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

interface BookingChange {
  id: string;
  booking_id: string;
  change_type: ChangeType;
  changed_by_name: string;
  change_reason?: string;
  additional_cost: number;
  refund_amount: number;
  created_at: string;
}

interface BookingTip {
  id: string;
  booking_id: string;
  tip_amount: number;
  service_rating: number;
  customer_comment?: string;
  payment_status: PaymentStatus;
  payout_status: PayoutStatus;
  tip_given_at: string;
}

export default function AdminBookings() {
  const supabase = useSupabaseClient();
  
  // State
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingChanges, setBookingChanges] = useState<BookingChange[]>([]);
  const [bookingTips, setBookingTips] = useState<BookingTip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Helper functions
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatEnumDisplay = (value: string) => {
    return value
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const getCustomerName = (booking: Booking) => {
    if (booking.guest_name) return booking.guest_name;
    if (booking.customer_profiles) {
      return `${booking.customer_profiles.first_name} ${booking.customer_profiles.last_name}`;
    }
    return "Unknown Customer";
  };

  const getProviderName = (booking: Booking) => {
    if (booking.providers) {
      return `${booking.providers.first_name} ${booking.providers.last_name}`;
    }
    return "Unknown Provider";
  };

  const getBusinessName = (booking: Booking) => {
    if (booking.providers?.business_profiles) {
      return booking.providers.business_profiles.business_name;
    }
    return "Unknown Business";
  };

  const getServiceName = (booking: Booking) => {
    if (booking.services) {
      return booking.services.name;
    }
    return "Unknown Service";
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
      case "partially_refunded":
        return "secondary" as const;
      default:
        return "outline" as const;
    }
  };

  const getBookingStatusBadgeVariant = (status: BookingStatus) => {
    switch (status) {
      case "completed":
        return "success" as const;
      case "confirmed":
      case "in_progress":
        return "secondary" as const;
      case "pending":
        return "warning" as const;
      case "cancelled":
      case "no_show":
        return "danger" as const;
      default:
        return "outline" as const;
    }
  };

  const getChangeTypeVariant = (type: ChangeType) => {
    switch (type) {
      case "reschedule":
        return "warning" as const;
      case "cancellation":
        return "danger" as const;
      case "modification":
        return "secondary" as const;
      case "add_on":
        return "success" as const;
      case "refund":
        return "neutral" as const;
      default:
        return "outline" as const;
    }
  };

  // Data fetching
  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
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
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      toast.error("Failed to load bookings");
    }
  };

  const fetchBookingChanges = async () => {
    try {
      const { data, error } = await supabase
        .from("booking_changes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBookingChanges(data || []);
    } catch (error) {
      console.error("Error fetching booking changes:", error);
      toast.error("Failed to load booking changes");
    }
  };

  const fetchBookingTips = async () => {
    try {
      const { data, error } = await supabase
        .from("booking_tips")
        .select("*")
        .order("tip_given_at", { ascending: false });

      if (error) throw error;
      setBookingTips(data || []);
    } catch (error) {
      console.error("Error fetching booking tips:", error);
      toast.error("Failed to load booking tips");
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchBookings(),
        fetchBookingChanges(),
        fetchBookingTips(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleBookingClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsDetailsModalOpen(true);
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <AdminLayout>
      <ErrorBoundary>
        <div className="space-y-6">
          {/* Page Header */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Booking Management</h1>
            <p className="text-muted-foreground">
              Manage and track all bookings, payments, and customer interactions
            </p>
          </div>

          {/* Booking Statistics */}
          <BookingStats 
            bookings={bookings} 
            formatPrice={formatPrice}
          />

          {/* Booking Overview */}
          <BookingOverview 
            bookings={bookings} 
          />

          {/* Booking Table */}
          <BookingTable
            bookings={bookings}
            onBookingClick={handleBookingClick}
            formatDate={formatDate}
            formatTime={formatTime}
            formatPrice={formatPrice}
            formatEnumDisplay={formatEnumDisplay}
            getCustomerName={getCustomerName}
            getProviderName={getProviderName}
            getBookingStatusBadgeVariant={getBookingStatusBadgeVariant}
            getPaymentStatusBadgeVariant={getPaymentStatusBadgeVariant}
          />

          {/* Booking Details Modal */}
          <BookingDetailsModal
            isOpen={isDetailsModalOpen}
            onClose={() => setIsDetailsModalOpen(false)}
            booking={selectedBooking}
            formatDate={formatDate}
            formatTime={formatTime}
            formatPrice={formatPrice}
            formatDateTime={formatDateTime}
            formatEnumDisplay={formatEnumDisplay}
            getCustomerName={getCustomerName}
            getProviderName={getProviderName}
            getBusinessName={getBusinessName}
            getServiceName={getServiceName}
            getPaymentStatusBadgeVariant={getPaymentStatusBadgeVariant}
            getBookingStatusBadgeVariant={getBookingStatusBadgeVariant}
          />

          {/* Booking Changes and Tips (in modal) */}
          {selectedBooking && isDetailsModalOpen && (
            <div className="hidden">
              <BookingChangesAndTips
                booking={selectedBooking}
                bookingChanges={bookingChanges}
                bookingTips={bookingTips}
                formatDateTime={formatDateTime}
                formatPrice={formatPrice}
                formatEnumDisplay={formatEnumDisplay}
                getChangeTypeVariant={getChangeTypeVariant}
              />
            </div>
          )}
        </div>
      </ErrorBoundary>
    </AdminLayout>
  );
}