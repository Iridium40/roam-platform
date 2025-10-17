import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  User,
  Phone,
  Mail,
  Search,
  Filter,
  Plus,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Star,
  Building,
  Hash,
  MessageCircle,
  UserCheck,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";

interface Booking {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  service_name: string;
  scheduled_time: string;
  duration: number;
  status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled" | "declined" | "no_show";
  location: string;
  price: number;
}

interface BookingWidgetProps {
  data: Booking[];
  onRefresh: () => void;
}

export const BookingWidget: React.FC<BookingWidgetProps> = ({ data, onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("today");

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800" },
      confirmed: { label: "Confirmed", color: "bg-blue-100 text-blue-800" },
      in_progress: { label: "In Progress", color: "bg-purple-100 text-purple-800" },
      completed: { label: "Completed", color: "bg-green-100 text-green-800" },
      cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800" },
      declined: { label: "Declined", color: "bg-gray-100 text-gray-800" },
      no_show: { label: "No Show", color: "bg-orange-100 text-orange-800" },
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const filteredBookings = data.filter((booking) => {
    const matchesSearch = booking.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         booking.service_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || booking.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleStatusUpdate = async (bookingId: string, newStatus: string) => {
    setLoading(true);
    try {
      // TODO: Implement status update API call
      console.log(`Updating booking ${bookingId} to status ${newStatus}`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      onRefresh();
    } catch (error) {
      console.error("Failed to update booking status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    onRefresh();
    setTimeout(() => setLoading(false), 1000);
  };

  const getStatusActions = (status: string) => {
    switch (status) {
      case "pending":
        return [
          { label: "Accept", status: "confirmed", icon: CheckCircle, variant: "default" as const },
          { label: "Decline", status: "declined", icon: XCircle, variant: "destructive" as const },
        ];
      case "confirmed":
        return [
          { label: "Start", status: "in_progress", icon: Clock, variant: "default" as const },
        ];
      case "in_progress":
        return [
          { label: "Complete", status: "completed", icon: CheckCircle, variant: "default" as const },
          { label: "No Show", status: "no_show", icon: AlertCircle, variant: "destructive" as const },
        ];
      default:
        return [];
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Bookings</h2>
          <p className="text-gray-600">Manage appointments and schedules</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Booking
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search bookings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
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
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner text="Loading bookings..." />
            </div>
          ) : filteredBookings.length === 0 ? (
            <EmptyState
              title="No bookings found"
              description="There are no bookings matching your current filters."
              action={{
                label: "Clear Filters",
                onClick: () => {
                  setSearchQuery("");
                  setStatusFilter("all");
                },
              }}
            />
          ) : (
            <div className="grid gap-4">
              {filteredBookings.map((booking) => (
                <Card key={booking.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <CardContent className="p-6">
                    {/* Top Section - Service Info */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-4">
                        {/* Customer Avatar */}
                        <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                          <div className="w-full h-full bg-blue-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-semibold text-lg">
                              {booking.customer_name?.[0] || "C"}
                            </span>
                          </div>
                        </div>
                        
                        {/* Service Details */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {booking.service_name}
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>{booking.scheduled_time}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span>{new Date(booking.scheduled_time).toLocaleTimeString()} ({booking.duration} min)</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Top Right - Price */}
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">
                          ${booking.price}
                        </div>
                      </div>
                    </div>

                    {/* Business & Location Info */}
                    <div className="flex items-start space-x-6 mb-4">
                      <div className="flex items-start space-x-2">
                        <Building className="w-4 h-4 text-gray-500 mt-0.5" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">Business</div>
                          <div className="text-sm text-gray-600">Main Location</div>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-2">
                        <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">Location</div>
                          <div className="text-sm text-gray-600 max-w-xs">
                            <a
                              href={`https://maps.google.com/maps?q=${encodeURIComponent(booking.location)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                              title="Click to open in Google Maps"
                            >
                              {booking.location}
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Customer and Provider Info */}
                    <div className="flex items-start justify-between mb-4">
                      {/* Customer Info */}
                      <div className="flex items-start space-x-2">
                        <User className="w-4 h-4 text-gray-500 mt-0.5" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">Customer</div>
                          <div className="text-sm text-gray-600">{booking.customer_name}</div>
                          {booking.customer_email && (
                            <div className="text-xs text-gray-500 mt-1">{booking.customer_email}</div>
                          )}
                        </div>
                      </div>

                      {/* Provider Info */}
                      <div className="flex items-start space-x-2">
                        <UserCheck className="w-4 h-4 text-gray-500 mt-0.5" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">Provider</div>
                          <div className="text-sm text-gray-600">Provider Name</div>
                        </div>
                      </div>
                    </div>

                    {/* Booking Reference */}
                    <div className="flex items-center space-x-2 mb-4">
                      <Hash className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-900">BOOKING REFERENCE:</span>
                      <span className="text-sm font-bold text-gray-900">
                        BK{Math.random().toString(36).substr(2, 4).toUpperCase()}
                      </span>
                    </div>

                    {/* Status Section */}
                    <div className="mb-4">
                      <div className="text-center mb-2">
                        <p className="text-sm text-gray-600">
                          {booking.status === 'pending' && "Pending - Awaiting your response"}
                          {booking.status === 'confirmed' && "Confirmed - Ready to start"}
                          {booking.status === 'in_progress' && "In Progress - Service ongoing"}
                          {booking.status === 'completed' && "Completed - Service finished"}
                          {booking.status === 'declined' && "Declined - Service declined"}
                          {booking.status === 'no_show' && "No Show - Customer didn't arrive"}
                        </p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ 
                              width: `${booking.status === 'pending' ? 20 : booking.status === 'confirmed' ? 60 : booking.status === 'in_progress' ? 80 : booking.status === 'completed' ? 100 : 0}%` 
                            }}
                          ></div>
                        </div>
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white p-2 h-8 w-8 rounded-lg"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {getStatusActions(booking.status).length > 0 && (
                      <div className="flex items-center justify-center space-x-2 mb-4">
                        {getStatusActions(booking.status).map((action) => {
                          const Icon = action.icon;
                          return (
                            <Button
                              key={action.status}
                              variant={action.variant}
                              size="sm"
                              onClick={() => handleStatusUpdate(booking.id, action.status)}
                              disabled={loading}
                              className="flex items-center space-x-2 px-4 py-2"
                            >
                              <Icon className="w-4 h-4" />
                              <span>{action.label}</span>
                            </Button>
                          );
                        })}
                      </div>
                    )}

                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
