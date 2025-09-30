import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BookingStatusIndicator from "@/components/BookingStatusIndicator";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  MessageCircle,
  Hash,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  AlertCircle,
  DollarSign,
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
  const getStatusActions = (status: string) => {
    switch (status) {
      case "pending":
        return [
          { label: "Accept", status: "confirmed", icon: CheckCircle, variant: "default" as const },
          { label: "Decline", status: "declined", icon: XCircle, variant: "destructive" as const },
        ];
      case "confirmed":
        return [
          { label: "Start Service", status: "in_progress", icon: Clock, variant: "default" as const },
          { label: "Cancel", status: "cancelled", icon: XCircle, variant: "destructive" as const },
        ];
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

  return (
    <Card className="overflow-hidden">
      {/* Service and Booking Overview */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                {booking.services?.name || "Service"}
              </h3>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>{new Date(booking.booking_date).toLocaleDateString()}</span>
                <span>{formatDisplayTime(booking.start_time)}</span>
                <span className="flex items-center space-x-1">
                  <Hash className="w-3 h-3" />
                  <span>{booking.booking_reference || `BK${Math.random().toString(36).substr(2, 4).toUpperCase()}`}</span>
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <BookingStatusIndicator status={booking.booking_status} />
            {booking.total_amount && (
              <Badge variant="outline" className="flex items-center space-x-1">
                <DollarSign className="w-3 h-3" />
                <span>${booking.total_amount}</span>
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Booking Details */}
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Customer Info */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium">Customer</span>
            </div>
            <div className="ml-6">
              <p className="text-sm font-medium text-gray-900">
                {booking.customer_profiles
                  ? `${booking.customer_profiles.first_name || ""} ${booking.customer_profiles.last_name || ""}`
                  : "Unknown Customer"
                }
              </p>
              {booking.customer_profiles?.email && (
                <p className="text-xs text-gray-500">{booking.customer_profiles.email}</p>
              )}
              {booking.customer_profiles?.phone && (
                <p className="text-xs text-gray-500">{booking.customer_profiles.phone}</p>
              )}
            </div>
          </div>

          {/* Location Info */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium">Location</span>
            </div>
            <div className="ml-6">
              <p className="text-sm text-gray-900">
                {booking.customer_locations
                  ? `${booking.customer_locations.address_line1 || ""} ${booking.customer_locations.address_line2 || ""}, ${booking.customer_locations.city || ""}, ${booking.customer_locations.state || ""} ${booking.customer_locations.postal_code || ""}`
                  : booking.business_locations
                  ? `${booking.business_locations.location_name || ""} ${booking.business_locations.address_line1 || ""}, ${booking.business_locations.city || ""}, ${booking.business_locations.state || ""}`
                  : "Location not specified"
                }
              </p>
            </div>
          </div>

          {/* Time & Duration */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium">Duration</span>
            </div>
            <div className="ml-6">
              <p className="text-sm text-gray-900">
                {booking.services?.duration_minutes 
                  ? `${booking.services.duration_minutes} minutes`
                  : "Duration not specified"
                }
              </p>
              <p className="text-xs text-gray-500">
                {formatDisplayTime(booking.start_time)} - {formatDisplayTime(booking.end_time)}
              </p>
            </div>
          </div>
        </div>

        {/* Special Instructions */}
        {booking.special_instructions && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-start space-x-2">
              <MessageCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">Special Instructions:</p>
                <p className="text-sm text-yellow-700">{booking.special_instructions}</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {showActions && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDetails(booking)}
            >
              View Details
            </Button>
            
            {statusActions.length > 0 && (
              <div className="flex items-center space-x-2">
                {statusActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Button
                      key={action.status}
                      variant={action.variant}
                      size="sm"
                      onClick={() => onUpdateStatus(booking.id, action.status)}
                      className="flex items-center space-x-1"
                    >
                      <Icon className="w-4 h-4" />
                      <span>{action.label}</span>
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}