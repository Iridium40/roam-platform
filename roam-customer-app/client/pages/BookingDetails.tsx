import { useState, useEffect, lazy, Suspense } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Star,
  Building,
  Car,
  Video,
  Hash,
  MessageCircle,
  Edit,
  X,
  CreditCard,
  Plus,
  CheckCircle,
  DollarSign,
  Receipt,
  Heart,
  Package,
  Loader2,
  AlertCircle,
  User,
  Phone,
  Mail,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { BookingWithDetails } from "@/types/index";
import { Footer } from "@/components/Footer";

// Lazy load modals
const EnhancedConversationChat = lazy(() => import("@/components/EnhancedConversationChat"));
import { CancelBookingModal, RescheduleModal } from "./MyBookings/components";
import ReviewAndTipModal from "./MyBookings/components/ReviewAndTipModal";
import { AddMoreServiceModal } from "./MyBookings/components/AddMoreServiceModal";

// Types for additional data
interface Transaction {
  id: string;
  booking_id: string;
  amount: number;
  currency: string;
  payment_method: string | null;
  description: string | null;
  transaction_type: string | null;
  status: string | null;
  created_at: string;
  processed_at: string | null;
  metadata?: any;
}

interface BookingChange {
  id: string;
  booking_id: string;
  change_type: string;
  additional_cost: number | null;
  refund_amount: number | null;
  change_reason: string | null;
  old_value: any;
  new_value: any;
  created_at: string;
}

interface BookingAddon {
  id: string;
  booking_id: string;
  addon_id: string;
  added_at: string;
  service_addons?: {
    id: string;
    name: string;
    description: string | null;
    image_url: string | null;
  };
  business_addons?: {
    custom_price: number | null;
  }[];
}

// Helper functions
const getDeliveryIcon = (type: string) => {
  const icons = {
    mobile: Car,
    business_location: Building,
    virtual: Video,
  };
  return icons[type as keyof typeof icons] || Car;
};

const getDeliveryTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    mobile: "Mobile Service",
    business_location: "At Business Location",
    virtual: "Virtual Service",
    customer_location: "At Your Location",
  };
  return labels[type] || type;
};

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    confirmed: "bg-blue-100 text-blue-800 border-blue-200",
    in_progress: "bg-purple-100 text-purple-800 border-purple-200",
    completed: "bg-green-100 text-green-800 border-green-200",
    cancelled: "bg-red-100 text-red-800 border-red-200",
    declined: "bg-gray-100 text-gray-800 border-gray-200",
    no_show: "bg-orange-100 text-orange-800 border-orange-200",
  };
  return colors[status] || "bg-gray-100 text-gray-800 border-gray-200";
};

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: "Awaiting Confirmation",
    confirmed: "Confirmed",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
    declined: "Declined",
    no_show: "No Show",
  };
  return labels[status] || status;
};

const formatCurrency = (amount: number | string | null | undefined) => {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  if (numAmount == null || isNaN(numAmount)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(numAmount);
};

const isWithin24Hours = (booking: BookingWithDetails) => {
  const bookingDateTime = new Date(`${booking.booking_date || booking.date} ${booking.start_time || booking.time}`);
  const now = new Date();
  const diffInHours = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  return diffInHours <= 24 && diffInHours > 0;
};

export default function BookingDetails() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { customer, loading: authLoading } = useAuth();
  const { toast } = useToast();

  // State
  const [booking, setBooking] = useState<BookingWithDetails | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bookingChanges, setBookingChanges] = useState<BookingChange[]>([]);
  const [bookingAddons, setBookingAddons] = useState<BookingAddon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [showAddMoreModal, setShowAddMoreModal] = useState(false);

  // Action states
  const [isCancelling, setIsCancelling] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [newBookingDate, setNewBookingDate] = useState("");
  const [newBookingTime, setNewBookingTime] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");

  // Fetch booking data
  const fetchBookingDetails = async () => {
    if (!bookingId || !customer) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch booking with all related data
      const { data: bookingData, error: bookingError } = await supabase
        .from("bookings")
        .select(`
          *,
          providers!left (
            id,
            user_id,
            first_name,
            last_name,
            email,
            phone,
            image_url,
            business_id,
            average_rating
          ),
          services!left (
            id,
            name,
            description,
            min_price,
            duration_minutes,
            image_url
          ),
          customer_profiles!left (
            id,
            first_name,
            last_name,
            email,
            phone
          ),
          business_locations!left (
            id,
            business_id,
            location_name,
            address_line1,
            address_line2,
            city,
            state,
            postal_code,
            country,
            is_primary,
            offers_mobile_services
          ),
          business_profiles!left (
            id,
            business_name,
            business_type,
            business_description,
            image_url,
            logo_url
          ),
          customer_locations!left (
            id,
            customer_id,
            location_name,
            street_address,
            unit_number,
            city,
            state,
            zip_code,
            is_primary,
            access_instructions
          ),
          reviews!left (
            id,
            overall_rating,
            service_rating,
            communication_rating,
            punctuality_rating,
            review_text,
            created_at
          ),
          tips!left (
            id,
            tip_amount,
            tip_percentage,
            customer_message,
            payment_status,
            created_at
          )
        `)
        .eq("id", bookingId)
        .eq("customer_id", customer.id)
        .single();

      if (bookingError) {
        console.error("Error fetching booking:", bookingError);
        throw new Error("Booking not found or you don't have access to it.");
      }

      // Fetch reviews separately (more reliable than join)
      const { data: reviewsData, error: reviewsError } = await supabase
        .from("reviews")
        .select("*")
        .eq("booking_id", bookingId);

      if (reviewsError) {
        console.error("Error fetching reviews:", reviewsError);
      }

      // Fetch tips separately (more reliable than join)
      const { data: tipsData, error: tipsError } = await supabase
        .from("tips")
        .select("*")
        .eq("booking_id", bookingId);

      if (tipsError) {
        console.error("Error fetching tips:", tipsError);
      }

      // Transform booking data with explicitly fetched reviews and tips
      const transformedBooking: BookingWithDetails = {
        ...bookingData,
        service_name: bookingData.services?.name || "Service",
        date: bookingData.booking_date,
        time: bookingData.start_time,
        status: bookingData.booking_status,
        deliveryType: bookingData.delivery_type,
        duration: bookingData.services?.duration_minutes
          ? `${bookingData.services.duration_minutes} min`
          : "60 min",
        // Use explicitly fetched reviews and tips instead of relying on join
        reviews: reviewsData || [],
        tips: tipsData || [],
      };

      console.log("📋 Booking Details loaded:", {
        bookingId,
        reviewsCount: reviewsData?.length || 0,
        tipsCount: tipsData?.length || 0,
        reviews: reviewsData,
        tips: tipsData,
      });

      setBooking(transformedBooking);

      // Fetch transactions for this booking
      const { data: txData, error: txError } = await supabase
        .from("financial_transactions")
        .select("*")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false });

      if (!txError) {
        setTransactions(txData || []);
      }

      // Fetch booking changes (additional services, reschedules, etc.)
      const { data: changesData, error: changesError } = await supabase
        .from("booking_changes")
        .select("*")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false });

      if (!changesError) {
        setBookingChanges(changesData || []);
      }

      // Fetch booking addons (addons selected during initial booking)
      const { data: addonsData, error: addonsError } = await supabase
        .from("booking_addons")
        .select(`
          *,
          service_addons (
            id,
            name,
            description,
            image_url
          )
        `)
        .eq("booking_id", bookingId)
        .order("added_at", { ascending: true });

      if (!addonsError) {
        // Fetch business addon prices if available
        if (addonsData && addonsData.length > 0 && bookingData.business_id) {
          const addonIds = addonsData.map((a: any) => a.addon_id);
          const { data: businessAddonPrices } = await supabase
            .from("business_addons")
            .select("addon_id, custom_price")
            .eq("business_id", bookingData.business_id)
            .in("addon_id", addonIds);

          // Merge business prices with addons
          const addonsWithPrices = addonsData.map((addon: any) => ({
            ...addon,
            business_addons: businessAddonPrices?.filter((ba: any) => ba.addon_id === addon.addon_id) || [],
          }));
          setBookingAddons(addonsWithPrices);
        } else {
          setBookingAddons(addonsData || []);
        }
      }
    } catch (err: any) {
      console.error("Error loading booking details:", err);
      setError(err.message || "Failed to load booking details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (customer && bookingId) {
      fetchBookingDetails();
    }
  }, [customer, bookingId]);

  // Action handlers
  const handleCancelBooking = async () => {
    if (!booking) return;

    try {
      setIsCancelling(true);

      const { error } = await supabase
        .from("bookings")
        .update({
          booking_status: "cancelled",
          cancellation_reason: cancellationReason,
          cancelled_at: new Date().toISOString(),
          cancelled_by: customer?.user_id,
        })
        .eq("id", booking.id);

      if (error) throw error;

      toast({
        title: "Booking Cancelled",
        description: "Your booking has been cancelled successfully.",
      });

      setShowCancelModal(false);
      setCancellationReason("");
      fetchBookingDetails();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to cancel booking.",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleRescheduleBooking = async () => {
    if (!booking || !newBookingDate || !newBookingTime) return;

    try {
      setIsRescheduling(true);

      const { error } = await supabase
        .from("bookings")
        .update({
          booking_date: newBookingDate,
          start_time: newBookingTime,
          reschedule_count: (booking.reschedule_count || 0) + 1,
          original_booking_date: booking.original_booking_date || booking.booking_date,
          original_start_time: booking.original_start_time || booking.start_time,
          reschedule_reason: rescheduleReason,
        })
        .eq("id", booking.id);

      if (error) throw error;

      toast({
        title: "Booking Rescheduled",
        description: "Your booking has been rescheduled successfully.",
      });

      setShowRescheduleModal(false);
      setNewBookingDate("");
      setNewBookingTime("");
      setRescheduleReason("");
      fetchBookingDetails();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to reschedule booking.",
        variant: "destructive",
      });
    } finally {
      setIsRescheduling(false);
    }
  };

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-roam-blue mx-auto mb-4" />
          <p className="text-lg font-semibold">Loading booking details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Booking Not Found</h2>
          <p className="text-foreground/70 mb-6">{error || "The booking you're looking for doesn't exist or you don't have access to it."}</p>
          <Link to="/my-bookings">
            <Button className="bg-roam-blue hover:bg-roam-blue/90">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to My Bookings
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const DeliveryIcon = getDeliveryIcon(booking.delivery_type || booking.deliveryType || "mobile");
  const deliveryLabel = getDeliveryTypeLabel(booking.delivery_type || booking.deliveryType || "mobile");

  const canCancelBooking =
    (booking.booking_status === "pending" || booking.booking_status === "confirmed") &&
    !isWithin24Hours(booking);

  const isPastBooking =
    booking.booking_status === "completed" ||
    booking.booking_status === "cancelled" ||
    booking.booking_status === "no_show" ||
    booking.booking_status === "declined";

  const hasReview = booking.reviews && booking.reviews.length > 0;
  const hasTip = booking.tips && booking.tips.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10">
      {/* Header */}
      <section className="py-6 lg:py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            {/* Back Button */}
            <div className="mb-6 flex items-center justify-between">
              <Link to="/my-bookings">
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 text-foreground/70 hover:text-foreground hover:bg-accent/50"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to My Bookings
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchBookingDetails}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
            </div>

            {/* Page Title */}
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold">
                Booking <span className="text-roam-blue">Details</span>
              </h1>
              {booking.booking_reference && (
                <p className="text-foreground/60 mt-1 flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  Reference: <span className="font-mono font-semibold">{booking.booking_reference}</span>
                </p>
              )}
            </div>

            {/* Main Content Grid */}
            <div className="grid gap-6">
              {/* Review & Tip Call-to-Action Banner for Completed Bookings */}
              {booking.booking_status === "completed" && (!hasReview || !hasTip) && (
                <Card className="bg-gradient-to-r from-roam-blue/10 to-purple-100 border-roam-blue/20">
                  <CardContent className="py-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-full">
                          {!hasReview ? (
                            <Star className="w-6 h-6 text-roam-blue" />
                          ) : (
                            <Heart className="w-6 h-6 text-pink-500" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {!hasReview && !hasTip
                              ? "How was your experience?"
                              : !hasReview
                              ? "Share your feedback!"
                              : "Show your appreciation!"}
                          </h3>
                          <p className="text-sm text-foreground/70">
                            {!hasReview && !hasTip
                              ? "Leave a review and send a tip to your provider"
                              : !hasReview
                              ? "Your review helps others find great providers"
                              : "Send a tip to thank your provider"}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!hasReview && (
                          <Button
                            onClick={() => setShowReviewModal(true)}
                            className="bg-roam-blue hover:bg-roam-blue/90"
                          >
                            <Star className="w-4 h-4 mr-2" />
                            Leave Review
                          </Button>
                        )}
                        {!hasTip && (
                          <Button
                            variant="outline"
                            className="border-pink-500 text-pink-600 hover:bg-pink-50"
                            onClick={() => setShowTipModal(true)}
                          >
                            <Heart className="w-4 h-4 mr-2" />
                            Send Tip
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Booking Overview Card */}
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Package className="w-5 h-5 text-roam-blue" />
                      Booking Overview
                    </CardTitle>
                    <Badge className={getStatusColor(booking.booking_status)}>
                      {getStatusLabel(booking.booking_status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Service Info */}
                  <div className="flex items-start gap-4">
                    <Avatar className="w-16 h-16 flex-shrink-0">
                      <AvatarImage
                        src={booking.services?.image_url}
                        alt={booking.service_name}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-gradient-to-br from-roam-blue to-roam-light-blue text-white text-lg font-semibold">
                        {booking.service_name?.[0]?.toUpperCase() || "S"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold text-xl">{booking.service_name}</h3>
                      <p className="text-foreground/60">
                        with {booking.providers?.first_name} {booking.providers?.last_name}
                      </p>
                      {booking.providers?.average_rating && (
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="w-4 h-4 text-roam-warning fill-current" />
                          <span className="text-sm">{booking.providers.average_rating}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-roam-blue">
                        {formatCurrency(booking.total_amount)}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Schedule & Location */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Schedule */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm text-foreground/70 uppercase tracking-wide">Schedule</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-5 h-5 text-roam-blue" />
                          <span>
                            {booking.booking_date
                              ? format(new Date(booking.booking_date), "EEEE, MMMM d, yyyy")
                              : "Date not set"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Clock className="w-5 h-5 text-roam-blue" />
                          <span>{booking.start_time || "Time not set"}</span>
                          <span className="text-foreground/60">({booking.duration})</span>
                        </div>
                      </div>
                    </div>

                    {/* Location */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm text-foreground/70 uppercase tracking-wide">Location</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <DeliveryIcon className="w-5 h-5 text-roam-blue" />
                          <span className="font-medium">{deliveryLabel}</span>
                        </div>
                        {booking.delivery_type === "business_location" && booking.business_locations && (
                          <button
                            onClick={() => {
                              const address = `${booking.business_locations!.address_line1}, ${booking.business_locations!.city}, ${booking.business_locations!.state}`;
                              window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, "_blank");
                            }}
                            className="text-sm text-roam-blue hover:underline flex items-center gap-1"
                          >
                            <MapPin className="w-4 h-4" />
                            {booking.business_locations.address_line1}, {booking.business_locations.city}, {booking.business_locations.state}
                          </button>
                        )}
                        {booking.delivery_type === "mobile" && booking.customer_locations && (
                          <button
                            onClick={() => {
                              const address = `${booking.customer_locations!.street_address}, ${booking.customer_locations!.city}, ${booking.customer_locations!.state}`;
                              window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, "_blank");
                            }}
                            className="text-sm text-roam-blue hover:underline flex items-center gap-1"
                          >
                            <MapPin className="w-4 h-4" />
                            {booking.customer_locations.street_address}, {booking.customer_locations.city}, {booking.customer_locations.state}
                          </button>
                        )}
                        {booking.delivery_type === "virtual" && (
                          <p className="text-sm text-foreground/60">Virtual service - link will be provided</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Business Info */}
                  {booking.business_profiles?.business_name && (
                    <>
                      <Separator />
                      <div className="flex items-center gap-3">
                        {booking.business_profiles.logo_url ? (
                          <img
                            src={booking.business_profiles.logo_url}
                            alt={booking.business_profiles.business_name}
                            className="w-10 h-10 rounded object-cover"
                          />
                        ) : (
                          <Building className="w-5 h-5 text-roam-blue" />
                        )}
                        <div>
                          <p className="text-xs text-foreground/60 uppercase tracking-wide">Business</p>
                          <p className="font-medium">{booking.business_profiles.business_name}</p>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Action Buttons - Vertical stacked like booking cards */}
                  <Separator />
                  <div className="space-y-2">
                    {/* In Progress Booking Actions */}
                    {booking.booking_status === "in_progress" && (
                      <div className="grid grid-cols-2 gap-2">
                        {/* Message Button */}
                        <Button
                          onClick={() => setShowMessageModal(true)}
                          className="bg-roam-blue hover:bg-roam-blue/90"
                        >
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Message Provider
                        </Button>
                        
                        {/* Add More Services Button */}
                        <Button
                          variant="outline"
                          className="border-purple-500 text-purple-600 hover:bg-purple-50"
                          onClick={() => setShowAddMoreModal(true)}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add More Services
                        </Button>
                      </div>
                    )}

                    {/* Pending/Confirmed Booking Actions */}
                    {!isPastBooking && (booking.booking_status === "pending" || booking.booking_status === "confirmed") && (
                      <div className="space-y-2">
                        {/* Message Button - Full Width */}
                        <Button
                          onClick={() => setShowMessageModal(true)}
                          className="w-full bg-roam-blue hover:bg-roam-blue/90"
                        >
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Message Provider
                        </Button>
                        
                        {/* Reschedule & Cancel Buttons - Side by Side */}
                        <div className="grid grid-cols-2 gap-2">
                          {/* Reschedule Button */}
                          <Button
                            variant="outline"
                            className="border-gray-300 text-gray-700 hover:bg-gray-50"
                            onClick={() => setShowRescheduleModal(true)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Reschedule
                          </Button>
                          
                          {/* Cancel Button */}
                          {canCancelBooking ? (
                            <Button
                              variant="outline"
                              className="border-red-200 text-red-600 hover:bg-red-50"
                              onClick={() => setShowCancelModal(true)}
                            >
                              <X className="w-4 h-4 mr-2" />
                              Cancel
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              className="border-gray-200 text-gray-400 cursor-not-allowed"
                              disabled
                              title="Cannot cancel within 24 hours of appointment"
                            >
                              <X className="w-4 h-4 mr-2" />
                              24h Lock
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Past Booking Actions (completed, cancelled, etc.) */}
                    {isPastBooking && (
                      <Button
                        onClick={() => setShowMessageModal(true)}
                        className="w-full bg-roam-blue hover:bg-roam-blue/90"
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Message Provider
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Financial Summary Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-roam-blue" />
                    Financial Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-foreground/60 mb-1">Total Amount</p>
                      <p className="text-xl font-bold">{formatCurrency(booking.total_amount)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-foreground/60 mb-1">Service Fee</p>
                      <p className="text-xl font-bold">{formatCurrency(booking.service_fee)}</p>
                      <Badge variant={booking.service_fee_charged ? "default" : "outline"} className="mt-1 text-xs">
                        {booking.service_fee_charged ? "Charged" : "Pending"}
                      </Badge>
                    </div>
                    {(booking.remaining_balance ?? 0) > 0 && (
                      <div className="bg-yellow-50 rounded-lg p-4">
                        <p className="text-sm text-foreground/60 mb-1">Remaining Balance</p>
                        <p className="text-xl font-bold text-yellow-700">{formatCurrency(booking.remaining_balance)}</p>
                        <Badge variant={booking.remaining_balance_charged ? "default" : "outline"} className="mt-1 text-xs">
                          {booking.remaining_balance_charged ? "Charged" : "Pending"}
                        </Badge>
                      </div>
                    )}
                    {(booking.refund_amount ?? 0) > 0 && (
                      <div className="bg-green-50 rounded-lg p-4">
                        <p className="text-sm text-foreground/60 mb-1">Refund Amount</p>
                        <p className="text-xl font-bold text-green-700">{formatCurrency(booking.refund_amount)}</p>
                      </div>
                    )}
                  </div>

                  {/* Transactions List */}
                  {transactions.length > 0 && (
                    <>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Receipt className="w-4 h-4" />
                        Transaction History
                      </h4>
                      <div className="space-y-3">
                        {transactions.map((tx) => (
                          <div
                            key={tx.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-full ${
                                tx.transaction_type === "refund" ? "bg-green-100" : "bg-blue-100"
                              }`}>
                                {tx.transaction_type === "refund" ? (
                                  <RefreshCw className="w-4 h-4 text-green-600" />
                                ) : tx.transaction_type === "tip" ? (
                                  <Heart className="w-4 h-4 text-pink-600" />
                                ) : (
                                  <CreditCard className="w-4 h-4 text-blue-600" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-sm">
                                  {tx.description || tx.transaction_type || "Transaction"}
                                </p>
                                <p className="text-xs text-foreground/60">
                                  {format(new Date(tx.created_at), "MMM d, yyyy h:mm a")}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`font-bold ${
                                tx.transaction_type === "refund" ? "text-green-600" : ""
                              }`}>
                                {tx.transaction_type === "refund" ? "+" : "-"}
                                {formatCurrency(tx.amount)}
                              </p>
                              <Badge
                                className={`text-xs ${
                                  tx.status === "completed" || tx.status === "paid"
                                    ? "bg-green-100 text-green-800"
                                    : tx.status === "pending"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {tx.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Add-ons & Additional Services Card */}
              {(bookingAddons.length > 0 || bookingChanges.filter((c) => c.change_type === "addon_added").length > 0) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Plus className="w-5 h-5 text-roam-blue" />
                      Add-ons & Additional Services
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Booking Add-ons (selected during initial booking) */}
                    {bookingAddons.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-foreground/70 uppercase tracking-wide">
                          Selected Add-ons
                        </h4>
                        {bookingAddons.map((addon) => (
                          <div
                            key={addon.id}
                            className="flex items-center justify-between p-3 bg-blue-50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              {addon.service_addons?.image_url && (
                                <img
                                  src={addon.service_addons.image_url}
                                  alt={addon.service_addons.name}
                                  className="w-10 h-10 rounded object-cover"
                                />
                              )}
                              <div>
                                <p className="font-medium">{addon.service_addons?.name || "Add-on"}</p>
                                {addon.service_addons?.description && (
                                  <p className="text-xs text-foreground/60 line-clamp-1">
                                    {addon.service_addons.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            {addon.business_addons && addon.business_addons[0]?.custom_price && (
                              <p className="font-bold text-blue-700">
                                {formatCurrency(addon.business_addons[0].custom_price)}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Additional Services Added Later */}
                    {bookingChanges.filter((c) => c.change_type === "addon_added").length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-foreground/70 uppercase tracking-wide">
                          Services Added During Appointment
                        </h4>
                        {bookingChanges
                          .filter((c) => c.change_type === "addon_added")
                          .map((change) => (
                            <div
                              key={change.id}
                              className="flex items-center justify-between p-3 bg-purple-50 rounded-lg"
                            >
                              <div>
                                <p className="font-medium">{change.change_reason || "Additional Service"}</p>
                                <p className="text-xs text-foreground/60">
                                  Added on {format(new Date(change.created_at), "MMM d, yyyy")}
                                </p>
                              </div>
                              <p className="font-bold text-purple-700">
                                +{formatCurrency(change.additional_cost)}
                              </p>
                            </div>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Review & Tip Card */}
              {booking.booking_status === "completed" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Star className="w-5 h-5 text-roam-blue" />
                      Review & Tip
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Review Section */}
                      <div className="space-y-3">
                        <h4 className="font-medium">Your Review</h4>
                        {hasReview ? (
                          <div className="bg-green-50 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-5 h-5 ${
                                    star <= (booking.reviews![0].overall_rating || 0)
                                      ? "text-yellow-400 fill-yellow-400"
                                      : "text-gray-300"
                                  }`}
                                />
                              ))}
                              <span className="font-medium ml-1">
                                {booking.reviews![0].overall_rating}/5
                              </span>
                            </div>
                            {booking.reviews![0].review_text && (
                              <p className="text-sm text-foreground/70">
                                "{booking.reviews![0].review_text}"
                              </p>
                            )}
                            <p className="text-xs text-foreground/50 mt-2">
                              Reviewed on {format(new Date(booking.reviews![0].created_at), "MMM d, yyyy")}
                            </p>
                          </div>
                        ) : (
                          <div className="bg-gray-50 rounded-lg p-4 text-center">
                            <p className="text-foreground/60 mb-3">You haven't left a review yet</p>
                            <Button onClick={() => setShowReviewModal(true)}>
                              <Star className="w-4 h-4 mr-2" />
                              Leave Review
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Tip Section */}
                      <div className="space-y-3">
                        <h4 className="font-medium">Tip</h4>
                        {hasTip ? (
                          <div className="bg-pink-50 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Heart className="w-5 h-5 text-pink-500 fill-pink-500" />
                              <span className="text-xl font-bold text-pink-700">
                                {formatCurrency(booking.tips![0].tip_amount)}
                              </span>
                            </div>
                            {booking.tips![0].customer_message && (
                              <p className="text-sm text-foreground/70">
                                "{booking.tips![0].customer_message}"
                              </p>
                            )}
                            <p className="text-xs text-foreground/50 mt-2">
                              Sent on {format(new Date(booking.tips![0].created_at), "MMM d, yyyy")}
                            </p>
                          </div>
                        ) : (
                          <div className="bg-gray-50 rounded-lg p-4 text-center">
                            <p className="text-foreground/60 mb-3">Show your appreciation with a tip</p>
                            <Button
                              variant="outline"
                              className="border-pink-500 text-pink-600 hover:bg-pink-50"
                              onClick={() => setShowTipModal(true)}
                            >
                              <Heart className="w-4 h-4 mr-2" />
                              Send Tip
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Provider Contact Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="w-5 h-5 text-roam-blue" />
                    Provider Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-4">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={booking.providers?.image_url} />
                      <AvatarFallback className="bg-gradient-to-br from-roam-blue to-roam-light-blue text-white">
                        {booking.providers?.first_name?.[0]}
                        {booking.providers?.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">
                        {booking.providers?.first_name} {booking.providers?.last_name}
                      </h3>
                      {booking.providers?.average_rating && (
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="w-4 h-4 text-roam-warning fill-current" />
                          <span className="text-sm">{booking.providers.average_rating} rating</span>
                        </div>
                      )}
                      <div className="mt-3 space-y-2">
                        {booking.providers?.email && (
                          <a
                            href={`mailto:${booking.providers.email}`}
                            className="flex items-center gap-2 text-sm text-roam-blue hover:underline"
                          >
                            <Mail className="w-4 h-4" />
                            {booking.providers.email}
                          </a>
                        )}
                        {booking.providers?.phone && (
                          <a
                            href={`tel:${booking.providers.phone}`}
                            className="flex items-center gap-2 text-sm text-roam-blue hover:underline"
                          >
                            <Phone className="w-4 h-4" />
                            {booking.providers.phone}
                          </a>
                        )}
                      </div>
                      
                      {/* View Profile Button */}
                      {booking.providers?.id && (
                        <div className="mt-4">
                          <Link to={`/provider/${booking.providers.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-roam-blue text-roam-blue hover:bg-roam-blue/10"
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              View Profile
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Modals */}
      {/* Cancel Modal */}
      <CancelBookingModal
        isOpen={showCancelModal}
        onClose={() => {
          setShowCancelModal(false);
          setCancellationReason("");
        }}
        booking={booking}
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
          setNewBookingDate("");
          setNewBookingTime("");
          setRescheduleReason("");
        }}
        booking={booking}
        newBookingDate={newBookingDate}
        newBookingTime={newBookingTime}
        rescheduleReason={rescheduleReason}
        onNewDateChange={setNewBookingDate}
        onNewTimeChange={setNewBookingTime}
        onRescheduleReasonChange={setRescheduleReason}
        onRescheduleBooking={handleRescheduleBooking}
        isRescheduling={isRescheduling}
      />

      {/* Message Modal */}
      {showMessageModal && (
        <Suspense
          fallback={
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-8">
                <Loader2 className="w-8 h-8 animate-spin text-roam-blue mx-auto mb-4" />
                <p>Loading chat...</p>
              </div>
            </div>
          }
        >
          <EnhancedConversationChat
            isOpen={showMessageModal}
            onClose={() => setShowMessageModal(false)}
            booking={booking}
            currentUser={customer}
          />
        </Suspense>
      )}

      {/* Review Modal */}
      <ReviewAndTipModal
        isOpen={showReviewModal}
        onClose={() => {
          setShowReviewModal(false);
          fetchBookingDetails();
        }}
        booking={booking}
      />

      {/* Tip Modal */}
      <ReviewAndTipModal
        isOpen={showTipModal}
        onClose={() => {
          setShowTipModal(false);
          fetchBookingDetails();
        }}
        booking={booking}
        initialStep="tip"
      />

      {/* Add More Services Modal */}
      <AddMoreServiceModal
        isOpen={showAddMoreModal}
        onClose={() => setShowAddMoreModal(false)}
        booking={booking}
        onSuccess={fetchBookingDetails}
      />

      {/* Footer */}
      <Footer />
    </div>
  );
}
