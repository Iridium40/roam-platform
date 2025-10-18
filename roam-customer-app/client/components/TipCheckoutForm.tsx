import React, { useState } from 'react';
import { useStripe, useElements, PaymentElement, AddressElement } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, DollarSign, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TipCheckoutFormProps {
  tipAmount: number;
  providerName: string;
  onSuccess: () => void;
  onError: (error: string) => void;
}

export function TipCheckoutForm({ tipAmount, providerName, onSuccess, onError }: TipCheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/my-bookings?tip_success=true`,
        },
        redirect: 'if_required',
      });

      if (error) {
        console.error('Payment failed:', error);
        setErrorMessage(error.message || 'Payment failed. Please try again.');
        onError(error.message || 'Payment failed');
      } else {
        console.log('✅ Tip payment successful');
        onSuccess();
      }
    } catch (err) {
      console.error('Payment error:', err);
      const errorMsg = 'An unexpected error occurred. Please try again.';
      setErrorMessage(errorMsg);
      onError(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Tip Payment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tip Summary */}
          <div className="bg-gray-50 rounded-lg p-4 border">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600">Tip Amount:</span>
              <span className="text-lg font-semibold text-gray-900">
                ${tipAmount.toFixed(2)}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              For {providerName}
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {/* Payment Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Payment Information
                </label>
                <div className="border rounded-lg p-4">
                  <PaymentElement 
                    options={{
                      layout: 'tabs',
                      paymentMethodOrder: ['card', 'apple_pay', 'google_pay'],
                      wallets: {
                        applePay: 'auto',
                        googlePay: 'auto',
                      },
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Billing Address (Optional)
                </label>
                <div className="border rounded-lg p-4">
                  <AddressElement 
                    options={{
                      mode: 'billing',
                      allowedCountries: ['US'],
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={!stripe || !elements || isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing Tip...
                </>
              ) : (
                <>
                  <DollarSign className="w-4 h-4 mr-2" />
                  Send ${tipAmount.toFixed(2)} Tip
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
