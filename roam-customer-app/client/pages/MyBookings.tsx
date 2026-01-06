import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Loader2,
  Clock,
  Calendar,
  MessageCircle,
  Search,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useState, lazy, Suspense } from "react";
import { logger } from "@/utils/logger";
import { ChatErrorBoundary } from "@/components/ErrorBoundary";
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
import { Footer } from "@/components/Footer";

export default function MyBookings() {
  const { customer, loading: authLoading } = useAuth();
  const currentUser = customer;

  logger.debug("MyBookings page state:", {
    is_authenticated: !!customer,
    auth_loading: authLoading,
    customer_id: customer?.id,
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
    goToPage,
    ITEMS_PER_PAGE,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
  } = useBookingFilters(bookings || []);

  // Add defensive programming to handle undefined data
  const safeFilteredBookings = filteredBookings || { active: [], closed: [] };
  const safePaginatedBookings = paginatedBookings || { active: [], closed: [] };
  const safeCurrentPage = currentPage || { active: 1, closed: 1 };
  const safeTotalPages = totalPages || { active: 1, closed: 1 };

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
                  logger.debug("Manual refresh triggered");
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

            {/* Search and Filter Section */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Search Bar */}
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search by service, provider, booking reference..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  {/* Status Filter Dropdown */}
                  <div className="sm:w-48">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
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
                </div>
              </CardContent>
            </Card>

            {/* Booking Tabs */}
            <Tabs defaultValue="active" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 h-12">
                <TabsTrigger 
                  value="active" 
                  className="flex items-center gap-2 data-[state=active]:bg-gray-800 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
                >
                  <CheckCircle className="w-4 h-4" />
                  Active Bookings ({safeFilteredBookings.active.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="closed" 
                  className="flex items-center gap-2 data-[state=active]:bg-gray-800 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
                >
                  <Clock className="w-4 h-4" />
                  Closed Bookings ({safeFilteredBookings.closed.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="space-y-4">
                <BookingList
                  bookings={safePaginatedBookings.active}
                  currentPage={safeCurrentPage.active}
                  totalPages={safeTotalPages.active}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onCancel={handleCancel}
                  onReschedule={handleReschedule}
                  onMessage={handleMessage}
                  onRefresh={refreshBookings}
                  onNextPage={() => nextPage("active")}
                  onPrevPage={() => prevPage("active")}
                  onPageChange={(page) => {
                    goToPage("active", page);
                  }}
                  emptyStateMessage="No active bookings. All bookings that are pending, confirmed, or in progress will appear here."
                  emptyStateIcon={CheckCircle}
                />
              </TabsContent>

              <TabsContent value="closed" className="space-y-4">
                <BookingList
                  bookings={safePaginatedBookings.closed}
                  currentPage={safeCurrentPage.closed}
                  totalPages={safeTotalPages.closed}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onCancel={handleCancel}
                  onReschedule={handleReschedule}
                  onMessage={handleMessage}
                  onRefresh={refreshBookings}
                  onNextPage={() => nextPage("closed")}
                  onPrevPage={() => prevPage("closed")}
                  onPageChange={(page) => {
                    goToPage("closed", page);
                  }}
                  emptyStateMessage="No closed bookings found. Your completed, cancelled, and declined bookings will appear here."
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
        <ChatErrorBoundary>
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
        </ChatErrorBoundary>
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
}
