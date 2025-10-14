import React, { useState, useEffect } from "react";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
  PaymentElement,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { useToast } from "../hooks/use-toast";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { Loader2, CreditCard, Lock } from "lucide-react";
import { logger } from '@/utils/logger';

// Initialize Stripe with error handling for CSP issues
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY, {
  stripeAccount: undefined, // Not using Stripe Connect
}).catch((error) => {
  logger.error("Failed to load Stripe:", error);
  logger.warn("This might be due to Content Security Policy restrictions.");
  return null;
});

interface PaymentFormProps {
  bookingId: string;
  totalAmount: number;
  serviceFee: number;
  customerEmail: string;
  customerName: string;
  businessName: string;
  serviceName: string;
  onPaymentSuccess: (paymentIntentId: string) => void;
  onPaymentError: (error: string) => void;
  clientSecret?: string;
}

const PaymentFormContent: React.FC<PaymentFormProps> = ({
  bookingId,
  totalAmount,
  serviceFee,
  customerEmail,
  customerName,
  businessName,
  serviceName,
  onPaymentSuccess,
  onPaymentError,
  clientSecret: passedClientSecret,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const { customer, isCustomer } = useAuth();

  // Debug log to see what customer data is available
  logger.debug("💳 PaymentForm: Customer data debug:", {
    isCustomer,
    customer,
    customerHasUserId: !!customer?.user_id,
    customerKeys: customer ? Object.keys(customer) : "no customer",
  });

  // Test Stripe sync directly since we have customer data with user_id
  useEffect(() => {
    if (isCustomer && customer?.user_id) {
      logger.debug("🧪 Testing Stripe sync with mock customer ID...");
      syncStripeCustomerToSupabase("cus_test_mock_customer_id");
    }
  }, [isCustomer, customer?.user_id]);

  const [isLoading, setIsLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string>(
    passedClientSecret || "",
  );
  const [paymentIntentId, setPaymentIntentId] = useState<string>("");
  const [stripeCustomerId, setStripeCustomerId] = useState<string>("");

  // Update clientSecret when passed prop changes
  useEffect(() => {
    if (passedClientSecret) {
      setClientSecret(passedClientSecret);
    }
  }, [passedClientSecret]);

  // Function to sync Stripe customer ID to Supabase
  const syncStripeCustomerToSupabase = async (stripeCustomerId: string) => {
    logger.debug("Stripe sync debug:", {
      isCustomer,
      customer,
      customerUserId: customer?.user_id,
      stripeCustomerId,
    });

    if (!isCustomer || !customer?.user_id || !stripeCustomerId) {
      logger.debug(
        "Skipping Stripe customer sync - not authenticated customer or missing IDs",
      );
      return;
    }

    try {
      // Check if stripe profile already exists for this user
      const { data: existingProfile, error: fetchError } = await supabase
        .from("customer_stripe_profiles")
        .select("id")
        .eq("user_id", customer.user_id)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        logger.error("Error checking existing Stripe profile:", fetchError);
        return;
      }

      // Also check if this stripe_customer_id is already used by another user
      const { data: existingStripeId, error: stripeIdError } = await supabase
        .from("customer_stripe_profiles")
        .select("user_id")
        .eq("stripe_customer_id", stripeCustomerId)
        .single();

      if (stripeIdError && stripeIdError.code !== "PGRST116") {
        logger.error(
          "Error checking existing Stripe customer ID:",
          stripeIdError,
        );
        return;
      }

      // If the stripe_customer_id exists for a different user, log and return
      if (existingStripeId && existingStripeId.user_id !== customer.user_id) {
        logger.warn(
          `Stripe customer ID ${stripeCustomerId} is already associated with a different user`,
        );
        return;
      }

      if (existingProfile) {
        // Update existing profile
        const { error } = await supabase
          .from("customer_stripe_profiles")
          .update({
            stripe_customer_id: stripeCustomerId,
            stripe_email: customerEmail,
          })
          .eq("user_id", customer.user_id);

        if (error) {
          logger.error(
            "Error updating Stripe customer profile - Full error object:",
            error,
          );
          logger.error("Error type:", typeof error);
          logger.error("Error keys:", Object.keys(error || {}));

          let errorMessage = "Unknown error occurred";
          if (error) {
            if (typeof error === "string") {
              errorMessage = error;
            } else if (error.message) {
              errorMessage = error.message;
            } else if (error.error_description) {
              errorMessage = error.error_description;
            } else if (error.details) {
              errorMessage = error.details;
            } else if (error.hint) {
              errorMessage = error.hint;
            } else if (error.code) {
              errorMessage = `Database error (${error.code})`;
            } else {
              try {
                errorMessage = JSON.stringify(error);
              } catch {
                errorMessage = "Unable to parse error details";
              }
            }
          }

          logger.error("Parsed error message:", errorMessage);
        } else {
          logger.debug("Stripe customer profile updated successfully");
        }
      } else {
        // Create new profile with upsert to handle race conditions
        const { error } = await supabase
          .from("customer_stripe_profiles")
          .upsert(
            {
              user_id: customer.user_id,
              stripe_customer_id: stripeCustomerId,
              stripe_email: customerEmail,
            },
            {
              onConflict: "user_id",
            },
          );

        if (error) {
          logger.error(
            "Error creating Stripe customer profile - Full error object:",
            error,
          );
          logger.error("Error type:", typeof error);
          logger.error("Error keys:", Object.keys(error || {}));

          let errorMessage = "Unknown error occurred";
          if (error) {
            if (typeof error === "string") {
              errorMessage = error;
            } else if (error.message) {
              errorMessage = error.message;
            } else if (error.error_description) {
              errorMessage = error.error_description;
            } else if (error.details) {
              errorMessage = error.details;
            } else if (error.hint) {
              errorMessage = error.hint;
            } else if (error.code) {
              errorMessage = `Database error (${error.code})`;
            } else {
              try {
                errorMessage = JSON.stringify(error);
              } catch {
                errorMessage = "Unable to parse error details";
              }
            }
          }

          logger.error("Parsed error message:", errorMessage);
        } else {
          logger.debug(
            "Successfully created Stripe customer profile:",
            stripeCustomerId,
          );
        }
      }
    } catch (error: any) {
      logger.error(
        "Error syncing Stripe customer ID - Full error object:",
        error,
      );
      logger.error("Error type:", typeof error);
      logger.error("Error keys:", Object.keys(error || {}));

      let errorMessage = "Unknown error occurred";
      if (error) {
        if (typeof error === "string") {
          errorMessage = error;
        } else if (error.message) {
          errorMessage = error.message;
        } else if (error.error_description) {
          errorMessage = error.error_description;
        } else if (error.details) {
          errorMessage = error.details;
        } else if (error.hint) {
          errorMessage = error.hint;
        } else if (error.code) {
          errorMessage = `Database error (${error.code})`;
        } else {
          try {
            errorMessage = JSON.stringify(error);
          } catch {
            errorMessage = "Unable to parse error details";
          }
        }
      }

      logger.error("Parsed error message:", errorMessage);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!clientSecret) {
      return;
    }

    setIsLoading(true);

    try {
      // Check if we're in mock development mode
      if (clientSecret.includes("mock")) {
        logger.debug("🧪 Mock payment processing in development mode");

        // Simulate payment processing delay
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Simulate successful payment
        const mockPaymentIntentId = `pi_mock_${Date.now()}`;
        logger.debug("Mock payment succeeded:", mockPaymentIntentId);

        onPaymentSuccess(mockPaymentIntentId);
        toast({
          title: "Payment Successful! (Mock Mode)",
          description:
            "Your booking has been confirmed. This was a simulated payment for development.",
        });
        return;
      }

      // Real Stripe payment processing
      if (!stripe || !elements) {
        throw new Error("Stripe not initialized");
      }
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/booking-success?booking_id=${bookingId}`,
          receipt_email: customerEmail,
        },
        redirect: "if_required",
      });

      if (error) {
        logger.error("Payment error:", error);
        onPaymentError(error.message || "Payment failed");
        toast({
          title: "Payment Failed",
          description: error.message || "Your payment could not be processed.",
          variant: "destructive",
        });
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        logger.debug("Payment succeeded:", paymentIntent);
        onPaymentSuccess(paymentIntent.id);
        toast({
          title: "Payment Successful!",
          description: "Your booking has been confirmed and paid.",
        });
      }
    } catch (error: any) {
      logger.error("Payment processing error:", error);
      onPaymentError(error.message);
      toast({
        title: "Payment Error",
        description: "An unexpected error occurred during payment.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!clientSecret) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Setting up payment...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Payment Summary */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>Service: {serviceName}</span>
              <span>${(totalAmount - serviceFee).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Platform Fee (15%)</span>
              <span>${serviceFee.toFixed(2)}</span>
            </div>
            <hr className="my-2" />
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>${totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Element */}
          <div className="p-4 border rounded-lg">
            {clientSecret.includes("mock") ? (
              // Development mode - show mock payment form
              <div className="space-y-4">
                <div className="text-center py-8">
                  <div className="text-gray-600 mb-4">
                    <CreditCard className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Development Mode
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Payment processing is in mock mode for development. Click
                    "Pay" to simulate a successful payment.
                  </p>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      💡 To test real payments, deploy to Vercel or run with
                      proper Stripe configuration
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              // Production mode - show real Stripe PaymentElement
              <PaymentElement
                options={{
                  layout: {
                    type: "accordion",
                    defaultCollapsed: false,
                    radios: false,
                    spacedAccordionItems: true,
                  },
                  wallets: {
                    applePay: "auto",
                    googlePay: "auto",
                  },
                }}
              />
            )}
          </div>

          {/* Security Notice */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Lock className="h-4 w-4" />
            <span>Your payment information is secure and encrypted</span>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={(!stripe && !clientSecret.includes("mock")) || isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Processing Payment...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                Pay ${totalAmount.toFixed(2)}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

const PaymentForm: React.FC<PaymentFormProps> = (props) => {
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string>("");
  const [isInitializing, setIsInitializing] = useState(true);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Handle Stripe loading errors
  useEffect(() => {
    stripePromise
      .then((stripe) => {
        if (!stripe) {
          setStripeError(
            "Failed to load Stripe. This might be due to security restrictions.",
          );
        }
      })
      .catch((error) => {
        setStripeError(`Stripe loading error: ${error.message}`);
      });
  }, []);

  // Initialize payment intent to get clientSecret
  useEffect(() => {
    const initializePayment = async () => {
      try {
        setIsInitializing(true);
        setPaymentError(null);

        // Use cached auth for faster payment initialization
        const { getAuthHeaders } = await import("../lib/api/authUtils");
        const headers = await getAuthHeaders();

        const response = await fetch("/api/stripe/create-payment-intent", {
          method: "POST",
          headers,
          body: JSON.stringify({
            totalAmount: props.totalAmount,
            serviceFee: props.serviceFee,
            currency: "usd",
            bookingId: props.bookingId,
            customerEmail: props.customerEmail,
            customerName: props.customerName,
            businessName: props.businessName,
            serviceName: props.serviceName,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.clientSecret) {
            setClientSecret(data.clientSecret);
          } else {
            throw new Error("No client secret received from payment intent");
          }
        } else {
          throw new Error(
            `Payment intent creation failed with status: ${response.status}`,
          );
        }
      } catch (error) {
        logger.error("Payment initialization error:", error);
        setPaymentError(
          error instanceof Error
            ? error.message
            : "Failed to initialize payment",
        );
      } finally {
        setIsInitializing(false);
      }
    };

    initializePayment();
  }, [props.totalAmount, props.bookingId, props.customerEmail]);

  if (stripeError) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="text-red-600 mb-4">
            <CreditCard className="h-12 w-12 mx-auto mb-2" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Payment System Unavailable
          </h3>
          <p className="text-gray-600 mb-4">{stripeError}</p>
          <p className="text-sm text-gray-500">
            Please try refreshing the page or contact support if the issue
            persists.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (paymentError) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="text-red-600 mb-4">
            <CreditCard className="h-12 w-12 mx-auto mb-2" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Payment Initialization Failed
          </h3>
          <p className="text-gray-600 mb-4">{paymentError}</p>
          <div className="space-y-2">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-roam-blue text-white rounded-lg hover:bg-roam-blue/90 transition-colors"
            >
              Try Again
            </button>
            <p className="text-sm text-gray-500">
              Please try refreshing the page or contact support if the issue
              persists.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isInitializing) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Initializing payment...</p>
        </CardContent>
      </Card>
    );
  }

  if (!clientSecret) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="text-yellow-600 mb-4">
            <CreditCard className="h-12 w-12 mx-auto mb-2" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Payment Not Ready
          </h3>
          <p className="text-gray-600 mb-4">
            Unable to initialize payment system. Please try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-roam-blue text-white rounded-lg hover:bg-roam-blue/90 transition-colors"
          >
            Refresh Page
          </button>
        </CardContent>
      </Card>
    );
  }

  const elementsOptions = {
    clientSecret,
    appearance: {
      theme: "stripe" as const,
    },
    loader: "auto",
  };

  return (
    <Elements stripe={stripePromise} options={elementsOptions}>
      <PaymentFormContent {...props} clientSecret={clientSecret} />
    </Elements>
  );
};

export default PaymentForm;
