import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Users,
  TrendingUp,
  Clock,
  Star,
  MessageCircle,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  UserX,
  Bell,
  CreditCard,
  MapPin,
  Package,
  Loader2,
} from "lucide-react";
import { useNotificationCount } from "@/hooks/useNotificationCount";
import { getAuthHeaders } from "@/lib/api/authUtils";
import { supabase } from "@/lib/supabase";

interface DashboardTabProps {
  providerData: any;
  business: any;
  providerRole?: string; // 'owner', 'dispatcher', or 'provider'
}

// Interface for dashboard stats from optimized API
interface DashboardStats {
  total_bookings: number;
  pending_bookings: number;
  confirmed_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  in_progress_bookings: number;
  unassigned_bookings: number;
  total_revenue: number;
  total_staff: number;
  active_staff: number;
  total_services: number;
  active_services: number;
  total_locations: number;
  active_locations: number;
  todays_confirmed_count: number;
  recent_bookings: any[];
}

type SetupHealth = {
  stripeConnected: boolean | null; // null = unknown/error
  stripeRequirementsDue: number;
  businessHasActiveServices: boolean;
  staffMissingServicesCount: number;
  staffMissingLocationCount: number;
  staffBookableBlockedCount: number;
};

export default function DashboardTab({
  providerData,
  business,
  providerRole,
}: DashboardTabProps) {
  const navigate = useNavigate();
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupHealth, setSetupHealth] = useState<SetupHealth | null>(null);
  
  // Get unread conversations count
  const businessId = business?.id || providerData?.business_id;
  const { count: notificationCount } = useNotificationCount(businessId);
  
  // Determine base path for navigation based on role
  const getBasePath = () => {
    const role = providerRole || providerData?.provider_role;
    if (role === 'owner') return '/owner';
    if (role === 'dispatcher') return '/dispatcher';
    return '/provider';
  };
  
  // Handle click on Unassigned Bookings card
  const handleUnassignedBookingsClick = () => {
    const basePath = getBasePath();
    navigate(`${basePath}/bookings?unassigned=true`);
  };
  
  // Handle click on Unread Conversations card
  const handleUnreadConversationsClick = () => {
    const basePath = getBasePath();
    navigate(`${basePath}/bookings?unread=true`);
  };
  
  // Handle click on Pending Bookings quick action
  const handlePendingBookingsClick = () => {
    const basePath = getBasePath();
    navigate(`${basePath}/bookings?status=pending`);
  };
  
  // Handle click on Today's Schedule quick action
  const handleTodaysScheduleClick = () => {
    const basePath = getBasePath();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    navigate(`${basePath}/bookings?status=confirmed&date=${today}`);
  };
  
  // Handle click on Unread Messages quick action
  const handleUnreadMessagesClick = () => {
    const basePath = getBasePath();
    navigate(`${basePath}/bookings?unread=true`);
  };
  
  // Handle click on recent booking item
  const handleRecentBookingClick = (bookingReference: string) => {
    const basePath = getBasePath();
    navigate(`${basePath}/bookings?search=${encodeURIComponent(bookingReference)}`);
  };

  // Determine if user is owner (show full stats) or dispatcher/provider (hide stats)
  const role = providerRole || providerData?.provider_role;
  const isOwner = role === 'owner';
  const isOwnerOrDispatcher = role === "owner" || role === "dispatcher";

  // Load dashboard data using optimized API endpoint
  const loadDashboardData = async () => {
    if (!providerData) return;

    try {
      setLoading(true);
      const businessId = business?.id || providerData?.business_id;

      // Use optimized dashboard stats API endpoint
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/business/dashboard-stats?business_id=${businessId}`, {
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to load dashboard stats: ${response.status}`);
      }

      const data = await response.json();
      
      // Set dashboard stats from optimized API
      setDashboardStats({
        total_bookings: data.total_bookings || 0,
        pending_bookings: data.pending_bookings || 0,
        confirmed_bookings: data.confirmed_bookings || 0,
        completed_bookings: data.completed_bookings || 0,
        cancelled_bookings: data.cancelled_bookings || 0,
        in_progress_bookings: data.in_progress_bookings || 0,
        unassigned_bookings: data.unassigned_bookings || 0,
        total_revenue: data.total_revenue || 0,
        total_staff: data.total_staff || 0,
        active_staff: data.active_staff || 0,
        total_services: data.total_services || 0,
        active_services: data.active_services || 0,
        total_locations: data.total_locations || 0,
        active_locations: data.active_locations || 0,
        todays_confirmed_count: data.todays_confirmed_count || 0,
        recent_bookings: data.recent_bookings || [],
      });

      console.log("✅ Dashboard stats loaded via optimized API:", {
        queryTime: data._meta?.query_time_ms,
        fallbackMode: data._meta?.fallback_mode,
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Set empty stats on error
      setDashboardStats({
        total_bookings: 0,
        pending_bookings: 0,
        confirmed_bookings: 0,
        completed_bookings: 0,
        cancelled_bookings: 0,
        in_progress_bookings: 0,
        unassigned_bookings: 0,
        total_revenue: 0,
        total_staff: 0,
        active_staff: 0,
        total_services: 0,
        active_services: 0,
        total_locations: 0,
        active_locations: 0,
        todays_confirmed_count: 0,
        recent_bookings: [],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [providerData, business]);

  // Load setup health to warn about blockers that prevent receiving bookings
  useEffect(() => {
    const loadSetupHealth = async () => {
      if (!businessId || !isOwnerOrDispatcher) return;

      try {
        setSetupLoading(true);

        // 1) Stripe connection status (server-side endpoint checks Stripe + DB)
        let stripeConnected: boolean | null = null;
        let stripeRequirementsDue = 0;
        try {
          const stripeRes = await fetch(`/api/stripe/check-account-status?businessId=${businessId}`);
          if (stripeRes.ok) {
            const stripeData = await stripeRes.json();
            stripeConnected = !!(stripeData?.hasAccount && stripeData?.chargesEnabled && stripeData?.payoutsEnabled);
            stripeRequirementsDue = Array.isArray(stripeData?.requirements) ? stripeData.requirements.length : 0;
          }
        } catch {
          stripeConnected = null;
        }

        // 2) Business services configured (from dashboard stats)
        const businessHasActiveServices = (dashboardStats?.active_services ?? 0) > 0;

        // 3) Staff readiness (owners + providers): location + assigned services
        const { data: staffProviders, error: staffError } = await supabase
          .from("providers")
          .select("id, provider_role, location_id, active_for_bookings, first_name, last_name")
          .eq("business_id", businessId)
          .in("provider_role", ["owner", "provider"]);

        if (staffError) {
          console.error("Error loading staff readiness:", staffError);
        }

        const staff = staffProviders || [];
        const providerIds = staff.map((p: any) => p.id).filter(Boolean);

        // Pull all active provider_services for these staff and count in-memory (staff sizes are small)
        let servicesByProvider: Record<string, number> = {};
        if (providerIds.length > 0) {
          const { data: providerServices, error: psError } = await supabase
            .from("provider_services")
            .select("provider_id, service_id")
            .in("provider_id", providerIds)
            .eq("is_active", true);

          if (psError) {
            console.error("Error loading provider_services:", psError);
          } else {
            servicesByProvider = (providerServices || []).reduce((acc: any, row: any) => {
              const pid = row.provider_id;
              acc[pid] = (acc[pid] || 0) + 1;
              return acc;
            }, {} as Record<string, number>);
          }
        }

        const staffMissingServicesCount = staff.filter((p: any) => (servicesByProvider[p.id] || 0) === 0).length;
        const staffMissingLocationCount = staff.filter((p: any) => !p.location_id).length;
        const staffBookableBlockedCount = staff.filter((p: any) => {
          const missingServices = (servicesByProvider[p.id] || 0) === 0;
          const missingLocation = !p.location_id;
          return !!p.active_for_bookings && (missingServices || missingLocation);
        }).length;

        setSetupHealth({
          stripeConnected,
          stripeRequirementsDue,
          businessHasActiveServices,
          staffMissingServicesCount,
          staffMissingLocationCount,
          staffBookableBlockedCount,
        });
      } finally {
        setSetupLoading(false);
      }
    };

    loadSetupHealth();
    // Intentionally include dashboardStats.active_services so the card updates when services are added/removed
  }, [businessId, isOwnerOrDispatcher, dashboardStats?.active_services]);

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-600">Loading dashboard data...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Use stats from optimized API
  const totalBookings = dashboardStats?.total_bookings || 0;
  const pendingBookings = dashboardStats?.pending_bookings || 0;
  const confirmedBookings = dashboardStats?.confirmed_bookings || 0;
  const completedBookings = dashboardStats?.completed_bookings || 0;
  const cancelledBookings = dashboardStats?.cancelled_bookings || 0;

  // Get unread conversations count from notification hook
  const unreadConversations = notificationCount.unreadMessages || 0;
  
  // Unassigned bookings count from optimized API
  const unassignedBookings = dashboardStats?.unassigned_bookings || 0;

  // Recent bookings from optimized API (already limited to 5 by the database function)
  const recentBookings = dashboardStats?.recent_bookings || [];
  
  // Today's confirmed bookings count
  const todaysConfirmedCount = dashboardStats?.todays_confirmed_count || 0;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'pending': return <Clock className="w-4 h-4 text-orange-600" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-blue-600" />;
      case 'cancelled': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const configs = {
      pending: { label: "Pending", className: "bg-orange-100 text-orange-800 border-orange-300" },
      confirmed: { label: "Confirmed", className: "bg-green-100 text-green-800 border-green-300" },
      in_progress: { label: "In Progress", className: "bg-purple-100 text-purple-800 border-purple-300" },
      completed: { label: "Completed", className: "bg-emerald-100 text-emerald-800 border-emerald-300" },
      cancelled: { label: "Cancelled", className: "bg-red-100 text-red-800 border-red-300" },
      declined: { label: "Declined", className: "bg-gray-100 text-gray-800 border-gray-300" },
      no_show: { label: "No Show", className: "bg-yellow-100 text-yellow-800 border-yellow-300" },
    };
    return configs[status] || { label: status, className: "bg-gray-100 text-gray-800 border-gray-300" };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-600">Welcome back, {providerData?.first_name || 'Provider'}!</p>
      </div>

      {/* Setup / Action Required (owners + dispatchers) */}
      {isOwnerOrDispatcher && (
        <Card className="border-2 border-gray-100">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-[#f88221]" />
                <span>Booking Readiness</span>
              </div>
              {setupLoading && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Checking…
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(() => {
              const stripeOk = setupHealth?.stripeConnected === true;
              const stripeUnknown = setupHealth?.stripeConnected === null;
              const servicesOk = setupHealth?.businessHasActiveServices === true;
              const missingServices = setupHealth?.staffMissingServicesCount ?? 0;
              const missingLocations = setupHealth?.staffMissingLocationCount ?? 0;
              const blockedBookable = setupHealth?.staffBookableBlockedCount ?? 0;

              const blockers =
                (stripeOk ? 0 : 1) +
                (servicesOk ? 0 : 1) +
                (missingServices > 0 ? 1 : 0) +
                (missingLocations > 0 ? 1 : 0) +
                (blockedBookable > 0 ? 1 : 0);

              const basePath = getBasePath();

              return (
                <>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      {blockers === 0 ? (
                        <span className="text-emerald-700 font-medium flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          You’re set up to receive bookings.
                        </span>
                      ) : (
                        <span className="text-red-700 font-medium">
                          Action required: {blockers} setup item{blockers === 1 ? "" : "s"} may block bookings
                        </span>
                      )}
                    </div>
                    {blockers > 0 && (
                      <Badge className="bg-red-100 text-red-800 border-red-300" variant="outline">
                        {blockers} Pending
                      </Badge>
                    )}
                  </div>

                  {/* Stripe */}
                  <div className="flex items-start justify-between gap-3 rounded-md border p-3">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 ${stripeOk ? "text-emerald-600" : "text-red-600"}`}>
                        {stripeOk ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="text-sm font-medium flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-gray-600" />
                          Stripe payouts
                          {stripeUnknown && (
                            <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700 border-gray-300">
                              Unknown
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-600">
                          {stripeOk
                            ? "Connected (charges + payouts enabled)."
                            : "Connect Stripe to receive payments."}
                          {!stripeOk && (setupHealth?.stripeRequirementsDue ?? 0) > 0 && (
                            <span className="ml-1 text-gray-500">
                              ({setupHealth?.stripeRequirementsDue} requirement{setupHealth?.stripeRequirementsDue === 1 ? "" : "s"} due)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`${basePath}/financials`)}
                    >
                      Manage
                    </Button>
                  </div>

                  {/* Business services */}
                  <div className="flex items-start justify-between gap-3 rounded-md border p-3">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 ${servicesOk ? "text-emerald-600" : "text-red-600"}`}>
                        {servicesOk ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="text-sm font-medium flex items-center gap-2">
                          <Package className="w-4 h-4 text-gray-600" />
                          Business services
                        </div>
                        <div className="text-xs text-gray-600">
                          {servicesOk
                            ? "At least one active service is available."
                            : "No active services yet — add/activate services to allow bookings."}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`${basePath}/business-settings?tab=services`)}
                    >
                      Configure
                    </Button>
                  </div>

                  {/* Staff services */}
                  <div className="flex items-start justify-between gap-3 rounded-md border p-3">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 ${missingServices === 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {missingServices === 0 ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="text-sm font-medium flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-600" />
                          Staff services assigned
                        </div>
                        <div className="text-xs text-gray-600">
                          {missingServices === 0
                            ? "All owners/providers have at least one service assigned."
                            : `${missingServices} staff member${missingServices === 1 ? "" : "s"} missing assigned services.`}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`${basePath}/business-settings?tab=staff`)}
                    >
                      Fix
                    </Button>
                  </div>

                  {/* Staff location */}
                  <div className="flex items-start justify-between gap-3 rounded-md border p-3">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 ${missingLocations === 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {missingLocations === 0 ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="text-sm font-medium flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-600" />
                          Staff locations assigned
                        </div>
                        <div className="text-xs text-gray-600">
                          {missingLocations === 0
                            ? "All owners/providers have a location assigned."
                            : `${missingLocations} staff member${missingLocations === 1 ? "" : "s"} missing a location.`}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`${basePath}/business-settings?tab=staff`)}
                    >
                      Fix
                    </Button>
                  </div>

                  {/* Bookable but blocked */}
                  <div className="flex items-start justify-between gap-3 rounded-md border p-3">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 ${blockedBookable === 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {blockedBookable === 0 ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="text-sm font-medium flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-gray-600" />
                          Bookable staff with blockers
                        </div>
                        <div className="text-xs text-gray-600">
                          {blockedBookable === 0
                            ? "No staff are marked bookable while missing required setup."
                            : `${blockedBookable} staff member${blockedBookable === 1 ? "" : "s"} marked bookable but missing services/location.`}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`${basePath}/business-settings?tab=staff`)}
                    >
                      Review
                    </Button>
                  </div>
                </>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Stats Cards - Only visible to owners */}
      {isOwner && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card 
            className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={handleUnassignedBookingsClick}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Unassigned Bookings</p>
                <p className={`text-3xl font-bold ${unassignedBookings > 0 ? 'text-red-600' : 'text-gray-900'}`}>{unassignedBookings}</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <UserX className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </Card>

          <Card 
            className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={handleUnreadConversationsClick}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Unread Conversations</p>
                <p className="text-3xl font-bold text-gray-900">{unreadConversations}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Bell className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Booking Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card 
          className={`p-4 ${pendingBookings > 0 ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''}`}
          onClick={pendingBookings > 0 ? handlePendingBookingsClick : undefined}
        >
          <div className="text-center">
            <p className="text-sm text-gray-600">Pending</p>
            <p className={`text-2xl font-bold ${pendingBookings > 0 ? 'text-red-600' : 'text-black'}`}>{pendingBookings}</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">Confirmed</p>
            <p className="text-2xl font-bold text-green-600">{confirmedBookings}</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">Completed</p>
            <p className="text-2xl font-bold text-blue-600">{completedBookings}</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">Cancelled</p>
            <p className="text-2xl font-bold text-red-600">{cancelledBookings}</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">Total</p>
            <p className="text-2xl font-bold text-gray-900">{totalBookings}</p>
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bookings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Recent Bookings</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentBookings.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No recent bookings</p>
              ) : (
                recentBookings.map((booking) => {
                  // Handle both nested (legacy) and flattened (from view) data structures
                  const customerFirstName = booking.customer_first_name || booking.customer_profiles?.first_name;
                  const customerLastName = booking.customer_last_name || booking.customer_profiles?.last_name;
                  const customerImageUrl = booking.customer_image_url || booking.customer_profiles?.image_url;
                  const serviceName = booking.service_name || booking.services?.name;
                  
                  return (
                  <div 
                    key={booking.id} 
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => booking.booking_reference && handleRecentBookingClick(booking.booking_reference)}
                  >
                    <div className="flex items-center space-x-3">
                      {/* Customer Avatar */}
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {customerImageUrl ? (
                          <img
                            src={customerImageUrl}
                            alt={`${customerFirstName || ""} ${customerLastName || ""}`}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-full h-full bg-blue-600 rounded-lg flex items-center justify-center">
                            {customerFirstName?.[0] || customerLastName?.[0] ? (
                              <span className="text-white font-semibold text-sm">
                                {customerFirstName?.[0] || customerLastName?.[0]}
                              </span>
                            ) : (
                              <User className="w-5 h-5 text-white" />
                            )}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {customerFirstName && customerLastName
                            ? `${customerFirstName} ${customerLastName}`
                            : booking.guest_name || "Guest"}
                        </p>
                        <p className="text-xs text-gray-600">
                          {serviceName || "Service"} • {booking.booking_date}
                        </p>
                        {booking.booking_reference && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            Ref: {booking.booking_reference}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={getStatusBadge(booking.booking_status).className}>
                        {getStatusBadge(booking.booking_status).label}
                      </Badge>
                      <p className="text-sm font-medium mt-1">${(parseFloat(booking.total_amount || '0')).toFixed(2)}</p>
                    </div>
                  </div>
                );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>Quick Actions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div 
                className="p-3 bg-blue-50 rounded-lg border border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors"
                onClick={handlePendingBookingsClick}
              >
                <h4 className="font-medium text-blue-900">Pending Bookings</h4>
                <p className="text-sm text-blue-700 mt-1">
                  {pendingBookings} booking{pendingBookings !== 1 ? 's' : ''} awaiting your response
                </p>
              </div>
              
              <div 
                className="p-3 bg-green-50 rounded-lg border border-green-200 cursor-pointer hover:bg-green-100 transition-colors"
                onClick={handleTodaysScheduleClick}
              >
                <h4 className="font-medium text-green-900">Today's Schedule</h4>
                <p className="text-sm text-green-700 mt-1">
                  {todaysConfirmedCount} confirmed booking{todaysConfirmedCount !== 1 ? 's' : ''} today
                </p>
              </div>

              <div 
                className="p-3 bg-orange-50 rounded-lg border border-orange-200 cursor-pointer hover:bg-orange-100 transition-colors"
                onClick={handleUnreadMessagesClick}
              >
                <h4 className="font-medium text-orange-900">Unread Messages</h4>
                <p className="text-sm text-orange-700 mt-1">
                  {unreadConversations} unread conversation{unreadConversations !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
