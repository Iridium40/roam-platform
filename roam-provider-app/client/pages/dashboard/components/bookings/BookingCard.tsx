import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BookingStatusIndicator from "@/components/BookingStatusIndicator";
import ConversationChat from "@/components/ConversationChat";
import DeclineBookingModal from "./DeclineBookingModal";
import { useProviderAuth } from "@/contexts/auth/ProviderAuthContext";
import { supabase } from "@/lib/supabase";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  MessageCircle,
  Hash,
  CheckCircle,
  XCircle,
  AlertCircle,
  DollarSign,
  UserCheck,
  Star,
  Building,
  User,
  CreditCard,
  RotateCcw,
} from "lucide-react";

interface BookingCardProps {
  booking: any;
  onViewDetails: (booking: any) => void;
  onUpdateStatus: (bookingId: string, status: string, reason?: string) => Promise<void>;
  formatDisplayTime: (time: string) => string;
  showActions?: boolean;
  unreadCount?: number;
}

export default function BookingCard({
  booking,
  onViewDetails,
  onUpdateStatus,
  formatDisplayTime,
  showActions = true,
  unreadCount: propUnreadCount = 0,
}: BookingCardProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  // Use prop value if provided, otherwise default to 0
  const unreadCount = propUnreadCount;
  const { provider } = useProviderAuth();

  // Handle decline with reason
  const handleDeclineConfirm = async (reason: string) => {
    await onUpdateStatus(booking.id, "declined", reason);
  };

  // Note: Unread count is now passed from parent component for better performance
  // Individual fetching per card has been removed

  // Check if a provider is assigned to the booking
  const hasProviderAssigned = Boolean(booking.providers && booking.providers.id) || Boolean(booking.provider_id);

  // Check if booking has been rescheduled
  const isRescheduled = Boolean(booking.original_booking_date || booking.original_booking_time);

  const getStatusActions = (status: string) => {
    // Check if booking is scheduled for today or in the past
    const isBookingDateTodayOrPast = () => {
      if (!booking.booking_date) return false;
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      return booking.booking_date <= today;
    };

    switch (status) {
      case "pending":
        // Only show Accept button if a provider is assigned
        // Always show Decline button
        return [
          { 
            label: hasProviderAssigned ? "Accept" : "Accept (Assign Provider First)", 
            status: "confirmed", 
            icon: CheckCircle, 
            variant: "default" as const,
            disabled: !hasProviderAssigned,
            tooltip: !hasProviderAssigned ? "Please assign a provider before accepting this booking" : undefined
          },
          { label: "Decline", status: "declined", icon: XCircle, variant: "destructive" as const },
        ];
      case "confirmed":
        // Only show "Start Service" if booking is scheduled for today or in the past AND has an assigned provider
        if (isBookingDateTodayOrPast() && hasProviderAssigned) {
          return [
            { label: "Start Service", status: "in_progress", icon: Clock, variant: "default" as const },
          ];
        }
        return []; // No actions for future confirmed bookings or unassigned bookings
      case "in_progress":
        return [
          { label: "Complete", status: "completed", icon: CheckCircle, variant: "default" as const },
          { label: "Mark No Show", status: "no_show", icon: AlertCircle, variant: "destructive" as const },
        ];
      default:
        return [];
    }
  };

  const statusActions = getStatusActions(booking.booking_status);

  const getStatusMessage = (status: string) => {
    // Check if booking is scheduled for today or in the past
    const isBookingDateTodayOrPast = () => {
      if (!booking.booking_date) return false;
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      return booking.booking_date <= today;
    };

    switch (status) {
      case "pending":
        return "Pending - Awaiting your response";
      case "confirmed":
        if (isBookingDateTodayOrPast()) {
          if (booking.providers && booking.providers.id) {
            return "Confirmed - Ready to start";
          } else {
            return "Confirmed - Awaiting provider assignment";
          }
        } else {
          return "Confirmed - Scheduled for future";
        }
      case "in_progress":
        return "In Progress - Service ongoing";
      case "completed":
        return "Completed - Service finished";
      case "declined":
        return "Declined - Service declined";
      case "no_show":
        return "No Show - Customer didn't arrive";
      default:
        return "Status unknown";
    }
  };

  const getProgressPercentage = (status: string) => {
    switch (status) {
      case "pending":
        return 20;
      case "confirmed":
        return 60;
      case "in_progress":
        return 80;
      case "completed":
        return 100;
      default:
        return 0;
    }
  };

  return (
    <Card className="overflow-hidden bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Desktop Layout */}
      <div className="hidden lg:block p-6 space-y-4">
        {/* Header Row - Service, Customer, Price */}
        <div className="flex items-start gap-4">
          {/* Customer Avatar */}
          <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
            {(() => {
              if (booking.customer_profiles?.image_url) {
                return (
                  <img
                    src={booking.customer_profiles.image_url}
                    alt={`${booking.customer_profiles.first_name || ""} ${booking.customer_profiles.last_name || ""}`}
                    className="w-full h-full object-cover rounded-lg"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                );
              } else {
                return (
                  <div className="w-full h-full bg-blue-600 rounded-lg flex items-center justify-center">
                    {booking.customer_profiles?.first_name?.[0] || booking.customer_profiles?.last_name?.[0] ? (
                      <span className="text-white font-semibold text-lg">
                        {booking.customer_profiles.first_name[0] || booking.customer_profiles.last_name[0]}
                      </span>
                    ) : (
                      <User className="w-7 h-7 text-white" />
                    )}
                  </div>
                );
              }
            })()}
          </div>
          
          {/* Service & Customer Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {booking.services?.name || "Service"}
                  </h3>
                  {isRescheduled && (
                    <Badge 
                      variant="outline" 
                      className="bg-orange-50 text-orange-700 border-orange-200 text-xs px-2 py-0.5 flex items-center gap-1"
                      title={`Rescheduled from ${booking.original_booking_date || 'original date'} at ${booking.original_booking_time ? formatDisplayTime(booking.original_booking_time) : 'original time'}`}
                    >
                      <RotateCcw className="w-3 h-3" />
                      Rescheduled
                    </Badge>
                  )}
                  {/* Payment Badge */}
                  {(() => {
                    const hasPaymentTransaction = booking.business_payment_transactions && 
                      (Array.isArray(booking.business_payment_transactions) 
                        ? booking.business_payment_transactions.length > 0
                        : !!booking.business_payment_transactions);
                    
                    return (
                      <Badge 
                        variant="outline" 
                        className={`text-xs px-2 py-0.5 ${hasPaymentTransaction ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}
                      >
                        {hasPaymentTransaction ? (
                          <><CreditCard className="w-3 h-3 mr-1" />Paid</>
                        ) : (
                          <><AlertCircle className="w-3 h-3 mr-1" />Payment Pending</>
                        )}
                      </Badge>
                    );
                  })()}
                </div>
                <p className="text-sm text-gray-600 mt-0.5">
                  <span className="font-medium">Customer:</span>{" "}
                  {booking.customer_profiles
                    ? `${booking.customer_profiles.first_name || ""} ${booking.customer_profiles.last_name || ""}`
                    : "Unknown Customer"
                  }
                  {booking.customer_profiles?.phone && (
                    <span className="text-gray-400 ml-2">• {booking.customer_profiles.phone}</span>
                  )}
                </p>
              </div>
              
              {/* Price */}
              <div className="text-right flex-shrink-0">
                <div className="text-2xl font-bold text-blue-600">
                  ${parseFloat(booking.total_amount || '0').toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Schedule & Reference Card */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Schedule Info */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-gray-700">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="font-medium">{booking.booking_date}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="font-medium">{formatDisplayTime(booking.start_time)}</span>
                <span className="text-gray-500">({booking.services?.duration_minutes || 0} min)</span>
              </div>
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-gray-500 uppercase tracking-wide">Ref:</span>
                <span className="font-mono font-semibold text-gray-800">
                  {booking.booking_reference || `BK${Math.random().toString(36).substr(2, 4).toUpperCase()}`}
                </span>
              </div>
            </div>
            
            {/* Rescheduled Info */}
            {isRescheduled && (
              <div className="flex items-center gap-1.5 text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded px-2 py-1">
                <RotateCcw className="w-3 h-3" />
                <span>Originally: {booking.original_booking_date || 'N/A'} at {booking.original_booking_time ? formatDisplayTime(booking.original_booking_time) : 'N/A'}</span>
              </div>
            )}
          </div>
        </div>

        {/* People & Location Row */}
        <div className="grid grid-cols-3 gap-4">
          {/* Provider */}
          <div className="flex items-start gap-2">
            <UserCheck className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Provider</div>
              <div className="text-sm font-medium text-gray-900">
                {booking.providers 
                  ? `${booking.providers.first_name || ""} ${booking.providers.last_name || ""}`
                  : "Unassigned"
                }
              </div>
              {booking.providers?.phone && (
                <div className="text-xs text-gray-500">{booking.providers.phone}</div>
              )}
            </div>
          </div>

          {/* Business */}
          <div className="flex items-start gap-2">
            <Building className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Business</div>
              <div className="text-sm font-medium text-gray-900">
                {booking.business_locations?.location_name || "Main Location"}
              </div>
            </div>
          </div>
          
          {/* Location */}
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Service Location</div>
              <div className="text-sm">
                {booking.customer_locations ? (
                  <a
                    href={`https://maps.google.com/maps?q=${encodeURIComponent(
                      `${booking.customer_locations.address_line1 || ""}, ${booking.customer_locations.city || ""}, ${booking.customer_locations.state || ""}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {booking.customer_locations.address_line1}, {booking.customer_locations.city}, {booking.customer_locations.state}
                  </a>
                ) : booking.business_locations ? (
                  <a
                    href={`https://maps.google.com/maps?q=${encodeURIComponent(
                      `${booking.business_locations.address_line1 || ""}, ${booking.business_locations.city || ""}, ${booking.business_locations.state || ""}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {booking.business_locations.address_line1}, {booking.business_locations.city}
                  </a>
                ) : (
                  <span className="text-gray-600">Location not specified</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Special Instructions */}
        {booking.special_instructions && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <MessageCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-800">Special Instructions:</p>
                <p className="text-sm text-yellow-700">{booking.special_instructions}</p>
              </div>
            </div>
          </div>
        )}

        {/* Status & Actions Section */}
        <div className="pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between gap-4">
            {/* Status */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm font-medium text-gray-700">{getStatusMessage(booking.booking_status)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    booking.booking_status === 'pending' ? 'bg-yellow-500' :
                    booking.booking_status === 'confirmed' ? 'bg-blue-500' :
                    booking.booking_status === 'in_progress' ? 'bg-purple-500' :
                    booking.booking_status === 'completed' ? 'bg-green-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${getProgressPercentage(booking.booking_status)}%` }}
                ></div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Message Button */}
              <Button
                onClick={() => setIsChatOpen(true)}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white relative"
              >
                <MessageCircle className="w-4 h-4 mr-1.5" />
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

              {/* Details Button */}
              <Button
                variant="outline"
                size="sm"
                className="border-gray-300"
                onClick={() => onViewDetails(booking)}
              >
                {hasProviderAssigned ? "Details" : "Assign Provider"}
              </Button>

              {/* Status Actions */}
              {showActions && statusActions.map((action: any) => {
                const Icon = action.icon;
                const isDisabled = action.disabled || false;
                return (
                  <Button
                    key={action.status}
                    variant={action.variant}
                    size="sm"
                    disabled={isDisabled}
                    onClick={() => {
                      if (isDisabled) return;
                      if (action.status === "declined") {
                        setIsDeclineModalOpen(true);
                      } else {
                        onUpdateStatus(booking.id, action.status);
                      }
                    }}
                    className={isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                    title={action.tooltip}
                  >
                    <Icon className="w-4 h-4 mr-1.5" />
                    {action.label}
                  </Button>
                );
              })}
            </div>
          </div>
          
          {/* Provider Assignment Warning */}
          {!hasProviderAssigned && booking.booking_status === "pending" && (
            <p className="text-xs text-amber-600 text-right mt-2">
              ⚠️ Assign a provider before accepting
            </p>
          )}
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden p-4 space-y-4">
        {/* Header - Service & Price */}
        <div className="flex items-start gap-3">
          {/* Customer Avatar */}
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
            {(() => {
              if (booking.customer_profiles?.image_url) {
                return (
                  <img
                    src={booking.customer_profiles.image_url}
                    alt={`${booking.customer_profiles.first_name || ""} ${booking.customer_profiles.last_name || ""}`}
                    className="w-full h-full object-cover rounded-lg"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                );
              } else {
                return (
                  <div className="w-full h-full bg-blue-600 rounded-lg flex items-center justify-center">
                    {booking.customer_profiles?.first_name?.[0] || booking.customer_profiles?.last_name?.[0] ? (
                      <span className="text-white font-semibold text-sm">
                        {booking.customer_profiles.first_name[0] || booking.customer_profiles.last_name[0]}
                      </span>
                    ) : (
                      <User className="w-6 h-6 text-white" />
                    )}
                  </div>
                );
              }
            })()}
          </div>

          {/* Service Name & Customer */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="font-semibold text-base text-gray-900 leading-tight">
                    {booking.services?.name || "Service"}
                  </h3>
                  {isRescheduled && (
                    <Badge 
                      variant="outline" 
                      className="bg-orange-50 text-orange-700 border-orange-200 text-xs px-1.5 py-0 flex items-center gap-0.5"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span className="text-[10px]">Rescheduled</span>
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-0.5">
                  {booking.customer_profiles
                    ? `${booking.customer_profiles.first_name || ""} ${booking.customer_profiles.last_name || ""}`
                    : "Unknown Customer"
                  }
                </p>
              </div>
              <span className="text-lg font-bold text-blue-600 flex-shrink-0">
                ${parseFloat(booking.total_amount || '0').toFixed(2)}
              </span>
            </div>
            
            {/* Payment Badge */}
            {(() => {
              const hasPaymentTransaction = booking.business_payment_transactions && 
                (Array.isArray(booking.business_payment_transactions) 
                  ? booking.business_payment_transactions.length > 0
                  : !!booking.business_payment_transactions);
              
              return (
                <div className="flex items-center gap-1 mt-1">
                  <Badge 
                    variant="outline" 
                    className={`text-xs px-1.5 py-0 ${hasPaymentTransaction ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}
                  >
                    {hasPaymentTransaction ? (
                      <><CreditCard className="w-3 h-3 mr-1" />Paid</>
                    ) : (
                      <><AlertCircle className="w-3 h-3 mr-1" />Pending</>
                    )}
                  </Badge>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Schedule Card */}
        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1.5 text-gray-700">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>{booking.booking_date}</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-700">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>{formatDisplayTime(booking.start_time)}</span>
              </div>
            </div>
            <span className="text-xs text-gray-500">{booking.services?.duration_minutes || 0} min</span>
          </div>
          
          {/* Booking Reference */}
          <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
            <Hash className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-xs text-gray-500 uppercase tracking-wide">Ref:</span>
            <span className="text-sm font-mono font-medium text-gray-800">
              {booking.booking_reference || `BK${Math.random().toString(36).substr(2, 4).toUpperCase()}`}
            </span>
          </div>

          {/* Rescheduled Info */}
          {isRescheduled && (
            <div className="flex items-center gap-1.5 pt-2 border-t border-gray-200 text-xs text-orange-600">
              <RotateCcw className="w-3 h-3" />
              <span>Originally: {booking.original_booking_date || 'N/A'} at {booking.original_booking_time ? formatDisplayTime(booking.original_booking_time) : 'N/A'}</span>
            </div>
          )}
        </div>

        {/* Status Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              {getStatusMessage(booking.booking_status)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                booking.booking_status === 'pending' ? 'bg-yellow-500' :
                booking.booking_status === 'confirmed' ? 'bg-blue-500' :
                booking.booking_status === 'in_progress' ? 'bg-purple-500' :
                booking.booking_status === 'completed' ? 'bg-green-500' :
                'bg-red-500'
              }`}
              style={{ width: `${getProgressPercentage(booking.booking_status)}%` }}
            ></div>
          </div>
        </div>

        {/* People & Location Section */}
        <div className="space-y-2">
          {/* Provider Assignment */}
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span className="text-sm text-gray-700">
              {booking.providers 
                ? `${booking.providers.first_name || ""} ${booking.providers.last_name || ""}`
                : "Unassigned Provider"
              }
            </span>
          </div>

          {/* Location */}
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              {booking.customer_locations ? (
                <a
                  href={`https://maps.google.com/maps?q=${encodeURIComponent(
                    `${booking.customer_locations.address_line1 || ""}, ${booking.customer_locations.city || ""}, ${booking.customer_locations.state || ""}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  {booking.customer_locations.address_line1}, {booking.customer_locations.city}, {booking.customer_locations.state}
                </a>
              ) : booking.business_locations ? (
                <a
                  href={`https://maps.google.com/maps?q=${encodeURIComponent(
                    `${booking.business_locations.address_line1 || ""}, ${booking.business_locations.city || ""}, ${booking.business_locations.state || ""}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  {booking.business_locations.location_name || booking.business_locations.address_line1}, {booking.business_locations.city}
                </a>
              ) : (
                <span className="text-sm text-gray-600">Location not specified</span>
              )}
            </div>
          </div>
        </div>

        {/* Special Instructions */}
        {booking.special_instructions && (
          <div className="p-2.5 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-start gap-2">
              <MessageCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-yellow-700">{booking.special_instructions}</p>
            </div>
          </div>
        )}

        {/* Action Buttons - Full Width */}
        <div className="pt-2 border-t border-gray-100 space-y-2">
          {/* Primary Actions Row */}
          <div className="grid grid-cols-2 gap-2">
            {/* Message Button */}
            <Button
              onClick={() => setIsChatOpen(true)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white relative"
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

            {/* Details Button */}
            <Button
              variant="outline"
              size="sm"
              className="border-gray-300 text-gray-700"
              onClick={() => onViewDetails(booking)}
            >
              <span className="text-xs">{hasProviderAssigned ? "Details" : "Assign Provider"}</span>
            </Button>
          </div>

          {/* Status Action Buttons */}
          {showActions && statusActions.length > 0 && (
            <div className={`grid gap-2 ${statusActions.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {statusActions.map((action: any) => {
                const Icon = action.icon;
                const isDisabled = action.disabled || false;
                return (
                  <Button
                    key={action.status}
                    variant={action.variant}
                    size="sm"
                    disabled={isDisabled}
                    onClick={() => {
                      if (isDisabled) return;
                      if (action.status === "declined") {
                        setIsDeclineModalOpen(true);
                      } else {
                        onUpdateStatus(booking.id, action.status);
                      }
                    }}
                    className={`flex items-center justify-center ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={action.tooltip}
                  >
                    <Icon className="w-4 h-4 mr-1.5" />
                    <span className="text-xs">{action.label}</span>
                  </Button>
                );
              })}
            </div>
          )}

          {/* Provider Assignment Warning */}
          {!hasProviderAssigned && booking.booking_status === "pending" && (
            <p className="text-xs text-amber-600 text-center">
              ⚠️ Assign a provider before accepting
            </p>
          )}
        </div>
      </div>

      {/* Chat Modal */}
      <ConversationChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        booking={booking}
      />

      {/* Decline Booking Modal */}
      <DeclineBookingModal
        isOpen={isDeclineModalOpen}
        onClose={() => setIsDeclineModalOpen(false)}
        onConfirm={handleDeclineConfirm}
        bookingDetails={{
          serviceName: booking.services?.name,
          customerName: booking.customer_profiles 
            ? `${booking.customer_profiles.first_name || ""} ${booking.customer_profiles.last_name || ""}`.trim()
            : undefined,
          bookingDate: booking.booking_date,
        }}
      />
    </Card>
  );
}