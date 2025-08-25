import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/auth/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  DollarSign, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  LogOut
} from "lucide-react";
import { useRealtimeBookings } from "@/hooks/useRealtimeBookings";
import { apiClient } from "@/lib/api/client";
import { AppError } from "@/lib/errors/AppError";
import { 
  OptimizedCard, 
  OptimizedList, 
  OptimizedButton, 
  OptimizedSearchInput,
  usePerformanceMonitor
} from "@/components/PerformanceOptimized";
import { config } from "@/lib/config";

// Types
interface Provider {
  id: string;
  user_id: string;
  business_id: string;
  verification_status: string;
  background_check_status: string;
  created_at: string;
  updated_at: string;
}

interface BusinessProfile {
  id: string;
  business_name: string;
  business_type: string;
  verification_status: string;
  owner_user_id: string;
  created_at: string;
  updated_at: string;
}

interface Booking {
  id: string;
  customer_id: string;
  provider_id: string;
  service_id: string;
  status: string;
  scheduled_at: string;
  location: any;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Memoized booking status component
const BookingStatusBadge = React.memo(({ status }: { status: string }) => {
  const statusConfig = useMemo(() => ({
    pending: { label: 'Pending', variant: 'secondary' as const, icon: Clock },
    confirmed: { label: 'Confirmed', variant: 'default' as const, icon: CheckCircle },
    in_progress: { label: 'In Progress', variant: 'default' as const, icon: RefreshCw },
    completed: { label: 'Completed', variant: 'default' as const, icon: CheckCircle },
    cancelled: { label: 'Cancelled', variant: 'destructive' as const, icon: XCircle },
  }), []);

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
});

// Memoized booking card component
const BookingCard = React.memo(({ 
  booking, 
  onStatusChange 
}: { 
  booking: Booking; 
  onStatusChange: (bookingId: string, status: string) => void;
}) => {
  const handleStatusChange = useCallback((newStatus: string) => {
    onStatusChange(booking.id, newStatus);
  }, [booking.id, onStatusChange]);

  const scheduledDate = useMemo(() => {
    return new Date(booking.scheduled_at).toLocaleDateString();
  }, [booking.scheduled_at]);

  const scheduledTime = useMemo(() => {
    return new Date(booking.scheduled_at).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }, [booking.scheduled_at]);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">Booking #{booking.id.slice(-8)}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {scheduledDate} at {scheduledTime}
            </p>
          </div>
          <BookingStatusBadge status={booking.status} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {booking.location && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span>{booking.location.address || 'Location not specified'}</span>
            </div>
          )}
          {booking.notes && (
            <p className="text-sm text-muted-foreground">{booking.notes}</p>
          )}
          <div className="flex gap-2">
            <Select value={booking.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export default function ProviderDashboardOptimized() {
  const { user, signOut, isOwner, isDispatcher, isProvider } = useAuth();
  const { toast } = useToast();
  const { measureAsync } = usePerformanceMonitor();
  
  // State
  const [isAvailable, setIsAvailable] = useState(true);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [businessMetrics, setBusinessMetrics] = useState({
    activeLocations: 0,
    teamMembers: 0,
    servicesOffered: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("bookings");
  const [activeBookingTab, setActiveBookingTab] = useState("today");
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Real-time booking updates for providers
  const { isConnected, refreshBookings } = useRealtimeBookings({
    userId: user?.id,
    userType: "provider",
    onStatusChange: useCallback((bookingUpdate) => {
      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === bookingUpdate.id
            ? {
                ...booking,
                status: bookingUpdate.status,
                updated_at: bookingUpdate.updated_at,
              }
            : booking,
        ),
      );
    }, []),
  });

  // Memoized filtered bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter(booking => {
      const matchesSearch = searchQuery === "" || 
        booking.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.notes?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = selectedStatusFilter === "all" || 
        booking.status === selectedStatusFilter;
      
      const matchesLocation = selectedLocationFilter === "all" || 
        booking.location?.id === selectedLocationFilter;
      
      return matchesSearch && matchesStatus && matchesLocation;
    });
  }, [bookings, searchQuery, selectedStatusFilter, selectedLocationFilter]);

  // Memoized grouped bookings
  const groupedBookings = useMemo(() => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return {
      today: filteredBookings.filter(booking => {
        const bookingDate = new Date(booking.scheduled_at);
        return bookingDate.toDateString() === today.toDateString();
      }),
      upcoming: filteredBookings.filter(booking => {
        const bookingDate = new Date(booking.scheduled_at);
        return bookingDate > tomorrow;
      }),
      past: filteredBookings.filter(booking => {
        const bookingDate = new Date(booking.scheduled_at);
        return bookingDate < today;
      }),
    };
  }, [filteredBookings]);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        setError("");
        
        await measureAsync('loadInitialData', async () => {
          // Load provider data
          const providerResponse = await apiClient.get(`/provider/profile/${user.id}`);
          if (providerResponse.success && providerResponse.data) {
            setProvider(providerResponse.data);
          }
          
          // Load business data
          if (providerResponse.data?.business_id) {
            const businessResponse = await apiClient.get(`/business/profile/${providerResponse.data.business_id}`);
            if (businessResponse.success && businessResponse.data) {
              setBusiness(businessResponse.data);
            }
          }
          
          // Load bookings
          await refreshBookings();
        });
        
      } catch (error) {
        console.error('Error loading initial data:', error);
        const appError = AppError.fromApiError(error);
        setError(appError.userMessage);
        toast({
          title: "Error",
          description: appError.userMessage,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [user?.id, refreshBookings, measureAsync, toast]);

  // Handle booking status change
  const handleBookingStatusChange = useCallback(async (bookingId: string, newStatus: string) => {
    try {
      const response = await apiClient.patch(`/bookings/${bookingId}/status`, {
        status: newStatus,
        notes: `Status updated to ${newStatus}`
      }, {
        showSuccessToast: true,
        successMessage: `Booking status updated to ${newStatus}`
      });

      if (response.success) {
        setBookings(prev => 
          prev.map(booking => 
            booking.id === bookingId 
              ? { ...booking, status: newStatus }
              : booking
          )
        );
      }
    } catch (error) {
      console.error('Error updating booking status:', error);
      const appError = AppError.fromApiError(error);
      toast({
        title: "Error",
        description: appError.userMessage,
        variant: "destructive",
      });
    }
  }, [toast]);

  // Handle availability toggle
  const handleAvailabilityToggle = useCallback(async () => {
    try {
      const newStatus = !isAvailable;
      setIsAvailable(newStatus);
      
      // Update provider availability in database
      await apiClient.patch(`/provider/profile/${user?.id}`, {
        is_available: newStatus
      }, {
        showSuccessToast: true,
        successMessage: `You are now ${newStatus ? 'available' : 'unavailable'} for bookings`
      });
      
    } catch (error) {
      console.error('Error updating availability:', error);
      setIsAvailable(!isAvailable); // Revert on error
      const appError = AppError.fromApiError(error);
      toast({
        title: "Error",
        description: appError.userMessage,
        variant: "destructive",
      });
    }
  }, [isAvailable, user?.id, toast]);

  // Handle sign out
  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  }, [signOut, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <CardTitle>Error Loading Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <OptimizedButton onClick={() => window.location.reload()}>
              Try Again
            </OptimizedButton>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                {business?.business_name || 'Provider Dashboard'}
              </h1>
              <Badge 
                variant={isAvailable ? "default" : "secondary"} 
                className="ml-4"
              >
                {isAvailable ? 'Available' : 'Unavailable'}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-4">
              <OptimizedButton
                variant="outline"
                onClick={handleAvailabilityToggle}
                loading={false}
              >
                {isAvailable ? 'Set Unavailable' : 'Set Available'}
              </OptimizedButton>
              
              <OptimizedButton
                variant="outline"
                onClick={handleSignOut}
                className="flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </OptimizedButton>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <OptimizedCard title="Today's Bookings" loading={loading}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{groupedBookings.today.length}</p>
                <p className="text-sm text-muted-foreground">Scheduled today</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
          </OptimizedCard>

          <OptimizedCard title="Total Revenue" loading={loading}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">$0</p>
                <p className="text-sm text-muted-foreground">This month</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </OptimizedCard>

          <OptimizedCard title="Team Members" loading={loading}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{businessMetrics.teamMembers}</p>
                <p className="text-sm text-muted-foreground">Active providers</p>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
          </OptimizedCard>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="bookings" className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <OptimizedSearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search bookings..."
                className="flex-1"
              />
              
              <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Booking Tabs */}
            <Tabs value={activeBookingTab} onValueChange={setActiveBookingTab}>
              <TabsList>
                <TabsTrigger value="today">Today ({groupedBookings.today.length})</TabsTrigger>
                <TabsTrigger value="upcoming">Upcoming ({groupedBookings.upcoming.length})</TabsTrigger>
                <TabsTrigger value="past">Past ({groupedBookings.past.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="today" className="space-y-4">
                <OptimizedList
                  items={groupedBookings.today}
                  renderItem={(booking) => (
                    <BookingCard 
                      booking={booking} 
                      onStatusChange={handleBookingStatusChange}
                    />
                  )}
                  keyExtractor={(booking) => booking.id}
                  emptyMessage="No bookings scheduled for today"
                />
              </TabsContent>

              <TabsContent value="upcoming" className="space-y-4">
                <OptimizedList
                  items={groupedBookings.upcoming}
                  renderItem={(booking) => (
                    <BookingCard 
                      booking={booking} 
                      onStatusChange={handleBookingStatusChange}
                    />
                  )}
                  keyExtractor={(booking) => booking.id}
                  emptyMessage="No upcoming bookings"
                />
              </TabsContent>

              <TabsContent value="past" className="space-y-4">
                <OptimizedList
                  items={groupedBookings.past}
                  renderItem={(booking) => (
                    <BookingCard 
                      booking={booking} 
                      onStatusChange={handleBookingStatusChange}
                    />
                  )}
                  keyExtractor={(booking) => booking.id}
                  emptyMessage="No past bookings"
                />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="services" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Services</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Service management features coming soon...
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Analytics dashboard coming soon...
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Settings panel coming soon...
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
