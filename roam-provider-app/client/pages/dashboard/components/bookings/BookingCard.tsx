import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BookingStatusIndicator from "@/components/BookingStatusIndicator";
import ConversationChat from "@/components/ConversationChat";
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
} from "lucide-react";

interface BookingCardProps {
  booking: any;
  onViewDetails: (booking: any) => void;
  onUpdateStatus: (bookingId: string, status: string) => Promise<void>;
  formatDisplayTime: (time: string) => string;
  showActions?: boolean;
}

export default function BookingCard({
  booking,
  onViewDetails,
  onUpdateStatus,
  formatDisplayTime,
  showActions = true,
}: BookingCardProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const getStatusActions = (status: string) => {
    // Check if booking is scheduled for today or in the past
    const isBookingDateTodayOrPast = () => {
      if (!booking.booking_date) return false;
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      return booking.booking_date <= today;
    };

    switch (status) {
      case "pending":
        return [
          { label: "Accept", status: "confirmed", icon: CheckCircle, variant: "default" as const },
          { label: "Decline", status: "declined", icon: XCircle, variant: "destructive" as const },
        ];
      case "confirmed":
        // Only show "Start Service" if booking is scheduled for today or in the past AND has an assigned provider
        if (isBookingDateTodayOrPast() && booking.providers && booking.providers.id) {
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
      {/* Main Content */}
      <div className="p-6">
        {/* Top Section - Service Info */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start space-x-4">
            {/* Customer Avatar */}
            <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
              {(() => {
                // Debug logging
                console.log("🔍 BOOKINGS TAB AVATAR DEBUG:", {
                  bookingId: booking.id,
                  customerProfiles: booking.customer_profiles,
                  imageUrl: booking.customer_profiles?.image_url,
                  firstName: booking.customer_profiles?.first_name,
                  lastName: booking.customer_profiles?.last_name,
                  hasImage: !!booking.customer_profiles?.image_url,
                  fullBookingData: booking
                });
                
                if (booking.customer_profiles?.image_url) {
                  return (
                    <img
                      src={booking.customer_profiles.image_url}
                      alt={`${booking.customer_profiles.first_name || ""} ${booking.customer_profiles.last_name || ""}`}
                      className="w-full h-full object-cover rounded-lg"
                      onError={(e) => {
                        console.log("❌ IMAGE LOAD ERROR:", booking.customer_profiles.image_url);
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
                        <User className="w-8 h-8 text-white" />
                      )}
                    </div>
                  );
                }
              })()}
            </div>
            
            {/* Service Details */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {booking.services?.name || "Service"}
              </h3>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>{booking.booking_date}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>{formatDisplayTime(booking.start_time)} ({booking.services?.duration_minutes || 0} min)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Right - More Options & Price */}
          <div className="flex flex-col items-end space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs px-3 py-1 h-8"
              onClick={() => onViewDetails(booking)}
            >
              Details & Assignment
            </Button>
            {booking.total_amount && (
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">
                  ${booking.total_amount}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Business & Location Info */}
        <div className="flex items-start space-x-6 mb-4">
          <div className="flex items-start space-x-2">
            <Building className="w-4 h-4 text-gray-500 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-gray-900">Business</div>
              <div className="text-sm text-gray-600">
                {booking.business_locations?.location_name || "Main Location"}
              </div>
            </div>
          </div>
          
                 <div className="flex items-start space-x-2">
                   <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
                   <div>
                     <div className="text-sm font-medium text-gray-900">Location</div>
                     <div className="text-sm text-gray-600 max-w-xs">
                       {booking.customer_locations ? (
                         <a
                           href={`https://maps.google.com/maps?q=${encodeURIComponent(
                             `${booking.customer_locations.address_line1 || ""} ${booking.customer_locations.address_line2 || ""}, ${booking.customer_locations.city || ""}, ${booking.customer_locations.state || ""} ${booking.customer_locations.postal_code || ""}`
                           )}`}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                           title="Click to open in Google Maps"
                         >
                           {`${booking.customer_locations.address_line1 || ""} ${booking.customer_locations.address_line2 || ""}, ${booking.customer_locations.city || ""}, ${booking.customer_locations.state || ""} ${booking.customer_locations.postal_code || ""}`}
                         </a>
                       ) : booking.business_locations ? (
                         <a
                           href={`https://maps.google.com/maps?q=${encodeURIComponent(
                             `${booking.business_locations.location_name || ""} ${booking.business_locations.address_line1 || ""}, ${booking.business_locations.city || ""}, ${booking.business_locations.state || ""}`
                           )}`}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                           title="Click to open in Google Maps"
                         >
                           {`${booking.business_locations.location_name || ""} ${booking.business_locations.address_line1 || ""}, ${booking.business_locations.city || ""}, ${booking.business_locations.state || ""}`}
                         </a>
                       ) : (
                         "Location not specified"
                       )}
                     </div>
                   </div>
                 </div>
        </div>

        {/* Customer and Provider Info */}
        <div className="flex items-start justify-between mb-4">
          {/* Customer Info */}
          <div className="flex items-start space-x-2">
            <Users className="w-4 h-4 text-gray-500 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-gray-900">Customer</div>
              <div className="text-sm text-gray-600">
                {booking.customer_profiles
                  ? `${booking.customer_profiles.first_name || ""} ${booking.customer_profiles.last_name || ""}`
                  : "Unknown Customer"
                }
              </div>
              {booking.customer_profiles?.phone && (
                <div className="text-xs text-gray-500 mt-1">
                  {booking.customer_profiles.phone}
                </div>
              )}
            </div>
          </div>

          {/* Provider Info */}
          <div className="flex items-start space-x-2">
            <UserCheck className="w-4 h-4 text-gray-500 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-gray-900">Provider</div>
              <div className="text-sm text-gray-600">
                {booking.providers 
                  ? `${booking.providers.first_name || ""} ${booking.providers.last_name || ""}`
                  : "Unassigned Provider"
                }
              </div>
              {booking.providers?.phone && (
                <div className="text-xs text-gray-500 mt-1">
                  {booking.providers.phone}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Booking Reference */}
        <div className="flex items-center space-x-2 mb-4">
          <Hash className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-900">BOOKING REFERENCE:</span>
          <span className="text-sm font-bold text-gray-900">
            {booking.booking_reference || `BK${Math.random().toString(36).substr(2, 4).toUpperCase()}`}
          </span>
        </div>

        {/* Special Instructions */}
        {booking.special_instructions && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-start space-x-2">
              <MessageCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">Special Instructions:</p>
                <p className="text-sm text-yellow-700">{booking.special_instructions}</p>
              </div>
            </div>
          </div>
        )}

        {/* Status Section */}
        <div className="mb-4">
          <div className="text-center mb-2">
            <p className="text-sm text-gray-600">{getStatusMessage(booking.booking_status)}</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
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
            <Button
              onClick={() => setIsChatOpen(true)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white p-2 h-8 w-8 rounded-lg"
            >
              <MessageCircle className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        {showActions && statusActions.length > 0 && (
          <div className="flex items-center justify-center space-x-2 mb-4">
            {statusActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.status}
                  variant={action.variant}
                  size="sm"
                  onClick={() => onUpdateStatus(booking.id, action.status)}
                  className="flex items-center space-x-2 px-4 py-2"
                >
                  <Icon className="w-4 h-4" />
                  <span>{action.label}</span>
                </Button>
              );
            })}
          </div>
        )}
      </div>

      {/* Chat Modal */}
      <ConversationChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        booking={booking}
      />
    </Card>
  );
}