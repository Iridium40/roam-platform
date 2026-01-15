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
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

/**
 * Get a user-friendly error message for Stripe payment errors
 */
function getPaymentErrorMessage(error: any): string {
  // Handle card_error type with specific decline codes
  if (error.type === 'card_error') {
    const declineCode = error.decline_code;
    const code = error.code;

    // Map decline codes to user-friendly messages
    const declineMessages: Record<string, string> = {
      'insufficient_funds': 'Your card has insufficient funds. Please try a different card or add funds to your account.',
      'card_velocity_exceeded': 'You have exceeded the transaction limit for this card. Please try again later or use a different card.',
      'lost_card': 'This card has been reported lost. Please use a different card.',
      'stolen_card': 'This card has been reported stolen. Please use a different card.',
      'expired_card': 'Your card has expired. Please use a different card or update your card details.',
      'incorrect_cvc': 'The security code (CVC) you entered is incorrect. Please check and try again.',
      'incorrect_number': 'The card number you entered is incorrect. Please check and try again.',
      'invalid_expiry_month': 'The expiration month is invalid. Please check and try again.',
      'invalid_expiry_year': 'The expiration year is invalid. Please check and try again.',
      'processing_error': 'An error occurred while processing your card. Please try again or use a different card.',
      'do_not_honor': 'Your card was declined. Please contact your bank or try a different card.',
      'generic_decline': 'Your card was declined. Please try a different card or contact your bank.',
      'fraudulent': 'This transaction was flagged as potentially fraudulent. Please contact your bank.',
      'card_not_supported': 'This card type is not supported. Please use a Visa, Mastercard, American Express, or Discover card.',
      'currency_not_supported': 'This card does not support USD transactions. Please use a different card.',
      'duplicate_transaction': 'A duplicate transaction was detected. Please wait a moment before trying again.',
      'incorrect_zip': 'The ZIP code you entered does not match the card. Please check and try again.',
      'invalid_account': 'This card account is invalid. Please use a different card.',
      'new_account_information_available': 'Your card information may have changed. Please contact your bank or try a different card.',
      'no_action_taken': 'Your card was declined. Please try again or use a different card.',
      'not_permitted': 'This transaction is not permitted by your card. Please contact your bank or try a different card.',
      'pickup_card': 'Your card cannot be used for this transaction. Please contact your bank.',
      'restricted_card': 'Your card is restricted. Please contact your bank or try a different card.',
      'revocation_of_all_authorizations': 'All authorizations have been revoked for this card. Please contact your bank.',
      'revocation_of_authorization': 'The authorization was revoked. Please try again or use a different card.',
      'security_violation': 'A security issue was detected. Please contact your bank.',
      'service_not_allowed': 'This service is not allowed for your card. Please try a different card.',
      'stop_payment_order': 'A stop payment was placed on this card. Please contact your bank.',
      'transaction_not_allowed': 'This transaction is not allowed. Please contact your bank or try a different card.',
      'try_again_later': 'Unable to process this transaction right now. Please try again in a few minutes.',
      'withdrawal_count_limit_exceeded': 'You have exceeded the withdrawal limit for this card. Please try again later or use a different card.',
    };

    if (declineCode && declineMessages[declineCode]) {
      return declineMessages[declineCode];
    }

    // Handle by error code if no specific decline code
    const codeMessages: Record<string, string> = {
      'card_declined': 'Your card was declined. Please try a different card or contact your bank.',
      'expired_card': 'Your card has expired. Please use a different card.',
      'incorrect_cvc': 'The security code (CVC) is incorrect. Please check and try again.',
      'incorrect_number': 'The card number is incorrect. Please check and try again.',
      'invalid_card_type': 'This card type is not supported. Please use a different card.',
      'invalid_expiry_month': 'The expiration month is invalid. Please check and try again.',
      'invalid_expiry_year': 'The expiration year is invalid. Please check and try again.',
      'postal_code_invalid': 'The ZIP/postal code is invalid. Please check and try again.',
    };

    if (code && codeMessages[code]) {
      return codeMessages[code];
    }
  }

  // Handle validation errors
  if (error.type === 'validation_error') {
    return 'Please check your card details and try again.';
  }

  // Handle API errors
  if (error.type === 'api_error') {
    return 'A temporary error occurred. Please try again in a moment.';
  }

  // Handle rate limit errors
  if (error.type === 'rate_limit_error') {
    return 'Too many requests. Please wait a moment and try again.';
  }

  // Default: use Stripe's message or a generic fallback
  return error.message || 'Payment failed. Please try again or use a different payment method.';
}

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
  const [billingAddress, setBillingAddress] = useState<any>(null);
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

  // Load customer billing address for pre-filling
  useEffect(() => {
    const loadBillingAddress = async () => {
      if (!customer?.user_id) return;

      try {
        // Try to get primary customer location
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
          // Fallback to customer profile data
          setBillingAddress({
            name: customer.first_name && customer.last_name 
              ? `${customer.first_name} ${customer.last_name}` 
              : customer.email || '',
            phone: customer.phone || '',
          });
        }
      } catch (error) {
        console.error('Error loading billing address:', error);
        // Fallback to customer profile data
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
            onError(verifyError.message || 'This payment method cannot be used. Please select a different card or add a new one.');
            setIsLoading(false);
            return;
          }
        }

        // Confirm payment with saved payment method
        // For manual capture, this will authorize but not charge (status will be 'requires_capture')
        // Note: With manual capture, confirmCardPayment should work normally - it will authorize but not capture
        const result = await stripe.confirmCardPayment(clientSecret, {
          payment_method: selectedPaymentMethod,
        });
        paymentIntent = result.paymentIntent;
        error = result.error;
        
        // Check if payment was authorized but not captured (manual capture)
        if (paymentIntent && paymentIntent.status === 'requires_capture') {
          console.log('✅ Payment authorized successfully (will be captured when booking is accepted)');
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
          console.log('✅ Payment charged successfully');
        }
      } else {
        // Use new payment method from PaymentElement
        let paymentMethodId: string | null = null;

        // If user wants to save the payment method, attach it to customer BEFORE processing payment
        if (savePaymentMethod && customer?.user_id) {
          try {
            // Create payment method from PaymentElement
            const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
              elements,
              params: {
                billing_details: billingAddress ? {
                  name: billingAddress.name,
                  address: billingAddress.address,
                  phone: billingAddress.phone,
                } : undefined,
              },
            });

            if (pmError) {
              throw new Error(`Failed to create payment method: ${pmError.message}`);
            }

            if (paymentMethod) {
              paymentMethodId = paymentMethod.id;

              // Attach payment method to customer BEFORE using it
              const attachResponse = await fetch('/api/stripe/attach-payment-method-from-element', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  payment_method_id: paymentMethodId,
                  customer_id: customer.user_id,
                  set_as_default: savedPaymentMethods.length === 0, // Set as default if first card
                }),
              });

              if (!attachResponse.ok) {
                const errorData = await attachResponse.json();
                throw new Error(`Failed to save payment method: ${errorData.error || 'Unknown error'}`);
              }

              // Reload payment methods to include the newly saved one
              const listResponse = await fetch(`/api/stripe/list-payment-methods?customer_id=${customer.user_id}`);
              if (listResponse.ok) {
                const data = await listResponse.json();
                setSavedPaymentMethods(data.payment_methods || []);
              }

              // Extract payment intent ID from client secret (format: pi_xxx_secret_yyy)
              const paymentIntentId = clientSecret.split('_secret_')[0];
              
              // Update payment intent with the attached payment method
              const updateResponse = await fetch('/api/stripe/update-payment-intent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  payment_intent_id: paymentIntentId,
                  payment_method_id: paymentMethodId,
                }),
              });

              if (!updateResponse.ok) {
                console.warn('⚠️ Could not update payment intent with payment method, continuing anyway');
              }
            }
          } catch (saveError: any) {
            console.error('Error saving payment method:', saveError);
            // Don't fail the payment - just continue without saving
            // User can still complete payment, just won't save the card
            // But notify the user that their card won't be saved
            toast({
              title: "Card not saved",
              description: "Your payment will still go through, but we couldn't save your card for future use.",
              variant: "default",
            });
          }
        }

        // Confirm payment (authorize only, not capture - payment will be captured when booking is accepted)
        // If we have a payment_method_id, use confirmCardPayment; otherwise use confirmPayment with elements
        let result;
        if (paymentMethodId) {
          // Use the attached payment method
          // For manual capture, we need to ensure the payment intent is in the correct state
          result = await stripe.confirmCardPayment(clientSecret, {
            payment_method: paymentMethodId,
            // Don't set return_url here - we handle success manually
          });
        } else {
          // Use PaymentElement
          // For manual capture, confirmPayment will authorize but not capture
          result = await stripe.confirmPayment({
            elements,
            confirmParams: {
              return_url: `${window.location.origin}/booking-success?booking_id=${bookingDetails.id || ''}`,
            },
            redirect: 'if_required',
          });
        }
        paymentIntent = result.paymentIntent;
        error = result.error;
        
        // Check if payment was authorized but not captured (manual capture)
        if (paymentIntent && paymentIntent.status === 'requires_capture') {
          console.log('✅ Payment authorized successfully (will be captured when booking is accepted)');
        }
      }

      if (error) {
        console.error('Payment failed:', error);
        const userFriendlyMessage = getPaymentErrorMessage(error);
        onError(userFriendlyMessage);
      } else if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'requires_capture')) {
        // Payment succeeded (charged) OR authorized (requires_capture - will be charged when booking is accepted)
        if (paymentIntent.status === 'requires_capture') {
          console.log('✅ Payment authorized - will be charged when booking is accepted');
        } else {
          console.log('✅ Payment charged successfully');
        }
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
                    <label
                      key={pm.id}
                      htmlFor={pm.id}
                      className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                        selectedPaymentMethod === pm.id ? 'border-roam-blue bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <RadioGroupItem value={pm.id} id={pm.id} />
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
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeletePaymentMethod(pm.id, e);
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </label>
                  ))}
                  
                  <label
                    htmlFor="new"
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                      selectedPaymentMethod === 'new' ? 'border-roam-blue bg-blue-50' : ''
                    }`}
                  >
                    <RadioGroupItem value="new" id="new" />
                    <span>Use a new payment method</span>
                  </label>
                </RadioGroup>
              </div>
            )}

            {/* Payment Element - Only show when "new" is selected */}
            {selectedPaymentMethod === 'new' && (
              <div>
                <PaymentElement 
                  options={{
                    layout: "tabs",
                    paymentMethodOrder: ['card'],
                    wallets: {
                      applePay: 'never',
                      googlePay: 'never',
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

            {/* Address Element - Only show when using a new payment method */}
            {selectedPaymentMethod === 'new' && (
              <div>
                <h3 className="text-sm font-medium mb-2">Billing Address</h3>
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
            )}

            {/* Terms and Conditions */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-700 leading-relaxed">
                By clicking Pay, you agree to the{" "}
                <Link
                  to="/terms-and-conditions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-roam-blue hover:underline font-medium"
                >
                  Terms and Conditions
                </Link>
                . Both service fees (platform fees, non-refundable) and business service fees will be charged upon booking acceptance. Cancellation 24 hours or more before the booking date will result in a refund of business service fees only (service fees remain non-refundable). Cancellation within 24 hours will result in 100% loss with no refund. You may reschedule your booking to prevent loss of funds.
              </p>
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
