// UPDATED handleBack function
// Replace the existing handleBack function in BookService.tsx (around line 1046)
// with this implementation that includes checkout step handling

const handleBack = () => {
  switch (currentStep) {
    case 'business':
      setCurrentStep('datetime');
      break;
    case 'delivery-location':
      setCurrentStep('business');
      break;
    case 'provider':
      if (selectedDeliveryType === 'business_location' || selectedDeliveryType === 'customer_location') {
        setCurrentStep('delivery-location');
      } else if (businessId) {
        setCurrentStep('datetime');
      } else {
        setCurrentStep('business');
      }
      break;
    case 'summary':
      setCurrentStep('provider');
      break;
    case 'checkout': // NEW - Handle going back from checkout
      setCurrentStep('summary');
      
      // Clean up created booking and payment intent
      if (createdBookingId) {
        // Delete the pending booking
        supabase
          .from('bookings')
          .delete()
          .eq('id', createdBookingId)
          .then(() => {
            console.log('🗑️ Cancelled pending booking:', createdBookingId);
          });
        
        // Reset state
        setCreatedBookingId(null);
        setClientSecret('');
        setPaymentBreakdown(null);
      }
      
      toast({
        title: "Checkout Cancelled",
        description: "You can update your booking details and try again.",
      });
      break;
  }
};

