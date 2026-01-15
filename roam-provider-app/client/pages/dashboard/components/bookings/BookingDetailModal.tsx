import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Phone,
  Mail,
  UserCheck,
  User,
  AlertCircle,
  DollarSign,
  Heart,
  Star,
  Sparkles,
  Timer,
  X,
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
          .select('id, first_name, last_name, provider_role')
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
        // Load providers who can perform this booking's service (bookability is derived from assigned services)
        const bookingServiceId = selectedBooking?.service_id || selectedBooking?.services?.id;

        const { data: providers, error } = await supabase
          .from('providers')
          .select('id, first_name, last_name, provider_role')
          .eq('business_id', selectedBooking.business_id)
          .eq('is_active', true)
          .in('provider_role', ['owner', 'provider'])
          .order('first_name');

        if (error) throw error;

        const allProviders = providers || [];
        if (!bookingServiceId || allProviders.length === 0) {
          // Fallback: if service id isn't available, show all providers (owners/providers)
          setAvailableProviders(allProviders);
          return;
        }

        const providerIds = allProviders.map((p: any) => p.id).filter(Boolean);
        const { data: providerServices, error: psError } = await supabase
          .from('provider_services')
          .select('provider_id')
          .in('provider_id', providerIds)
          .eq('service_id', bookingServiceId)
          .eq('is_active', true);

        if (psError) throw psError;

        const eligibleProviderIds = new Set((providerServices || []).map((r: any) => r.provider_id));
        setAvailableProviders(allProviders.filter((p: any) => eligibleProviderIds.has(p.id)));
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

  // Format currency helper
  const formatCurrency = (amount: number | string | null | undefined): string => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (numAmount == null || isNaN(numAmount)) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(numAmount);
  };

  // Format date helper
  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Get tip status display
  const getTipStatusBadge = (status: string | null | undefined) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Received</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
      case 'requested':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Requested</Badge>;
      case 'declined':
        return <Badge className="bg-gray-100 text-gray-600 border-gray-200">Declined</Badge>;
      default:
        return <Badge variant="outline" className="text-gray-500">No Tip</Badge>;
    }
  };

  // Check if booking is completed
  const isCompleted = selectedBooking.booking_status === 'completed';

  // Get provider info (handle both array and object formats)
  const provider = Array.isArray(selectedBooking.providers) 
    ? selectedBooking.providers[0] 
    : selectedBooking.providers;

  // Format location
  const getFormattedLocation = () => {
    if (selectedBooking.delivery_type === 'virtual') {
      return 'Virtual';
    }
    if (selectedBooking.customer_locations) {
      const loc = selectedBooking.customer_locations;
      const parts = [
        loc.street_address || loc.address_line1,
        loc.unit_number,
        loc.city,
        loc.state,
        loc.zip_code || loc.postal_code
      ].filter(Boolean);
      return parts.join(', ') || 'Customer location';
    }
    if (selectedBooking.business_locations) {
      const loc = selectedBooking.business_locations;
      const parts = [
        loc.location_name,
        loc.address_line1,
        loc.city,
        loc.state,
        loc.postal_code
      ].filter(Boolean);
      return parts.join(', ') || 'Business location';
    }
    return 'Location not specified';
  };

  return (
    <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
      <DialogContent className="max-w-lg sm:max-w-xl md:max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header Section */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 sm:p-6 rounded-t-lg">
          {/* Close Button */}
          <button
            onClick={() => setSelectedBooking(null)}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 text-white/80 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pr-8">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 flex-shrink-0" />
                <span className="text-xs font-medium text-blue-100 uppercase tracking-wide">
                  {selectedBooking.booking_reference || `#${selectedBooking.id?.slice(-8)}`}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold truncate">
                {selectedBooking.services?.name || "Service"}
              </h2>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm text-blue-100">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(selectedBooking.booking_date)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDisplayTime(selectedBooking.start_time)}
                </span>
              </div>
            </div>
            <div className="flex-shrink-0">
              <BookingStatusIndicator status={selectedBooking.booking_status} />
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          {/* Customer Card */}
          <Card className="border-0 shadow-sm bg-gray-50/50">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <User className="h-4 w-4 text-blue-600" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-md">
                  {selectedBooking.customer_profiles?.image_url ? (
                    <img
                      src={selectedBooking.customer_profiles.image_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-semibold text-lg">
                      {selectedBooking.guest_name?.[0] ||
                       selectedBooking.customer_profiles?.first_name?.[0] || 
                       selectedBooking.customer_profiles?.last_name?.[0] || 
                       <User className="w-6 h-6" />}
                    </span>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">
                    {selectedBooking.guest_name
                      ? selectedBooking.guest_name
                      : selectedBooking.customer_profiles
                        ? `${selectedBooking.customer_profiles.first_name || ""} ${selectedBooking.customer_profiles.last_name || ""}`.trim() || "Unknown Customer"
                        : "Unknown Customer"
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Service & Schedule Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Service Details */}
            <Card className="border-0 shadow-sm bg-gray-50/50">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Timer className="h-4 w-4 text-blue-600" />
                  Service Details
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0 space-y-2">
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Duration</span>
                  <p className="font-medium text-gray-900">
                    {selectedBooking.services?.duration_minutes 
                      ? `${selectedBooking.services.duration_minutes} minutes`
                      : "Not specified"
                    }
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Time</span>
                  <p className="font-medium text-gray-900">
                    {formatDisplayTime(selectedBooking.start_time)}
                    {selectedBooking.end_time && ` - ${formatDisplayTime(selectedBooking.end_time)}`}
                  </p>
                </div>
                {selectedBooking.total_amount && (
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Total</span>
                    <p className="font-semibold text-green-600">
                      {formatCurrency(selectedBooking.total_amount)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Location */}
            <Card className="border-0 shadow-sm bg-gray-50/50">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  Location
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                <p className="text-sm text-gray-900 leading-relaxed">
                  {getFormattedLocation()}
                </p>
                {selectedBooking.customer_locations?.access_instructions && (
                  <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                    <span className="font-medium">Access: </span>
                    {selectedBooking.customer_locations.access_instructions}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Assigned Provider */}
          <Card className="border-0 shadow-sm bg-gray-50/50">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-blue-600" />
                Assigned Provider
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              {!provider && !selectedBooking.provider_id ? (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                  <p className="text-sm text-amber-800 font-medium">No provider assigned</p>
                </div>
              ) : provider ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-semibold shadow-sm">
                    {provider.first_name?.[0] || provider.last_name?.[0] || 'P'}
                  </div>
                  <p className="font-medium text-gray-900">
                    {provider.first_name} {provider.last_name}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Provider details not available</p>
              )}
            </CardContent>
          </Card>

          {/* Provider Assignment Section (Owners and Dispatchers Only) */}
          {canAssignBookings && canAssignBooking && (
            <Card className="border border-blue-200 shadow-sm bg-blue-50/50">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold text-blue-700 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {isUnassigned ? "Assign Provider" : "Reassign Provider"}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0 space-y-3">
                {isIndependentBusiness && !isUnassigned && (
                  <p className="text-xs text-gray-600 bg-white p-2 rounded border">
                    <span className="font-medium">Independent Business:</span> Provider reassignment is automatic.
                  </p>
                )}
                
                <div className="flex gap-2">
                  <Select
                    value={currentProviderId || 'unassigned'}
                    onValueChange={handleAssignProvider}
                    disabled={isAssigning || loadingProviders}
                  >
                    <SelectTrigger className="flex-1 bg-white">
                      <SelectValue placeholder={
                        loadingProviders ? "Loading..." : "Select provider"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {availableProviders.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.first_name} {p.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isAssigning && (
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  )}
                </div>
                
                {isUnassigned && (
                  <p className="text-xs text-blue-700 bg-white p-2 rounded border border-blue-200">
                    ⚠️ Please assign a provider before accepting this booking.
                  </p>
                )}
                
                {availableProviders.length === 0 && !loadingProviders && (
                  <p className="text-xs text-amber-700">No active providers available</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Special Instructions */}
          {selectedBooking.special_instructions && (
            <Card className="border-0 shadow-sm bg-amber-50/50">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold text-amber-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Special Instructions
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                <p className="text-sm text-gray-800 leading-relaxed">
                  {selectedBooking.special_instructions}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Tip & Review Section - Only show for completed bookings */}
          {isCompleted && (
            <Card className="border border-green-200 shadow-sm bg-gradient-to-br from-green-50 to-emerald-50">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold text-green-700 flex items-center gap-2">
                  <Heart className="h-4 w-4 fill-green-600 text-green-600" />
                  Tip & Appreciation
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Tip Info */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 uppercase tracking-wide">Tip Status</span>
                      {getTipStatusBadge(selectedBooking.tip_status)}
                    </div>
                    
                    {selectedBooking.tip_amount > 0 && (
                      <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-green-200">
                        <DollarSign className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="text-lg font-bold text-green-600">
                            {formatCurrency(selectedBooking.tip_amount)}
                          </p>
                          <p className="text-xs text-gray-500">Tip received</p>
                        </div>
                      </div>
                    )}
                    
                    {!selectedBooking.tip_amount && selectedBooking.tip_eligible && (
                      <p className="text-xs text-gray-500 italic">
                        Tip eligible - awaiting customer
                      </p>
                    )}
                  </div>

                  {/* Review/Rating Info */}
                  <div className="space-y-2">
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Customer Feedback</span>
                    
                    {selectedBooking.customer_rating ? (
                      <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-green-200">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star 
                              key={star} 
                              className={`h-4 w-4 ${
                                star <= selectedBooking.customer_rating 
                                  ? 'text-yellow-400 fill-yellow-400' 
                                  : 'text-gray-300'
                              }`} 
                            />
                          ))}
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          {selectedBooking.customer_rating}/5
                        </span>
                      </div>
                    ) : (
                      <div className="p-3 bg-white rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-500 italic flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 text-gray-400" />
                          No rating yet
                        </p>
                      </div>
                    )}
                    
                    {selectedBooking.customer_review && (
                      <div className="p-3 bg-white rounded-lg border border-green-200 mt-2">
                        <p className="text-sm text-gray-700 italic">
                          "{selectedBooking.customer_review}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}