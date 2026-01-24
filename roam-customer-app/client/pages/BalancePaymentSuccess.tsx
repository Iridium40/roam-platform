import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, ArrowLeft, Calendar, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Footer } from '@/components/Footer';

export default function BalancePaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  
  const sessionId = searchParams.get('session_id');
  const bookingId = searchParams.get('booking_id');

  useEffect(() => {
    // Simulate loading while webhook processes the payment
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleViewBooking = () => {
    if (bookingId) {
      navigate(`/my-bookings/${bookingId}?from_payment=success`);
    } else {
      navigate('/my-bookings?from_payment=success');
    }
  };

  const handleBackToBookings = () => {
    navigate('/my-bookings?from_payment=success');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Processing your payment...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10">
      <div className="flex items-center justify-center min-h-[80vh]">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Payment Successful!
            </CardTitle>
          </CardHeader>
          
          <CardContent className="text-center space-y-6">
            <p className="text-gray-600">
              Your remaining balance has been paid successfully. Your booking is now fully closed!
            </p>
            
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-center gap-2 text-green-700">
                <DollarSign className="w-5 h-5" />
                <span className="font-medium">Booking Complete</span>
              </div>
              <p className="text-sm text-green-600 mt-1">
                Thank you for your payment. A receipt has been sent to your email.
              </p>
            </div>
            
            {sessionId && (
              <p className="text-sm text-gray-500">
                Transaction ID: {sessionId.slice(-8).toUpperCase()}
              </p>
            )}
            
            <div className="space-y-3 pt-4">
              {bookingId && (
                <Button 
                  onClick={handleViewBooking}
                  className="w-full bg-roam-blue hover:bg-roam-blue/90"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  View Booking Details
                </Button>
              )}
              
              <Button 
                onClick={handleBackToBookings}
                variant="outline"
                className="w-full"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to My Bookings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
}
