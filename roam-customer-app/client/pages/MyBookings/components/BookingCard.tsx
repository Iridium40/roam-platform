import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
  Car,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Edit,
  Hash,
  Map,
  CreditCard,
  Plus,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import type { BookingWithDetails } from "@/types/index";
import { formatBookingDate, isWithin24Hours, getDeliveryTypeLabel, getDeliveryTypeIcon } from "../utils/bookingCalculations";
import ReviewAndTipModal from "./ReviewAndTipModal";
import { AddMoreServiceModal } from "./AddMoreServiceModal";

interface BookingCardProps {
  booking: BookingWithDetails;
  onCancel: (booking: BookingWithDetails) => void;
  onReschedule: (booking: BookingWithDetails) => void;
  onMessage: (booking: BookingWithDetails) => void;
  onRefresh?: () => void;
}


const getDeliveryIcon = (type: string) => {
  const icons = {
    mobile: Car,
    business_location: Building,
    virtual: Video,
  };
  return icons[type as keyof typeof icons] || Car;
};

export const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  onCancel,
  onReschedule,
  onMessage,
  onRefresh,
}) => {
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [showAddMoreModal, setShowAddMoreModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { customer } = useAuth();

  // Fetch unread message count for this booking
  useEffect(() => {
    if (!booking?.id || !customer?.user_id) {
      setUnreadCount(0);
      return;
    }

    const fetchUnreadCount = async () => {
      try {
        // Get conversation metadata for this booking
        const { data: conversation, error: convError } = await supabase
          .from('conversation_metadata')
          .select('id')
          .eq('booking_id', booking.id)
          .eq('is_active', true)
          .maybeSingle<{ id: string }>();

        if (convError || !conversation?.id) {
          setUnreadCount(0);
          return;
        }

        // Get unread message count - use user_id to match auth.users
        const { count, error: countError } = await supabase
          .from('message_notifications')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conversation.id)
          .eq('user_id', customer.user_id)
          .eq('is_read', false);

        if (countError) {
          console.error('Error fetching unread count:', countError);
          setUnreadCount(0);
          return;
        }

        setUnreadCount(count || 0);
      } catch (error) {
        console.error('Error fetching unread count:', error);
        setUnreadCount(0);
      }
    };

    fetchUnreadCount();

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);

    return () => clearInterval(interval);
  }, [booking?.id, customer?.user_id]);

  // Reset unread count when message button is clicked
  const handleMessageClick = () => {
    setUnreadCount(0);
    onMessage(booking);
  };

  const DeliveryIcon = getDeliveryIcon(booking.deliveryType);
  const deliveryLabel = getDeliveryTypeLabel(booking.deliveryType);

  // Check if booking is within 24 hours and cannot be cancelled
  const canCancelBooking =
    (booking.booking_status === "pending" || booking.booking_status === "confirmed") &&
    !isWithin24Hours(booking);

  // Check if booking is in the past (completed, cancelled, no_show, or past date)
  const isPastBooking = 
    booking.booking_status === "completed" ||
    booking.booking_status === "cancelled" || 
    booking.booking_status === "no_show" ||
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
                      {booking.date}
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
                {/* Business Name */}
                {booking.business_profiles?.business_name && (
                  <div className="flex items-center gap-2">
                    {booking.business_profiles.logo_url ? (
                      <img 
                        src={booking.business_profiles.logo_url} 
                        alt={`${booking.business_profiles.business_name} logo`}
                        className="w-10 h-10 rounded object-cover"
                      />
                    ) : (
                      <Building className="w-5 h-5 text-roam-blue" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {booking.business_profiles.business_name}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Location */}
                <div className="flex items-start gap-2">
                  <DeliveryIcon className="w-5 h-5 text-roam-blue mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{deliveryLabel}</p>
                    {booking.delivery_type === 'business_location' && booking.business_locations ? (
                      <button
                        onClick={() => {
                          const address = `${booking.business_locations.address_line1}${booking.business_locations.address_line2 ? `, ${booking.business_locations.address_line2}` : ''}, ${booking.business_locations.city}, ${booking.business_locations.state} ${booking.business_locations.postal_code}`;
                          const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
                          window.open(mapsUrl, '_blank');
                        }}
                        className="text-sm text-foreground/60 hover:text-roam-blue hover:underline cursor-pointer text-left"
                        title="Click to open in Google Maps"
                      >
                        {booking.business_locations.location_name || 'Business Location'}: {booking.business_locations.address_line1}{booking.business_locations.address_line2 ? `, ${booking.business_locations.address_line2}` : ''}, {booking.business_locations.city}, {booking.business_locations.state} {booking.business_locations.postal_code}
                      </button>
                    ) : booking.delivery_type === 'mobile' && booking.customer_locations ? (
                      <button
                        onClick={() => {
                          const address = `${booking.customer_locations.street_address}${booking.customer_locations.unit_number ? `, Unit ${booking.customer_locations.unit_number}` : ''}, ${booking.customer_locations.city}, ${booking.customer_locations.state} ${booking.customer_locations.zip_code}`;
                          const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
                          window.open(mapsUrl, '_blank');
                        }}
                        className="text-sm text-foreground/60 hover:text-roam-blue hover:underline cursor-pointer text-left"
                        title="Click to open in Google Maps"
                      >
                        {booking.customer_locations.location_name || 'Customer Location'}: {booking.customer_locations.street_address}{booking.customer_locations.unit_number ? `, Unit ${booking.customer_locations.unit_number}` : ''}, {booking.customer_locations.city}, {booking.customer_locations.state} {booking.customer_locations.zip_code}
                      </button>
                    ) : (
                      <p className="text-sm text-foreground/60">
                        {booking.delivery_type === 'virtual'
                          ? 'Virtual Service - Link will be provided'
                          : 'Location TBD'
                        }
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Rating, Price, Booking Reference & Hamburger Menu */}
            <div className="col-span-4">
              <div className="flex flex-col items-end space-y-4">
                {/* Hamburger Menu - Top Right */}
                {!isPastBooking && 
                  (booking.booking_status === "pending" || booking.booking_status === "confirmed") &&
                  booking.booking_status !== "cancelled" &&
                  booking.booking_status !== "declined" &&
                  booking.booking_status !== "completed" &&
                  booking.booking_status !== "no_show" && (
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
                    ${parseFloat(booking.total_amount || '0').toFixed(2)}
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

          {/* Desktop Status Section - Full Width */}
          <div className="mt-6">
            {/* Status Text and Progress Bar */}
            <div className="w-full">
              {/* Status Text - Centered Above Progress Bar */}
              <div className="text-center mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {booking.booking_status === 'pending' ? 'Awaiting confirmation' : 
                   booking.booking_status === 'confirmed' ? 'Confirmed - Provider will arrive' :
                   booking.booking_status === 'in_progress' ? 'Service in progress' : 
                   booking.booking_status === 'completed' ? 'Service completed' :
                   booking.booking_status === 'cancelled' ? 'Booking cancelled' :
                   booking.booking_status === 'declined' ? 'Booking declined' :
                   'No show'}
                </span>
              </div>
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full transition-all duration-300 ${
                    booking.booking_status === 'pending' ? 'bg-yellow-500' :
                    booking.booking_status === 'confirmed' ? 'bg-blue-500' :
                    booking.booking_status === 'in_progress' ? 'bg-purple-500' :
                    booking.booking_status === 'completed' ? 'bg-green-500' :
                    'bg-red-500'
                  }`}
                  style={{ 
                    width: booking.booking_status === 'pending' ? '25%' : 
                           booking.booking_status === 'confirmed' ? '50%' : 
                           booking.booking_status === 'in_progress' ? '75%' : 
                           '100%' 
                  }}
                ></div>
              </div>
            </div>

            {/* Action Buttons - Centered Below Progress Bar */}
            <div className="flex justify-center gap-2 mt-4 flex-wrap">
              {(() => {
                // Show message button for all bookings that are not in final status (completed, cancelled, declined, no_show)
                const isFinalStatus = booking.booking_status === 'completed' || 
                                     booking.booking_status === 'cancelled' || 
                                     booking.booking_status === 'declined' || 
                                     booking.booking_status === 'no_show';
                const shouldShow = !isFinalStatus;
                
                console.log('🔍 Message Button Debug:', {
                  isPastBooking,
                  bookingDate: booking.date,
                  bookingTime: booking.time,
                  bookingStatus: booking.booking_status,
                  bookingBookingStatus: booking.booking_status,
                  isFinalStatus,
                  shouldShow,
                  currentDate: new Date().toISOString()
                });
                return shouldShow;
              })() && (
                <Button
                  size="sm"
                  className="bg-roam-blue hover:bg-roam-blue/90 text-white font-medium relative"
                  onClick={handleMessageClick}
                  title={booking.providers ? `Message ${booking.providers.first_name} ${booking.providers.last_name} about this booking` : "Message about this booking"}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Message
                  {unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs font-bold rounded-full"
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Badge>
                  )}
                </Button>
              )}
              
              {/* Add More button - Only show for in_progress bookings */}
              {booking.booking_status === 'in_progress' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-purple-500 text-purple-600 hover:bg-purple-50"
                  onClick={() => setShowAddMoreModal(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add More
                </Button>
              )}
            </div>
          </div>

          {/* Review and Tip Buttons for Completed Bookings - Desktop */}
          {booking.booking_status === "completed" && (
            <div className="flex justify-center mt-4">
              {(() => {
                console.log('🔍 Review Check Debug:', {
                  bookingId: booking.id,
                  bookingStatus: booking.booking_status,
                  reviews: booking.reviews,
                  reviewsLength: booking.reviews?.length,
                  hasReviews: booking.reviews && booking.reviews.length > 0,
                  tips: booking.tips,
                  tipsLength: booking.tips?.length,
                  hasTips: booking.tips && booking.tips.length > 0
                });
                return booking.reviews && booking.reviews.length > 0;
              })() ? (
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
                      • ${parseFloat(booking.tips[0].tip_amount || '0').toFixed(2)} tip
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-purple-500 text-purple-600 hover:bg-purple-50"
                    onClick={() => setShowTipModal(true)}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Send Tip
                  </Button>
                  <Button
                    size="sm" 
                    className="bg-roam-blue hover:bg-roam-blue/90"
                    onClick={() => setShowReviewModal(true)}
                  >
                    <Star className="w-4 h-4 mr-2" />
                    Leave Review
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile Layout - Vertical */}
        <div className="lg:hidden space-y-4">
          {/* Header Section - Service Info with Price */}
          <div className="flex items-start gap-3">
            {/* Service Image */}
            <Avatar className="w-14 h-14 flex-shrink-0">
              <AvatarImage
                src={booking.services?.image_url || booking.service_image}
                alt={booking.service_name}
                className="object-cover"
              />
              <AvatarFallback className="bg-gradient-to-br from-roam-blue to-roam-light-blue text-white text-sm font-semibold">
                {booking.service_name?.[0]?.toUpperCase() || "S"}
              </AvatarFallback>
            </Avatar>
            
            {/* Service Name, Provider, and Price */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg leading-tight">{booking.service_name}</h3>
                  <p className="text-sm text-foreground/60 mt-0.5">
                    with {booking.providers?.first_name} {booking.providers?.last_name}
                  </p>
                </div>
                <span className="text-xl font-bold text-roam-blue flex-shrink-0">
                  ${parseFloat(booking.total_amount || '0').toFixed(2)}
                </span>
              </div>
              
              {/* Rating */}
              <div className="flex items-center gap-1 mt-1">
                <Star className="w-4 h-4 text-roam-warning fill-current" />
                <span className="text-sm text-foreground/70">
                  {booking.providers?.average_rating || "No rating"} stars
                </span>
              </div>
            </div>
          </div>

          {/* Schedule & Reference Row */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-1.5 text-foreground/70">
                  <Calendar className="w-4 h-4 text-roam-blue" />
                  <span>{booking.date}</span>
                </div>
                <div className="flex items-center gap-1.5 text-foreground/70">
                  <Clock className="w-4 h-4 text-roam-blue" />
                  <span>{booking.time}</span>
                </div>
              </div>
              <span className="text-xs text-foreground/50">{booking.duration}</span>
            </div>
            
            {/* Booking Reference */}
            {booking.booking_reference && (
              <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                <Hash className="w-3.5 h-3.5 text-roam-blue" />
                <span className="text-xs text-gray-500 uppercase tracking-wide">Ref:</span>
                <span className="text-sm font-mono font-medium text-gray-800">
                  {booking.booking_reference}
                </span>
              </div>
            )}
          </div>

          {/* Status Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                {booking.booking_status === 'pending' ? 'Awaiting confirmation' : 
                 booking.booking_status === 'confirmed' ? 'Confirmed' :
                 booking.booking_status === 'in_progress' ? 'Service in progress' : 
                 booking.booking_status === 'completed' ? 'Service completed' :
                 booking.booking_status === 'cancelled' ? 'Booking cancelled' :
                 booking.booking_status === 'declined' ? 'Booking declined' :
                 'No show'}
              </span>
              {booking.booking_status === "confirmed" && (
                <span className="text-xs text-roam-blue bg-roam-blue/10 px-2 py-0.5 rounded-full">
                  Messaging Available
                </span>
              )}
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  booking.booking_status === 'pending' ? 'bg-yellow-500' :
                  booking.booking_status === 'confirmed' ? 'bg-blue-500' :
                  booking.booking_status === 'in_progress' ? 'bg-purple-500' :
                  booking.booking_status === 'completed' ? 'bg-green-500' :
                  'bg-red-500'
                }`}
                style={{ 
                  width: booking.booking_status === 'pending' ? '25%' : 
                         booking.booking_status === 'confirmed' ? '50%' : 
                         booking.booking_status === 'in_progress' ? '75%' : 
                         '100%' 
                }}
              ></div>
            </div>
          </div>

          {/* Business & Location Section */}
          <div className="space-y-2">
            {/* Business Name */}
            {booking.business_profiles?.business_name && (
              <div className="flex items-center gap-2">
                {booking.business_profiles.logo_url ? (
                  <img 
                    src={booking.business_profiles.logo_url} 
                    alt={`${booking.business_profiles.business_name} logo`}
                    className="w-6 h-6 rounded object-cover"
                  />
                ) : (
                  <Building className="w-4 h-4 text-roam-blue" />
                )}
                <p className="text-sm font-medium text-gray-900">
                  {booking.business_profiles.business_name}
                </p>
              </div>
            )}

            {/* Location */}
            <div className="flex items-start gap-2">
              <DeliveryIcon className="w-4 h-4 text-roam-blue mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{deliveryLabel}</p>
                {booking.delivery_type === 'business_location' && booking.business_locations ? (
                  <button
                    onClick={() => {
                      const address = `${booking.business_locations.address_line1}${booking.business_locations.address_line2 ? `, ${booking.business_locations.address_line2}` : ''}, ${booking.business_locations.city}, ${booking.business_locations.state} ${booking.business_locations.postal_code}`;
                      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
                      window.open(mapsUrl, '_blank');
                    }}
                    className="text-sm text-foreground/60 hover:text-roam-blue hover:underline cursor-pointer text-left"
                    title="Click to open in Google Maps"
                  >
                    {booking.business_locations.address_line1}, {booking.business_locations.city}, {booking.business_locations.state}
                  </button>
                ) : booking.delivery_type === 'mobile' && booking.customer_locations ? (
                  <button
                    onClick={() => {
                      const address = `${booking.customer_locations.street_address}${booking.customer_locations.unit_number ? `, Unit ${booking.customer_locations.unit_number}` : ''}, ${booking.customer_locations.city}, ${booking.customer_locations.state} ${booking.customer_locations.zip_code}`;
                      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
                      window.open(mapsUrl, '_blank');
                    }}
                    className="text-sm text-foreground/60 hover:text-roam-blue hover:underline cursor-pointer text-left"
                    title="Click to open in Google Maps"
                  >
                    {booking.customer_locations.street_address}, {booking.customer_locations.city}, {booking.customer_locations.state}
                  </button>
                ) : (
                  <p className="text-sm text-foreground/60">
                    {booking.delivery_type === 'virtual'
                      ? 'Virtual Service - Link will be provided'
                      : 'Location TBD'
                    }
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons - Full Width Horizontal Row */}
          <div className="pt-2 border-t border-gray-100">
            {/* Active Booking Actions */}
            {!isPastBooking && (booking.booking_status === "confirmed" || booking.booking_status === "pending" || booking.booking_status === "in_progress") && (
              <div className="grid grid-cols-3 gap-2">
                {/* Message Button */}
                {booking.providers && (
                  <Button
                    size="sm"
                    className="bg-roam-blue hover:bg-roam-blue/90 text-white font-medium relative flex-1"
                    onClick={handleMessageClick}
                    title={`Message ${booking.providers.first_name} ${booking.providers.last_name} about this booking`}
                  >
                    <MessageCircle className="w-4 h-4 mr-1.5" />
                    <span className="text-xs">Message</span>
                    {unreadCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs font-bold rounded-full"
                      >
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </Badge>
                    )}
                  </Button>
                )}
                
                {/* Reschedule Button */}
                {(booking.booking_status === "pending" || booking.booking_status === "confirmed") && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-gray-300 text-gray-700 hover:bg-gray-50 flex-1"
                    onClick={() => onReschedule(booking)}
                  >
                    <Edit className="w-4 h-4 mr-1.5" />
                    <span className="text-xs">Reschedule</span>
                  </Button>
                )}
                
                {/* Cancel Button or More Menu */}
                {(booking.booking_status === "pending" || booking.booking_status === "confirmed") && (
                  canCancelBooking ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50 flex-1"
                      onClick={() => onCancel(booking)}
                    >
                      <X className="w-4 h-4 mr-1.5" />
                      <span className="text-xs">Cancel</span>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-gray-200 text-gray-400 cursor-not-allowed flex-1"
                      disabled
                      title="Cannot cancel within 24 hours of appointment"
                    >
                      <X className="w-4 h-4 mr-1.5" />
                      <span className="text-xs">24h Lock</span>
                    </Button>
                  )
                )}
                
                {/* Add More button - Only show for in_progress bookings */}
                {booking.booking_status === 'in_progress' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-purple-500 text-purple-600 hover:bg-purple-50 col-span-2"
                    onClick={() => setShowAddMoreModal(true)}
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    <span className="text-xs">Add More Services</span>
                  </Button>
                )}
              </div>
            )}

            {/* Past Booking - Message Button */}
            {isPastBooking && booking.providers && booking.booking_status !== "completed" && (
              <Button
                size="sm"
                className="w-full bg-roam-blue hover:bg-roam-blue/90 text-white font-medium relative"
                onClick={handleMessageClick}
                title={`Message ${booking.providers.first_name} ${booking.providers.last_name} about this booking`}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Message Provider
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs font-bold rounded-full"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </Button>
            )}

            {/* Completed Booking Actions */}
            {booking.booking_status === "completed" && (
              <div className="space-y-2">
                {(() => {
                  console.log('🔍 Mobile Review Check Debug:', {
                    bookingId: booking.id,
                    bookingStatus: booking.booking_status,
                    reviews: booking.reviews,
                    reviewsLength: booking.reviews?.length,
                    hasReviews: booking.reviews && booking.reviews.length > 0,
                    tips: booking.tips,
                    tipsLength: booking.tips?.length,
                    hasTips: booking.tips && booking.tips.length > 0
                  });
                  return booking.reviews && booking.reviews.length > 0;
                })() ? (
                  <div className="space-y-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="w-full border-green-500 text-green-600 hover:bg-green-50"
                      onClick={() => setShowReviewModal(true)}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      View Review & Tip
                    </Button>
                    <div className="flex items-center justify-center gap-3 text-sm text-gray-500">
                      <span>{booking.reviews[0].overall_rating}/5 stars</span>
                      {booking.tips && booking.tips.length > 0 && (
                        <>
                          <span>•</span>
                          <span>${parseFloat(booking.tips[0].tip_amount || '0').toFixed(2)} tip</span>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-purple-500 text-purple-600 hover:bg-purple-50"
                      onClick={() => setShowTipModal(true)}
                    >
                      <CreditCard className="w-4 h-4 mr-1.5" />
                      <span className="text-xs">Send Tip</span>
                    </Button>
                    <Button 
                      size="sm" 
                      className="bg-roam-blue hover:bg-roam-blue/90"
                      onClick={() => setShowReviewModal(true)}
                    >
                      <Star className="w-4 h-4 mr-1.5" />
                      <span className="text-xs">Leave Review</span>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>



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
      onClose={() => {
        setShowReviewModal(false);
        // Refresh booking data to get updated reviews/tips
        if (onRefresh) {
          onRefresh();
        }
      }}
      booking={booking}
    />

    {/* Tip Modal */}
    <ReviewAndTipModal
      isOpen={showTipModal}
      onClose={() => {
        setShowTipModal(false);
        // Refresh booking data to get updated tips
        if (onRefresh) {
          onRefresh();
        }
      }}
      booking={booking}
      initialStep="tip"
    />

    {/* Add More Service Modal */}
    <AddMoreServiceModal
      isOpen={showAddMoreModal}
      onClose={() => setShowAddMoreModal(false)}
      booking={booking}
      onSuccess={() => {
        // Refresh booking data to get updated remaining_balance
        if (onRefresh) {
          onRefresh();
        }
      }}
    />
  </>
  );
};
