import { useState, useEffect } from 'react';
import {
  useStripe,
  useElements,
  PaymentElement,
  AddressElement
} from '@stripe/react-stripe-js';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Loader2, CreditCard, Trash2, Check } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../contexts/AuthContext';

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
  clientSecret: string;
  onSuccess: (paymentIntent: any) => void;
  onError: (error: string) => void;
}

export function CheckoutForm({ bookingDetails, clientSecret, onSuccess, onError }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [savedPaymentMethods, setSavedPaymentMethods] = useState<any[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('new');
  const [savePaymentMethod, setSavePaymentMethod] = useState(true);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(true);
  const { toast } = useToast();
  const { customer } = useAuth();

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
    
    if (!stripe || !elements) {
      onError('Stripe has not loaded yet');
      return;
    }

    setIsLoading(true);

    try {
      if (!clientSecret) {
        throw new Error('Payment intent not found');
      }

      let paymentIntent;
      let error;

      if (selectedPaymentMethod !== 'new') {
        // Use saved payment method - confirm directly
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
            return_url: `${window.location.origin}/booking-success?booking_id=${bookingDetails.id || ''}`,
          },
          redirect: 'if_required',
        });
        paymentIntent = result.paymentIntent;
        error = result.error;
      }

      if (error) {
        console.error('Payment failed:', error);
        onError(error.message || 'Payment failed');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Save payment method if requested and using new card
        if (savePaymentMethod && selectedPaymentMethod === 'new' && customer?.user_id && paymentIntent.payment_method) {
          try {
            const paymentMethodId = typeof paymentIntent.payment_method === 'string' 
              ? paymentIntent.payment_method 
              : paymentIntent.payment_method.id;

            const saveResponse = await fetch('/api/stripe/save-payment-method', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                payment_method_id: paymentMethodId,
                customer_id: customer.user_id,
                set_as_default: savedPaymentMethods.length === 0, // Set as default if first card
              }),
            });

            if (saveResponse.ok) {
              // Reload payment methods
              const listResponse = await fetch(`/api/stripe/list-payment-methods?customer_id=${customer.user_id}`);
              if (listResponse.ok) {
                const data = await listResponse.json();
                setSavedPaymentMethods(data.payment_methods || []);
              }
            }
          } catch (saveError) {
            console.error('Error saving payment method:', saveError);
            // Don't fail the payment if saving fails
          }
        }

        onSuccess(paymentIntent);
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      onError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePaymentMethod = async (paymentMethodId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (!customer?.user_id) return;

    if (!confirm('Are you sure you want to delete this payment method?')) {
      return;
    }

    try {
      const response = await fetch('/api/stripe/delete-payment-method', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_method_id: paymentMethodId,
          customer_id: customer.user_id,
        }),
      });

      if (response.ok) {
        // Reload payment methods
        const listResponse = await fetch(`/api/stripe/list-payment-methods?customer_id=${customer.user_id}`);
        if (listResponse.ok) {
          const data = await listResponse.json();
          setSavedPaymentMethods(data.payment_methods || []);
          // Reset to 'new' if deleted method was selected
          if (selectedPaymentMethod === paymentMethodId) {
            setSelectedPaymentMethod('new');
          }
        }
      } else {
        throw new Error('Failed to delete payment method');
      }
    } catch (error: any) {
      console.error('Error deleting payment method:', error);
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
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDeletePaymentMethod(pm.id, e)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
                
                {/* Save payment method checkbox */}
                {customer?.user_id && (
                  <div className="mt-4 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="save-payment-method"
                      checked={savePaymentMethod}
                      onChange={(e) => setSavePaymentMethod(e.target.checked)}
                      className="w-4 h-4 text-roam-blue border-gray-300 rounded focus:ring-roam-blue"
                    />
                    <Label htmlFor="save-payment-method" className="text-sm text-gray-600 cursor-pointer">
                      Save this payment method for future use
                    </Label>
                  </div>
                )}
              </div>
            )}

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
