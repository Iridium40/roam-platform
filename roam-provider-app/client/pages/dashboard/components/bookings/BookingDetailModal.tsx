import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  DollarSign,
  Phone,
  Mail,
  X,
} from "lucide-react";

interface BookingDetailModalProps {
  selectedBooking: any;
  setSelectedBooking: (booking: any) => void;
  formatDisplayTime: (time: string) => string;
}

export default function BookingDetailModal({
  selectedBooking,
  setSelectedBooking,
  formatDisplayTime,
}: BookingDetailModalProps) {
  if (!selectedBooking) return null;

  return (
    <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              Booking Details
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedBooking(null)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Booking Header */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedBooking.services?.name || "Service"}
              </h3>
              <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                <span className="flex items-center space-x-1">
                  <Hash className="w-3 h-3" />
                  <span>{selectedBooking.booking_reference || `BK${Math.random().toString(36).substr(2, 4).toUpperCase()}`}</span>
                </span>
                <span>{new Date(selectedBooking.booking_date).toLocaleDateString()}</span>
                <span>{formatDisplayTime(selectedBooking.start_time)}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <BookingStatusIndicator status={selectedBooking.booking_status} />
              {selectedBooking.total_amount && (
                <Badge variant="outline" className="flex items-center space-x-1">
                  <DollarSign className="w-3 h-3" />
                  <span>${selectedBooking.total_amount}</span>
                </Badge>
              )}
            </div>
          </div>

          {/* Customer Information */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Customer Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Name</span>
                </div>
                <div className="ml-6">
                  <p className="text-sm">
                    {selectedBooking.customer_profiles
                      ? `${selectedBooking.customer_profiles.first_name || ""} ${selectedBooking.customer_profiles.last_name || ""}`
                      : "Unknown Customer"
                    }
                  </p>
                </div>
              </div>

              {selectedBooking.customer_profiles?.email && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Email</span>
                  </div>
                  <div className="ml-6">
                    <p className="text-sm">{selectedBooking.customer_profiles.email}</p>
                  </div>
                </div>
              )}

              {selectedBooking.customer_profiles?.phone && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Phone</span>
                  </div>
                  <div className="ml-6">
                    <p className="text-sm">{selectedBooking.customer_profiles.phone}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Service Details */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Service Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Date & Time</span>
                </div>
                <div className="ml-6">
                  <p className="text-sm">
                    {new Date(selectedBooking.booking_date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                  <p className="text-sm text-gray-600">
                    {formatDisplayTime(selectedBooking.start_time)} - {formatDisplayTime(selectedBooking.end_time)}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Duration</span>
                </div>
                <div className="ml-6">
                  <p className="text-sm">
                    {selectedBooking.services?.duration_minutes 
                      ? `${selectedBooking.services.duration_minutes} minutes`
                      : "Duration not specified"
                    }
                  </p>
                </div>
              </div>

              {selectedBooking.services?.description && (
                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center space-x-2">
                    <MessageCircle className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Service Description</span>
                  </div>
                  <div className="ml-6">
                    <p className="text-sm text-gray-600">{selectedBooking.services.description}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Location Information */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Location</h3>
            <div className="flex items-start space-x-2">
              <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
              <div>
                <p className="text-sm">
                  {selectedBooking.customer_locations
                    ? `${selectedBooking.customer_locations.address_line1 || ""} ${selectedBooking.customer_locations.address_line2 || ""}, ${selectedBooking.customer_locations.city || ""}, ${selectedBooking.customer_locations.state || ""} ${selectedBooking.customer_locations.postal_code || ""}`
                    : selectedBooking.business_locations
                    ? `${selectedBooking.business_locations.location_name || ""} ${selectedBooking.business_locations.address_line1 || ""}, ${selectedBooking.business_locations.city || ""}, ${selectedBooking.business_locations.state || ""}`
                    : "Location not specified"
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Special Instructions */}
          {selectedBooking.special_instructions && (
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Special Instructions</h3>
              <p className="text-sm bg-gray-50 p-3 rounded-md">{selectedBooking.special_instructions}</p>
            </div>
          )}

          {/* Assigned Provider */}
          {selectedBooking.providers && (
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Assigned Provider</h3>
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-gray-500" />
                <p className="text-sm">{selectedBooking.providers.first_name} {selectedBooking.providers.last_name}</p>
              </div>
            </div>
          )}

          {/* Pricing Information */}
          {(selectedBooking.total_amount || selectedBooking.services?.min_price || selectedBooking.services?.max_price) && (
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Pricing</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedBooking.total_amount && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">Total Amount</span>
                    </div>
                    <div className="ml-6">
                      <p className="text-sm font-semibold text-green-600">${selectedBooking.total_amount}</p>
                    </div>
                  </div>
                )}

                {(selectedBooking.services?.min_price || selectedBooking.services?.max_price) && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">Service Price Range</span>
                    </div>
                    <div className="ml-6">
                      <p className="text-sm">
                        ${selectedBooking.services.min_price || 0} - ${selectedBooking.services.max_price || 0}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}