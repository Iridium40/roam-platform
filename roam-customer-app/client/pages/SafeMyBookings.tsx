import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Loader2,
  Clock,
  Calendar,
  MessageCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import type { BookingWithDetails } from "@/types/index";

// Simplified booking interface for mock data
interface SimpleBooking {
  id: string;
  service_name: string;
  provider_name: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  booking_status: 'confirmed' | 'pending' | 'in_progress' | 'completed' | 'cancelled';
  total_amount: number;
}

// Safe wrapper for the original MyBookings components
const SafeMyBookings = () => {
  const { customer, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<SimpleBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mock data for now - you can replace this with real data fetching later
  const mockBookings: SimpleBooking[] = [
    {
      id: "1",
      service_name: "Hair Styling",
      provider_name: "Jane Smith",
      booking_date: "2025-10-15",
      start_time: "10:00:00",
      end_time: "11:00:00",
      booking_status: "confirmed",
      total_amount: 85.00,
    },
    {
      id: "2",
      service_name: "Massage Therapy",
      provider_name: "Mike Johnson",
      booking_date: "2025-10-20", 
      start_time: "14:30:00",
      end_time: "16:00:00",
      booking_status: "pending",
      total_amount: 120.00,
    },
    {
      id: "3",
      service_name: "Manicure",
      provider_name: "Sarah Wilson",
      booking_date: "2025-10-05",
      start_time: "09:00:00", 
      end_time: "10:30:00",
      booking_status: "completed",
      total_amount: 75.00,
    }
  ];

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setBookings(mockBookings);
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [customer]);

  // Categorize bookings
  const categorizeBookings = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const upcoming = bookings.filter(booking => {
      const bookingDate = new Date(booking.booking_date);
      return bookingDate >= today && ['confirmed', 'pending'].includes(booking.booking_status);
    });
    
    const active = bookings.filter(booking => {
      return booking.booking_status === 'in_progress';
    });
    
    const past = bookings.filter(booking => {
      const bookingDate = new Date(booking.booking_date);
      return bookingDate < today || ['completed', 'cancelled'].includes(booking.booking_status);
    });

    return { upcoming, active, past };
  };

  const { upcoming, active, past } = categorizeBookings();

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-roam-blue mx-auto mb-4" />
          <p className="text-lg font-semibold">Loading your bookings...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please Sign In</h1>
          <p className="mb-4">You need to be signed in to view your bookings.</p>
          <Link to="/sign-in">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  const BookingCard = ({ booking }: { booking: SimpleBooking }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">{booking.service_name}</h3>
            <p className="text-gray-600">Provider: {booking.provider_name}</p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {booking.booking_date} at {booking.start_time}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                booking.booking_status === 'confirmed' 
                  ? 'bg-green-100 text-green-700'
                  : booking.booking_status === 'pending'
                  ? 'bg-yellow-100 text-yellow-700' 
                  : booking.booking_status === 'completed'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {booking.booking_status}
              </span>
              <span className="font-semibold text-roam-blue">
                ${booking.total_amount.toFixed(2)}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <MessageCircle className="w-4 h-4 mr-1" />
              Message
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const EmptyState = ({ message, icon: Icon }: { message: string; icon: any }) => (
    <div className="text-center py-12">
      <Icon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-gray-600 mb-2">No bookings found</h3>
      <p className="text-gray-500 mb-6">{message}</p>
      <Link to="/">
        <Button>Browse Services</Button>
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10">
      <section className="py-8 lg:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            {/* Back to Home Button */}
            <div className="mb-6">
              <Link to="/">
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 text-foreground/70 hover:text-foreground hover:bg-accent/50 px-3 py-2 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Home
                </Button>
              </Link>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold mb-4">
              My <span className="text-roam-blue">Bookings</span>
            </h1>
            <p className="text-lg text-foreground/70 mb-8">
              Manage your service appointments and view your booking history.
            </p>

            {/* Active Service Alert */}
            {active.length > 0 && (
              <Card className="mb-8 border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                    <div>
                      <h3 className="font-semibold text-blue-900">
                        Active Service in Progress
                      </h3>
                      <p className="text-sm text-blue-700">
                        You have {active.length} active service(s) right now.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Booking Tabs */}
            <Tabs defaultValue="upcoming" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="upcoming" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Upcoming ({upcoming.length})
                </TabsTrigger>
                <TabsTrigger value="active" className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Active ({active.length})
                </TabsTrigger>
                <TabsTrigger value="past" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Past ({past.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upcoming" className="space-y-4">
                {upcoming.length > 0 ? (
                  upcoming.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} />
                  ))
                ) : (
                  <EmptyState
                    message="You don't have any upcoming bookings. Browse our services to book your next appointment."
                    icon={Calendar}
                  />
                )}
              </TabsContent>

              <TabsContent value="active" className="space-y-4">
                {active.length > 0 ? (
                  active.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} />
                  ))
                ) : (
                  <EmptyState
                    message="No active services at the moment. Your upcoming bookings will appear here when they start."
                    icon={CheckCircle}
                  />
                )}
              </TabsContent>

              <TabsContent value="past" className="space-y-4">
                {past.length > 0 ? (
                  past.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} />
                  ))
                ) : (
                  <EmptyState
                    message="No past bookings found. Your completed and cancelled bookings will appear here."
                    icon={Clock}
                  />
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SafeMyBookings;