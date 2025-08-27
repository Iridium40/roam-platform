import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
  Clock,
  Star,
  MessageCircle,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface DashboardTabProps {
  providerData: any;
  business: any;
}

export default function DashboardTab({
  providerData,
  business,
}: DashboardTabProps) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Load dashboard data
  const loadDashboardData = async () => {
    if (!providerData) return;

    try {
      setLoading(true);
      const businessId = business?.id || providerData?.business_id;

      // Load bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          services:service_id(*),
          customer:customer_id(*),
          provider:provider_id(*)
        `)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (bookingsError) throw bookingsError;
      setBookings(bookingsData || []);

      // Load staff members
      const { data: staffData, error: staffError } = await supabase
        .from('providers')
        .select('*')
        .eq('business_id', businessId);

      if (staffError) throw staffError;
      setStaffMembers(staffData || []);

      // Load conversations (placeholder - implement when messaging is ready)
      setConversations([]);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
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

  // Calculate stats
  const totalBookings = bookings.length;
  const pendingBookings = bookings.filter(b => b.booking_status === 'pending').length;
  const confirmedBookings = bookings.filter(b => b.booking_status === 'confirmed').length;
  const completedBookings = bookings.filter(b => b.booking_status === 'completed').length;
  const cancelledBookings = bookings.filter(b => b.booking_status === 'cancelled').length;

  const totalRevenue = bookings
    .filter(b => b.booking_status === 'completed')
    .reduce((sum, b) => sum + (b.total_amount || 0), 0);

  const activeStaff = staffMembers.filter(s => s.is_active).length;
  const activeConversations = conversations.filter(c => c.status === 'active').length;

  // Recent bookings (last 5)
  const recentBookings = bookings
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

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
      in_progress: { label: "In Progress", className: "bg-blue-100 text-blue-800 border-blue-300" },
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Bookings</p>
              <p className="text-3xl font-bold text-gray-900">{totalBookings}</p>
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
              <p className="text-3xl font-bold text-gray-900">${totalRevenue.toFixed(2)}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Staff</p>
              <p className="text-3xl font-bold text-gray-900">{activeStaff}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Conversations</p>
              <p className="text-3xl font-bold text-gray-900">{activeConversations}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Booking Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">Pending</p>
            <p className="text-2xl font-bold text-orange-600">{pendingBookings}</p>
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
                  <div key={booking.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(booking.booking_status)}
                      <div>
                        <p className="font-medium text-sm">
                          {booking.customer_profiles?.first_name && booking.customer_profiles?.last_name
                            ? `${booking.customer_profiles.first_name} ${booking.customer_profiles.last_name}`
                            : booking.guest_name || "Guest"}
                        </p>
                        <p className="text-xs text-gray-600">
                          {booking.services?.name || "Service"} • {new Date(booking.booking_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={getStatusBadge(booking.booking_status).className}>
                        {getStatusBadge(booking.booking_status).label}
                      </Badge>
                      <p className="text-sm font-medium mt-1">${booking.total_amount || 0}</p>
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
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900">Pending Bookings</h4>
                <p className="text-sm text-blue-700 mt-1">
                  {pendingBookings} booking{pendingBookings !== 1 ? 's' : ''} awaiting your response
                </p>
              </div>
              
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-medium text-green-900">Today's Schedule</h4>
                <p className="text-sm text-green-700 mt-1">
                  {bookings.filter(b => 
                    b.booking_status === 'confirmed' && 
                    new Date(b.booking_date).toDateString() === new Date().toDateString()
                  ).length} confirmed booking{bookings.filter(b => 
                    b.booking_status === 'confirmed' && 
                    new Date(b.booking_date).toDateString() === new Date().toDateString()
                  ).length !== 1 ? 's' : ''} today
                </p>
              </div>

              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <h4 className="font-medium text-orange-900">Customer Messages</h4>
                <p className="text-sm text-orange-700 mt-1">
                  {conversations.filter(c => c.needs_response).length} conversation{conversations.filter(c => c.needs_response).length !== 1 ? 's' : ''} need{conversations.filter(c => c.needs_response).length !== 1 ? '' : 's'} response
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
