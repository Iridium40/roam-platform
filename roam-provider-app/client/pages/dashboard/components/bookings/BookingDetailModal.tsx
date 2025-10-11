import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import BookingStatusIndicator from "@/components/BookingStatusIndicator";
import ConversationChat from "@/components/ConversationChat";
import { useProviderAuth } from "@/contexts/auth/ProviderAuthContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
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
  UserCheck,
} from "lucide-react";

interface BookingDetailModalProps {
  selectedBooking: any;
  setSelectedBooking: (booking: any) => void;
  formatDisplayTime: (time: string) => string;
  onBookingUpdate?: () => void;
}

export default function BookingDetailModal({
  selectedBooking,
  setSelectedBooking,
  formatDisplayTime,
  onBookingUpdate,
}: BookingDetailModalProps) {
  const { provider: user, isOwner, isDispatcher } = useProviderAuth();
  const { toast } = useToast();
  const [availableProviders, setAvailableProviders] = useState<any[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [loadingProviders, setLoadingProviders] = useState(false);

  // Check if current user can assign bookings (owners and dispatchers only)
  const canAssignBookings = isOwner || isDispatcher;

  // Check if booking can be reassigned (only pending, confirmed, or in_progress bookings)
  const canReassignBooking = selectedBooking && 
    ['pending', 'confirmed', 'in_progress'].includes(selectedBooking.booking_status);

  // Load available providers when modal opens and user can assign
  useEffect(() => {
    if (selectedBooking && canAssignBookings) {
      loadAvailableProviders();
    }
  }, [selectedBooking, canAssignBookings]);

  const loadAvailableProviders = async () => {
    if (!selectedBooking?.business_id) return;

    setLoadingProviders(true);
    try {
      // Load providers who are active for bookings and are staff (not owners/dispatchers)
      const { data, error } = await supabase
        .from('providers')
        .select('id, first_name, last_name, provider_role, active_for_bookings')
        .eq('business_id', selectedBooking.business_id)
        .eq('active_for_bookings', true)
        .eq('is_active', true)
        .in('provider_role', ['provider']) // Only actual service providers, not owners/dispatchers
        .order('first_name');

      if (error) throw error;
      setAvailableProviders(data || []);
    } catch (error) {
      console.error('Error loading available providers:', error);
      toast({
        title: "Error",
        description: "Failed to load available providers",
        variant: "destructive",
      });
    } finally {
      setLoadingProviders(false);
    }
  };

  const handleAssignProvider = async (providerId: string) => {
    if (!selectedBooking?.id) return;

    setIsAssigning(true);
    try {
      const { error } = await (supabase as any)
        .from('bookings')
        .update({ 
          provider_id: providerId === 'unassigned' ? null : providerId
        })
        .eq('id', selectedBooking.id);

      if (error) throw error;

      // Update local booking data
      const updatedBooking = {
        ...selectedBooking,
        provider_id: providerId === 'unassigned' ? null : providerId,
        providers: providerId === 'unassigned' ? null : 
          availableProviders.find(p => p.id === providerId)
      };
      setSelectedBooking(updatedBooking);

      toast({
        title: "Success",
        description: providerId === 'unassigned' 
          ? "Booking unassigned successfully" 
          : "Provider assigned successfully",
      });

      // Notify parent component to refresh data
      onBookingUpdate?.();
    } catch (error) {
      console.error('Error assigning provider:', error);
      toast({
        title: "Error",
        description: "Failed to assign provider. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAssigning(false);
    }
  };

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
          {/* Provider Assignment (Owners and Dispatchers Only) */}
          {canAssignBookings && (
            <div className="space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Provider Assignment
              </h3>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Current Assignment:</span>
                    <Badge variant={selectedBooking.providers ? "default" : "secondary"}>
                      {selectedBooking.providers 
                        ? `${selectedBooking.providers.first_name} ${selectedBooking.providers.last_name}`
                        : "Unassigned"
                      }
                    </Badge>
                  </div>
                  
                  {canReassignBooking && (
                    <div className="space-y-2">
                      <Label htmlFor="provider-assignment">Assign to Provider:</Label>
                      <div className="flex gap-2">
                        <Select
                          onValueChange={handleAssignProvider}
                          disabled={isAssigning || loadingProviders}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder={
                              loadingProviders ? "Loading providers..." : "Select a provider"
                            } />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {availableProviders.map((provider) => (
                              <SelectItem key={provider.id} value={provider.id}>
                                {provider.first_name} {provider.last_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {isAssigning && (
                          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        )}
                      </div>
                      {availableProviders.length === 0 && !loadingProviders && (
                        <p className="text-sm text-yellow-600">
                          No active providers available for assignment
                        </p>
                      )}
                    </div>
                  )}
                  
                  {!canReassignBooking && (
                    <p className="text-sm text-gray-600">
                      Cannot reassign - booking is {selectedBooking.booking_status}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Chat Actions */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Communication</h3>
            <div className="flex gap-2">
              <Button
                onClick={() => setIsChatOpen(true)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <MessageCircle className="h-4 w-4" />
                Open Chat
              </Button>
              {selectedBooking.customer_profiles?.phone && (
                <Button
                  onClick={() => window.open(`tel:${selectedBooking.customer_profiles.phone}`)}
                  variant="outline"
                  size="sm"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Call
                </Button>
              )}
              {selectedBooking.customer_profiles?.email && (
                <Button
                  onClick={() => window.open(`mailto:${selectedBooking.customer_profiles.email}`)}
                  variant="outline"
                  size="sm"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Chat Modal */}
      <ConversationChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        booking={selectedBooking}
      />
    </Dialog>
  );
}