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
import { useProviderAuth } from "@/contexts/auth/ProviderAuthContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Hash,
  Phone,
  Mail,
  UserCheck,
  User,
  AlertCircle,
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
  const [loadingProviders, setLoadingProviders] = useState(false);

  // Check if current user can assign bookings (owners and dispatchers only)
  const canAssignBookings = isOwner || isDispatcher;

  // Check if business is independent (single provider, assignment locked)
  const isIndependentBusiness = selectedBooking?.business_profiles?.business_type === 'independent';

  // Check if booking can be assigned/reassigned
  // Can assign if: booking is pending, confirmed, or in_progress AND not independent business
  // Can also assign if booking has no provider assigned (unassigned bookings) - even for independent businesses
  const currentProviderId = selectedBooking?.provider_id || 
    (Array.isArray(selectedBooking?.providers) ? selectedBooking?.providers[0]?.id : selectedBooking?.providers?.id);
  const isUnassigned = !currentProviderId;
  
  // Can reassign if booking has a provider and is not independent business
  const canReassignBooking = selectedBooking && 
    currentProviderId && // Has a provider assigned
    ['pending', 'confirmed', 'in_progress'].includes(selectedBooking.booking_status) &&
    !isIndependentBusiness;
  
  // Can assign if:
  // 1. Booking is unassigned (regardless of business type) OR
  // 2. Booking can be reassigned (has provider and not independent business)
  const canAssignBooking = (isUnassigned && selectedBooking && 
    ['pending', 'confirmed', 'in_progress'].includes(selectedBooking.booking_status)) ||
    canReassignBooking;

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
      // Check if business is independent
      const businessIsIndependent = selectedBooking?.business_profiles?.business_type === 'independent';
      
      // Check if booking is unassigned
      const currentProviderId = selectedBooking?.provider_id || 
        (Array.isArray(selectedBooking?.providers) ? selectedBooking?.providers[0]?.id : selectedBooking?.providers?.id);
      const bookingIsUnassigned = !currentProviderId;
      
      // For independent businesses, only load the owner
      if (businessIsIndependent) {
        const { data, error } = await supabase
          .from('providers')
          .select('id, first_name, last_name, provider_role, active_for_bookings')
          .eq('business_id', selectedBooking.business_id)
          .eq('provider_role', 'owner')
          .eq('is_active', true)
          .maybeSingle();

        if (error) throw error;
        setAvailableProviders(data ? [data] : []);
        
        // Auto-assign to owner if booking is unassigned
        if (bookingIsUnassigned && data && canAssignBooking) {
          // Use setTimeout to avoid calling during render
          setTimeout(() => {
            handleAssignProvider(data.id);
          }, 100);
        }
      } else {
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
      }
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
      const assignedProvider = providerId === 'unassigned' 
        ? null 
        : availableProviders.find(p => p.id === providerId);
      
      const updatedBooking = {
        ...selectedBooking,
        provider_id: providerId === 'unassigned' ? null : providerId,
        providers: assignedProvider
      };
      setSelectedBooking(updatedBooking);

      toast({
        title: "Success",
        description: providerId === 'unassigned' 
          ? "Booking unassigned successfully" 
          : "Provider assigned successfully",
      });

      // Close the popup after successful assignment
      setSelectedBooking(null);
      
      // Notify parent component to refresh data in background
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
          <DialogTitle className="text-xl font-semibold">
            Booking Details
          </DialogTitle>
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
                <span>{selectedBooking.booking_date}</span>
                <span>{formatDisplayTime(selectedBooking.start_time)}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <BookingStatusIndicator status={selectedBooking.booking_status} />
            </div>
          </div>

          {/* Customer Information */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Customer Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Customer</span>
                </div>
                <div className="ml-6">
                  <div className="flex items-center space-x-3">
                    {/* Customer Avatar */}
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {selectedBooking.customer_profiles?.image_url ? (
                        <img
                          src={selectedBooking.customer_profiles.image_url}
                          alt={`${selectedBooking.customer_profiles.first_name || ""} ${selectedBooking.customer_profiles.last_name || ""}`}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-full h-full bg-blue-600 rounded-lg flex items-center justify-center">
                          {selectedBooking.customer_profiles?.first_name?.[0] || selectedBooking.customer_profiles?.last_name?.[0] ? (
                            <span className="text-white font-semibold text-lg">
                              {selectedBooking.customer_profiles.first_name[0] || selectedBooking.customer_profiles.last_name[0]}
                            </span>
                          ) : (
                            <User className="w-6 h-6 text-white" />
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {selectedBooking.customer_profiles
                          ? `${selectedBooking.customer_profiles.first_name || ""} ${selectedBooking.customer_profiles.last_name || ""}`
                          : "Unknown Customer"
                        }
                      </p>
                    </div>
                  </div>
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

          {/* Assigned Provider */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Assigned Provider</h3>
            {(() => {
              // Handle both array and object formats from Supabase joins
              const provider = Array.isArray(selectedBooking.providers) 
                ? selectedBooking.providers[0] 
                : selectedBooking.providers;
              
              if (!provider && !selectedBooking.provider_id) {
                return (
                  <div className="flex items-center space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <p className="text-sm text-yellow-800 font-medium">Unassigned - No provider assigned to this booking</p>
                  </div>
                );
              }
              
              if (!provider) {
                return (
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <p className="text-sm text-gray-600">Provider ID: {selectedBooking.provider_id} (Details not loaded)</p>
                  </div>
                );
              }
              
              return (
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  <p className="text-sm">{provider.first_name} {provider.last_name}</p>
                </div>
              );
            })()}
          </div>

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
                    {(() => {
                      // Handle both array and object formats from Supabase joins
                      const provider = Array.isArray(selectedBooking.providers) 
                        ? selectedBooking.providers[0] 
                        : selectedBooking.providers;
                      
                      return (
                        <Badge variant={provider ? "default" : "secondary"}>
                          {provider 
                            ? `${provider.first_name} ${provider.last_name}`
                            : "Unassigned"
                          }
                        </Badge>
                      );
                    })()}
                  </div>
                  
                  {isIndependentBusiness && !isUnassigned && (
                    <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded border border-gray-200">
                      <span className="font-medium">Independent Business:</span> Provider reassignment is automatic and cannot be changed.
                    </div>
                  )}
                  
                  {canAssignBooking && (
                    <div className="space-y-2">
                      <Label htmlFor="provider-assignment">
                        {isUnassigned ? "Assign to Provider:" : "Reassign to Provider:"}
                      </Label>
                      <div className="flex gap-2">
                        <Select
                          value={currentProviderId || 'unassigned'}
                          onValueChange={handleAssignProvider}
                          disabled={isAssigning || loadingProviders}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder={
                              loadingProviders ? "Loading providers..." : isUnassigned ? "Select a provider" : "Change provider"
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
                      {isUnassigned && (
                        <p className="text-sm text-blue-600 bg-blue-50 p-2 rounded border border-blue-200">
                          ⚠️ This booking is unassigned. Please assign a provider before accepting.
                        </p>
                      )}
                      {availableProviders.length === 0 && !loadingProviders && (
                        <p className="text-sm text-yellow-600">
                          No active providers available for assignment
                        </p>
                      )}
                    </div>
                  )}
                  
                  {!canAssignBooking && !isIndependentBusiness && (
                    <p className="text-sm text-gray-600">
                      Cannot assign/reassign - booking is {selectedBooking.booking_status}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

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
                    {selectedBooking.booking_date}
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

        </div>
      </DialogContent>
    </Dialog>
  );
}