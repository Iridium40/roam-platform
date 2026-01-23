import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Calendar,
  Clock,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Loader2,
  Shield,
  DollarSign,
  Hash,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Footer } from "@/components/Footer";
import { logger } from "@/utils/logger";
import { PageErrorBoundary } from "@/components/ErrorBoundary";

interface BookingForPayment {
  id: string;
  booking_reference: string;
  booking_status: string;
  booking_date: string;
  start_time: string;
  total_amount: string | number;
  service_fee: string | number;
  remaining_balance: string | number;
  remaining_balance_charged: boolean;
  services?: {
    id: string;
    name: string;
    image_url?: string;
  };
  providers?: {
    id: string;
    first_name: string;
    last_name: string;
    image_url?: string;
  };
  business_profiles?: {
    id: string;
    business_name: string;
    logo_url?: string;
  };
}

const formatCurrency = (amount: number | string | null | undefined) => {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  if (numAmount == null || isNaN(numAmount)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(numAmount);
};

function PayBalanceContent() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { customer, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [booking, setBooking] = useState<BookingForPayment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch booking data from API instead of direct Supabase query
  const fetchBooking = async () => {
    if (!bookingId || !customer) return;

    try {
      setLoading(true);
      setError(null);

      // Get auth token from localStorage
      const token = localStorage.getItem('roam_access_token');
      if (!token) {
        throw new Error("Authentication required. Please sign in again.");
      }

      // Fetch from API
      const response = await fetch(`/api/bookings/list?customer_id=${customer.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token is invalid, clear and redirect
          localStorage.removeItem('roam_access_token');
          localStorage.removeItem('roam_customer');
          window.location.href = '/';
          return;
        }
        throw new Error("Failed to load booking details.");
      }

      const data = await response.json();
      const bookings = data.data || [];
      
      // Find the specific booking
      const bookingData = bookings.find((b: any) => b.id === bookingId);
      
      if (!bookingData) {
        throw new Error("Booking not found or you don't have access to it.");
      }

      setBooking(bookingData);
    } catch (err: any) {
      logger.error("Error loading booking:", err);
      setError(err.message || "Failed to load booking details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (customer && bookingId) {
      fetchBooking();
    }
  }, [customer, bookingId]);

  const handlePayBalance = async () => {
    if (!booking || !customer) return;

    try {
      setIsProcessing(true);

      // Determine API base URL
      const apiBaseUrl = import.meta.env.VITE_API_URL || '';

      const response = await fetch(`${apiBaseUrl}/api/stripe/create-balance-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          booking_id: booking.id,
          customer_id: customer.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err: any) {
      logger.error("Error creating checkout session:", err);
      toast({
        title: "Payment Error",
        description: err.message || "Failed to initiate payment. Please try again.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-roam-blue mx-auto mb-4" />
          <p className="text-lg font-semibold">Loading payment details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Unable to Load Payment</h2>
          <p className="text-foreground/70 mb-6">
            {error || "The booking you're looking for doesn't exist or you don't have access to it."}
          </p>
          <Link to="/my-bookings">
            <Button className="bg-roam-blue hover:bg-roam-blue/90">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to My Bookings
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Already paid state
  if (booking.remaining_balance_charged) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10 flex items-center justify-center">
        <div className="text-center max-w-md">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Balance Already Paid</h2>
          <p className="text-foreground/70 mb-6">
            The remaining balance for this booking has already been paid. Thank you!
          </p>
          <Link to={`/my-bookings/${booking.id}`}>
            <Button className="bg-roam-blue hover:bg-roam-blue/90">
              <ArrowLeft className="w-4 h-4 mr-2" />
              View Booking Details
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const remainingBalance = parseFloat(booking.remaining_balance as string) || 0;
  const depositPaid = parseFloat(booking.total_amount as string) - parseFloat(booking.service_fee as string) || 0;

  // No balance due state
  if (remainingBalance <= 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10 flex items-center justify-center">
        <div className="text-center max-w-md">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Balance Due</h2>
          <p className="text-foreground/70 mb-6">
            There is no remaining balance to pay for this booking.
          </p>
          <Link to={`/my-bookings/${booking.id}`}>
            <Button className="bg-roam-blue hover:bg-roam-blue/90">
              <ArrowLeft className="w-4 h-4 mr-2" />
              View Booking Details
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10">
      <section className="py-6 lg:py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-lg mx-auto">
            {/* Back Button */}
            <div className="mb-6">
              <Link to={`/my-bookings/${booking.id}`}>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 text-foreground/70 hover:text-foreground hover:bg-accent/50"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Booking
                </Button>
              </Link>
            </div>

            {/* Page Title */}
            <div className="mb-6 text-center">
              <h1 className="text-2xl sm:text-3xl font-bold">
                Pay <span className="text-amber-600">Remaining Balance</span>
              </h1>
              <p className="text-foreground/60 mt-1">
                Complete your payment to close out this booking
              </p>
            </div>

            {/* Payment Card */}
            <Card className="mb-6 border-2 border-amber-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-full shadow-sm">
                    <CreditCard className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Balance Payment</CardTitle>
                    {booking.booking_reference && (
                      <p className="text-sm text-foreground/60 flex items-center gap-1">
                        <Hash className="w-3 h-3" />
                        {booking.booking_reference}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {/* Service Info */}
                <div className="flex items-start gap-4">
                  <Avatar className="w-14 h-14 flex-shrink-0">
                    <AvatarImage
                      src={booking.services?.image_url}
                      alt={booking.services?.name}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-gradient-to-br from-roam-blue to-roam-light-blue text-white font-semibold">
                      {booking.services?.name?.[0]?.toUpperCase() || "S"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{booking.services?.name}</h3>
                    <p className="text-foreground/60">
                      with {booking.providers?.first_name} {booking.providers?.last_name}
                    </p>
                    <p className="text-sm text-foreground/50">
                      {booking.business_profiles?.business_name}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Date & Time */}
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-foreground/60" />
                    <span>
                      {booking.booking_date
                        ? format(new Date(booking.booking_date), "MMM d, yyyy")
                        : "Date not set"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-foreground/60" />
                    <span>{booking.start_time || "Time not set"}</span>
                  </div>
                </div>

                <Separator />

                {/* Payment Summary */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-foreground/70 uppercase tracking-wide">
                    Payment Summary
                  </h4>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-foreground/70">Deposit Paid</span>
                    <span className="text-green-600 font-medium">
                      {formatCurrency(depositPaid)}
                    </span>
                  </div>
                  
                  <Separator className="my-2" />
                  
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-lg">Balance Due</span>
                    <span className="text-2xl font-bold text-amber-600">
                      {formatCurrency(remainingBalance)}
                    </span>
                  </div>
                </div>

                <Separator />

                {/* Pay Button */}
                <Button
                  onClick={handlePayBalance}
                  disabled={isProcessing}
                  className="w-full h-12 text-lg bg-amber-500 hover:bg-amber-600 text-white"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5 mr-2" />
                      Pay {formatCurrency(remainingBalance)}
                    </>
                  )}
                </Button>

                {/* Security Note */}
                <div className="flex items-center justify-center gap-2 text-xs text-foreground/50">
                  <Shield className="w-4 h-4" />
                  <span>Secure payment powered by Stripe</span>
                </div>
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="py-4">
                <div className="flex gap-3">
                  <DollarSign className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900 mb-1">
                      About Your Balance
                    </p>
                    <p className="text-blue-700">
                      This is the final amount determined by your provider after completing 
                      your service. Once paid, your booking will be fully closed.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default function PayBalance() {
  return (
    <PageErrorBoundary>
      <PayBalanceContent />
    </PageErrorBoundary>
  );
}
