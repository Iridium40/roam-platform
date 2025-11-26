import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { XCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Footer } from '@/components/Footer';

export default function TipCancel() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const bookingId = searchParams.get('booking_id');

  const handleBackToBookings = () => {
    navigate('/my-bookings');
  };

  const handleTryAgain = () => {
    navigate('/my-bookings');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <XCircle className="w-16 h-16 text-orange-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Tip Cancelled
          </CardTitle>
        </CardHeader>
        
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            Your tip payment was cancelled. No charges have been made to your account.
          </p>
          
          <p className="text-sm text-gray-500">
            You can always send a tip later from your booking details.
          </p>
          
          <div className="pt-4 space-y-3">
            <Button 
              onClick={handleTryAgain}
              className="w-full"
            >
              Try Again
            </Button>
            
            <Button 
              variant="outline"
              onClick={handleBackToBookings}
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to My Bookings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <Footer />
    </div>
  );
}
