import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { CheckoutForm } from "@/components/CheckoutForm";
import { useAuth } from "@/contexts/AuthContext";
import type { BookingWithDetails } from "@/types/index";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface AddMoreServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: BookingWithDetails | null;
  onSuccess?: () => void;
}

export const AddMoreServiceModal: React.FC<AddMoreServiceModalProps> = ({
  isOpen,
  onClose,
  booking,
  onSuccess,
}) => {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDescription, setPaymentDescription] = useState<string>("");
  const [paymentBreakdown, setPaymentBreakdown] = useState<any>(null);
  const { toast } = useToast();
  const { customer } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!booking) return;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than $0",
        variant: "destructive",
      });
      return;
    }

    if (!description.trim()) {
      toast({
        title: "Description Required",
        description: "Please describe what this additional service is for",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create payment intent for the additional service
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || localStorage.getItem('roam_access_token');

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Create payment intent
      const paymentIntentResponse = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          bookingId: booking.id,
          customerId: booking.customer_id,
          serviceId: booking.service_id,
          businessId: booking.business_id,
          serviceAmount: amountNum * 100, // Convert to cents
          bookingDate: booking.booking_date,
          startTime: booking.start_time,
          guestEmail: customer?.email || '',
          guestName: customer?.first_name && customer?.last_name 
            ? `${customer.first_name} ${customer.last_name}` 
            : customer?.email || '',
          guestPhone: customer?.phone || '',
          deliveryType: booking.delivery_type || 'business_location',
          specialInstructions: `Additional service: ${description.trim()}`,
          promotionId: null,
        }),
      });

      if (!paymentIntentResponse.ok) {
        const errorData = await paymentIntentResponse.json();
        throw new Error(errorData.error || 'Failed to create payment intent');
      }

      const paymentData = await paymentIntentResponse.json();
      
      // Store payment details and show payment form
      setClientSecret(paymentData.clientSecret);
      setPaymentAmount(amountNum);
      setPaymentDescription(description.trim());
      setPaymentBreakdown(paymentData.breakdown || null);
      setShowPayment(true);
    } catch (error: any) {
      console.error('Error creating payment intent:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to initialize payment. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  const handlePaymentSuccess = async (paymentIntent: any) => {
    try {
      // Now add the service to the booking after payment succeeds
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || localStorage.getItem('roam_access_token');

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/bookings/add-additional-service', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          booking_id: booking?.id,
          amount: paymentAmount,
          description: paymentDescription,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add additional service');
      }

      toast({
        title: "Payment Successful",
        description: `$${paymentAmount.toFixed(2)} has been charged and added to your booking.`,
      });

      // Reset form
      setAmount("");
      setDescription("");
      setShowPayment(false);
      setClientSecret(null);
      onClose();

      // Call success callback to refresh booking data
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error adding additional service after payment:', error);
      toast({
        title: "Payment Successful",
        description: "Payment was processed, but there was an issue updating the booking. Please contact support.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentError = (error: string) => {
    toast({
      title: "Payment Failed",
      description: error,
      variant: "destructive",
    });
    setIsSubmitting(false);
    setShowPayment(false);
    setClientSecret(null);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setAmount("");
      setDescription("");
      setShowPayment(false);
      setClientSecret(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={showPayment ? "sm:max-w-[700px] max-h-[90vh] overflow-y-auto" : "sm:max-w-[500px]"}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add More Services
          </DialogTitle>
          <DialogDescription>
            Add an additional service or charge to this booking. Payment will be processed immediately.
          </DialogDescription>
        </DialogHeader>

        {!showPayment ? (
          <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">
              Amount <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-9"
                required
                disabled={isSubmitting}
              />
            </div>
            <p className="text-xs text-gray-500">
              Enter the amount for this additional service
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              placeholder="e.g., Extra massage time, Additional products, Extended service duration..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              required
              disabled={isSubmitting}
              className="resize-none"
            />
            <p className="text-xs text-gray-500">
              Describe what this additional charge is for
            </p>
          </div>

          {booking && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-900">
                <strong>Current Booking:</strong> {booking.service_name}
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Payment will be processed immediately for this additional service.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !amount || !description.trim()}
              className="bg-roam-blue hover:bg-roam-blue/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Service
                </>
              )}
            </Button>
          </div>
        </form>
        ) : (
          clientSecret && stripePromise && (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CheckoutForm
                bookingDetails={{
                  id: booking?.id,
                  serviceName: paymentDescription,
                  providerName: booking?.provider_name || '',
                  businessName: booking?.business_name || '',
                  scheduledDate: booking?.booking_date || '',
                  serviceAmount: paymentAmount,
                  platformFee: paymentBreakdown?.platformFee || paymentAmount * 0.2,
                  discountAmount: paymentBreakdown?.discountAmount || 0,
                  taxAmount: paymentBreakdown?.taxAmount || 0,
                  taxRate: paymentBreakdown?.taxRate || null,
                  total: paymentBreakdown?.total || (paymentAmount * 1.2), // Include platform fee in total
                }}
                clientSecret={clientSecret}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
              />
            </Elements>
          )
        )}
      </DialogContent>
    </Dialog>
  );
};

