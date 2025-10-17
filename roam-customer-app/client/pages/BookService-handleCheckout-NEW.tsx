// NEW handleCheckout function for embedded checkout
// Replace the existing handleCheckout function in BookService.tsx (lines ~1100-1224)
// with this implementation

const handleCheckout = async () => {
  // Check if user is authenticated first
  if (!customer) {
    toast({
      title: "Sign In Required",
      description: "Please sign in or create an account to complete your booking.",
      variant: "default",
    });
    setShowAuthModal(true);
    setPendingCheckout(true);
    return;
  }

  // Ensure all necessary data is available
  if (!service || !selectedBusiness || !selectedProvider || !selectedDate || !selectedTime) {
    toast({
      title: "Missing Information",
      description: "Please complete all booking steps before proceeding.",
      variant: "destructive",
    });
    return;
  }

  setCheckoutLoading(true);

  try {
    // Get cached auth headers
    const { getAuthHeaders } = await import('../lib/api/authUtils');
    const headers = await getAuthHeaders();

    // Use selected delivery type or get the primary one for the business
    const businessDeliveryTypes = getDeliveryTypes(selectedBusiness);
    const deliveryType = selectedDeliveryType || businessDeliveryTypes[0] || 'business_location';

    // Prepare booking details (snake_case, DB schema compliant)
    let formattedStartTime = selectedTime;
    if (selectedTime && selectedTime.length === 5) {
      formattedStartTime = selectedTime + ':00';
    }

    // Save new customer location if needed (temp location)
    let business_location_id = null;
    let customer_location_id = null;
    
    if (deliveryType === 'business_location') {
      business_location_id = selectedBusinessLocation?.id || null;
    } else if (deliveryType === 'customer_location') {
      if (selectedCustomerLocation?.id && selectedCustomerLocation.id.startsWith('temp-')) {
        const savedLocation = await saveNewCustomerLocation();
        if (savedLocation) {
          customer_location_id = savedLocation.id;
        }
      } else {
        customer_location_id = selectedCustomerLocation?.id || null;
      }
    }

    const bookingDetails = {
      service_id: service.id,
      business_id: selectedBusiness.id,
      customer_id: customer.id,
      provider_id: selectedProvider?.id || null,
      booking_date: selectedDate.toISOString().split('T')[0],
      start_time: formattedStartTime,
      guest_name: `${customer.first_name} ${customer.last_name}`,
      guest_email: customer.email,
      guest_phone: customer.phone || '',
      delivery_type: deliveryType,
      business_location_id,
      customer_location_id,
      special_instructions: '',
      total_amount: calculateTotalAmount(),
      booking_status: 'pending_payment', // Will be confirmed after payment
      payment_status: 'pending'
    };

    console.log('💳 Creating booking with pending payment status:', bookingDetails);

    // Step 1: Create the booking in pending status
    const { data: newBooking, error: bookingError } = await supabase
      .from('bookings')
      .insert(bookingDetails)
      .select('id')
      .single();

    if (bookingError || !newBooking) {
      throw new Error(bookingError?.message || 'Failed to create booking');
    }

    console.log('✅ Booking created with ID:', newBooking.id);
    setCreatedBookingId(newBooking.id);

    // Step 2: Create promotion usage if promotion was applied
    if (promotion) {
      await supabase
        .from('promotion_usage')
        .insert({
          promotion_id: promotion.id,
          user_id: customer.user_id,
          booking_id: newBooking.id,
          discount_applied: promotion.savingsAmount
        });

      // Increment promotion usage count
      await supabase
        .from('promotions')
        .update({ current_uses: promotion.current_uses + 1 })
        .eq('id', promotion.id);
    }

    // Step 3: Create Payment Intent
    const paymentPayload = {
      bookingId: newBooking.id,
      serviceId: service.id,
      businessId: selectedBusiness.id,
      customerId: customer.id,
      bookingDate: bookingDetails.booking_date,
      startTime: formattedStartTime,
      guestName: bookingDetails.guest_name,
      guestEmail: bookingDetails.guest_email,
      guestPhone: bookingDetails.guest_phone,
      deliveryType,
      specialInstructions: bookingDetails.special_instructions,
      promotionId: promotion?.id || null
    };

    const paymentResponse = await fetch('/api/stripe/create-payment-intent', {
      method: 'POST',
      headers,
      body: JSON.stringify(paymentPayload),
    });

    if (!paymentResponse.ok) {
      const errorData = await paymentResponse.json();
      throw new Error(errorData.error || 'Failed to initialize payment');
    }

    const paymentData = await paymentResponse.json();
    console.log('✅ Payment Intent created:', paymentData);

    // Step 4: Store client secret and payment breakdown
    setClientSecret(paymentData.clientSecret);
    setPaymentBreakdown(paymentData.breakdown);

    // Step 5: Move to checkout step
    setCurrentStep('checkout');
    setCheckoutLoading(false);

    toast({
      title: "Ready for Payment",
      description: "Please complete your payment to confirm the booking.",
    });

  } catch (error) {
    console.error('❌ Error preparing checkout:', error);
    setCheckoutLoading(false);
    
    // Clean up booking if it was created
    if (createdBookingId) {
      await supabase.from('bookings').delete().eq('id', createdBookingId);
      setCreatedBookingId(null);
    }

    let errorMessage = "An unexpected error occurred. Please try again.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    toast({
      title: "Checkout Error",
      description: errorMessage,
      variant: "destructive",
    });
  }
};

