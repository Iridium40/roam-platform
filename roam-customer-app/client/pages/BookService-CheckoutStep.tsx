// CHECKOUT STEP UI COMPONENT
// Add this to BookService.tsx in the render section
// Insert after the summary step (around line 2100+)

// Make sure these imports are at the top of BookService.tsx:
// import { useNavigate } from "react-router-dom";

{/* CHECKOUT STEP */}
{currentStep === 'checkout' && clientSecret && (
  <div className="space-y-6">
    {/* Back Button */}
    <Button
      variant="ghost"
      onClick={handleBack}
      className="mb-4"
    >
      <ArrowLeft className="w-4 h-4 mr-2" />
      Back
    </Button>

    {/* Checkout Card */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CreditCard className="w-5 h-5" />
          <span>Complete Your Booking</span>
        </CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          Your booking has been reserved. Complete payment to confirm.
        </p>
      </CardHeader>
      <CardContent>
        {/* Stripe Elements Wrapper */}
        <Elements 
          stripe={stripePromise} 
          options={{ 
            clientSecret,
            appearance: {
              theme: 'stripe',
              variables: {
                colorPrimary: '#3b82f6', // roam-blue
                colorBackground: '#ffffff',
                colorText: '#1f2937',
                colorDanger: '#ef4444',
                fontFamily: 'system-ui, sans-serif',
                borderRadius: '8px',
              }
            }
          }}
        >
          <CheckoutForm
            bookingDetails={{
              id: createdBookingId || '',
              serviceName: service?.name || '',
              providerName: selectedProvider 
                ? `${selectedProvider.first_name} ${selectedProvider.last_name}` 
                : '',
              businessName: selectedBusiness?.business_name || '',
              scheduledDate: selectedDate 
                ? `${selectedDate.toISOString().split('T')[0]} ${selectedTime}` 
                : '',
              serviceAmount: paymentBreakdown?.serviceAmount || 0,
              platformFee: paymentBreakdown?.platformFee || 0,
              discountAmount: paymentBreakdown?.discountAmount || 0,
              total: paymentBreakdown?.total || 0,
            }}
            onSuccess={(paymentIntent) => {
              console.log('✅ Payment successful!', paymentIntent);
              
              toast({
                title: "Payment Successful!",
                description: "Your booking has been confirmed.",
              });

              // Redirect to success page
              const navigate = useNavigate();
              navigate(`/booking-success?booking_id=${createdBookingId}`);
            }}
            onError={(error) => {
              console.error('❌ Payment error:', error);
              
              toast({
                title: "Payment Failed",
                description: error,
                variant: "destructive",
              });

              // Optionally go back to summary to try again
              // setCurrentStep('summary');
            }}
          />
        </Elements>
      </CardContent>
    </Card>

    {/* Security Notice */}
    <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
      <div className="flex items-center space-x-1">
        <span className="text-lg">🔒</span>
        <span>Secure payment</span>
      </div>
      <span>•</span>
      <span>Powered by Stripe</span>
    </div>

    {/* Booking Reference */}
    {createdBookingId && (
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900">Booking Reserved</p>
              <p className="text-blue-700 mt-1">
                Reference: {createdBookingId.slice(-8).toUpperCase()}
              </p>
              <p className="text-blue-600 mt-1 text-xs">
                Complete payment within 10 minutes to confirm your booking.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )}
  </div>
)}

