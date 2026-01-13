import React, { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import BookingStatusIndicator from "@/components/BookingStatusIndicator";
import { Input } from "@/components/ui/input";
import { getDeliveryTypeLabel } from '@/utils/deliveryTypeHelpers';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  ChevronLeft,
  ChevronRight,
  DollarSign,
  TrendingUp,
  Activity,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface BookingsTabProps {
  providerData: any;
  business: any;
  providerRole?: string; // 'owner', 'dispatcher', or 'provider'
}

export default function BookingsTab({
  providerData,
  business,
  providerRole,
}: BookingsTabProps) {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<any[]>([]);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [allProviders, setAllProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Determine if user is owner (show full stats) or dispatcher/provider (hide stats)
  const role = providerRole || providerData?.provider_role;
  const isOwner = role === 'owner';
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "week" | "month">("list");
  const [activeTab, setActiveTab] = useState("present");
  const [presentPage, setPresentPage] = useState(1);
  const [futurePage, setFuturePage] = useState(1);
  const [pastPage, setPastPage] = useState(1);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [isBookingDetailsOpen, setIsBookingDetailsOpen] = useState(false);
  const [businessServices, setBusinessServices] = useState<any[]>([]);
  const pageSize = 20;

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

    // Filter for unassigned bookings only
    if (unassignedOnly) {
      filtered = filtered.filter(booking => !booking.provider_id);
    }

    // Filter for unread bookings only (pending status as proxy for unread)
    if (unreadOnly) {
      filtered = filtered.filter(booking => booking.booking_status === 'pending');
    }

    return filtered.sort((a, b) => {
      const dateA = new Date(`${a.booking_date} ${a.start_time}`);
      const dateB = new Date(`${b.booking_date} ${b.start_time}`);
      return dateA.getTime() - dateB.getTime();
    });
  }, [bookings, searchQuery, selectedStatusFilter, unreadOnly, unassignedOnly]);

  const [presentBookings, futureBookings, pastBookings, paginatedData] = useMemo(() => {
    const present: any[] = [];
    const future: any[] = [];
    const past: any[] = [];
    const presentSet = new Set(['pending','confirmed','in_progress']);
    const futureSet = new Set(['pending','confirmed']);
    const pastSet = new Set(['completed','cancelled','declined','no_show']);
    const todayStr = new Date().toLocaleDateString('en-CA');

    filteredBookings.forEach((b: any) => {
      const status = b.booking_status;
      const dateStr: string = b.booking_date || '';
      if (pastSet.has(status)) {
        past.push(b);
      } else if (dateStr > todayStr && futureSet.has(status)) {
        future.push(b);
      } else if (dateStr <= todayStr && presentSet.has(status)) {
        present.push(b);
      } else {
        if (dateStr > todayStr) future.push(b);
        else present.push(b);
      }
    });

    // Calculate pagination data
    const presentStart = (presentPage - 1) * pageSize;
    const presentEnd = presentStart + pageSize;
    const futureStart = (futurePage - 1) * pageSize;
    const futureEnd = futureStart + pageSize;
    const pastStart = (pastPage - 1) * pageSize;
    const pastEnd = pastStart + pageSize;

    const paginatedPresent = present.slice(presentStart, presentEnd);
    const paginatedFuture = future.slice(futureStart, futureEnd);
    const paginatedPast = past.slice(pastStart, pastEnd);

    const presentTotalPages = Math.ceil(present.length / pageSize);
    const futureTotalPages = Math.ceil(future.length / pageSize);
    const pastTotalPages = Math.ceil(past.length / pageSize);

    return [present, future, past, {
      present: { items: paginatedPresent, totalPages: presentTotalPages, currentPage: presentPage },
      future: { items: paginatedFuture, totalPages: futureTotalPages, currentPage: futurePage },
      past: { items: paginatedPast, totalPages: pastTotalPages, currentPage: pastPage }
    }];
  }, [filteredBookings, presentPage, futurePage, pastPage, pageSize]);

  // Calculate booking stats
  const bookingStats = useMemo(() => {
    const totalBookings = bookings.length;
    const pendingBookings = bookings.filter(b => b.booking_status === 'pending').length;
    const confirmedBookings = bookings.filter(b => b.booking_status === 'confirmed').length;
    const completedBookings = bookings.filter(b => b.booking_status === 'completed').length;
    const cancelledBookings = bookings.filter(b => b.booking_status === 'cancelled').length;
    const inProgressBookings = bookings.filter(b => b.booking_status === 'in_progress').length;

    const totalRevenue = bookings
      .filter(b => b.booking_status === 'completed')
      .reduce((sum, b) => sum + (b.total_amount || 0), 0);

    const averageBookingValue = completedBookings > 0 ? totalRevenue / completedBookings : 0;
    const completionRate = totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0;

    return {
      totalBookings,
      pendingBookings,
      confirmedBookings,
      completedBookings,
      cancelledBookings,
      inProgressBookings,
      totalRevenue,
      averageBookingValue,
      completionRate,
    };
  }, [bookings]);

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
      const { data: bookingsData, error: bookingsError } = await (supabase as any)
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

      // Load business services for pricing information
      const { data: businessServicesData, error: businessServicesError } = await (supabase as any)
        .from('business_services')
        .select('*')
        .eq('business_id', providerData.business_id);

      if (businessServicesError) {
        console.warn('Error loading business services:', businessServicesError);
        setBusinessServices([]);
      } else {
        setBusinessServices(businessServicesData || []);
      }

      // Load staff members for assignment
      const { data: staffData, error: staffError } = await (supabase as any)
        .from('providers')
        .select('*')
        .eq('business_id', providerData.business_id);

      if (staffError) throw staffError;
      setStaffMembers(staffData || []);

      // Set available providers (only those with provider_role = "provider")
      const availableProviders = staffData?.filter((provider: any) => provider.provider_role === "provider") || [];
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
      const { error } = await (supabase as any)
        .from('bookings')
        .update({ 
          booking_status: 'confirmed'
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
      const { error } = await (supabase as any)
        .from('bookings')
        .update({ 
          booking_status: 'declined',
          decline_reason: reason || 'Provider declined'
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
      const { error } = await (supabase as any)
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

  const onOpenBookingDetails = (booking: any) => {
    setSelectedBooking(booking);
    setIsBookingDetailsOpen(true);
  };

  const getBusinessPrice = (serviceId: string) => {
    const businessService = businessServices.find(bs => bs.service_id === serviceId);
    return businessService?.business_price || null;
  };

  const getMapUrl = (booking: any) => {
    let address = "";

    if (booking.customer_locations) {
      address = `${booking.customer_locations.location_name || ""} ${booking.customer_locations.address_line1 || ""}${booking.customer_locations.address_line2 ? `, ${booking.customer_locations.address_line2}` : ""}, ${booking.customer_locations.city || ""}, ${booking.customer_locations.state || ""}`;
    } else if (booking.business_locations) {
      address = `${booking.business_locations.location_name || ""} ${booking.business_locations.address_line1 || ""}, ${booking.business_locations.city || ""}, ${booking.business_locations.state || ""}`;
    }

    if (!address.trim()) return null;

    const encodedAddress = encodeURIComponent(address.trim());
    return `https://maps.google.com/maps?q=${encodedAddress}`;
  };

  // Reset pagination when search or filter changes
  useEffect(() => {
    setPresentPage(1);
    setFuturePage(1);
    setPastPage(1);
  }, [searchQuery, selectedStatusFilter, unreadOnly, unassignedOnly]);

  // Reset current tab pagination when tab changes
  useEffect(() => {
    if (activeTab === 'present') setPresentPage(1);
    else if (activeTab === 'future') setFuturePage(1);
    else if (activeTab === 'past') setPastPage(1);
  }, [activeTab]);

  // Load bookings when component mounts
  useEffect(() => {
    loadBookings();
  }, [providerData, business]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Bookings</h3>
          <p className="text-sm text-foreground/60">
            Manage and track all your bookings.
          </p>
        </div>
      </div>

      {/* Booking Statistics - Only visible to owners */}
      {isOwner && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Bookings</p>
                <p className="text-3xl font-bold text-gray-900">{bookingStats.totalBookings}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {bookingStats.completionRate.toFixed(1)}% completion rate
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-3xl font-bold text-gray-900">${bookingStats.totalRevenue.toFixed(2)}</p>
                <p className="text-sm text-gray-500 mt-1">
                  ${bookingStats.averageBookingValue.toFixed(2)} avg per booking
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Actions</p>
                <p className="text-3xl font-bold text-gray-900">{bookingStats.pendingBookings}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {bookingStats.inProgressBookings} in progress
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-3xl font-bold text-gray-900">{bookingStats.completedBookings}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {bookingStats.cancelledBookings} cancelled
                </p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Quick Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card 
          className="p-4 text-center cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setSelectedStatusFilter('all')}
        >
          <p className="text-sm text-gray-600">Active</p>
          <p className="text-2xl font-bold text-blue-600">{presentBookings.length}</p>
        </Card>
        <Card 
          className="p-4 text-center cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setSelectedStatusFilter('all')}
        >
          <p className="text-sm text-gray-600">Closed</p>
          <p className="text-2xl font-bold text-purple-600">{pastBookings.length}</p>
        </Card>
        <Card 
          className="p-4 text-center cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setSelectedStatusFilter('pending')}
        >
          <p className="text-sm text-gray-600">Pending</p>
          <p className="text-2xl font-bold text-orange-600">{bookingStats.pendingBookings}</p>
        </Card>
        <Card 
          className="p-4 text-center cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setSelectedStatusFilter('confirmed')}
        >
          <p className="text-sm text-gray-600">Confirmed</p>
          <p className="text-2xl font-bold text-green-600">{bookingStats.confirmedBookings}</p>
        </Card>
        <Card 
          className="p-4 text-center cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setSelectedStatusFilter('completed')}
        >
          <p className="text-sm text-gray-600">Completed</p>
          <p className="text-2xl font-bold text-emerald-600">{bookingStats.completedBookings}</p>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex flex-col gap-3">
          {/* Row 1: Search Bar + Status Dropdown */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by customer name, service, or booking reference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
              />
            </div>
            <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px] h-10">
                <Filter className="w-3.5 h-3.5 mr-2 text-gray-500" />
                <SelectValue placeholder="Status" />
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
          
          {/* Row 2: Unread Only + Unassigned Only + Refresh */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setUnreadOnly(!unreadOnly)}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                unreadOnly 
                  ? 'bg-blue-50 text-blue-700 border-blue-300 font-medium' 
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              Unread Only
            </button>
            <button
              onClick={() => setUnassignedOnly(!unassignedOnly)}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                unassignedOnly 
                  ? 'bg-blue-50 text-blue-700 border-blue-300 font-medium' 
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              Unassigned Only
            </button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadBookings}
              disabled={loading}
              className="h-8 px-3 text-sm"
            >
              <Activity className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>

          {/* Row 3: View Mode Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">View:</span>
            <Select value={viewMode} onValueChange={(value: "list" | "week" | "month") => setViewMode(value)}>
              <SelectTrigger className="w-[120px] h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="list">List</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Active Filters Display */}
          {(searchQuery || selectedStatusFilter !== 'all' || unreadOnly || unassignedOnly) && (
            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
              <span className="text-xs text-gray-500">Active filters:</span>
              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded-md">
                  Search: "{searchQuery.length > 20 ? searchQuery.substring(0, 20) + '...' : searchQuery}"
                  <button onClick={() => setSearchQuery('')} className="hover:text-blue-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedStatusFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-purple-50 text-purple-700 rounded-md">
                  Status: {selectedStatusFilter.replace('_', ' ')}
                  <button onClick={() => setSelectedStatusFilter('all')} className="hover:text-purple-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {unreadOnly && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-orange-50 text-orange-700 rounded-md">
                  Unread Only
                  <button onClick={() => setUnreadOnly(false)} className="hover:text-orange-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {unassignedOnly && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-green-50 text-green-700 rounded-md">
                  Unassigned Only
                  <button onClick={() => setUnassignedOnly(false)} className="hover:text-green-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              <button 
                onClick={() => { setSearchQuery(''); setSelectedStatusFilter('all'); setUnreadOnly(false); setUnassignedOnly(false); }}
                className="text-xs text-gray-500 hover:text-gray-700 underline ml-auto"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* Bookings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="present">Present ({presentBookings.length})</TabsTrigger>
          <TabsTrigger value="future">Future ({futureBookings.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({pastBookings.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="present" className="mt-6">
          <div className="space-y-4">
            {paginatedData.present.items.length > 0 ? (
              paginatedData.present.items.map((booking) => (
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
                            <BookingStatusIndicator status={booking.booking_status || 'unknown'} size="sm" showProgress={false} />
                            <div className="text-right">
                              <p className="text-base sm:text-lg font-bold text-gray-900">
                                ${(parseFloat(booking.total_amount || "0")).toFixed(2)}
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
                                {booking.delivery_type === 'virtual'
                                  ? 'Virtual'
                                  : booking.customer_location_id
                                  ? 'Customer Location'
                                  : 'Business Location'}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {booking.delivery_type === 'virtual'
                                ? 'Virtual'
                                : booking.customer_locations
                                ? `${booking.customer_locations.address_line1 || ""}${booking.customer_locations.address_line2 ? ` ${booking.customer_locations.address_line2}` : ""}, ${booking.customer_locations.city || ""}, ${booking.customer_locations.state || ""} ${booking.customer_locations.postal_code || ""}`.trim()
                                : booking.business_locations
                                ? `${booking.business_locations.address_line1 || ""}, ${booking.business_locations.city || ""}, ${booking.business_locations.state || ""}`
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
            ) : (
              <Card className="p-8">
                <div className="text-center">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Present Bookings</h3>
                  <p className="text-gray-600">No bookings require immediate attention.</p>
                </div>
              </Card>
            )}
            {presentBookings.length > pageSize && (
              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPresentPage(p => Math.max(1, p - 1))}
                    disabled={presentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPresentPage(p => Math.min(paginatedData.present.totalPages, p + 1))}
                    disabled={presentPage === paginatedData.present.totalPages}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                <span className="text-sm text-gray-600">
                  Page {presentPage} of {paginatedData.present.totalPages} ({presentBookings.length} total)
                </span>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="future" className="mt-6">
          <div className="space-y-4">
            {paginatedData.future.items.length > 0 ? (
              paginatedData.future.items.map((booking) => (
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
                            <BookingStatusIndicator status={booking.booking_status || 'unknown'} size="sm" showProgress={false} />
                            <div className="text-right">
                              <p className="text-base sm:text-lg font-bold text-gray-900">
                                ${(parseFloat(booking.total_amount || "0")).toFixed(2)}
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
                                ? `${booking.customer_locations.address_line1 || ""}${booking.customer_locations.address_line2 ? ` ${booking.customer_locations.address_line2}` : ""}, ${booking.customer_locations.city || ""}, ${booking.customer_locations.state || ""} ${booking.customer_locations.postal_code || ""}`.trim()
                                : booking.business_locations
                                ? `${booking.business_locations.address_line1 || ""}, ${booking.business_locations.city || ""}, ${booking.business_locations.state || ""}`
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
            ) : (
              <Card className="p-8">
                <div className="text-center">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Future Bookings</h3>
                  <p className="text-gray-600">No upcoming bookings scheduled.</p>
                </div>
              </Card>
            )}
            {futureBookings.length > pageSize && (
              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFuturePage(p => Math.max(1, p - 1))}
                    disabled={futurePage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFuturePage(p => Math.min(paginatedData.future.totalPages, p + 1))}
                    disabled={futurePage === paginatedData.future.totalPages}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                <span className="text-sm text-gray-600">
                  Page {futurePage} of {paginatedData.future.totalPages} ({futureBookings.length} total)
                </span>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="past" className="mt-6">
          <div className="space-y-4">
            {paginatedData.past.items.length > 0 ? (
              paginatedData.past.items.map((booking) => (
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
                            <BookingStatusIndicator status={booking.booking_status || 'unknown'} size="sm" showProgress={false} />
                            <div className="text-right">
                              <p className="text-base sm:text-lg font-bold text-gray-900">
                                ${(parseFloat(booking.total_amount || "0")).toFixed(2)}
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
                                ? `${booking.customer_locations.address_line1 || ""}${booking.customer_locations.address_line2 ? ` ${booking.customer_locations.address_line2}` : ""}, ${booking.customer_locations.city || ""}, ${booking.customer_locations.state || ""} ${booking.customer_locations.postal_code || ""}`.trim()
                                : booking.business_locations
                                ? `${booking.business_locations.address_line1 || ""}, ${booking.business_locations.city || ""}, ${booking.business_locations.state || ""}`
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
            ) : (
              <Card className="p-8">
                <div className="text-center">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Past Bookings</h3>
                  <p className="text-gray-600">No completed or cancelled bookings found.</p>
                </div>
              </Card>
            )}
            {pastBookings.length > pageSize && (
              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPastPage(p => Math.max(1, p - 1))}
                    disabled={pastPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPastPage(p => Math.min(paginatedData.past.totalPages, p + 1))}
                    disabled={pastPage === paginatedData.past.totalPages}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                <span className="text-sm text-gray-600">
                  Page {pastPage} of {paginatedData.past.totalPages} ({pastBookings.length} total)
                </span>
              </div>
            )}
          </div>
        </TabsContent>

        {filteredBookings.length === 0 && (
          <div className="mt-6">
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
          </div>
        )}
      </Tabs>

      {/* Booking Details Modal */}
      <Dialog open={isBookingDetailsOpen} onOpenChange={setIsBookingDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Booking Details</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsBookingDetailsOpen(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          {selectedBooking && (
            <div className="space-y-6">
              {/* Booking Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <BookingStatusIndicator status={selectedBooking.booking_status || 'unknown'} />
                  <span className="font-medium">#{selectedBooking.booking_reference || 'N/A'}</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {selectedBooking.booking_status || 'unknown'}
                </Badge>
              </div>

              {/* Customer Information */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Customer Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Name</label>
                    <p className="text-sm">{selectedBooking.customer_profiles?.first_name} {selectedBooking.customer_profiles?.last_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Email</label>
                    <p className="text-sm">{selectedBooking.customer_profiles?.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Phone</label>
                    <p className="text-sm">{selectedBooking.customer_profiles?.phone || 'Not provided'}</p>
                  </div>
                </div>
              </div>

              {/* Service Information */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Service Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Service Name</label>
                    <p className="text-sm">{selectedBooking.services?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Business Price</label>
                    <p className="text-sm font-medium">${getBusinessPrice(selectedBooking.service_id) || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Duration</label>
                    <p className="text-sm">{selectedBooking.services?.duration_minutes || 'N/A'} minutes</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Delivery Type</label>
                    <p className="text-sm">{getDeliveryTypeLabel(selectedBooking.delivery_type)}</p>
                  </div>
                </div>
              </div>

              {/* Appointment Details */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Appointment Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <div>
                      <label className="text-sm font-medium text-gray-600">Booking Date</label>
                      <p className="text-sm">{selectedBooking.booking_date ? new Date(selectedBooking.booking_date).toLocaleDateString() : 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <div>
                      <label className="text-sm font-medium text-gray-600">Start Time</label>
                      <p className="text-sm">{selectedBooking.start_time || 'N/A'}</p>
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
