import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ROAMCard,
  ROAMCardHeader,
  ROAMCardTitle,
  ROAMCardContent,
} from "@/components/ui/roam-card";
import { ROAMBadge } from "@/components/ui/roam-badge";
import {
  Calendar,
  Clock,
  DollarSign,
  User,
  UserCheck,
  Building2,
  Truck,
  CreditCard,
  CheckCircle,
  XCircle,
  MapPin,
  Mail,
  Phone,
  Heart,
  Package,
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

interface BookingDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  formatDate: (date: string) => string;
  formatTime: (time: string) => string;
  formatPrice: (amount: number) => string;
  formatDateTime: (dateTime: string) => string;
  formatEnumDisplay: (value: string) => string;
  getCustomerName: (booking: Booking) => string;
  getProviderName: (booking: Booking) => string;
  getBusinessName: (booking: Booking) => string;
  getServiceName: (booking: Booking) => string;
  getPaymentStatusBadgeVariant: (status: PaymentStatus) => "default" | "secondary" | "success" | "warning" | "danger" | "neutral" | "outline";
  getBookingStatusBadgeVariant: (status: BookingStatus) => "default" | "secondary" | "success" | "warning" | "danger" | "neutral" | "outline";
}

export function BookingDetailsModal({
  isOpen,
  onClose,
  booking,
  formatDate,
  formatTime,
  formatPrice,
  formatDateTime,
  formatEnumDisplay,
  getCustomerName,
  getProviderName,
  getBusinessName,
  getServiceName,
  getPaymentStatusBadgeVariant,
  getBookingStatusBadgeVariant,
}: BookingDetailsModalProps) {
  
  if (!booking) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-roam-blue" />
            Booking Details
          </DialogTitle>
          <DialogDescription>
            Reference: {booking.booking_reference || `#${booking.id.slice(-6)}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Service & Provider Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ROAMCard>
              <ROAMCardHeader>
                <ROAMCardTitle className="text-base">Service Information</ROAMCardTitle>
              </ROAMCardHeader>
              <ROAMCardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">Service</div>
                    <div className="font-medium">{getServiceName(booking)}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">Business</div>
                    <div className="font-medium">{getBusinessName(booking)}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <UserCheck className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">Provider</div>
                    <div className="font-medium">{getProviderName(booking)}</div>
                  </div>
                </div>
              </ROAMCardContent>
            </ROAMCard>

            <ROAMCard>
              <ROAMCardHeader>
                <ROAMCardTitle className="text-base">Customer Information</ROAMCardTitle>
              </ROAMCardHeader>
              <ROAMCardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">Customer</div>
                    <div className="font-medium">{getCustomerName(booking)}</div>
                  </div>
                </div>

                {booking.guest_name && (
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Guest Name</div>
                      <div className="font-medium">{booking.guest_name}</div>
                    </div>
                  </div>
                )}

                {booking.guest_email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Guest Email</div>
                      <div className="font-medium">{booking.guest_email}</div>
                    </div>
                  </div>
                )}

                {booking.guest_phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Guest Phone</div>
                      <div className="font-medium">{booking.guest_phone}</div>
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
                <ROAMCardTitle className="text-base">Schedule & Location</ROAMCardTitle>
              </ROAMCardHeader>
              <ROAMCardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">Date & Time</div>
                    <div className="font-medium">
                      {new Date(booking.booking_date).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </div>
                    <div className="text-sm text-roam-blue">{booking.start_time}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {booking.delivery_type === "mobile" ? (
                    <Truck className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                  )}
                  <div>
                    <div className="text-sm text-muted-foreground">Service Type</div>
                    <ROAMBadge
                      variant={booking.delivery_type === "mobile" ? "warning" : "secondary"}
                      className="mt-1"
                    >
                      {booking.delivery_type === "mobile" ? "Mobile Service" : "In-Business"}
                    </ROAMBadge>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">Created</div>
                    <div className="font-medium">{formatDateTime(booking.created_at)}</div>
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
                    <div className="text-sm text-muted-foreground">Booking Status</div>
                    <ROAMBadge
                      variant={getBookingStatusBadgeVariant(booking.booking_status)}
                      className="mt-1"
                    >
                      {formatEnumDisplay(booking.booking_status)}
                    </ROAMBadge>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">Payment Status</div>
                    <ROAMBadge
                      variant={getPaymentStatusBadgeVariant(booking.payment_status)}
                      className="mt-1"
                    >
                      {formatEnumDisplay(booking.payment_status)}
                    </ROAMBadge>
                  </div>
                </div>

                {booking.cancelled_at && (
                  <div className="flex items-center gap-3">
                    <XCircle className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Cancelled</div>
                      <div className="font-medium">{formatDateTime(booking.cancelled_at)}</div>
                      {booking.cancellation_reason && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {booking.cancellation_reason}
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
              <ROAMCardTitle className="text-base">Financial Details</ROAMCardTitle>
            </ROAMCardHeader>
            <ROAMCardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-4 h-4 text-roam-success" />
                  <div>
                    <div className="text-sm text-muted-foreground">Total Amount</div>
                    <div className="font-semibold text-lg">{formatPrice(booking.total_amount)}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">Service Fee</div>
                    <div className="font-medium">{formatPrice(booking.service_fee)}</div>
                    <div className="text-xs text-muted-foreground">
                      {booking.service_fee_charged ? "Charged" : "Pending"}
                    </div>
                  </div>
                </div>

                {booking.remaining_balance > 0 && (
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-4 h-4 text-yellow-600" />
                    <div>
                      <div className="text-sm text-muted-foreground">Remaining Balance</div>
                      <div className="font-medium">{formatPrice(booking.remaining_balance)}</div>
                      <div className="text-xs text-muted-foreground">
                        {booking.remaining_balance_charged ? "Charged" : "Pending"}
                      </div>
                    </div>
                  </div>
                )}

                {booking.refund_amount > 0 && (
                  <div className="flex items-center gap-3">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <div>
                      <div className="text-sm text-muted-foreground">Refund Amount</div>
                      <div className="font-medium">{formatPrice(booking.refund_amount)}</div>
                    </div>
                  </div>
                )}

                {booking.cancellation_fee > 0 && (
                  <div className="flex items-center gap-3">
                    <XCircle className="w-4 h-4 text-orange-600" />
                    <div>
                      <div className="text-sm text-muted-foreground">Cancellation Fee</div>
                      <div className="font-medium">{formatPrice(booking.cancellation_fee)}</div>
                    </div>
                  </div>
                )}
              </div>
            </ROAMCardContent>
          </ROAMCard>

          {/* Tip Information */}
          {booking.tip_eligible && (
            <ROAMCard>
              <ROAMCardHeader>
                <ROAMCardTitle className="text-base flex items-center gap-2">
                  <Heart className="w-4 h-4 text-pink-600" />
                  Tip Information
                </ROAMCardTitle>
              </ROAMCardHeader>
              <ROAMCardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex items-center gap-3">
                    <Heart className={`w-4 h-4 ${booking.tip_status === "completed" ? "text-roam-success fill-roam-success" : "text-muted-foreground"}`} />
                    <div>
                      <div className="text-sm text-muted-foreground">Tip Status</div>
                      <ROAMBadge
                        variant={booking.tip_status === "completed" ? "success" : booking.tip_status === "pending" ? "warning" : "outline"}
                        className="mt-1"
                      >
                        {formatEnumDisplay(booking.tip_status)}
                      </ROAMBadge>
                    </div>
                  </div>

                  {booking.tip_amount > 0 && (
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-4 h-4 text-roam-success" />
                      <div>
                        <div className="text-sm text-muted-foreground">Tip Amount</div>
                        <div className="font-semibold text-lg text-roam-success">
                          {formatPrice(booking.tip_amount)}
                        </div>
                      </div>
                    </div>
                  )}

                  {booking.tip_requested_at && (
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">Tip Requested</div>
                        <div className="font-medium">{formatDateTime(booking.tip_requested_at)}</div>
                      </div>
                    </div>
                  )}
                </div>
              </ROAMCardContent>
            </ROAMCard>
          )}

          {/* Admin Notes */}
          {booking.admin_notes && (
            <ROAMCard>
              <ROAMCardHeader>
                <ROAMCardTitle className="text-base">Admin Notes</ROAMCardTitle>
              </ROAMCardHeader>
              <ROAMCardContent>
                <div className="bg-muted/30 p-4 rounded-lg">
                  <p className="text-sm">{booking.admin_notes}</p>
                </div>
              </ROAMCardContent>
            </ROAMCard>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}