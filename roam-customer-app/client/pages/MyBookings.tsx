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
import { useState } from "react";
import type { BookingWithDetails } from "@/types/index";
import ConversationChat from "@/components/ConversationChat";

// Import modular components and hooks
import {
  CancelBookingModal,
  RescheduleModal,
  BookingList,
} from "./MyBookings/components";
import {
  useBookingsData,
  useBookingFilters,
  useBookingActions,
} from "./MyBookings/hooks";

export default function MyBookings() {
  const { customer, loading: authLoading } = useAuth();
  const currentUser = customer;

  // State for modals
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedBookingForCancel, setSelectedBookingForCancel] =
    useState<BookingWithDetails | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedBookingForReschedule, setSelectedBookingForReschedule] =
    useState<BookingWithDetails | null>(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedBookingForMessage, setSelectedBookingForMessage] =
    useState<BookingWithDetails | null>(null);

  // Use modular hooks
  const { bookings, setBookings, loading, error, refreshBookings } = useBookingsData(currentUser);
  const {
    filteredBookings,
    paginatedBookings,
    currentPage,
    totalPages,
    nextPage,
    prevPage,
    ITEMS_PER_PAGE,
  } = useBookingFilters(bookings);
  const { cancelBooking, rescheduleBooking, isCancelling, isRescheduling } = useBookingActions(
    currentUser,
    setBookings,
    refreshBookings
  );

  // Handler functions
  const handleCancel = (booking: BookingWithDetails) => {
    setSelectedBookingForCancel(booking);
    setCancellationReason("");
    setShowCancelModal(true);
  };

  const handleReschedule = (booking: BookingWithDetails) => {
    setSelectedBookingForReschedule(booking);
    setShowRescheduleModal(true);
  };

  const handleMessage = (booking: BookingWithDetails) => {
    setSelectedBookingForMessage(booking);
    setShowMessageModal(true);
  };

  const handleCancelBooking = async () => {
    if (!selectedBookingForCancel) return;
    
    await cancelBooking(selectedBookingForCancel, cancellationReason);
    setShowCancelModal(false);
    setSelectedBookingForCancel(null);
    setCancellationReason("");
  };

  const handleRescheduleBooking = async (newDate: string, newTime: string, reason: string) => {
    if (!selectedBookingForReschedule) return;
    
    await rescheduleBooking(selectedBookingForReschedule, newDate, newTime, reason);
    setShowRescheduleModal(false);
    setSelectedBookingForReschedule(null);
  };

  // Show loading state
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

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Bookings</h2>
          <p className="text-foreground/70 mb-6">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            className="bg-roam-blue hover:bg-roam-blue/90"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10">
      {/* Header */}
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
            {paginatedBookings.active.length > 0 && (
              <Card className="mb-8 border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                    <div>
                      <h3 className="font-semibold text-blue-900">
                        Active Service in Progress
                      </h3>
                      <p className="text-sm text-blue-700">
                        You have {paginatedBookings.active.length} active service(s) right now.
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
                  Upcoming ({filteredBookings.upcoming.length})
                </TabsTrigger>
                <TabsTrigger value="active" className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Active ({filteredBookings.active.length})
                </TabsTrigger>
                <TabsTrigger value="past" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Past ({filteredBookings.past.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upcoming" className="space-y-4">
                <BookingList
                  bookings={paginatedBookings.upcoming}
                  currentPage={currentPage.upcoming}
                  totalPages={totalPages.upcoming}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onCancel={handleCancel}
                  onReschedule={handleReschedule}
                  onMessage={handleMessage}
                  onNextPage={() => nextPage("upcoming")}
                  onPrevPage={() => prevPage("upcoming")}
                  onPageChange={(page) => {
                    // This would need to be implemented in the hook
                    console.log("Page change to:", page);
                  }}
                  emptyStateMessage="You don't have any upcoming bookings. Browse our services to book your next appointment."
                  emptyStateIcon={Calendar}
                />
              </TabsContent>

              <TabsContent value="active" className="space-y-4">
                <BookingList
                  bookings={paginatedBookings.active}
                  currentPage={currentPage.active}
                  totalPages={totalPages.active}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onCancel={handleCancel}
                  onReschedule={handleReschedule}
                  onMessage={handleMessage}
                  onNextPage={() => nextPage("active")}
                  onPrevPage={() => prevPage("active")}
                  onPageChange={(page) => {
                    console.log("Page change to:", page);
                  }}
                  emptyStateMessage="No active services at the moment. Your upcoming bookings will appear here when they start."
                  emptyStateIcon={CheckCircle}
                />
              </TabsContent>

              <TabsContent value="past" className="space-y-4">
                <BookingList
                  bookings={paginatedBookings.past}
                  currentPage={currentPage.past}
                  totalPages={totalPages.past}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onCancel={handleCancel}
                  onReschedule={handleReschedule}
                  onMessage={handleMessage}
                  onNextPage={() => nextPage("past")}
                  onPrevPage={() => prevPage("past")}
                  onPageChange={(page) => {
                    console.log("Page change to:", page);
                  }}
                  emptyStateMessage="No past bookings found. Your completed and cancelled bookings will appear here."
                  emptyStateIcon={Clock}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </section>

      {/* Cancellation Modal */}
      <CancelBookingModal
        isOpen={showCancelModal}
        onClose={() => {
          setShowCancelModal(false);
          setSelectedBookingForCancel(null);
          setCancellationReason("");
        }}
        booking={selectedBookingForCancel}
        cancellationReason={cancellationReason}
        onCancellationReasonChange={setCancellationReason}
        onCancelBooking={handleCancelBooking}
        isCancelling={isCancelling}
      />

      {/* Reschedule Modal */}
      <RescheduleModal
        isOpen={showRescheduleModal}
        onClose={() => {
          setShowRescheduleModal(false);
          setSelectedBookingForReschedule(null);
        }}
        booking={selectedBookingForReschedule}
        onReschedule={handleRescheduleBooking}
        isRescheduling={isRescheduling}
      />

      {/* Messaging Modal */}
      <ConversationChat
        isOpen={showMessageModal}
        onClose={() => setShowMessageModal(false)}
        booking={
          selectedBookingForMessage
            ? {
                id: selectedBookingForMessage.id,
                customer_name:
                  `${currentUser?.first_name || ""} ${currentUser?.last_name || ""}`.trim() ||
                  "Customer",
                customer_email: currentUser?.email || "",
                customer_phone: currentUser?.phone || "",
                service_name: selectedBookingForMessage.service_name || "Service",
                provider_name:
                  `${selectedBookingForMessage.providers?.first_name || ""} ${selectedBookingForMessage.providers?.last_name || ""}`.trim() || "Provider",
                business_id: selectedBookingForMessage.business_id || "",
                customer_id: selectedBookingForMessage.customer_id,
                // Include the actual database profile objects
                customer_profiles: selectedBookingForMessage.customer_profiles,
                providers: selectedBookingForMessage.providers,
              }
            : undefined
        }
      />
    </div>
  );
}
