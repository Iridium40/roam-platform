import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Loader2,
  Clock,
  Calendar,
  MessageCircle,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import type { BookingWithDetails } from "@/types/index";
import ConversationChat from "@/components/ConversationChat";

// Import the fixed data hook
import { useBookingsDataFixed } from "./MyBookings/hooks/useBookingsDataFixed";

export default function MyBookingsFixed() {
  const { customer, loading: authLoading } = useAuth();
  const currentUser = customer;

  // State for modals
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedBookingForMessage, setSelectedBookingForMessage] =
    useState<BookingWithDetails | null>(null);

  // Use the fixed data hook
  const { bookings, loading, error, refreshBookings } = useBookingsDataFixed(currentUser);

  // Categorize bookings based on current date and status
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
      return bookingDate < today || ['completed', 'cancelled', 'no_show'].includes(booking.booking_status);
    });

    return { upcoming, active, past };
  };

  const { upcoming, active, past } = categorizeBookings();

  // Handle messaging
  const handleMessage = (booking: BookingWithDetails) => {
    setSelectedBookingForMessage(booking);
    setShowMessageModal(true);
  };

  // Handle refresh
  const handleRefresh = () => {
    refreshBookings();
  };

  // Loading state
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

  // Authentication check
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

  // Error state with retry option
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">Unable to Load Bookings</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-4">
            <Button onClick={handleRefresh} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Link to="/">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const BookingCard = ({ booking }: { booking: BookingWithDetails }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="space-y-2 flex-1">
            <h3 className="text-lg font-semibold">{booking.service_name}</h3>
            <p className="text-gray-600">Provider: {booking.providers ? `${booking.providers.first_name} ${booking.providers.last_name}`.trim() : 'Unknown Provider'}</p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {booking.booking_date} at {booking.start_time}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {booking.duration}
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
                  : booking.booking_status === 'in_progress'
                  ? 'bg-purple-100 text-purple-700'
                  : booking.booking_status === 'cancelled'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {booking.booking_status.replace('_', ' ')}
              </span>
              <span className="font-semibold text-roam-blue">
                {booking.price}
              </span>
            </div>
            {booking.admin_notes && (
              <p className="text-sm text-gray-500 italic">Note: {booking.admin_notes}</p>
            )}
          </div>
          <div className="flex flex-col gap-2 ml-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleMessage(booking)}
              className="flex items-center gap-1"
            >
              <MessageCircle className="w-4 h-4" />
              Message
            </Button>
            {booking.booking_status === 'confirmed' && (
              <Button variant="outline" size="sm" className="text-orange-600 border-orange-200">
                Reschedule
              </Button>
            )}
            {['pending', 'confirmed'].includes(booking.booking_status) && (
              <Button variant="outline" size="sm" className="text-red-600 border-red-200">
                Cancel
              </Button>
            )}
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

            {/* Header */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold mb-4">
                  My <span className="text-roam-blue">Bookings</span>
                </h1>
                <p className="text-lg text-foreground/70">
                  Manage your service appointments and view your booking history.
                </p>
              </div>
              <Button 
                onClick={handleRefresh}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
            </div>

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

      {/* Message Modal */}
      <Dialog open={showMessageModal} onOpenChange={setShowMessageModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              Message Provider - {selectedBookingForMessage?.service_name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {selectedBookingForMessage && (
              <ConversationChat
                booking={selectedBookingForMessage}
                isOpen={showMessageModal}
                onClose={() => setShowMessageModal(false)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}