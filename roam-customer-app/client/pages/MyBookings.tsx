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
import { useState, lazy, Suspense } from "react";
import type { BookingWithDetails } from "@/types/index";

// Lazy load EnhancedConversationChat to avoid date-fns import issues on page load
const EnhancedConversationChat = lazy(() => import("@/components/EnhancedConversationChat"));

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

  // Enhanced debug logging to diagnose data issues
  console.log("🔐 MY BOOKINGS PAGE DEBUG:", {
    is_authenticated: !!customer,
    auth_loading: authLoading,
    customer_id: customer?.id,
    customer_email: customer?.email,
    customer_object: customer
  });

  // State for modals
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedBookingForCancel, setSelectedBookingForCancel] =
    useState<BookingWithDetails | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedBookingForReschedule, setSelectedBookingForReschedule] =
    useState<BookingWithDetails | null>(null);
  const [newBookingDate, setNewBookingDate] = useState("");
  const [newBookingTime, setNewBookingTime] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedBookingForMessage, setSelectedBookingForMessage] =
    useState<BookingWithDetails | null>(null);

  // Use modular hooks
  const { bookings, setBookings, loading, error, refreshBookings } = useBookingsData(currentUser);
  
  // Temporarily remove console logs to reduce noise
  
  const {
    filteredBookings,
    paginatedBookings,
    currentPage,
    totalPages,
    nextPage,
    prevPage,
    ITEMS_PER_PAGE,
  } = useBookingFilters(bookings || []);

  // Add defensive programming to handle undefined data
  const safeFilteredBookings = filteredBookings || { present: [], future: [], past: [] };
  const safePaginatedBookings = paginatedBookings || { present: [], future: [], past: [] };
  const safeCurrentPage = currentPage || { present: 1, future: 1, past: 1 };
  const safeTotalPages = totalPages || { present: 1, future: 1, past: 1 };

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
              <Link to="/booknow">
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 text-foreground/70 hover:text-foreground hover:bg-accent/50 px-3 py-2 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Home
                </Button>
              </Link>
            </div>

            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl sm:text-4xl font-bold">
                My <span className="text-roam-blue">Bookings</span>
              </h1>
              <Button
                onClick={() => {
                  console.log("🔄 MANUAL REFRESH TRIGGERED");
                  refreshBookings();
                }}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
            </div>
            <p className="text-lg text-foreground/70 mb-8">
              Manage your service appointments and view your booking history.
            </p>

            {/* Present Service Alert */}
            {safePaginatedBookings.present.length > 0 && (
              <Card className="mb-8 border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                    <div>
                      <h3 className="font-semibold text-blue-900">
                        Current Bookings
                      </h3>
                      <p className="text-sm text-blue-700">
                        You have {safePaginatedBookings.present.length} booking(s) for today or overdue.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Booking Tabs */}
            <Tabs defaultValue="present" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="present" className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Present ({safeFilteredBookings.present.length})
                </TabsTrigger>
                <TabsTrigger value="future" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Future ({safeFilteredBookings.future.length})
                </TabsTrigger>
                <TabsTrigger value="past" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Past ({safeFilteredBookings.past.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="present" className="space-y-4">
                <BookingList
                  bookings={safePaginatedBookings.present}
                  currentPage={safeCurrentPage.present}
                  totalPages={safeTotalPages.present}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onCancel={handleCancel}
                  onReschedule={handleReschedule}
                  onMessage={handleMessage}
                  onRefresh={refreshBookings}
                  onNextPage={() => nextPage("present")}
                  onPrevPage={() => prevPage("present")}
                  onPageChange={(page) => {
                    // This would need to be implemented in the hook
                  }}
                  emptyStateMessage="No current bookings. Your bookings for today or overdue will appear here."
                  emptyStateIcon={CheckCircle}
                />
              </TabsContent>

              <TabsContent value="future" className="space-y-4">
                <BookingList
                  bookings={safePaginatedBookings.future}
                  currentPage={safeCurrentPage.future}
                  totalPages={safeTotalPages.future}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onCancel={handleCancel}
                  onReschedule={handleReschedule}
                  onMessage={handleMessage}
                  onRefresh={refreshBookings}
                  onNextPage={() => nextPage("future")}
                  onPrevPage={() => prevPage("future")}
                  onPageChange={(page) => {
                    // Page change handler
                  }}
                  emptyStateMessage="You don't have any future bookings. Browse our services to book your next appointment."
                  emptyStateIcon={Calendar}
                />
              </TabsContent>

              <TabsContent value="past" className="space-y-4">
                <BookingList
                  bookings={safePaginatedBookings.past}
                  currentPage={safeCurrentPage.past}
                  totalPages={safeTotalPages.past}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onCancel={handleCancel}
                  onReschedule={handleReschedule}
                  onMessage={handleMessage}
                  onRefresh={refreshBookings}
                  onNextPage={() => nextPage("past")}
                  onPrevPage={() => prevPage("past")}
                  onPageChange={(page) => {
                    // Page change handler
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
          setNewBookingDate("");
          setNewBookingTime("");
          setRescheduleReason("");
        }}
        booking={selectedBookingForReschedule}
        newBookingDate={newBookingDate}
        newBookingTime={newBookingTime}
        rescheduleReason={rescheduleReason}
        onNewDateChange={setNewBookingDate}
        onNewTimeChange={setNewBookingTime}
        onRescheduleReasonChange={setRescheduleReason}
        onRescheduleBooking={() => handleRescheduleBooking(newBookingDate, newBookingTime, rescheduleReason)}
        isRescheduling={isRescheduling}
      />

      {/* Messaging Modal */}
      {showMessageModal && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8">
              <Loader2 className="w-8 h-8 animate-spin text-roam-blue mx-auto mb-4" />
              <p>Loading chat...</p>
            </div>
          </div>
        }>
          <EnhancedConversationChat
            isOpen={showMessageModal}
            onClose={() => setShowMessageModal(false)}
            booking={selectedBookingForMessage}
            currentUser={currentUser}
          />
        </Suspense>
      )}
    </div>
  );
}
