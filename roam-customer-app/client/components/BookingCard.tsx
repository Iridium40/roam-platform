import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  DollarSign,
  Users,
  MessageCircle,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit,
  MoreHorizontal,
  Smartphone,
  Building,
  Video,
  Star,
  CreditCard,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { logger } from '@/utils/logger';
import type {
  Booking,
  Provider,
  ProviderRole,
  BookingStatus,
  PaymentStatus,
  DeliveryType,
} from "@roam/shared";

interface BookingCardProps {
  booking: Booking & {
    providers?: { first_name: string; last_name: string };
    services?: { name: string; description?: string };
  };
  availableProviders?: Provider[];
  onUpdate?: () => void;
  showFullActions?: boolean;
}

export const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  availableProviders = [],
  onUpdate,
  showFullActions = false,
}) => {
  const { user, isOwner, isDispatcher, hasPermission } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isReassignDialogOpen, setIsReassignDialogOpen] = useState(false);
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [reassignProviderId, setReassignProviderId] = useState("");
  const [message, setMessage] = useState("");
  const [newStatus, setNewStatus] = useState<BookingStatus>("pending");
  const [cancelReason, setCancelReason] = useState("");
  const [refundAmount, setRefundAmount] = useState(0);

  const canManageAllBookings = hasPermission("manage_all_bookings");
  const canReassignBookings = hasPermission("reassign_bookings");
  const canSendAllMessages = hasPermission("send_all_messages");

  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPaymentStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "refunded":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getDeliveryIcon = (type: DeliveryType) => {
    switch (type) {
      case "mobile":
        return Smartphone;
      case "business_location":
        return Building;
      case "virtual":
        return Video;
      default:
        return Building;
    }
  };

  const logBookingAction = async (
    actionType: string,
    oldValues: any,
    newValues: any,
    actionDetails?: any,
  ) => {
    try {
      await supabase.from("booking_actions").insert({
        booking_id: booking.id,
        action_type: actionType,
        performed_by_user_id: user?.id,
        performed_for_provider_id: booking.provider_id,
        old_values: oldValues,
        new_values: newValues,
        action_details: actionDetails,
      });
    } catch (error) {
      logger.error("Error logging booking action:", error);
    }
  };

  const handleStatusUpdate = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const oldStatus = booking.booking_status;
      const { error } = await supabase
        .from("bookings")
        .update({ booking_status: newStatus })
        .eq("id", booking.id);

      if (error) throw error;

      await logBookingAction(
        "status_update",
        { booking_status: oldStatus },
        { booking_status: newStatus },
        { updated_by_role: user.provider_role },
      );

      setIsStatusDialogOpen(false);
      onUpdate?.();

      toast({
        title: "Success",
        description: "Booking status updated successfully",
      });
    } catch (error: any) {
      logger.error("Error updating booking status:", error);

      let errorMessage = "Failed to update booking status";
      if (typeof error === "string") {
        errorMessage = error;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.details) {
        errorMessage = error.details;
      } else if (error?.error?.message) {
        errorMessage = error.error.message;
      } else if (error?.hint) {
        errorMessage = error.hint;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReassignment = async () => {
    if (!user || !reassignProviderId) return;

    setIsLoading(true);
    try {
      const oldProviderId = booking.provider_id;
      const { error } = await supabase
        .from("bookings")
        .update({ provider_id: reassignProviderId })
        .eq("id", booking.id);

      if (error) throw error;

      await logBookingAction(
        "provider_reassignment",
        { provider_id: oldProviderId },
        { provider_id: reassignProviderId },
        {
          reassigned_by_role: user.provider_role,
          reassignment_reason: "Manual reassignment",
        },
      );

      setIsReassignDialogOpen(false);
      setReassignProviderId("");
      onUpdate?.();

      toast({
        title: "Success",
        description: "Booking reassigned successfully",
      });
    } catch (error: any) {
      logger.error("Error reassigning booking:", error);

      let errorMessage = "Failed to reassign booking";
      if (typeof error === "string") {
        errorMessage = error;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.details) {
        errorMessage = error.details;
      } else if (error?.error?.message) {
        errorMessage = error.error.message;
      } else if (error?.hint) {
        errorMessage = error.hint;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!user || !message.trim()) return;

    setIsLoading(true);
    try {
      // In a real implementation, this would send SMS/email to customer
      // For now, we'll just log the action
      await logBookingAction(
        "customer_message_sent",
        {},
        { message: message.trim() },
        {
          sent_by_role: user.provider_role,
          message_type: "manual",
        },
      );

      setIsMessageDialogOpen(false);
      setMessage("");
      onUpdate?.();

      toast({
        title: "Success",
        description: "Message sent successfully",
      });
    } catch (error: any) {
      logger.error("Error sending message:", error);
      const errorMessage =
        error?.message ||
        error?.details ||
        error?.error?.message ||
        "Failed to send message";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({
          booking_status: "cancelled",
          cancelled_at: new Date().toISOString(),
          cancelled_by: user.id,
          cancellation_reason: cancelReason,
          refund_amount: refundAmount,
        })
        .eq("id", booking.id);

      if (error) throw error;

      await logBookingAction(
        "booking_cancelled",
        { booking_status: booking.booking_status },
        {
          booking_status: "cancelled",
          cancellation_reason: cancelReason,
          refund_amount: refundAmount,
        },
        {
          cancelled_by_role: user.provider_role,
          cancellation_type: "manual",
        },
      );

      setIsCancelDialogOpen(false);
      setCancelReason("");
      setRefundAmount(0);
      onUpdate?.();

      toast({
        title: "Success",
        description: "Booking cancelled successfully",
      });
    } catch (error: any) {
      logger.error("Error cancelling booking:", error);

      let errorMessage = "Failed to cancel booking";
      if (typeof error === "string") {
        errorMessage = error;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.details) {
        errorMessage = error.details;
      } else if (error?.error?.message) {
        errorMessage = error.error.message;
      } else if (error?.hint) {
        errorMessage = error.hint;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const DeliveryIcon = getDeliveryIcon(booking.delivery_type);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-full flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">
                {booking.services?.name || "Service"}
              </h3>
              <p className="text-sm text-foreground/60 mb-2">
                Customer: {booking.guest_name || "Guest"}
              </p>
              <div className="flex items-center gap-4 text-sm text-foreground/60">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(booking.booking_date).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {booking.start_time}
                </div>
                <div className="flex items-center gap-1">
                  <DeliveryIcon className="w-4 h-4" />
                  {booking.delivery_type.replace("_", " ").toUpperCase()}
                </div>
              </div>
              {booking.guest_phone && (
                <div className="flex items-center gap-1 text-sm text-foreground/60 mt-1">
                  <Phone className="w-4 h-4" />
                  {booking.guest_phone}
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="flex flex-col gap-2">
              <Badge className={getStatusColor(booking.booking_status)}>
                {booking.booking_status.replace("_", " ").toUpperCase()}
              </Badge>
              <Badge className={getPaymentStatusColor(booking.payment_status)}>
                Payment: {booking.payment_status.toUpperCase()}
              </Badge>
            </div>
            <p className="text-lg font-semibold text-roam-blue mt-2">
              ${booking.total_amount}
            </p>
          </div>
        </div>

        {/* Provider Information */}
        {booking.providers && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
            <Users className="w-4 h-4 text-gray-500" />
            <span className="text-sm">
              Provider: {booking.providers.first_name}{" "}
              {booking.providers.last_name}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {/* Status Update */}
          {(canManageAllBookings ||
            booking.provider_id === user?.provider_id) && (
            <Dialog
              open={isStatusDialogOpen}
              onOpenChange={setIsStatusDialogOpen}
            >
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Edit className="w-4 h-4 mr-2" />
                  Update Status
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Update Booking Status</DialogTitle>
                  <DialogDescription>
                    Change the status of this booking.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="status">New Status</Label>
                    <Select
                      value={newStatus}
                      onValueChange={(value) =>
                        setNewStatus(value as BookingStatus)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsStatusDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleStatusUpdate} disabled={isLoading}>
                    {isLoading ? "Updating..." : "Update Status"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {/* Reassignment - Owner/Dispatcher only */}
          {canReassignBookings && availableProviders.length > 0 && (
            <Dialog
              open={isReassignDialogOpen}
              onOpenChange={setIsReassignDialogOpen}
            >
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Users className="w-4 h-4 mr-2" />
                  Reassign
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reassign Booking</DialogTitle>
                  <DialogDescription>
                    Assign this booking to a different provider.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="provider">Select Provider</Label>
                    <Select
                      value={reassignProviderId}
                      onValueChange={setReassignProviderId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableProviders.map((provider) => (
                          <SelectItem key={provider.id} value={provider.id}>
                            {provider.first_name} {provider.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsReassignDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleReassignment}
                    disabled={isLoading || !reassignProviderId}
                  >
                    {isLoading ? "Reassigning..." : "Reassign Booking"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {/* Send Message */}
          {canSendAllMessages && (
            <Dialog
              open={isMessageDialogOpen}
              onOpenChange={setIsMessageDialogOpen}
            >
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Message Customer
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Send Message to Customer</DialogTitle>
                  <DialogDescription>
                    Send a message to {booking.guest_name || "the customer"}.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type your message here..."
                      rows={4}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsMessageDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSendMessage}
                    disabled={isLoading || !message.trim()}
                  >
                    {isLoading ? "Sending..." : "Send Message"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {/* Cancel Booking */}
          {canManageAllBookings && booking.booking_status !== "cancelled" && (
            <AlertDialog
              open={isCancelDialogOpen}
              onOpenChange={setIsCancelDialogOpen}
            >
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel Booking</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. Please provide a reason for
                    cancellation.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reason">Cancellation Reason</Label>
                    <Textarea
                      id="reason"
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="Reason for cancellation..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="refund">Refund Amount</Label>
                    <Input
                      id="refund"
                      type="number"
                      min="0"
                      max={booking.total_amount}
                      step="0.01"
                      value={refundAmount}
                      onChange={(e) =>
                        setRefundAmount(parseFloat(e.target.value) || 0)
                      }
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCancelBooking}
                    disabled={isLoading || !cancelReason.trim()}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {isLoading ? "Cancelling..." : "Cancel Booking"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {/* Admin Notes */}
        {booking.admin_notes && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">
                Admin Notes
              </span>
            </div>
            <p className="text-sm text-yellow-700">{booking.admin_notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
