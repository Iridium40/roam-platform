import React, { useState, useEffect, memo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import BookingStatusIndicator from "@/components/BookingStatusIndicator";
import ConversationChat from "@/components/ConversationChat";
import DeclineBookingModal from "./DeclineBookingModal";
import { useProviderAuth } from "@/contexts/auth/ProviderAuthContext";
import { supabase } from "@/lib/supabase";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  MessageCircle,
  Hash,
  CheckCircle,
  XCircle,
  AlertCircle,
  AlertTriangle,
  DollarSign,
  UserCheck,
  Star,
  Building,
  User,
  CreditCard,
  RotateCcw,
} from "lucide-react";

interface BookingCardProps {
  booking: any;
  onViewDetails: (booking: any) => void;
  onUpdateStatus: (bookingId: string, status: string, reason?: string) => Promise<void>;
  formatDisplayTime: (time: string) => string;
  showActions?: boolean;
  unreadCount?: number;
}

// Confirmation dialog config for each status action
const STATUS_CONFIRMATION_CONFIG: Record<string, { title: string; description: string; confirmText: string; variant: 'default' | 'destructive' }> = {
  confirmed: {
    title: "Accept Booking",
    description: "Are you sure you want to accept this booking? The customer will be notified that their booking has been confirmed.",
    confirmText: "Accept Booking",
    variant: "default",
  },
  in_progress: {
    title: "Start Service",
    description: "Are you sure you want to start this service? This will mark the booking as in progress.",
    confirmText: "Start Service",
    variant: "default",
  },
  completed: {
    title: "Complete Service",
    description: "Are you sure you want to mark this service as completed? This action cannot be undone.",
    confirmText: "Complete Service",
    variant: "default",
  },
  no_show: {
    title: "Mark as No Show",
    description: "Are you sure you want to mark this booking as a no-show? The customer will be notified and this may affect their account.",
    confirmText: "Mark No Show",
    variant: "destructive",
  },
};

function BookingCard({
  booking,
  onViewDetails,
  onUpdateStatus,
  formatDisplayTime,
  showActions = true,
  unreadCount: propUnreadCount,
}: BookingCardProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [confirmationDialog, setConfirmationDialog] = useState<{ isOpen: boolean; status: string | null }>({
    isOpen: false,
    status: null,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [fetchedUnreadCount, setFetchedUnreadCount] = useState(0);
  const { provider } = useProviderAuth();
  
  // Final balance modal state (for deposit services)
  const [showFinalBalanceModal, setShowFinalBalanceModal] = useState(false);
  const [finalBalanceAmount, setFinalBalanceAmount] = useState<string>("");
  const [finalBalanceError, setFinalBalanceError] = useState<string | null>(null);
  
  // Edit balance modal state (for editing after completion)
  const [showEditBalanceModal, setShowEditBalanceModal] = useState(false);
  const [editBalanceAmount, setEditBalanceAmount] = useState<string>("");
  const [editBalanceError, setEditBalanceError] = useState<string | null>(null);
  const [isEditingBalance, setIsEditingBalance] = useState(false);

  // Fetch unread message count for this booking (same approach as customer app)
  useEffect(() => {
    if (!booking?.id || !provider?.user_id) {
      setFetchedUnreadCount(0);
      return;
    }

    const fetchUnreadCount = async () => {
      try {
        // Get conversation metadata for this booking
        const { data: conversation, error: convError } = await supabase
          .from('conversation_metadata')
          .select('id')
          .eq('booking_id', booking.id)
          .eq('is_active', true)
          .maybeSingle();

        if (convError || !conversation?.id) {
          setFetchedUnreadCount(0);
          return;
        }

        // Get unread message count - use user_id to match auth.users
        const { count, error: countError } = await supabase
          .from('message_notifications')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conversation.id)
          .eq('user_id', provider.user_id)
          .eq('is_read', false);

        if (countError) {
          console.error('Error fetching unread count:', countError);
          setFetchedUnreadCount(0);
          return;
        }

        setFetchedUnreadCount(count || 0);
      } catch (error) {
        console.error('Error fetching unread count:', error);
        setFetchedUnreadCount(0);
      }
    };

    fetchUnreadCount();

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);

    return () => clearInterval(interval);
  }, [booking?.id, provider?.user_id]);

  // Use fetched count, fall back to prop if provided
  const unreadCount = fetchedUnreadCount || propUnreadCount || 0;

  // Handle message button click - reset unread count immediately (like customer app)
  const handleMessageClick = () => {
    setFetchedUnreadCount(0);
    setIsChatOpen(true);
  };

  // Check if this booking has an unpaid remaining balance
  const hasUnpaidBalance = parseFloat(booking.remaining_balance || '0') > 0 && !booking.remaining_balance_charged;
  // Check if this is a deposit pricing type service (requires balance confirmation on completion)
  const isDepositPricingType = booking.services?.pricing_type === 'deposit';
  // Deposit paid shows what the business earned from the initial deposit
  // This is the total_amount minus the platform fee (service_fee)
  // total_amount = service_amount + platform_fee, so deposit_paid = total_amount - service_fee
  const totalAmount = parseFloat(booking.total_amount || '0');
  const serviceFee = parseFloat(booking.service_fee || '0');
  const depositAmount = totalAmount - serviceFee; // What business receives from deposit

  // Handle status action with confirmation
  const handleStatusAction = (status: string) => {
    // Decline has its own modal with reason input
    if (status === "declined") {
      setIsDeclineModalOpen(true);
      return;
    }
    
    // For completing a DEPOSIT service, always show the final balance modal
    // (deposit services require provider to confirm/enter remaining balance before completing)
    if (status === "completed" && isDepositPricingType) {
      // Pre-fill with current remaining balance
      setFinalBalanceAmount(parseFloat(booking.remaining_balance || '0').toFixed(2));
      setFinalBalanceError(null);
      setShowFinalBalanceModal(true);
      return;
    }
    
    // Show confirmation dialog for other actions (including fixed price completions)
    setConfirmationDialog({ isOpen: true, status });
  };
  
  // Handle final balance submission for deposit services
  const handleFinalBalanceSubmit = async () => {
    const amount = parseFloat(finalBalanceAmount);
    
    if (isNaN(amount) || amount < 0) {
      setFinalBalanceError("Please enter a valid amount (0 or greater)");
      return;
    }
    
    setIsProcessing(true);
    setFinalBalanceError(null);
    
    try {
      // Update the remaining balance in the database
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          remaining_balance: amount,
          remaining_balance_charged: false, // Customer needs to pay this
        })
        .eq('id', booking.id);
      
      if (updateError) {
        console.error('Error updating remaining balance:', updateError);
        setFinalBalanceError("Failed to update balance. Please try again.");
        return;
      }
      
      // Now complete the booking
      await onUpdateStatus(booking.id, "completed");
      setShowFinalBalanceModal(false);
      setFinalBalanceAmount("");
    } catch (error) {
      console.error('Error completing booking:', error);
      setFinalBalanceError("Failed to complete booking. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Handle edit balance submission (for correcting mistakes after completion)
  const handleEditBalanceSubmit = async () => {
    const amount = parseFloat(editBalanceAmount);
    
    if (isNaN(amount) || amount < 0) {
      setEditBalanceError("Please enter a valid amount (0 or greater)");
      return;
    }
    
    setIsEditingBalance(true);
    setEditBalanceError(null);
    
    try {
      // Update the remaining balance in the database
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          remaining_balance: amount,
          remaining_balance_charged: false, // Reset to unpaid so customer can pay the new amount
        })
        .eq('id', booking.id);
      
      if (updateError) {
        console.error('Error updating remaining balance:', updateError);
        setEditBalanceError("Failed to update balance. Please try again.");
        return;
      }
      
      // Update local booking state to reflect the change
      booking.remaining_balance = amount.toString();
      booking.remaining_balance_charged = false;
      
      setShowEditBalanceModal(false);
      setEditBalanceAmount("");
      
      // Optionally trigger a refresh of the parent component
      // This could be done through a callback prop if needed
    } catch (error) {
      console.error('Error updating balance:', error);
      setEditBalanceError("Failed to update balance. Please try again.");
    } finally {
      setIsEditingBalance(false);
    }
  };
  
  // Open edit balance modal with current balance pre-filled
  const openEditBalanceModal = () => {
    const currentBalance = parseFloat(booking.remaining_balance || '0');
    setEditBalanceAmount(currentBalance.toFixed(2));
    setEditBalanceError(null);
    setShowEditBalanceModal(true);
  };

  // Confirm the status change
  const handleConfirmStatusChange = async () => {
    if (!confirmationDialog.status) return;
    
    setIsProcessing(true);
    try {
      await onUpdateStatus(booking.id, confirmationDialog.status);
    } finally {
      setIsProcessing(false);
      setConfirmationDialog({ isOpen: false, status: null });
    }
  };

  // Handle decline with reason
  const handleDeclineConfirm = async (reason: string) => {
    await onUpdateStatus(booking.id, "declined", reason);
  };

  // Note: Unread count is now passed from parent component for better performance
  // Individual fetching per card has been removed

  // Check if a provider is assigned to the booking
  const hasProviderAssigned = Boolean(booking.providers && booking.providers.id) || Boolean(booking.provider_id);

  // Check if booking has been rescheduled
  const isRescheduled = Boolean(booking.original_booking_date || booking.original_booking_time);

  // Check if messaging should be allowed
  // Hide message button if booking is in final status AND booking date is more than 1 day past
  const canMessage = () => {
    const finalStatuses = ['completed', 'cancelled', 'declined', 'no_show'];
    const isInFinalStatus = finalStatuses.includes(booking.booking_status);
    
    if (!isInFinalStatus) return true;
    
    // Check if booking date is more than 1 day past
    if (!booking.booking_date) return true;
    
    const bookingDate = new Date(booking.booking_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    bookingDate.setHours(0, 0, 0, 0);
    
    const diffInDays = (today.getTime() - bookingDate.getTime()) / (1000 * 60 * 60 * 24);
    
    // Allow messaging if booking date is within 1 day (not more than 1 day past)
    return diffInDays <= 1;
  };

  const getStatusActions = (status: string) => {
    // Check if booking is scheduled for today or in the past
    const isBookingDateTodayOrPast = () => {
      if (!booking.booking_date) return false;
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      return booking.booking_date <= today;
    };

    switch (status) {
      case "pending":
        // Only show Accept button if a provider is assigned
        // Always show Decline button
        return [
          { 
            label: hasProviderAssigned ? "Accept" : "Accept (Assign Provider First)", 
            status: "confirmed", 
            icon: CheckCircle, 
            variant: "default" as const,
            disabled: !hasProviderAssigned,
            tooltip: !hasProviderAssigned ? "Please assign a provider before accepting this booking" : undefined
          },
          { label: "Decline", status: "declined", icon: XCircle, variant: "destructive" as const },
        ];
      case "confirmed":
        // Only show "Start Service" if booking is scheduled for today or in the past AND has an assigned provider
        if (isBookingDateTodayOrPast() && hasProviderAssigned) {
          return [
            { label: "Start Service", status: "in_progress", icon: Clock, variant: "default" as const },
          ];
        }
        return []; // No actions for future confirmed bookings or unassigned bookings
      case "in_progress":
        return [
          { label: "Complete", status: "completed", icon: CheckCircle, variant: "default" as const },
          { label: "Mark No Show", status: "no_show", icon: AlertCircle, variant: "destructive" as const },
        ];
      default:
        return [];
    }
  };

  const statusActions = getStatusActions(booking.booking_status);

  const getStatusMessage = (status: string) => {
    // Check if booking is scheduled for today or in the past
    const isBookingDateTodayOrPast = () => {
      if (!booking.booking_date) return false;
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      return booking.booking_date <= today;
    };

    switch (status) {
      case "pending":
        return "Pending - Awaiting your response";
      case "confirmed":
        if (isBookingDateTodayOrPast()) {
          if (booking.providers && booking.providers.id) {
            return "Confirmed - Ready to start";
          } else {
            return "Confirmed - Awaiting provider assignment";
          }
        } else {
          return "Confirmed - Scheduled for future";
        }
      case "in_progress":
        return "In Progress - Service ongoing";
      case "completed":
        return "Completed - Service finished";
      case "declined":
        return "Declined - Service declined";
      case "no_show":
        return "No Show - Customer didn't arrive";
      default:
        return "Status unknown";
    }
  };

  const getProgressPercentage = (status: string) => {
    switch (status) {
      case "pending":
        return 20;
      case "confirmed":
        return 60;
      case "in_progress":
        return 80;
      case "completed":
        return 100;
      default:
        return 0;
    }
  };

  return (
    <Card className="overflow-hidden bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Desktop Layout */}
      <div className="hidden lg:block p-6 space-y-4">
        {/* Header Row - Service, Customer, Price */}
        <div className="flex items-start gap-4">
          {/* Customer Avatar */}
          <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
            {(() => {
              if (booking.customer_profiles?.image_url) {
                return (
                  <img
                    src={booking.customer_profiles.image_url}
                    alt={`${booking.customer_profiles.first_name || ""} ${booking.customer_profiles.last_name || ""}`}
                    className="w-full h-full object-cover rounded-lg"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                );
              } else {
                const initial = booking.guest_name?.[0] || booking.customer_profiles?.first_name?.[0] || booking.customer_profiles?.last_name?.[0];
                return (
                  <div className="w-full h-full bg-blue-600 rounded-lg flex items-center justify-center">
                    {initial ? (
                      <span className="text-white font-semibold text-lg">
                        {initial}
                      </span>
                    ) : (
                      <User className="w-7 h-7 text-white" />
                    )}
                  </div>
                );
              }
            })()}
          </div>
          
          {/* Service & Customer Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {booking.services?.name || "Service"}
                  </h3>
                  {isRescheduled && (
                    <Badge 
                      variant="outline" 
                      className="bg-orange-50 text-orange-700 border-orange-200 text-xs px-2 py-0.5 flex items-center gap-1"
                      title={`Rescheduled from ${booking.original_booking_date || 'original date'} at ${booking.original_booking_time ? formatDisplayTime(booking.original_booking_time) : 'original time'}`}
                    >
                      <RotateCcw className="w-3 h-3" />
                      Rescheduled
                    </Badge>
                  )}
                  {/* Payment Badge */}
                  {(() => {
                    const bookingStatus = booking.booking_status;
                    const isCancelled = bookingStatus === 'cancelled';
                    const hasPaymentIntent = !!booking.stripe_service_amount_payment_intent_id;
                    const isPaymentCaptured = booking.service_fee_charged === true;
                    
                    let badgeClass = 'bg-yellow-50 text-yellow-700 border-yellow-200';
                    let badgeText = 'Payment Pending';
                    let BadgeIcon = AlertCircle;
                    
                    if (isCancelled) {
                      badgeClass = 'bg-gray-50 text-gray-600 border-gray-200';
                      badgeText = 'Refunded';
                      BadgeIcon = RotateCcw;
                    } else if (isPaymentCaptured) {
                      // Payment was captured - money retrieved from customer
                      badgeClass = 'bg-green-50 text-green-700 border-green-200';
                      badgeText = 'Paid';
                      BadgeIcon = CreditCard;
                    } else if (hasPaymentIntent) {
                      // Payment authorized but not yet captured
                      badgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
                      badgeText = 'Authorized';
                      BadgeIcon = CreditCard;
                    }
                    
                    return (
                      <Badge 
                        variant="outline" 
                        className={`text-xs px-2 py-0.5 ${badgeClass}`}
                      >
                        <BadgeIcon className="w-3 h-3 mr-1" />{badgeText}
                      </Badge>
                    );
                  })()}
                </div>
                <p className="text-sm text-gray-600 mt-0.5">
                  <span className="font-medium">Customer:</span>{" "}
                  {booking.guest_name
                    ? booking.guest_name
                    : booking.customer_profiles
                      ? `${booking.customer_profiles.first_name || ""} ${booking.customer_profiles.last_name || ""}`
                      : "Unknown Customer"
                  }
                </p>
              </div>
              
              {/* Price - Show business earnings clearly */}
              <div className="text-right flex-shrink-0">
                {(() => {
                  const totalAmount = parseFloat(booking.total_amount || '0');
                  const serviceFee = parseFloat(booking.service_fee || '0');
                  const businessEarnings = totalAmount - serviceFee;
                  const remainingBalance = parseFloat(booking.remaining_balance || '0');
                  const isRemainingBalanceCharged = booking.remaining_balance_charged === true;
                  
                  return (
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        ${businessEarnings.toFixed(2)}
                      </div>
                      <p className="text-xs text-gray-500">
                        Your earnings
                      </p>
                      {serviceFee > 0 && (
                        <p className="text-xs text-gray-400">
                          (${totalAmount.toFixed(2)} - ${serviceFee.toFixed(2)} fee)
                        </p>
                      )}
                      {/* Balance to Collect - Show for accepted/confirmed/in_progress bookings */}
                      {(booking.booking_status === 'confirmed' || booking.booking_status === 'in_progress') && !isRemainingBalanceCharged && (
                        <div className={`mt-2 px-2 py-1 rounded ${remainingBalance > 0 ? 'bg-amber-100 border border-amber-300 text-amber-800' : 'bg-gray-100 border border-gray-200 text-gray-600'}`}>
                          <p className="text-xs font-semibold">Balance to Collect</p>
                          <p className="text-sm font-bold">${remainingBalance.toFixed(2)}</p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditBalanceModal();
                            }}
                            className={`text-xs underline mt-1 ${remainingBalance > 0 ? 'text-amber-700 hover:text-amber-900' : 'text-blue-600 hover:text-blue-800'}`}
                          >
                            {remainingBalance > 0 ? 'Edit Amount' : '+ Add Balance'}
                          </button>
                        </div>
                      )}
                      {/* Show unpaid balance for completed bookings */}
                      {booking.booking_status === 'completed' && remainingBalance > 0 && !isRemainingBalanceCharged && (
                        <div className="mt-2 px-2 py-1 bg-amber-100 border border-amber-300 rounded text-amber-800">
                          <p className="text-xs font-semibold">Balance to Collect</p>
                          <p className="text-sm font-bold">${remainingBalance.toFixed(2)}</p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditBalanceModal();
                            }}
                            className="text-xs text-amber-700 hover:text-amber-900 underline mt-1"
                          >
                            Edit Amount
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Schedule & Reference Card */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Schedule Info */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-gray-700">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="font-medium">{booking.booking_date}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="font-medium">{formatDisplayTime(booking.start_time)}</span>
                <span className="text-gray-500">({booking.services?.duration_minutes || 0} min)</span>
              </div>
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-gray-500 uppercase tracking-wide">Ref:</span>
                <span className="font-mono font-semibold text-gray-800">
                  {booking.booking_reference || `BK${Math.random().toString(36).substr(2, 4).toUpperCase()}`}
                </span>
              </div>
            </div>
            
            {/* Rescheduled Info */}
            {isRescheduled && (
              <div className="flex items-center gap-1.5 text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded px-2 py-1">
                <RotateCcw className="w-3 h-3" />
                <span>Originally: {booking.original_booking_date || 'N/A'} at {booking.original_booking_time ? formatDisplayTime(booking.original_booking_time) : 'N/A'}</span>
              </div>
            )}
          </div>
        </div>

        {/* People & Location Row */}
        <div className="grid grid-cols-3 gap-4">
          {/* Provider */}
          <div className="flex items-start gap-2">
            <UserCheck className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Provider</div>
              <div className="text-sm font-medium text-gray-900">
                {booking.providers 
                  ? `${booking.providers.first_name || ""} ${booking.providers.last_name || ""}`
                  : "Unassigned"
                }
              </div>
              {booking.providers?.phone && (
                <div className="text-xs text-gray-500">{booking.providers.phone}</div>
              )}
            </div>
          </div>

          {/* Business */}
          <div className="flex items-start gap-2">
            <Building className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Business</div>
              <div className="text-sm font-medium text-gray-900">
                {booking.business_locations?.location_name || "Main Location"}
              </div>
            </div>
          </div>
          
          {/* Location */}
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Service Location</div>
              <div className="text-sm">
                {booking.delivery_type === 'virtual' ? (
                  <span className="text-gray-700">Virtual</span>
                ) : booking.customer_locations ? (
                  <a
                    href={`https://maps.google.com/maps?q=${encodeURIComponent(
                      `${booking.customer_locations.street_address || ""}, ${booking.customer_locations.city || ""}, ${booking.customer_locations.state || ""}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {booking.customer_locations.street_address}, {booking.customer_locations.city}, {booking.customer_locations.state}
                  </a>
                ) : booking.business_locations ? (
                  <a
                    href={`https://maps.google.com/maps?q=${encodeURIComponent(
                      `${booking.business_locations.address_line1 || ""}, ${booking.business_locations.city || ""}, ${booking.business_locations.state || ""}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {booking.business_locations.address_line1}, {booking.business_locations.city}
                  </a>
                ) : (
                  <span className="text-gray-600">Location not specified</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Special Instructions */}
        {booking.special_instructions && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <MessageCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-800">Special Instructions:</p>
                <p className="text-sm text-yellow-700">{booking.special_instructions}</p>
              </div>
            </div>
          </div>
        )}

        {/* Status Section */}
        <div className="pt-4 border-t border-gray-100 space-y-4">
          {/* Status */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-medium text-gray-700">{getStatusMessage(booking.booking_status)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  booking.booking_status === 'pending' ? 'bg-yellow-500' :
                  booking.booking_status === 'confirmed' ? 'bg-blue-500' :
                  booking.booking_status === 'in_progress' ? 'bg-purple-500' :
                  booking.booking_status === 'completed' ? 'bg-green-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${getProgressPercentage(booking.booking_status)}%` }}
              ></div>
            </div>
          </div>

          {/* Action Buttons - Same layout as mobile */}
          <div className="space-y-2">
            {/* Primary Actions Row - Message & Details */}
            <div className={`grid gap-2 ${canMessage() ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {canMessage() && (
                <Button
                  onClick={handleMessageClick}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white relative"
                >
                  <MessageCircle className="w-4 h-4 mr-1.5" />
                  Message
                  {unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs font-bold rounded-full"
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Badge>
                  )}
                </Button>
              )}

              {/* Details Button */}
              <Button
                variant="outline"
                size="sm"
                className="border-gray-300"
                onClick={() => onViewDetails(booking)}
              >
                {hasProviderAssigned ? "Details" : "Assign Provider"}
              </Button>
            </div>

            {/* Status Action Buttons */}
            {showActions && statusActions.length > 0 && (
              <div className={`grid gap-2 ${statusActions.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {statusActions.map((action: any) => {
                  const Icon = action.icon;
                  const isDisabled = action.disabled || false;
                  return (
                    <Button
                      key={action.status}
                      variant={action.variant}
                      size="sm"
                      disabled={isDisabled || isProcessing}
                      onClick={() => {
                        if (isDisabled) return;
                        handleStatusAction(action.status);
                      }}
                      className={`flex items-center justify-center ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title={action.tooltip}
                    >
                      <Icon className="w-4 h-4 mr-1.5" />
                      {action.label}
                    </Button>
                  );
                })}
              </div>
            )}

            {/* Provider Assignment Warning */}
            {!hasProviderAssigned && booking.booking_status === "pending" && (
              <p className="text-xs text-amber-600 text-center">
                ⚠️ Assign a provider before accepting
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden p-4 space-y-4">
        {/* Header - Service & Price */}
        <div className="flex items-start gap-3">
          {/* Customer Avatar */}
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
            {(() => {
              if (booking.customer_profiles?.image_url) {
                return (
                  <img
                    src={booking.customer_profiles.image_url}
                    alt={`${booking.customer_profiles.first_name || ""} ${booking.customer_profiles.last_name || ""}`}
                    className="w-full h-full object-cover rounded-lg"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                );
              } else {
                const initial = booking.guest_name?.[0] || booking.customer_profiles?.first_name?.[0] || booking.customer_profiles?.last_name?.[0];
                return (
                  <div className="w-full h-full bg-blue-600 rounded-lg flex items-center justify-center">
                    {initial ? (
                      <span className="text-white font-semibold text-sm">
                        {initial}
                      </span>
                    ) : (
                      <User className="w-6 h-6 text-white" />
                    )}
                  </div>
                );
              }
            })()}
          </div>

          {/* Service Name & Customer */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="font-semibold text-base text-gray-900 leading-tight">
                    {booking.services?.name || "Service"}
                  </h3>
                  {isRescheduled && (
                    <Badge 
                      variant="outline" 
                      className="bg-orange-50 text-orange-700 border-orange-200 text-xs px-1.5 py-0 flex items-center gap-0.5"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span className="text-[10px]">Rescheduled</span>
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-0.5">
                  {booking.guest_name
                    ? booking.guest_name
                    : booking.customer_profiles
                      ? `${booking.customer_profiles.first_name || ""} ${booking.customer_profiles.last_name || ""}`
                      : "Unknown Customer"
                  }
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-lg font-bold text-blue-600">
                  ${parseFloat(booking.total_amount || '0').toFixed(2)}
                </span>
                {/* Balance to Collect - Show for confirmed/in_progress bookings (mobile) */}
                {(() => {
                  const remainingBalance = parseFloat(booking.remaining_balance || '0');
                  const isRemainingBalanceCharged = booking.remaining_balance_charged === true;
                  
                  // Show balance box for confirmed/in_progress bookings
                  if ((booking.booking_status === 'confirmed' || booking.booking_status === 'in_progress') && !isRemainingBalanceCharged) {
                    return (
                      <div className={`mt-1 px-1.5 py-0.5 rounded ${remainingBalance > 0 ? 'bg-amber-100 border border-amber-300 text-amber-800' : 'bg-gray-100 border border-gray-200 text-gray-600'}`}>
                        <p className="text-[10px] font-semibold">Balance</p>
                        <p className="text-xs font-bold">${remainingBalance.toFixed(2)}</p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditBalanceModal();
                          }}
                          className={`text-[10px] underline ${remainingBalance > 0 ? 'text-amber-700 hover:text-amber-900' : 'text-blue-600 hover:text-blue-800'}`}
                        >
                          {remainingBalance > 0 ? 'Edit' : '+ Add'}
                        </button>
                      </div>
                    );
                  }
                  
                  // Show unpaid balance for completed bookings
                  if (booking.booking_status === 'completed' && remainingBalance > 0 && !isRemainingBalanceCharged) {
                    return (
                      <div className="mt-1 px-1.5 py-0.5 bg-amber-100 border border-amber-300 rounded text-amber-800">
                        <p className="text-[10px] font-semibold">Balance Due</p>
                        <p className="text-xs font-bold">${remainingBalance.toFixed(2)}</p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditBalanceModal();
                          }}
                          className="text-[10px] text-amber-700 hover:text-amber-900 underline"
                        >
                          Edit
                        </button>
                      </div>
                    );
                  }
                  
                  return null;
                })()}
              </div>
            </div>
            
            {/* Payment Badge */}
            {(() => {
              const bookingStatus = booking.booking_status;
              const isCancelled = bookingStatus === 'cancelled';
              const hasPaymentIntent = !!booking.stripe_service_amount_payment_intent_id;
              const isPaymentCaptured = booking.service_fee_charged === true;
              
              let badgeClass = 'bg-yellow-50 text-yellow-700 border-yellow-200';
              let badgeText = 'Pending';
              let BadgeIcon = AlertCircle;
              
              if (isCancelled) {
                badgeClass = 'bg-gray-50 text-gray-600 border-gray-200';
                badgeText = 'Refunded';
                BadgeIcon = RotateCcw;
              } else if (isPaymentCaptured) {
                // Payment was captured - money retrieved from customer
                badgeClass = 'bg-green-50 text-green-700 border-green-200';
                badgeText = 'Paid';
                BadgeIcon = CreditCard;
              } else if (hasPaymentIntent) {
                // Payment authorized but not yet captured
                badgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
                badgeText = 'Authorized';
                BadgeIcon = CreditCard;
              }
              
              return (
                <div className="flex items-center gap-1 mt-1">
                  <Badge 
                    variant="outline" 
                    className={`text-xs px-1.5 py-0 ${badgeClass}`}
                  >
                    <BadgeIcon className="w-3 h-3 mr-1" />{badgeText}
                  </Badge>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Schedule Card */}
        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1.5 text-gray-700">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>{booking.booking_date}</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-700">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>{formatDisplayTime(booking.start_time)}</span>
              </div>
            </div>
            <span className="text-xs text-gray-500">{booking.services?.duration_minutes || 0} min</span>
          </div>
          
          {/* Booking Reference */}
          <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
            <Hash className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-xs text-gray-500 uppercase tracking-wide">Ref:</span>
            <span className="text-sm font-mono font-medium text-gray-800">
              {booking.booking_reference || `BK${Math.random().toString(36).substr(2, 4).toUpperCase()}`}
            </span>
          </div>

          {/* Rescheduled Info */}
          {isRescheduled && (
            <div className="flex items-center gap-1.5 pt-2 border-t border-gray-200 text-xs text-orange-600">
              <RotateCcw className="w-3 h-3" />
              <span>Originally: {booking.original_booking_date || 'N/A'} at {booking.original_booking_time ? formatDisplayTime(booking.original_booking_time) : 'N/A'}</span>
            </div>
          )}
        </div>

        {/* Status Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              {getStatusMessage(booking.booking_status)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                booking.booking_status === 'pending' ? 'bg-yellow-500' :
                booking.booking_status === 'confirmed' ? 'bg-blue-500' :
                booking.booking_status === 'in_progress' ? 'bg-purple-500' :
                booking.booking_status === 'completed' ? 'bg-green-500' :
                'bg-red-500'
              }`}
              style={{ width: `${getProgressPercentage(booking.booking_status)}%` }}
            ></div>
          </div>
        </div>

        {/* People & Location Section */}
        <div className="space-y-2">
          {/* Provider Assignment */}
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span className="text-sm text-gray-700">
              {booking.providers 
                ? `${booking.providers.first_name || ""} ${booking.providers.last_name || ""}`
                : "Unassigned Provider"
              }
            </span>
          </div>

          {/* Location */}
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              {booking.delivery_type === 'virtual' ? (
                <span className="text-sm text-gray-700">Virtual</span>
              ) : booking.customer_locations ? (
                <a
                  href={`https://maps.google.com/maps?q=${encodeURIComponent(
                    `${booking.customer_locations.street_address || ""}, ${booking.customer_locations.city || ""}, ${booking.customer_locations.state || ""}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  {booking.customer_locations.street_address}, {booking.customer_locations.city}, {booking.customer_locations.state}
                </a>
              ) : booking.business_locations ? (
                <a
                  href={`https://maps.google.com/maps?q=${encodeURIComponent(
                    `${booking.business_locations.address_line1 || ""}, ${booking.business_locations.city || ""}, ${booking.business_locations.state || ""}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  {booking.business_locations.location_name || booking.business_locations.address_line1}, {booking.business_locations.city}
                </a>
              ) : (
                <span className="text-sm text-gray-600">Location not specified</span>
              )}
            </div>
          </div>
        </div>

        {/* Special Instructions */}
        {booking.special_instructions && (
          <div className="p-2.5 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-start gap-2">
              <MessageCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-yellow-700">{booking.special_instructions}</p>
            </div>
          </div>
        )}

        {/* Action Buttons - Full Width */}
        <div className="pt-2 border-t border-gray-100 space-y-2">
          {/* Primary Actions Row */}
          <div className={`grid gap-2 ${canMessage() ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {/* Message Button - Hidden for final status bookings more than 1 day past */}
            {canMessage() && (
              <Button
                onClick={handleMessageClick}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white relative"
              >
                <MessageCircle className="w-4 h-4 mr-1.5" />
                <span className="text-xs">Message</span>
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs font-bold rounded-full"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </Button>
            )}

            {/* Details Button */}
            <Button
              variant="outline"
              size="sm"
              className="border-gray-300 text-gray-700"
              onClick={() => onViewDetails(booking)}
            >
              <span className="text-xs">{hasProviderAssigned ? "Details" : "Assign Provider"}</span>
            </Button>
          </div>

          {/* Status Action Buttons */}
          {showActions && statusActions.length > 0 && (
            <div className={`grid gap-2 ${statusActions.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {statusActions.map((action: any) => {
                const Icon = action.icon;
                const isDisabled = action.disabled || false;
                return (
                  <Button
                    key={action.status}
                    variant={action.variant}
                    size="sm"
                    disabled={isDisabled || isProcessing}
                    onClick={() => {
                      if (isDisabled) return;
                      handleStatusAction(action.status);
                    }}
                    className={`flex items-center justify-center ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={action.tooltip}
                  >
                    <Icon className="w-4 h-4 mr-1.5" />
                    <span className="text-xs">{action.label}</span>
                  </Button>
                );
              })}
            </div>
          )}

          {/* Provider Assignment Warning */}
          {!hasProviderAssigned && booking.booking_status === "pending" && (
            <p className="text-xs text-amber-600 text-center">
              ⚠️ Assign a provider before accepting
            </p>
          )}
        </div>
      </div>

      {/* Chat Modal */}
      <ConversationChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        booking={booking}
      />

      {/* Decline Booking Modal */}
      <DeclineBookingModal
        isOpen={isDeclineModalOpen}
        onClose={() => setIsDeclineModalOpen(false)}
        onConfirm={handleDeclineConfirm}
        bookingDetails={{
          serviceName: booking.services?.name,
          customerName: booking.guest_name 
            ? booking.guest_name
            : booking.customer_profiles 
              ? `${booking.customer_profiles.first_name || ""} ${booking.customer_profiles.last_name || ""}`.trim()
              : undefined,
          bookingDate: booking.booking_date,
        }}
      />

      {/* Status Change Confirmation Dialog */}
      <AlertDialog 
        open={confirmationDialog.isOpen} 
        onOpenChange={(open) => !open && setConfirmationDialog({ isOpen: false, status: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              {confirmationDialog.status === 'no_show' ? (
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
              ) : confirmationDialog.status === 'completed' ? (
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              ) : confirmationDialog.status === 'in_progress' ? (
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-purple-600" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                </div>
              )}
              <div>
                <AlertDialogTitle>
                  {confirmationDialog.status && STATUS_CONFIRMATION_CONFIG[confirmationDialog.status]?.title}
                </AlertDialogTitle>
              </div>
            </div>
            <AlertDialogDescription className="mt-3">
              {confirmationDialog.status && STATUS_CONFIRMATION_CONFIG[confirmationDialog.status]?.description}
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-900">{booking.services?.name}</p>
                <p className="text-sm text-gray-600">
                  {booking.guest_name 
                    ? booking.guest_name
                    : booking.customer_profiles 
                      ? `${booking.customer_profiles.first_name || ""} ${booking.customer_profiles.last_name || ""}`.trim()
                      : "Customer"
                  } • {booking.booking_date} at {formatDisplayTime(booking.start_time)}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmStatusChange}
              disabled={isProcessing}
              className={
                confirmationDialog.status && STATUS_CONFIRMATION_CONFIG[confirmationDialog.status]?.variant === 'destructive'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }
            >
              {isProcessing ? 'Processing...' : confirmationDialog.status && STATUS_CONFIRMATION_CONFIG[confirmationDialog.status]?.confirmText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Final Balance Modal (for deposit services) */}
      <Dialog open={showFinalBalanceModal} onOpenChange={(open) => !open && setShowFinalBalanceModal(false)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <DialogTitle>Set Final Balance</DialogTitle>
                <DialogDescription>
                  Complete service and set the amount due
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Booking Info */}
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm font-medium text-gray-900">{booking.services?.name}</p>
              <p className="text-sm text-gray-600">
                {booking.guest_name 
                  ? booking.guest_name
                  : booking.customer_profiles 
                    ? `${booking.customer_profiles.first_name || ""} ${booking.customer_profiles.last_name || ""}`.trim()
                    : "Customer"
                }
              </p>
            </div>
            
            {/* Deposit Info */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-800">Deposit Paid</span>
                <span className="font-semibold text-green-700">${depositAmount.toFixed(2)}</span>
              </div>
            </div>
            
            {/* Final Balance Input */}
            <div className="space-y-2">
              <Label htmlFor="final-balance" className="text-sm font-medium">
                Additional Amount to Charge
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="final-balance"
                  type="number"
                  step="0.01"
                  min="0"
                  value={finalBalanceAmount}
                  onChange={(e) => {
                    setFinalBalanceAmount(e.target.value);
                    setFinalBalanceError(null);
                  }}
                  className="pl-9"
                  placeholder="0.00"
                />
              </div>
              <p className="text-xs text-gray-500">
                Enter the amount you want to charge for additional services. You will receive this full amount. Enter 0 if no additional payment is needed.
              </p>
            </div>
            
            {/* Payment Breakdown */}
            {finalBalanceAmount && !isNaN(parseFloat(finalBalanceAmount)) && parseFloat(finalBalanceAmount) > 0 && (
              <div className="space-y-2">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-green-800">You Will Receive</span>
                    <span className="font-bold text-green-700">
                      ${parseFloat(finalBalanceAmount || '0').toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Customer Pays (incl. 20% service fee)</span>
                    <span className="font-semibold text-gray-700">
                      ${(parseFloat(finalBalanceAmount || '0') * 1.20).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Error Message */}
            {finalBalanceError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">{finalBalanceError}</p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowFinalBalanceModal(false);
                setFinalBalanceAmount("");
                setFinalBalanceError(null);
              }}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleFinalBalanceSubmit}
              disabled={isProcessing || !finalBalanceAmount}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? 'Processing...' : 'Complete Service'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Balance Modal (for correcting mistakes after completion) */}
      <Dialog open={showEditBalanceModal} onOpenChange={(open) => !open && setShowEditBalanceModal(false)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <DialogTitle>Edit Balance Due</DialogTitle>
                <DialogDescription>
                  Correct the remaining balance amount
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Booking Info */}
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm font-medium text-gray-900">{booking.services?.name}</p>
              <p className="text-sm text-gray-600">
                {booking.guest_name 
                  ? booking.guest_name
                  : booking.customer_profiles 
                    ? `${booking.customer_profiles.first_name || ""} ${booking.customer_profiles.last_name || ""}`.trim()
                    : "Customer"
                }
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Ref: {booking.booking_reference || 'N/A'}
              </p>
            </div>
            
            {/* Info Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-800">
                  Update the balance if you need to correct the amount. The customer will be able to pay the new amount.
                </p>
              </div>
            </div>
            
            {/* Current Balance Info */}
            {parseFloat(booking.remaining_balance || '0') > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-amber-800">Current Balance (You Receive)</span>
                  <span className="font-semibold text-amber-700">
                    ${parseFloat(booking.remaining_balance || '0').toFixed(2)}
                  </span>
                </div>
              </div>
            )}
            
            {/* New Balance Input */}
            <div className="space-y-2">
              <Label htmlFor="edit-balance" className="text-sm font-medium">
                Amount to Charge
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="edit-balance"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editBalanceAmount}
                  onChange={(e) => {
                    setEditBalanceAmount(e.target.value);
                    setEditBalanceError(null);
                  }}
                  className="pl-9"
                  placeholder="0.00"
                />
              </div>
              <p className="text-xs text-gray-500">
                Enter the amount you want to charge. You will receive this full amount. Enter 0 to clear the balance.
              </p>
            </div>
            
            {/* Payment Breakdown */}
            {editBalanceAmount && !isNaN(parseFloat(editBalanceAmount)) && parseFloat(editBalanceAmount) > 0 && (
              <div className="space-y-2">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-green-800">You Will Receive</span>
                    <span className="font-bold text-green-700">
                      ${parseFloat(editBalanceAmount || '0').toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Customer Pays (incl. 20% service fee)</span>
                    <span className="font-semibold text-gray-700">
                      ${(parseFloat(editBalanceAmount || '0') * 1.20).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Error Message */}
            {editBalanceError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">{editBalanceError}</p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditBalanceModal(false);
                setEditBalanceAmount("");
                setEditBalanceError(null);
              }}
              disabled={isEditingBalance}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditBalanceSubmit}
              disabled={isEditingBalance || !editBalanceAmount}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isEditingBalance ? 'Updating...' : 'Update Balance'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// Memoize the component to prevent unnecessary re-renders in large lists
export default memo(BookingCard, (prevProps, nextProps) => {
  // Custom comparison - only re-render if these props change
  return (
    prevProps.booking.id === nextProps.booking.id &&
    prevProps.booking.booking_status === nextProps.booking.booking_status &&
    prevProps.booking.provider_id === nextProps.booking.provider_id &&
    prevProps.unreadCount === nextProps.unreadCount &&
    prevProps.showActions === nextProps.showActions
  );
});