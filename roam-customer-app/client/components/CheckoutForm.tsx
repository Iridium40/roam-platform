import { useState, useEffect } from 'react';
import {
  useStripe,
  useElements,
  PaymentElement,
  AddressElement
} from '@stripe/react-stripe-js';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Loader2, CreditCard } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

interface CheckoutFormProps {
  bookingDetails: {
    id?: string;
    serviceName: string;
    providerName: string;
    businessName: string;
    scheduledDate: string;
    serviceAmount: number;
    platformFee?: number;
    discountAmount?: number;
    taxAmount?: number;
    taxRate?: number | null;
    total: number;
  };
  onSuccess: (paymentIntent: any) => void;
  onError: (error: string) => void;
}

export function CheckoutForm({ bookingDetails, onSuccess, onError }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const {
    serviceName,
    providerName,
    businessName,
    scheduledDate,
    serviceAmount,
    platformFee = 0,
    discountAmount = 0,
    taxAmount = 0,
    taxRate = null,
    total
  } = bookingDetails;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      onError('Stripe has not loaded yet');
      return;
    }

    setIsLoading(true);

    try {
      // Confirm payment with Stripe
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/booking-success?booking_id=${bookingDetails.id || ''}`,
        },
        redirect: 'if_required',
      });

      if (error) {
        console.error('Payment failed:', error);
        onError(error.message || 'Payment failed');
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        toast({
          title: "Payment Successful!",
          description: "Your booking has been confirmed.",
        });
        onSuccess(paymentIntent);
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      onError(err.message);
      toast({
        title: "Payment Error",
        description: err.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Booking Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>Booking Summary</span>
          </CardTitle>
          <CardDescription>
            {serviceName} with {providerName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-gray-600">
            <p><strong>Business:</strong> {businessName}</p>
            <p><strong>Date:</strong> {new Date(scheduledDate).toLocaleDateString()}</p>
            <p><strong>Time:</strong> {new Date(scheduledDate).toLocaleTimeString()}</p>
          </div>
          
          <hr className="my-3" />
          
          <div className="flex justify-between text-sm">
            <span>Service</span>
            <span>${serviceAmount.toFixed(2)}</span>
          </div>
          
          {platformFee > 0 && (
            <div className="flex justify-between text-sm text-gray-600">
              <span>Platform Fee</span>
              <span>${platformFee.toFixed(2)}</span>
            </div>
          )}
          
          {discountAmount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount</span>
              <span>-${discountAmount.toFixed(2)}</span>
            </div>
          )}
          
          {taxAmount > 0 && (
            <div className="flex justify-between text-sm text-gray-600">
              <span>
                Sales Tax
                {taxRate && ` (${(taxRate * 100).toFixed(2)}%)`}
              </span>
              <span>${taxAmount.toFixed(2)}</span>
            </div>
          )}
          
          <hr className="my-2" />
          
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Payment Form */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Payment Element */}
            <div>
              <PaymentElement 
                options={{
                  layout: "tabs",
                  paymentMethodOrder: ['card', 'apple_pay', 'google_pay'],
                  wallets: {
                    applePay: 'auto',
                    googlePay: 'auto',
                  },
                }}
              />
            </div>

            {/* Address Element */}
            <div>
              <h3 className="text-sm font-medium mb-2">Billing Address</h3>
              <AddressElement 
                options={{ 
                  mode: 'billing',
                  allowedCountries: ['US']
                }} 
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-12 text-base bg-roam-blue hover:bg-roam-blue/90"
              disabled={!stripe || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing Payment...
                </>
              ) : (
                `Pay $${total.toFixed(2)}`
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <div className="text-center text-sm text-gray-500">
        <p>🔒 Payments are secure and encrypted</p>
        <p>Powered by Stripe</p>
      </div>
    </div>
  );
}
