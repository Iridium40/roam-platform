import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { CheckCircle, Calendar, Clock, MapPin, CreditCard, User, Phone, Mail } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_PUBLIC_SUPABASE_URL,
  import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY
);

interface BookingDetails {
  id: string;
  service_id: string;
  business_id: string;
  booking_date: string;
  start_time: string;
  total_amount: number;
  service_price: number;
  service_fee: number;
  discount_applied: number;
  delivery_type: string;
  special_instructions: string;
  booking_status: string;
  payment_status: string;
  stripe_session_id: string;
  services: {
    name: string;
    description: string;
    image_url: string;
  };
  businesses: {
    business_name: string;
    business_address: string;
    business_phone: string;
    business_email: string;
  };
  providers: {
    user_id: string;
    first_name: string;
    last_name: string;
  };
}

export default function BookingSuccess() {
  const [searchParams] = useSearchParams();
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId) {
      fetchBookingDetails();
    } else {
      toast({
        title: "Error",
        description: "No session ID found. Please try again.",
        variant: "destructive",
      });
      navigate('/');
    }
  }, [sessionId]);

  const fetchBookingDetails = async () => {
    try {
      // Fetch booking details using Stripe session ID
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          services:service_id (
            name,
            description,
            image_url
          ),
          businesses:business_id (
            business_name,
            business_address,
            business_phone,
            business_email
          ),
          providers:provider_id (
            user_id,
            first_name,
            last_name
          )
        `)
        .eq('stripe_session_id', sessionId)
        .single();

      if (error) {
        console.error('Error fetching booking:', error);
        toast({
          title: "Error",
          description: "Could not find booking details. Please contact support.",
          variant: "destructive",
        });
        return;
      }

      setBooking(data);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

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

  if (!booking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <h2 className="text-xl font-semibold mb-4">Booking Not Found</h2>
            <p className="text-gray-600 mb-6">We couldn't find your booking details. Please contact support for assistance.</p>
            <Button onClick={() => navigate('/')} className="bg-roam-blue hover:bg-roam-blue/90">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
            <p className="text-lg text-gray-600">
              Your payment was successful and your booking has been confirmed.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Booking Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Booking Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
                    {booking.services.image_url ? (
                      <img 
                        src={booking.services.image_url} 
                        alt={booking.services.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-roam-blue/10 flex items-center justify-center">
                        <span className="text-roam-blue text-xs font-medium">
                          {booking.services.name.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold">{booking.services.name}</h3>
                    <p className="text-sm text-gray-600">{booking.services.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">Date</p>
                      <p className="font-medium">{formatDate(booking.booking_date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">Time</p>
                      <p className="font-medium">{formatTime(booking.start_time)}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Delivery Type</span>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {booking.delivery_type}
                  </Badge>
                </div>

                {booking.special_instructions && (
                  <div className="pt-2">
                    <p className="text-sm text-gray-600 mb-1">Special Instructions</p>
                    <p className="text-sm bg-gray-50 p-2 rounded">{booking.special_instructions}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    {booking.booking_status}
                  </Badge>
                  <Badge variant="default" className="bg-blue-100 text-blue-800">
                    {booking.payment_status}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Provider & Business Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Provider & Business
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">{booking.businesses.business_name}</h3>
                  <p className="text-gray-600">{booking.businesses.business_address}</p>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600 mb-2">Your Provider</p>
                  <p className="font-medium">
                    {booking.providers.first_name} {booking.providers.last_name}
                  </p>
                </div>

                <div className="pt-4 border-t space-y-2">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">{booking.businesses.business_phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">{booking.businesses.business_email}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Summary */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Payment Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Service Price:</span>
                    <span className="font-medium">${booking.service_price.toFixed(2)}</span>
                  </div>
                  {booking.service_fee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Service Fee:</span>
                      <span className="font-medium">${booking.service_fee.toFixed(2)}</span>
                    </div>
                  )}
                  {booking.discount_applied > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount Applied:</span>
                      <span className="font-medium">-${booking.discount_applied.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-3 text-lg font-bold">
                    <span>Total Paid:</span>
                    <span className="text-roam-blue">${booking.total_amount.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex justify-center gap-4 mt-8">
            <Button 
              variant="outline" 
              onClick={() => navigate('/my-bookings')}
            >
              View My Bookings
            </Button>
            <Button 
              onClick={() => navigate('/')}
              className="bg-roam-blue hover:bg-roam-blue/90"
            >
              Book Another Service
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
