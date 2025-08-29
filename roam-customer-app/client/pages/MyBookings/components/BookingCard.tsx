import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Calendar,
  Clock,
  MapPin,
  MessageCircle,
  Star,
  MoreHorizontal,
  Video,
  Building,
  Smartphone,
  CheckCircle,
  XCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Info,
  X,
  Edit,
  Hash,
  Map,
} from "lucide-react";
import type { BookingWithDetails } from "@/types/index";
import { formatBookingDate, isWithin24Hours, getDeliveryTypeLabel, getDeliveryTypeIcon } from "../utils/bookingCalculations";
import { RealtimeStatusUpdate } from "@/components/BookingStatusIndicator";
import ReviewAndTipModal from "./ReviewAndTipModal";

interface BookingCardProps {
  booking: BookingWithDetails;
  onCancel: (booking: BookingWithDetails) => void;
  onReschedule: (booking: BookingWithDetails) => void;
  onMessage: (booking: BookingWithDetails) => void;
}

const getStatusConfig = (status: string) => {
  const configs = {
    confirmed: {
      label: "Confirmed",
      color: "bg-green-100 text-green-800",
      icon: CheckCircle,
      description: "Your booking is confirmed",
    },
    pending: {
      label: "Pending",
      color: "bg-yellow-100 text-yellow-800",
      icon: Clock,
      description: "Waiting for provider confirmation",
    },
    in_progress: {
      label: "In Progress",
      color: "bg-blue-100 text-blue-800",
      icon: RefreshCw,
      description: "Service is currently active",
    },
    completed: {
      label: "Completed",
      color: "bg-gray-100 text-gray-800",
      icon: CheckCircle,
      description: "Service completed successfully",
    },
    cancelled: {
      label: "Cancelled",
      color: "bg-red-100 text-red-800",
      icon: XCircle,
      description: "Booking was cancelled",
    },
    declined: {
      label: "Declined",
      color: "bg-red-100 text-red-800",
      icon: XCircle,
      description: "Booking was declined by provider",
    },
    no_show: {
      label: "No Show",
      color: "bg-gray-100 text-gray-800",
      icon: XCircle,
      description: "Customer did not show up",
    },
  };
  return configs[status as keyof typeof configs] || configs.pending;
};

const getDeliveryIcon = (type: string) => {
  const icons = {
    mobile: Smartphone,
    business_location: Building,
    virtual: Video,
  };
  return icons[type as keyof typeof icons] || Smartphone;
};

export const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  onCancel,
  onReschedule,
  onMessage,
}) => {
  const [showMoreInfo, setShowMoreInfo] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const statusConfig = getStatusConfig(booking.status);
  const DeliveryIcon = getDeliveryIcon(booking.deliveryType);
  const deliveryLabel = getDeliveryTypeLabel(booking.deliveryType);

  // Check if booking is within 24 hours and cannot be cancelled
  const canCancelBooking =
    (booking.status === "pending" || booking.status === "confirmed") &&
    !isWithin24Hours(booking);

  // Check if booking is in the past (completed, cancelled, no_show, or past date)
  const isPastBooking = 
    booking.status === "completed" ||
    booking.status === "cancelled" || 
    booking.status === "no_show" ||
    new Date(`${booking.date} ${booking.time}`) < new Date();

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
          <div className="flex items-start gap-4 min-w-0 flex-1">
            <Avatar className="w-12 h-12 flex-shrink-0">
              <AvatarImage
                src={booking.providers?.image}
                alt={booking.providers?.first_name}
                className="object-cover"
              />
              <AvatarFallback className="bg-gradient-to-br from-roam-blue to-roam-light-blue text-white text-sm font-semibold">
                {booking.providers?.first_name?.[0]?.toUpperCase() || ""}
                {booking.providers?.last_name?.[0]?.toUpperCase() || ""}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-lg mb-1">{booking.service_name}</h3>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-foreground/60">
                  with {booking.providers?.first_name} {booking.providers?.last_name}
                </p>
                {booking.status === "confirmed" && (
                  <div className="flex items-center gap-1 text-xs text-roam-blue bg-roam-blue/10 px-2 py-1 rounded-full">
                    <MessageCircle className="w-3 h-3" />
                    <span>Messaging Available</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 text-sm text-foreground/60 mb-2">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(booking.date).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {booking.time} ({booking.duration})
                </div>
              </div>

              {/* More Info Button with indicators */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {booking.booking_reference && (
                    <div
                      className="w-2 h-2 bg-roam-blue rounded-full"
                      title="Booking Reference Available"
                    />
                  )}
                  <div
                    className="w-2 h-2 bg-green-500 rounded-full"
                    title="Status Details Available"
                  />
                  <div
                    className="w-2 h-2 bg-yellow-500 rounded-full"
                    title="Rating & Price Available"
                  />
                  {booking.reschedule_count > 0 && (
                    <div
                      className="w-2 h-2 bg-amber-500 rounded-full"
                      title="Reschedule History Available"
                    />
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMoreInfo(!showMoreInfo)}
                  className="text-roam-blue hover:text-roam-blue/80 hover:bg-roam-blue/10 p-1 h-auto"
                >
                  <Info className="w-4 h-4 mr-1" />
                  <span className="text-xs">More Info</span>
                  {showMoreInfo ? (
                    <ChevronUp className="w-4 h-4 ml-1" />
                  ) : (
                    <ChevronDown className="w-4 h-4 ml-1" />
                  )}
                </Button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 self-start">
            {isPastBooking ? (
              <Button
                size="sm"
                variant="outline"
                className="border-roam-blue text-roam-blue hover:bg-roam-blue hover:text-white"
                onClick={() => {
                  // Navigate to book the same service again
                  window.location.href = `/book-service/${booking.service_id}`;
                }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Book Again
              </Button>
            ) : null}
          </div>
        </div>

        <div className="flex items-start gap-2 mb-4">
          <DeliveryIcon className="w-4 h-4 text-roam-blue mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium">{deliveryLabel}</p>
            <div className="flex items-start gap-2">
              <p className="text-sm text-foreground/60 flex-1">
                Location TBD
              </p>
            </div>
          </div>
        </div>

        {/* Collapsible More Info Section */}
        {showMoreInfo && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
            <h4 className="font-medium text-sm text-gray-800 mb-3 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Additional Details
            </h4>

            {/* Booking Reference */}
            {booking.booking_reference && (
              <div className="flex items-center gap-2 p-2 bg-white rounded-lg border-l-4 border-roam-blue">
                <Hash className="w-4 h-4 text-roam-blue" />
                <div>
                  <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                    Booking Reference
                  </span>
                  <p className="text-sm font-mono font-semibold text-gray-900">
                    {booking.booking_reference}
                  </p>
                </div>
              </div>
            )}

            {/* Status Update */}
            <div className="p-2 bg-white rounded-lg">
              <span className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-2">
                Current Status
              </span>
              <RealtimeStatusUpdate
                bookingId={booking.id}
                currentStatus={booking.booking_status}
                onStatusChange={(newStatus) => {
                  // Booking status changed
                }}
              />
            </div>

            {/* Rating and Price */}
            <div className="flex items-center justify-between p-2 bg-white rounded-lg">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-roam-warning fill-current" />
                <span className="text-sm font-medium">
                  {booking.providers?.average_rating || "No rating"} stars
                </span>
              </div>
              <span className="text-lg font-semibold text-roam-blue">
                ${booking.total_amount}
              </span>
            </div>

            {/* Reschedule History */}
            {booking.reschedule_count > 0 && (
              <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg border-l-4 border-amber-400">
                <RefreshCw className="w-4 h-4 text-amber-600" />
                <div className="flex-1">
                  <span className="text-xs font-medium text-amber-700 uppercase tracking-wide">
                    Rescheduled {booking.reschedule_count} time
                    {booking.reschedule_count > 1 ? "s" : ""}
                  </span>
                  {booking.original_booking_date &&
                    booking.original_start_time && (
                      <p className="text-xs text-amber-600">
                        Originally:{" "}
                        {new Date(
                          booking.original_booking_date,
                        ).toLocaleDateString()}{" "}
                        at{" "}
                        {new Date(
                          `1970-01-01T${booking.original_start_time}`,
                        ).toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                  {booking.reschedule_reason && (
                    <p className="text-xs text-amber-600 mt-1">
                      Reason: {booking.reschedule_reason}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {booking.admin_notes && (
          <div className="bg-accent/20 rounded-lg p-3 mb-4">
            <p className="text-sm text-foreground/80">
              <strong>Notes:</strong> {booking.admin_notes}
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Primary action - Message Provider (only for future bookings) */}
          <div className="flex gap-2">
            {!isPastBooking && (booking.status === "confirmed" || booking.status === "pending") && booking.providers && (
              <Button
                size="sm"
                className="bg-roam-blue hover:bg-roam-blue/90 text-white font-medium"
                onClick={() => onMessage(booking)}
                title={`Message ${booking.providers.first_name} ${booking.providers.last_name} about this booking`}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Message Provider
              </Button>
            )}
          </div>

          {/* Secondary actions - Cancel and Reschedule (only for future bookings) */}
          <div className="flex gap-2">
            {!isPastBooking && 
              (booking.status === "pending" || booking.status === "confirmed") &&
              booking.status !== "cancelled" &&
              booking.status !== "declined" &&
              booking.status !== "completed" &&
              booking.status !== "no_show" && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-roam-blue text-roam-blue hover:bg-roam-blue hover:text-white"
                    onClick={() => onReschedule(booking)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Reschedule
                  </Button>
                  {canCancelBooking ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-500 text-red-600 hover:bg-red-500 hover:text-white"
                      onClick={() => onCancel(booking)}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  ) : isWithin24Hours(booking) ? (
                    <div className="flex flex-col items-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-300 text-gray-400 cursor-not-allowed"
                        disabled
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                      <p className="text-xs text-red-600 mt-1 max-w-[120px] text-right">
                        Cannot cancel within 24 hours
                      </p>
                    </div>
                  ) : null}
                </>
              )}
          </div>
          {booking.status === "completed" && (
            <>
              {booking.reviews && booking.reviews.length > 0 ? (
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="border-green-500 text-green-600 hover:bg-green-50"
                    onClick={() => setShowReviewModal(true)}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    View Review & Tip
                  </Button>
                  <span className="text-xs text-gray-500">
                    {booking.reviews[0].overall_rating}/5 stars
                  </span>
                  {booking.tips && booking.tips.length > 0 && (
                    <span className="text-xs text-gray-500">
                      • ${booking.tips[0].tip_amount} tip
                    </span>
                  )}
                </div>
              ) : (
                <Button 
                  size="sm" 
                  className="bg-roam-blue hover:bg-roam-blue/90"
                  onClick={() => setShowReviewModal(true)}
                >
                  <Star className="w-4 h-4 mr-2" />
                  Leave Review and Tip
                </Button>
              )}
            </>
          )}
          {/* Removed duplicate "Book Again" button - already shown in top-right for all past bookings */}
        </div>
      </CardContent>
    </Card>

    {/* Review and Tip Modal */}
    <ReviewAndTipModal
      isOpen={showReviewModal}
      onClose={() => setShowReviewModal(false)}
      booking={booking}
    />
  </>
  );
};
