// ENHANCED CheckoutForm following Stripe's official best practices
// Based on: https://docs.stripe.com/checkout/embedded/quickstart?client=react
// This version adds improved error handling, payment status messages, and better UX

import { useState, useEffect } from 'react';
import {
  useStripe,
  useElements,
  PaymentElement,
  AddressElement
} from '@stripe/react-stripe-js';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, CreditCard, DollarSign, CheckCircle, AlertCircle } from 'lucide-react';
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
    total: number;
  };
  onSuccess: (paymentIntent: any) => void;
  onError: (error: string) => void;
}

export function CheckoutForm({ bookingDetails, onSuccess, onError }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const { toast } = useToast();

  const {
    serviceName,
    providerName,
    businessName,
    scheduledDate,
    serviceAmount,
    platformFee = 0,
    discountAmount = 0,
    total
  } = bookingDetails;

  // Check payment status on mount (if returning from redirect)
  useEffect(() => {
    if (!stripe) {
      return;
    }

    const clientSecret = new URLSearchParams(window.location.search).get(
      'payment_intent_client_secret'
    );

    if (!clientSecret) {
      return;
    }

    stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
      switch (paymentIntent?.status) {
        case 'succeeded':
          setMessage('Payment succeeded!');
          setMessageType('success');
          onSuccess(paymentIntent);
          break;
        case 'processing':
          setMessage('Your payment is processing.');
          setMessageType('info');
          break;
        case 'requires_payment_method':
          setMessage('Your payment was not successful, please try again.');
          setMessageType('error');
          break;
        default:
          setMessage('Something went wrong.');
          setMessageType('error');
          break;
      }
    });
  }, [stripe]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      onError('Stripe has not loaded yet. Please refresh the page.');
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      // Confirm payment with Stripe
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/booking-success?booking_id=${bookingDetails.id || ''}`,
        },
        redirect: 'if_required', // Only redirect if 3D Secure is required
      });

      if (error) {
        // Payment failed or was cancelled
        console.error('Payment failed:', error);
        
        // Show user-friendly error messages
        let errorMessage = error.message || 'Payment failed';
        
        if (error.type === 'card_error' || error.type === 'validation_error') {
          errorMessage = error.message || 'Please check your card details and try again.';
        } else if (error.type === 'invalid_request_error') {
          errorMessage = 'There was an issue with your payment. Please try again.';
        }
        
        setMessage(errorMessage);
        setMessageType('error');
        onError(errorMessage);
        
        toast({
          title: "Payment Failed",
          description: errorMessage,
          variant: "destructive",
        });

      } else if (paymentIntent) {
        // Handle payment status
        switch (paymentIntent.status) {
          case 'succeeded':
            setMessage('Payment successful! Redirecting...');
            setMessageType('success');
            toast({
              title: "Payment Successful!",
              description: "Your booking has been confirmed.",
            });
            onSuccess(paymentIntent);
            break;
            
          case 'processing':
            setMessage('Your payment is processing. We\'ll update you when payment is received.');
            setMessageType('info');
            toast({
              title: "Payment Processing",
              description: "Your payment is being processed. You'll receive a confirmation soon.",
            });
            // Still call onSuccess as booking is created
            onSuccess(paymentIntent);
            break;
            
          case 'requires_payment_method':
            setMessage('Payment failed. Please try another payment method.');
            setMessageType('error');
            onError('Payment method failed');
            break;
            
          default:
            setMessage('Something went wrong. Please try again.');
            setMessageType('error');
            onError('Unknown payment status');
            break;
        }
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      const errorMessage = err.message || 'An unexpected error occurred';
      setMessage(errorMessage);
      setMessageType('error');
      onError(errorMessage);
      
      toast({
        title: "Payment Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Payment Status Message */}
      {message && (
        <Alert variant={messageType === 'error' ? 'destructive' : 'default'}>
          {messageType === 'success' && <CheckCircle className="h-4 w-4" />}
          {messageType === 'error' && <AlertCircle className="h-4 w-4" />}
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

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
              <span>Service Fee</span>
              <span>${platformFee.toFixed(2)}</span>
            </div>
          )}
          
          {discountAmount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount</span>
              <span>-${discountAmount.toFixed(2)}</span>
            </div>
          )}
          
          <hr className="my-2" />
          
          <div className="flex justify-between font-semibold text-lg">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Payment Form */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Information</CardTitle>
          <CardDescription>
            All transactions are secure and encrypted
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Payment Element - Unified payment method collection */}
            <div>
              <PaymentElement 
                options={{
                  layout: {
                    type: 'tabs',
                    defaultCollapsed: false,
                  },
                  paymentMethodOrder: ['card', 'apple_pay', 'google_pay'],
                  fields: {
                    billingDetails: {
                      email: 'auto', // Collect email if not already provided
                    }
                  },
                  terms: {
                    card: 'auto', // Show terms for cards if required
                  }
                }}
              />
            </div>

            {/* Address Element for billing */}
            <div>
              <h3 className="text-sm font-medium mb-2">Billing Address</h3>
              <AddressElement 
                options={{ 
                  mode: 'billing',
                  allowedCountries: ['US'],
                  fields: {
                    phone: 'auto', // Collect phone if needed
                  },
                  validation: {
                    phone: {
                      required: 'auto',
                    }
                  }
                }} 
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-12 text-base bg-roam-blue hover:bg-roam-blue/90"
              disabled={!stripe || !elements || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing Payment...
                </>
              ) : (
                <>
                  <DollarSign className="mr-2 h-4 w-4" />
                  Pay ${total.toFixed(2)}
                </>
              )}
            </Button>

            {/* Payment method icons */}
            <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
              <span>Accepts</span>
              <span className="font-medium">Visa</span>
              <span>•</span>
              <span className="font-medium">Mastercard</span>
              <span>•</span>
              <span className="font-medium">Amex</span>
              <span>•</span>
              <span className="font-medium">Discover</span>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <div className="text-center space-y-1">
        <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
          <span className="text-lg">🔒</span>
          <span className="font-medium">Secure SSL Encrypted Payment</span>
        </div>
        <p className="text-xs text-gray-500">
          Your payment information is encrypted and never stored on our servers
        </p>
        <p className="text-xs text-gray-400">Powered by Stripe</p>
      </div>
    </div>
  );
}

