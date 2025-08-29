import React, { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import BookingStatusIndicator from "@/components/BookingStatusIndicator";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  MessageCircle,
  Hash,
  Search,
  Filter,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface BookingsTabProps {
  providerData: any;
  business: any;
}

export default function BookingsTab({
  providerData,
  business,
}: BookingsTabProps) {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<any[]>([]);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [allProviders, setAllProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");

  // Filter bookings based on search and status
  const filteredBookings = useMemo(() => {
    let filtered = bookings;

    if (selectedStatusFilter !== "all") {
      filtered = filtered.filter(booking => booking.booking_status === selectedStatusFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(booking =>
        booking.booking_reference?.toLowerCase().includes(query) ||
        booking.customer_profiles?.first_name?.toLowerCase().includes(query) ||
        booking.customer_profiles?.last_name?.toLowerCase().includes(query) ||
        booking.customer_profiles?.email?.toLowerCase().includes(query) ||
        booking.guest_name?.toLowerCase().includes(query) ||
        booking.services?.name?.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => {
      const dateA = new Date(`${a.booking_date} ${a.start_time}`);
      const dateB = new Date(`${b.booking_date} ${b.start_time}`);
      return dateA.getTime() - dateB.getTime();
    });
  }, [bookings, searchQuery, selectedStatusFilter]);

  const getStatusBadge = (status: string) => {
    const configs = {
      pending: { label: "Pending", className: "bg-orange-100 text-orange-800 border-orange-300" },
      confirmed: { label: "Confirmed", className: "bg-green-100 text-green-800 border-green-300" },
      in_progress: { label: "In Progress", className: "bg-blue-100 text-blue-800 border-blue-300" },
      completed: { label: "Completed", className: "bg-emerald-100 text-emerald-800 border-emerald-300" },
      cancelled: { label: "Cancelled", className: "bg-red-100 text-red-800 border-red-300" },
      declined: { label: "Declined", className: "bg-gray-100 text-gray-800 border-gray-300" },
      no_show: { label: "No Show", className: "bg-yellow-100 text-yellow-800 border-yellow-300" },
    };
    return configs[status] || { label: status, className: "bg-gray-100 text-gray-800 border-gray-300" };
  };

  const formatDisplayTime = (time: string) => {
    if (!time) return "";
    return new Date(`2000-01-01T${time}`).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Booking Management Functions
  const loadBookings = async () => {
    if (!providerData?.business_id) return;

    try {
      setLoading(true);
      
      // Load bookings with all related data
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          services (*),
          providers (*),
          customer_profiles (*),
          business_locations (*),
          customer_locations (*)
        `)
        .eq('business_id', providerData.business_id)
        .order('booking_date', { ascending: true });

      if (bookingsError) throw bookingsError;
      setBookings(bookingsData || []);

      // Load staff members for assignment
      const { data: staffData, error: staffError } = await supabase
        .from('providers')
        .select('*')
        .eq('business_id', providerData.business_id);

      if (staffError) throw staffError;
      setStaffMembers(staffData || []);

      // Set available providers (only those with provider_role = "provider")
      const availableProviders = staffData?.filter(provider => provider.provider_role === "provider") || [];
      setAllProviders(availableProviders);

    } catch (error: any) {
      console.error('Error loading bookings:', error);
      toast({
        title: "Error",
        description: "Failed to load bookings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ 
          booking_status: 'confirmed',
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: "Booking Accepted",
        description: "The booking has been confirmed successfully.",
        variant: "default",
      });

      // Reload bookings
      await loadBookings();
    } catch (error) {
      console.error("Error accepting booking:", error);
      toast({
        title: "Error",
        description: "Failed to accept booking. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeclineBooking = async (bookingId: string, reason?: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ 
          booking_status: 'declined',
          decline_reason: reason || 'Provider declined',
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: "Booking Declined",
        description: "The booking has been declined.",
        variant: "default",
      });

      // Reload bookings
      await loadBookings();
    } catch (error) {
      console.error("Error declining booking:", error);
      toast({
        title: "Error",
        description: "Failed to decline booking. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAssignProvider = async (bookingId: string, providerId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ 
          provider_id: providerId === 'unassigned' ? null : providerId
        })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: "Provider Assigned",
        description: "The booking has been assigned successfully.",
        variant: "default",
      });

      // Reload bookings
      await loadBookings();
    } catch (error) {
      console.error("Error assigning provider:", error);
      toast({
        title: "Error",
        description: "Failed to assign provider. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getMapUrl = (booking: any) => {
    let address = "";

    if (booking.customer_locations) {
      address = `${booking.customer_locations.location_name || ""} ${booking.customer_locations.street_address || ""}${booking.customer_locations.unit_number ? `, ${booking.customer_locations.unit_number}` : ""}, ${booking.customer_locations.city || ""}, ${booking.customer_locations.state || ""}`;
    } else if (booking.business_locations) {
      address = `${booking.business_locations.location_name || ""} ${booking.business_locations.address_line1 || ""}, ${booking.business_locations.city || ""}, ${booking.business_locations.state || ""}`;
    }

    if (!address.trim()) return null;

    const encodedAddress = encodeURIComponent(address.trim());
    return `https://maps.google.com/maps?q=${encodedAddress}`;
  };

  // Load bookings when component mounts
  useEffect(() => {
    loadBookings();
  }, [providerData, business]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
        <p className="text-sm text-gray-600">Manage and track all your bookings</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search bookings by customer, service, or reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="sm:w-48">
          <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
              <SelectItem value="no_show">No Show</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bookings List */}
      <div className="space-y-4">
        {filteredBookings.length === 0 ? (
          <Card className="p-8">
            <div className="text-center">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Bookings Found</h3>
              <p className="text-gray-600">
                {searchQuery || selectedStatusFilter !== "all" 
                  ? "Try adjusting your search or filter criteria."
                  : "No bookings have been created yet."}
              </p>
            </div>
          </Card>
        ) : (
          filteredBookings.map((booking) => (
            <Card key={booking.id} className="overflow-hidden">
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
                  <div className="flex items-center justify-between sm:justify-end space-x-2 sm:space-x-3 flex-shrink-0">
                    <BookingStatusIndicator status={booking.booking_status} size="sm" showProgress={false} />
                    <div className="text-right">
                      <p className="text-base sm:text-lg font-bold text-gray-900">
                        ${booking.total_amount || "115"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer and Location Details */}
              <div className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 space-y-2 sm:space-y-0">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">
                      Customer: {booking.customer_profiles?.first_name && booking.customer_profiles?.last_name
                        ? `${booking.customer_profiles.first_name} ${booking.customer_profiles.last_name}`
                        : booking.guest_name || "Alan Smith"}
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-gray-600">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">
                        {booking.customer_location_id ? "Customer Location" : "Business Location"}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {booking.customer_locations 
                        ? `${booking.customer_locations.location_name || ""} ${booking.customer_locations.street_address || ""}${booking.customer_locations.unit_number ? `, ${booking.customer_locations.unit_number}` : ""}, ${booking.customer_locations.city || ""}, ${booking.customer_locations.state || ""}`
                        : booking.business_locations
                        ? `${booking.business_locations.location_name || ""} ${booking.business_locations.address_line1 || ""}, ${booking.business_locations.city || ""}, ${booking.business_locations.state || ""}`
                        : "Location not specified"
                      }
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 sm:h-7 px-2 text-xs text-blue-600 border-blue-200 hover:bg-blue-50 whitespace-nowrap"
                      onClick={() => onOpenBookingDetails(booking)}
                    >
                      <span className="hidden sm:inline">More Details</span>
                      <span className="sm:hidden">Details</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 sm:h-7 sm:w-7 p-0 text-blue-600"
                      onClick={() => onOpenMessageFromBooking(booking.id, booking.customer_profiles?.id || booking.guest_name)}
                    >
                      <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                    </Button>
                  </div>
                </div>

                {/* Provider Assignment Row */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 bg-gray-50 p-2 rounded space-y-2 sm:space-y-0">
                  <div className="flex items-center space-x-2">
                    <Users className="w-3 h-3 text-gray-600" />
                    <span className="text-xs font-medium text-gray-700">
                      {providerData.provider_role === "provider" ? "Assigned Provider:" : "Provider:"}
                    </span>
                    {providerData.provider_role !== "provider" && 
                     !["pending", "confirmed"].includes(booking.booking_status) && (
                      <span className="text-xs text-gray-500">
                        (Can't reassign - booking is {booking.booking_status})
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className="text-xs font-medium text-gray-900">
                      {booking.providers 
                        ? `${booking.providers.first_name} ${booking.providers.last_name}`
                        : "Unassigned"
                      }
                    </div>
                    <Select
                      value={booking.providers?.id || "unassigned"}
                      disabled={
                        providerData.provider_role === "provider" || 
                        (providerData.provider_role !== "provider" && 
                         !["pending", "confirmed"].includes(booking.booking_status))
                      }
                      onValueChange={(value) => handleAssignProvider(booking.id, value)}
                    >
                      <SelectTrigger className="w-full sm:w-32 h-7 text-xs">
                        <SelectValue placeholder={
                          providerData.provider_role === "provider" 
                            ? (booking.providers 
                                ? `${booking.providers.first_name} ${booking.providers.last_name}`
                                : "Unassigned")
                            : !["pending", "confirmed"].includes(booking.booking_status)
                            ? `Locked (${booking.booking_status})`
                            : (booking.providers 
                                ? `${booking.providers.first_name} ${booking.providers.last_name}`
                                : "Unassigned")
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {providerData.provider_role === "provider" ? (
                          <SelectItem key={providerData.id} value={providerData.id}>
                            {providerData.first_name} {providerData.last_name}
                          </SelectItem>
                        ) : (
                          allProviders.map((provider) => (
                            <SelectItem key={provider.id} value={provider.id}>
                              {provider.first_name} {provider.last_name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Actions Row - Only for pending bookings */}
                {booking.booking_status === "pending" && (
                  <div className="flex items-center justify-center space-x-2 pt-2 border-t">
                    <Button
                      size="sm"
                      onClick={() => handleAcceptBooking(booking.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-1 text-xs h-6 sm:h-7 flex-1 sm:flex-none"
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeclineBooking(booking.id)}
                      className="border-red-300 text-red-600 hover:bg-red-50 px-3 sm:px-4 py-1 text-xs h-6 sm:h-7 flex-1 sm:flex-none"
                    >
                      Decline
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
