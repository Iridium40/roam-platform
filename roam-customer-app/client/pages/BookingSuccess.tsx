// Type for the raw booking row returned from Supabase
type BookingDataRow = {
  id: string;
  booking_reference?: string;
  booking_date: string;
  start_time: string;
  total_amount: number;
  payment_status: string;
  booking_status?: string;
  services?: { name?: string } | null;
  business_profiles?: { business_name?: string } | null;
  customer_profiles?: { first_name?: string; last_name?: string } | null;
};
import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Calendar, Clock, Mail, Home, Eye, Bell } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

interface BookingDetails {
  id: string;
  booking_reference?: string;
  booking_date: string;
  start_time: string;
  total_amount: number;
  payment_status: string;
  booking_status?: string;
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
  const bookingId = searchParams.get('booking_id');

  useEffect(() => {
    const fetchBookingDetails = async (retryCount = 0) => {
      if (!sessionId && !bookingId) {
        setError('No booking information provided - please return to the booking page and try again');
        setLoading(false);
        return;
      }

      try {
        // Build query - use booking_id if available (Payment Intent flow), otherwise use session_id (Checkout Session flow)
        let query = supabase
          .from('bookings')
          .select(`
            id,
            booking_reference,
            booking_date,
            start_time,
            total_amount,
            payment_status,
            booking_status,
            service_id,
            business_id,
            customer_id,
            services!bookings_service_id_fkey (name),
            business_profiles!bookings_business_id_fkey (business_name),
            customer_profiles!bookings_customer_id_fkey (first_name, last_name)
          `);

        if (bookingId) {
          // Payment Intent flow - fetch by booking_id
          query = query.eq('id', bookingId);
        } else if (sessionId) {
          // Checkout Session flow - fetch by session_id
          query = query.eq('stripe_checkout_session_id', sessionId);
        }

        const { data: bookingData, error: bookingError } = await query.single<BookingDataRow>();

        if (bookingError) {
          console.error('Error fetching booking:', bookingError);
          // If booking not found and we haven't retried too many times, retry
          if (bookingError.code === 'PGRST116' && retryCount < 10) {
            console.log(`Booking not found yet, retrying in 2 seconds (attempt ${retryCount + 1}/10)...`);
            setTimeout(() => fetchBookingDetails(retryCount + 1), 2000);
            return;
          }
          setError('Payment successful - processing booking details');
          setLoading(false);
          return;
        }

        if (bookingData) {
          setBooking({
            id: bookingData.id,
            booking_reference: bookingData.booking_reference,
            booking_date: bookingData.booking_date,
            start_time: bookingData.start_time,
            total_amount: bookingData.total_amount,
            payment_status: bookingData.payment_status,
            booking_status: bookingData.booking_status,
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
  }, [sessionId, bookingId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10">
        <Header />
        <div className="flex items-center justify-center py-32">
          <Card className="border-0 shadow-lg rounded-2xl">
            <CardContent className="p-12 text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-roam-blue border-t-transparent mx-auto mb-6"></div>
              <p className="text-lg font-medium text-foreground">Loading booking details...</p>
              <p className="text-sm text-foreground/60 mt-2">Please wait while we retrieve your information</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto">
            <Card className="border-0 shadow-2xl rounded-3xl overflow-hidden">
              <CardContent className="p-12 md:p-16 text-center">
                {/* Success Animation */}
                <div className="relative mb-8">
                  <div className="w-32 h-32 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg animate-scale-in">
                    <CheckCircle className="h-16 w-16 text-white" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 text-4xl animate-bounce-subtle">🎉</div>
                </div>

                <Badge variant="secondary" className="mb-4 text-sm px-4 py-2 bg-green-500/10 text-green-700 border-green-200">
                  Payment Confirmed
                </Badge>

                <h1 className="text-3xl md:text-4xl font-bold mb-4 gradient-text">
                  Payment Successful!
                </h1>
                
                <p className="text-lg text-foreground/80 mb-3 font-medium">
                Your payment was processed successfully!
              </p>
                <p className="text-sm text-foreground/60 mb-8 leading-relaxed">
                We're processing your booking details. You'll receive a confirmation email shortly.
              </p>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                  <Button asChild size="lg" className="bg-roam-blue hover:bg-roam-blue/90 button-shine shadow-lg">
                    <Link to="/my-bookings">
                      <Eye className="w-5 h-5 mr-2" />
                      View My Bookings
                    </Link>
              </Button>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="border-2 border-roam-blue text-roam-blue hover:bg-roam-blue hover:text-white shadow-lg"
                    onClick={() => window.location.href = '/'}
                  >
                    <Home className="w-5 h-5 mr-2" />
                    Return to Home
                  </Button>
            </div>

                {/* Debug Info */}
                {(sessionId || bookingId) && (
                  <div className="text-xs text-foreground/40 pt-6 border-t border-gray-200">
                    {sessionId && <p className="mb-1">Session: {sessionId.substring(0, 20)}...</p>}
                    {bookingId && <p>Booking: {bookingId.substring(0, 20)}...</p>}
            </div>
                )}
          </CardContent>
        </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10">
      <Header />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">

          {/* Success Header */}
          <Card className="mb-8 border-0 shadow-2xl rounded-3xl overflow-hidden">
            <CardContent className="p-12 text-center">
              {/* Success Animation */}
              <div className="relative mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg animate-scale-in">
                  <CheckCircle className="h-12 w-12 text-white" />
                </div>
              </div>

              <Badge variant="secondary" className={`mb-4 text-sm px-4 py-2 border ${
                booking.booking_status === 'confirmed' 
                  ? 'bg-green-500/10 text-green-700 border-green-200' 
                  : 'bg-blue-500/10 text-blue-700 border-blue-200'
              }`}>
                {booking.booking_status === 'confirmed' ? 'Booking Confirmed' : 'Booking Requested'}
              </Badge>

              <h1 className="text-3xl md:text-4xl font-bold mb-4 gradient-text">
                {booking.booking_status === 'confirmed' ? 'Booking Complete!' : 'Booking Requested!'}
              </h1>
              
              <p className="text-lg text-foreground/70 mb-8 leading-relaxed">
                {booking.booking_status === 'confirmed' 
                  ? 'Thank you for booking with ROAM. Your service has been confirmed and the provider has been notified.'
                  : 'Thank you for booking with ROAM. Your booking request has been submitted and is awaiting provider acceptance. You will be notified once the provider confirms your appointment.'}
              </p>

              {/* Booking Reference */}
              {booking.booking_reference && (
                <div className="bg-gradient-to-br from-roam-blue/5 to-roam-light-blue/5 p-6 rounded-2xl border border-roam-blue/20">
                  <p className="text-sm font-medium text-foreground/60 mb-2">Booking Reference</p>
                  <p className="text-2xl md:text-3xl font-bold text-roam-blue tracking-wider">
                    {booking.booking_reference}
                  </p>
                  <p className="text-xs text-foreground/50 mt-2">
                    Save this reference for your records
                  </p>
                </div>
              )}
              </CardContent>
            </Card>

          {/* What's Next Section */}
          <Card className="mb-8 border-0 shadow-lg rounded-2xl">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-xl flex items-center justify-center shadow-sm">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold">What's Next?</h2>
              </div>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-xl flex items-center justify-center text-lg font-bold shadow-sm flex-shrink-0">
                    1
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Mail className="w-5 h-5 text-blue-500" />
                      <p className="font-bold text-lg">Confirmation Email</p>
                    </div>
                    <p className="text-sm text-foreground/70 leading-relaxed">
                      {booking.booking_status === 'confirmed' 
                        ? "You'll receive a confirmation email with all the details, including service information, provider contact, and booking instructions."
                        : "You'll receive an email once the provider accepts your booking request. This email will include all the details, including service information, provider contact, and booking instructions."}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-xl flex items-center justify-center text-lg font-bold shadow-sm flex-shrink-0">
                    2
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Bell className="w-5 h-5 text-purple-500" />
                      <p className="font-bold text-lg">Provider Notification</p>
                    </div>
                    <p className="text-sm text-foreground/70 leading-relaxed">
                      {booking.booking_status === 'confirmed' 
                        ? "The service provider has been notified and will prepare for your appointment."
                        : "The service provider has been notified of your booking request and will review it. You'll be notified once they accept or if any changes are needed."}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 text-white rounded-xl flex items-center justify-center text-lg font-bold shadow-sm flex-shrink-0">
                    3
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="w-5 h-5 text-green-500" />
                      <p className="font-bold text-lg">Booking Management</p>
                    </div>
                    <p className="text-sm text-foreground/70 leading-relaxed">
                      You can view, manage, reschedule, or cancel your booking from your account at any time.
                    </p>
              </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-roam-blue hover:bg-roam-blue/90 button-shine shadow-lg hover-scale">
              <Link to="/my-bookings">
                <Eye className="w-5 h-5 mr-2" />
                View My Bookings
              </Link>
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-2 border-roam-blue text-roam-blue hover:bg-roam-blue hover:text-white shadow-lg hover-scale"
              onClick={() => window.location.href = '/'}
            >
              <Home className="w-5 h-5 mr-2" />
              Return to Home
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
