import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
      <CardContent className="p-6">
        {/* Desktop Layout - Horizontal */}
        <div className="hidden lg:block">
          <div className="grid grid-cols-12 gap-6 items-start">
            {/* Left Column - Service Info */}
            <div className="col-span-4">
              <div className="flex items-start gap-4">
                {/* Service Image */}
                <Avatar className="w-16 h-16 flex-shrink-0">
                  <AvatarImage
                    src={booking.services?.image_url || booking.service_image}
                    alt={booking.service_name}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-gradient-to-br from-roam-blue to-roam-light-blue text-white text-lg font-semibold">
                    {booking.service_name?.[0]?.toUpperCase() || "S"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-xl mb-2">{booking.service_name}</h3>
                  <p className="text-foreground/60 mb-3">
                    with {booking.providers?.first_name} {booking.providers?.last_name}
                  </p>
                  
                  {/* Schedule */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-foreground/60">
                      <Calendar className="w-4 h-4" />
                      {new Date(booking.date).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-foreground/60">
                      <Clock className="w-4 h-4" />
                      {booking.time} ({booking.duration})
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Middle Column - Location */}
            <div className="col-span-4">
              <div className="space-y-4">
                {/* Location */}
                <div className="flex items-start gap-2">
                  <DeliveryIcon className="w-5 h-5 text-roam-blue mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{deliveryLabel}</p>
                    <p className="text-sm text-foreground/60">
                      {booking.delivery_type === 'business_location' && booking.business_locations 
                        ? `${booking.business_locations.location_name || 'Business Location'}: ${booking.business_locations.address_line1}${booking.business_locations.address_line2 ? `, ${booking.business_locations.address_line2}` : ''}, ${booking.business_locations.city}, ${booking.business_locations.state} ${booking.business_locations.postal_code}`
                        : booking.delivery_type === 'mobile' && booking.customer_locations
                        ? `${booking.customer_locations.location_name || 'Customer Location'}: ${booking.customer_locations.street_address}${booking.customer_locations.unit_number ? `, Unit ${booking.customer_locations.unit_number}` : ''}, ${booking.customer_locations.city}, ${booking.customer_locations.state} ${booking.customer_locations.zip_code}`
                        : booking.delivery_type === 'virtual'
                        ? 'Virtual Service - Link will be provided'
                        : 'Location TBD'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Rating, Price, Booking Reference & Hamburger Menu */}
            <div className="col-span-4">
              <div className="flex flex-col items-end space-y-4">
                {/* Hamburger Menu - Top Right */}
                {!isPastBooking && 
                  (booking.status === "pending" || booking.status === "confirmed") &&
                  booking.status !== "cancelled" &&
                  booking.status !== "declined" &&
                  booking.status !== "completed" &&
                  booking.status !== "no_show" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-gray-300 text-gray-600 hover:bg-gray-50"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => onReschedule(booking)}
                          className="cursor-pointer"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Reschedule
                        </DropdownMenuItem>
                        {canCancelBooking ? (
                          <DropdownMenuItem
                            onClick={() => onCancel(booking)}
                            className="cursor-pointer text-red-600 focus:text-red-600"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Cancel
                          </DropdownMenuItem>
                        ) : isWithin24Hours(booking) ? (
                          <DropdownMenuItem
                            disabled
                            className="cursor-not-allowed text-gray-400"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Cancel (Within 24h)
                          </DropdownMenuItem>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                {/* Rating and Price */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Star className="w-5 h-5 text-roam-warning fill-current" />
                    <span className="text-sm font-medium">
                      {booking.providers?.average_rating || "No rating"} stars
                    </span>
                  </div>
                  <span className="text-2xl font-bold text-roam-blue">
                    ${booking.total_amount}
                  </span>
                </div>

                {/* Booking Reference - Stacked */}
                {booking.booking_reference && (
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-roam-blue" />
                      <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Booking Reference:
                      </span>
                    </div>
                    <span className="text-sm font-mono font-semibold text-gray-900">
                      {booking.booking_reference}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Desktop Status and Progress Bar - Bottom Left to Right */}
          <div className="flex items-center justify-between mt-6">
            {/* Status and Progress Bar - Bottom Left */}
            <div className="flex-1 mr-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                  Status:
                </span>
                <RealtimeStatusUpdate
                  bookingId={booking.id}
                  currentStatus={booking.booking_status}
                  onStatusChange={(newStatus) => {
                    // Booking status changed
                  }}
                />
              </div>
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-roam-blue h-2 rounded-full transition-all duration-300"
                  style={{ width: booking.booking_status === 'pending' ? '25%' : booking.booking_status === 'confirmed' ? '50%' : booking.booking_status === 'in_progress' ? '75%' : '100%' }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {booking.booking_status === 'pending' ? 'Awaiting confirmation' : 
                 booking.booking_status === 'confirmed' ? 'Confirmed' :
                 booking.booking_status === 'in_progress' ? 'In progress' : 'Completed'}
              </p>
            </div>

            {/* Message Button - Bottom Right */}
            <div className="flex-shrink-0">
              {!isPastBooking && (booking.status === "confirmed" || booking.status === "pending") && booking.providers && (
                <Button
                  size="sm"
                  className="bg-roam-blue hover:bg-roam-blue/90 text-white font-medium"
                  onClick={() => onMessage(booking)}
                  title={`Message ${booking.providers.first_name} ${booking.providers.last_name} about this booking`}
                >
                  <MessageCircle className="w-4 h-4" />
                </Button>
              )}

              {isPastBooking && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-roam-blue text-roam-blue hover:bg-roam-blue hover:text-white"
                  onClick={() => {
                    window.location.href = `/book-service/${booking.service_id}`;
                  }}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Book Again
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Layout - Vertical (unchanged) */}
        <div className="lg:hidden">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
            <div className="flex items-start gap-4 min-w-0 flex-1">
              {/* Service Image instead of Provider Avatar */}
              <Avatar className="w-12 h-12 flex-shrink-0">
                <AvatarImage
                  src={booking.services?.image_url || booking.service_image}
                  alt={booking.service_name}
                  className="object-cover"
                />
                <AvatarFallback className="bg-gradient-to-br from-roam-blue to-roam-light-blue text-white text-sm font-semibold">
                  {booking.service_name?.[0]?.toUpperCase() || "S"}
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

                {/* Booking Reference - Always Visible */}
                {booking.booking_reference && (
                  <div className="flex items-center gap-2 mb-2">
                    <Hash className="w-4 h-4 text-roam-blue" />
                    <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                      Booking Reference:
                    </span>
                    <span className="text-sm font-mono font-semibold text-gray-900">
                      {booking.booking_reference}
                    </span>
                  </div>
                )}

                {/* Current Status - Always Visible */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                    Status:
                  </span>
                  <RealtimeStatusUpdate
                    bookingId={booking.id}
                    currentStatus={booking.booking_status}
                    onStatusChange={(newStatus) => {
                      // Booking status changed
                    }}
                  />
                </div>

                {/* Rating and Price - Always Visible */}
                <div className="flex items-center gap-4 mb-2">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-roam-warning fill-current" />
                    <span className="text-sm font-medium">
                      {booking.providers?.average_rating || "No rating"} stars
                    </span>
                  </div>
                  <span className="text-lg font-semibold text-roam-blue">
                    ${booking.total_amount}
                  </span>
                </div>

                {/* More Info Button for additional details */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
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

          {/* Mobile Location Section */}
          <div className="flex items-start gap-2 mb-4">
            <DeliveryIcon className="w-4 h-4 text-roam-blue mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">{deliveryLabel}</p>
              <div className="flex items-start gap-2">
                <p className="text-sm text-foreground/60 flex-1">
                  {booking.delivery_type === 'business_location' && booking.business_locations 
                    ? `${booking.business_locations.location_name || 'Business Location'}: ${booking.business_locations.address_line1}${booking.business_locations.address_line2 ? `, ${booking.business_locations.address_line2}` : ''}, ${booking.business_locations.city}, ${booking.business_locations.state} ${booking.business_locations.postal_code}`
                    : booking.delivery_type === 'mobile' && booking.customer_locations
                    ? `${booking.customer_locations.location_name || 'Customer Location'}: ${booking.customer_locations.street_address}${booking.customer_locations.unit_number ? `, Unit ${booking.customer_locations.unit_number}` : ''}, ${booking.customer_locations.city}, ${booking.customer_locations.state} ${booking.customer_locations.zip_code}`
                    : booking.delivery_type === 'virtual'
                    ? 'Virtual Service - Link will be provided'
                    : 'Location TBD'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Mobile Action Buttons */}
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
                  <MessageCircle className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Hamburger menu for Reschedule and Cancel actions */}
            <div className="flex gap-2">
              {!isPastBooking && 
                (booking.status === "pending" || booking.status === "confirmed") &&
                booking.status !== "cancelled" &&
                booking.status !== "declined" &&
                booking.status !== "completed" &&
                booking.status !== "no_show" && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-300 text-gray-600 hover:bg-gray-50"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => onReschedule(booking)}
                        className="cursor-pointer"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Reschedule
                      </DropdownMenuItem>
                      {canCancelBooking ? (
                        <DropdownMenuItem
                          onClick={() => onCancel(booking)}
                          className="cursor-pointer text-red-600 focus:text-red-600"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancel
                        </DropdownMenuItem>
                      ) : isWithin24Hours(booking) ? (
                        <DropdownMenuItem
                          disabled
                          className="cursor-not-allowed text-gray-400"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancel (Within 24h)
                        </DropdownMenuItem>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
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
          </div>
        </div>


        {/* Collapsible More Info Section - Only for additional details */}
        {showMoreInfo && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
            <h4 className="font-medium text-sm text-gray-800 mb-3 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Additional Details
            </h4>

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

            {/* Additional service details if available */}
            {booking.services?.description && (
              <div className="p-2 bg-white rounded-lg">
                <span className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-2">
                  Service Description
                </span>
                <p className="text-sm text-gray-700">
                  {booking.services.description}
                </p>
              </div>
            )}

            {/* Special Instructions if available */}
            {booking.special_instructions && (
              <div className="p-2 bg-white rounded-lg">
                <span className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-2">
                  Special Instructions
                </span>
                <p className="text-sm text-gray-700">
                  {booking.special_instructions}
                </p>
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
