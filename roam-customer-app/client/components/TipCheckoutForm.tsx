import React, { useState, useEffect } from 'react';
import { useStripe, useElements, PaymentElement, AddressElement } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, DollarSign, AlertCircle, CreditCard, Trash2, Check } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface TipCheckoutFormProps {
  tipAmount: number;
  providerName: string;
  clientSecret: string;
  onSuccess: () => void;
  onError: (error: string) => void;
}

export function TipCheckoutForm({ tipAmount, providerName, clientSecret, onSuccess, onError }: TipCheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [savedPaymentMethods, setSavedPaymentMethods] = useState<any[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('new');
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(true);
  const [billingAddress, setBillingAddress] = useState<any>(null);
  const { customer } = useAuth();

  // Load saved payment methods
  useEffect(() => {
    const loadPaymentMethods = async () => {
      if (!customer?.user_id) {
        setLoadingPaymentMethods(false);
        return;
      }

      try {
        const response = await fetch(`/api/stripe/list-payment-methods?customer_id=${customer.user_id}`);
        if (response.ok) {
          const data = await response.json();
          setSavedPaymentMethods(data.payment_methods || []);
          // Set default payment method if available
          if (data.default_payment_method_id) {
            setSelectedPaymentMethod(data.default_payment_method_id);
          } else if (data.payment_methods && data.payment_methods.length > 0) {
            setSelectedPaymentMethod(data.payment_methods[0].id);
          }
        }
      } catch (error) {
        console.error('Error loading payment methods:', error);
      } finally {
        setLoadingPaymentMethods(false);
      }
    };

    loadPaymentMethods();
  }, [customer?.user_id]);

  // Load customer billing address for pre-filling
  useEffect(() => {
    const loadBillingAddress = async () => {
      if (!customer?.user_id) return;

      try {
        const { data: locations, error: locationError } = await supabase
          .from('customer_locations')
          .select('*')
          .eq('customer_id', customer.user_id)
          .eq('is_primary', true)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        if (locations && !locationError) {
          setBillingAddress({
            name: customer.first_name && customer.last_name 
              ? `${customer.first_name} ${customer.last_name}` 
              : customer.email || '',
            address: {
              line1: locations.street_address || '',
              line2: locations.unit_number || '',
              city: locations.city || '',
              state: locations.state || '',
              postal_code: locations.zip_code || '',
              country: 'US',
            },
            phone: customer.phone || '',
          });
        } else if (customer.first_name || customer.last_name || customer.email) {
          setBillingAddress({
            name: customer.first_name && customer.last_name 
              ? `${customer.first_name} ${customer.last_name}` 
              : customer.email || '',
            phone: customer.phone || '',
          });
        }
      } catch (error) {
        console.error('Error loading billing address:', error);
        if (customer.first_name || customer.last_name || customer.email) {
          setBillingAddress({
            name: customer.first_name && customer.last_name 
              ? `${customer.first_name} ${customer.last_name}` 
              : customer.email || '',
            phone: customer.phone || '',
          });
        }
      }
    };

    loadBillingAddress();
  }, [customer]);

  // Format card brand name
  const getCardBrandName = (brand: string) => {
    const brands: Record<string, string> = {
      visa: 'Visa',
      mastercard: 'Mastercard',
      amex: 'American Express',
      discover: 'Discover',
      diners: 'Diners Club',
      jcb: 'JCB',
      unionpay: 'UnionPay',
    };
    return brands[brand.toLowerCase()] || brand;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      onError('Stripe has not loaded yet');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      let paymentIntent;
      let error;

      if (selectedPaymentMethod !== 'new') {
        // Use saved payment method - verify it belongs to the customer first
        if (customer?.user_id) {
          try {
            const verifyResponse = await fetch('/api/stripe/verify-payment-method', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                payment_method_id: selectedPaymentMethod,
                customer_id: customer.user_id,
              }),
            });

            if (!verifyResponse.ok) {
              const errorData = await verifyResponse.json();
              throw new Error(errorData.error || 'Payment method verification failed');
            }
          } catch (verifyError: any) {
            console.error('Payment method verification error:', verifyError);
            setErrorMessage(verifyError.message || 'This payment method cannot be used. Please select a different card or add a new one.');
            onError(verifyError.message || 'This payment method cannot be used. Please select a different card or add a new one.');
            setIsProcessing(false);
            return;
          }
        }

        // Confirm payment with saved payment method
        const result = await stripe.confirmCardPayment(clientSecret, {
          payment_method: selectedPaymentMethod,
        });
        paymentIntent = result.paymentIntent;
        error = result.error;
      } else {
        // Use new payment method from PaymentElement
        const result = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/my-bookings?tip_success=true`,
          },
          redirect: 'if_required',
        });
        paymentIntent = result.paymentIntent;
        error = result.error;
      }

      if (error) {
        console.error('Payment failed:', error);
        setErrorMessage(error.message || 'Payment failed. Please try again.');
        onError(error.message || 'Payment failed');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        console.log('✅ Tip payment successful');
        onSuccess();
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      const errorMsg = err.message || 'An unexpected error occurred. Please try again.';
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
            {/* Saved Payment Methods */}
            {!loadingPaymentMethods && savedPaymentMethods.length > 0 && (
              <div className="space-y-3">
                <Label className="text-base font-semibold">Saved Payment Methods</Label>
                <RadioGroup value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                  {savedPaymentMethods.map((pm) => (
                    <div
                      key={pm.id}
                      className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                        selectedPaymentMethod === pm.id ? 'border-roam-blue bg-blue-50' : ''
                      }`}
                      onClick={() => setSelectedPaymentMethod(pm.id)}
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value={pm.id} id={pm.id} />
                        <Label htmlFor={pm.id} className="cursor-pointer flex-1">
                          <div className="flex items-center gap-2">
                            {pm.card && (
                              <>
                                <CreditCard className="w-5 h-5 text-gray-600" />
                                <span className="font-medium">
                                  {getCardBrandName(pm.card.brand)} •••• {pm.card.last4}
                                </span>
                                <span className="text-sm text-gray-500">
                                  Expires {pm.card.exp_month}/{pm.card.exp_year}
                                </span>
                                {pm.is_default && (
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                    Default
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </Label>
                      </div>
                    </div>
                  ))}
                  
                  <div
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                      selectedPaymentMethod === 'new' ? 'border-roam-blue bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedPaymentMethod('new')}
                  >
                    <RadioGroupItem value="new" id="new" />
                    <Label htmlFor="new" className="cursor-pointer">
                      Use a new payment method
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Payment Element - Only show when "new" is selected */}
            {selectedPaymentMethod === 'new' && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Payment Information
                  </label>
                  <div className="border rounded-lg p-4">
                    <PaymentElement 
                      options={{
                        layout: 'tabs',
                        paymentMethodOrder: ['card'],
                        wallets: {
                          applePay: 'never',
                          googlePay: 'never',
                        },
                      }}
                    />
                  </div>
                </div>

                {/* Address Element - Only show when using new payment method */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Billing Address
                  </label>
                  <div className="border rounded-lg p-4">
                    <AddressElement 
                      options={{
                        mode: 'billing',
                        allowedCountries: ['US'],
                        fields: {
                          phone: billingAddress?.phone ? 'always' : 'auto',
                        },
                        ...(billingAddress && {
                          defaultValues: {
                            name: billingAddress.name,
                            address: billingAddress.address,
                            phone: billingAddress.phone,
                          }
                        })
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

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
                `Send ${tipAmount.toFixed(2)} Tip`
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
