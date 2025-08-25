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
  status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";
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
                <Card key={booking.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold text-lg">{booking.customer_name}</h3>
                          {getStatusBadge(booking.status)}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(booking.scheduled_time).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4" />
                            <span>{new Date(booking.scheduled_time).toLocaleTimeString()}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-4 h-4" />
                            <span>{booking.location}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">${booking.price}</span>
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-gray-500">
                          <p>{booking.service_name} • {booking.duration} minutes</p>
                        </div>
                      </div>
                      <div className="flex flex-col space-y-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusUpdate(booking.id, "confirmed")}
                          disabled={loading}
                        >
                          Confirm
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusUpdate(booking.id, "cancelled")}
                          disabled={loading}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
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
