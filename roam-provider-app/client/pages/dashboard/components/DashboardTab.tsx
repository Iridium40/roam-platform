import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { useNotificationCount } from "@/hooks/useNotificationCount";
import { getAuthHeaders } from "@/lib/api/authUtils";

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

export default function DashboardTab({
  providerData,
  business,
  providerRole,
}: DashboardTabProps) {
  const navigate = useNavigate();
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  
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
                recentBookings.map((booking) => (
                  <div 
                    key={booking.id} 
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => booking.booking_reference && handleRecentBookingClick(booking.booking_reference)}
                  >
                    <div className="flex items-center space-x-3">
                      {/* Customer Avatar */}
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {booking.customer_profiles?.image_url ? (
                          <img
                            src={booking.customer_profiles.image_url}
                            alt={`${booking.customer_profiles.first_name || ""} ${booking.customer_profiles.last_name || ""}`}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-full h-full bg-blue-600 rounded-lg flex items-center justify-center">
                            {booking.customer_profiles?.first_name?.[0] || booking.customer_profiles?.last_name?.[0] ? (
                              <span className="text-white font-semibold text-sm">
                                {booking.customer_profiles.first_name[0] || booking.customer_profiles.last_name[0]}
                              </span>
                            ) : (
                              <User className="w-5 h-5 text-white" />
                            )}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {booking.customer_profiles?.first_name && booking.customer_profiles?.last_name
                            ? `${booking.customer_profiles.first_name} ${booking.customer_profiles.last_name}`
                            : booking.guest_name || "Guest"}
                        </p>
                        <p className="text-xs text-gray-600">
                          {booking.services?.name || "Service"} • {booking.booking_date}
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
                ))
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
