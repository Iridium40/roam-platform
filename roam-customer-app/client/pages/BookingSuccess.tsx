import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Calendar, Clock, MapPin, User, CreditCard } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface BookingDetails {
  id: string;
  booking_date: string;
  start_time: string;
  total_amount: number;
  payment_status: string;
  service_name?: string;
  business_name?: string;
  customer_name?: string;
}

export default function BookingSuccess() {
  const [searchParams] = useSearchParams();
  const { customer } = useAuth();
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const fetchBookingDetails = async (retryCount = 0) => {
      if (!sessionId) {
        setError('No session ID provided - please return to the booking page and try again');
        setLoading(false);
        return;
      }

      try {
        // Fetch booking details from Supabase with corrected join syntax
        const { data: bookingData, error: bookingError } = await supabase
          .from('bookings')
          .select(`
            id,
            booking_date,
            start_time,
            total_amount,
            payment_status,
            service_id,
            business_id,
            customer_id,
            services!bookings_service_id_fkey (name),
            business_profiles!bookings_business_id_fkey (business_name),
            customer_profiles!bookings_customer_id_fkey (first_name, last_name)
          `)
          .eq('stripe_checkout_session_id', sessionId)
          .single();

        if (bookingError) {
          console.error('Error fetching booking:', bookingError);
          
          // If booking not found and we haven't retried too many times, retry
          // The webhook might still be processing
          if (bookingError.code === 'PGRST116' && retryCount < 10) {
            console.log(`Booking not found yet, retrying in 2 seconds (attempt ${retryCount + 1}/10)...`);
            setTimeout(() => fetchBookingDetails(retryCount + 1), 2000);
            return;
          }
          
          // Set a generic message that doesn't alarm the user
          setError('Payment successful - processing booking details');
          setLoading(false);
          return;
        }

        if (bookingData) {
          setBooking({
            id: bookingData.id,
            booking_date: bookingData.booking_date,
            start_time: bookingData.start_time,
            total_amount: bookingData.total_amount,
            payment_status: bookingData.payment_status,
            service_name: bookingData.services?.name || 'Service',
            business_name: bookingData.business_profiles?.business_name || 'Business',
            customer_name: `${bookingData.customer_profiles?.first_name || ''} ${bookingData.customer_profiles?.last_name || ''}`.trim() || 'Customer',
          });
        }

        setLoading(false);
      } catch (err) {
        console.error('Error:', err);
        setError('An unexpected error occurred');
        setLoading(false);
      }
    };

    fetchBookingDetails();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-roam-blue mx-auto mb-4"></div>
          <p>Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-green-600">Payment Successful! 🎉</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="space-y-2">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <p className="text-gray-600 font-medium">
                Your payment was processed successfully!
              </p>
              <p className="text-sm text-gray-500">
                We're processing your booking details. You'll receive a confirmation email shortly.
              </p>
            </div>
            
            <div className="space-y-3">
              <Button asChild className="w-full">
                <Link to="/my-bookings">View My Bookings</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/">Return to Home</Link>
              </Button>
            </div>
            
            <div className="text-xs text-gray-400 pt-2 border-t">
              <p>Payment Session: {sessionId?.substring(0, 20)}...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
            <p className="text-gray-600">Your payment was successful and your booking is confirmed.</p>
          </div>

          {/* Booking Details Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Booking Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Customer</p>
                    <p className="font-medium">{booking.customer_name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Service</p>
                    <p className="font-medium">{booking.service_name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Date</p>
                    <p className="font-medium">{new Date(booking.booking_date).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Time</p>
                    <p className="font-medium">{booking.start_time}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Amount Paid</p>
                    <p className="font-medium">${booking.total_amount.toFixed(2)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <p className="font-medium text-green-600 capitalize">{booking.payment_status}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>What's Next?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-medium">Confirmation Email</p>
                  <p className="text-sm text-gray-600">You'll receive a confirmation email with all the details.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mt-0.5">
                  2
                </div>
                <div>
                  <p className="font-medium">Provider Notification</p>
                  <p className="text-sm text-gray-600">The service provider will be notified of your booking.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mt-0.5">
                  3
                </div>
                <div>
                  <p className="font-medium">Booking Management</p>
                  <p className="text-sm text-gray-600">You can view and manage your booking in your account.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild variant="outline">
              <Link to="/my-bookings">View My Bookings</Link>
            </Button>
            <Button asChild>
              <Link to="/">Return to Home</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
