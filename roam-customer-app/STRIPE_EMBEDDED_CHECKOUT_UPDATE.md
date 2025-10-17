# 🎯 Stripe Embedded Checkout Implementation - Customer App

## What's Changing

We're switching from **Stripe Hosted Checkout** (redirects to Stripe's page) to **Stripe Embedded Checkout** (payment form stays on your website).

### Benefits:
✅ Full control over checkout UI/UX  
✅ Better branding and customization  
✅ Customers stay on your site  
✅ Faster checkout experience  
✅ More conversion (no redirect friction)  

---

## Changes Required

### 1. **BookService.tsx** - Update `handleCheckout` function

**Location:** `roam-customer-app/client/pages/BookService.tsx` lines 1100-1224

**Replace the current `handleCheckout` function with:**

```typescript
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
```

---

### 2. **Add Checkout Step UI**

**Location:** In the render section of `BookService.tsx`, after the summary step

Add this new checkout step section (around line 2100+):

```typescript
      {/* CHECKOUT STEP */}
      {currentStep === 'checkout' && clientSecret && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5" />
                <span>Complete Your Booking</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <CheckoutForm
                  bookingDetails={{
                    id: createdBookingId || '',
                    serviceName: service?.name || '',
                    providerName: selectedProvider ? `${selectedProvider.first_name} ${selectedProvider.last_name}` : '',
                    businessName: selectedBusiness?.business_name || '',
                    scheduledDate: selectedDate?.toISOString() || '',
                    serviceAmount: paymentBreakdown?.serviceAmount || 0,
                    platformFee: paymentBreakdown?.platformFee || 0,
                    discountAmount: paymentBreakdown?.discountAmount || 0,
                    total: paymentBreakdown?.total || 0,
                  }}
                  onSuccess={(paymentIntent) => {
                    console.log('✅ Payment successful!', paymentIntent);
                    // Redirect to success page
                    navigate(`/booking-success?booking_id=${createdBookingId}`);
                  }}
                  onError={(error) => {
                    console.error('❌ Payment error:', error);
                    toast({
                      title: "Payment Failed",
                      description: error,
                      variant: "destructive",
                    });
                  }}
                />
              </Elements>
            </CardContent>
          </Card>
        </div>
      )}
```

---

### 3. **Update handleBack Function**

**Location:** Around line 1046 in `BookService.tsx`

Add handling for the checkout step:

```typescript
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
      case 'checkout': // NEW - Add this case
        setCurrentStep('summary');
        // Clean up created booking if going back
        if (createdBookingId) {
          supabase.from('bookings').delete().eq('id', createdBookingId);
          setCreatedBookingId(null);
          setClientSecret('');
          setPaymentBreakdown(null);
        }
        break;
    }
  };
```

---

### 4. **Update Webhook to Handle Payment Intents**

**Location:** `roam-customer-app/api/stripe/webhook.ts`

Add a new handler for Payment Intent success:

```typescript
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    const bookingId = paymentIntent.metadata.bookingId;
    
    if (!bookingId) {
      console.error('No booking ID in payment intent metadata');
      return;
    }

    console.log(`✅ Payment successful for booking: ${bookingId}`);

    // Update booking status
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        booking_status: 'confirmed',
        payment_status: 'completed',
        stripe_payment_intent_id: paymentIntent.id,
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (updateError) {
      console.error('Error updating booking:', updateError);
      throw updateError;
    }

    console.log(`✅ Booking ${bookingId} confirmed successfully`);

  } catch (error) {
    console.error('Error handling payment intent succeeded:', error);
    throw error;
  }
}
```

And add it to your webhook handler switch:

```typescript
  const eventType = event.type;
  console.log(`📨 Webhook event received: ${eventType}`);

  try {
    switch (eventType) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      
      case 'payment_intent.succeeded': // NEW - Add this case
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
```

---

## Testing Checklist

After implementing these changes:

- [ ] User completes booking form
- [ ] Clicks "Proceed to Checkout"
- [ ] Booking is created in `pending_payment` status
- [ ] Payment form loads (embedded Stripe Elements)
- [ ] User can enter card details
- [ ] Payment processes successfully
- [ ] Webhook updates booking to `confirmed` status
- [ ] User redirects to success page
- [ ] Test with Stripe test cards:
  - `4242 4242 4242 4242` (Success)
  - `4000 0000 0000 0002` (Card declined)
  - `4000 0000 0000 9995` (Insufficient funds)

---

## Database Schema Notes

Make sure these columns exist in your `bookings` table:
- `booking_status` (should have value `'pending_payment'` initially)
- `payment_status` (should have value `'pending'` initially)  
- `stripe_payment_intent_id` (stores the Payment Intent ID)
- `confirmed_at` (timestamp when payment confirmed)

---

## Benefits of This Approach

1. **Better UX**: No redirect, customers stay on site
2. **More Control**: Customize the checkout experience
3. **Faster**: No page reload/redirect
4. **Better Mobile**: Optimized for mobile devices
5. **Higher Conversion**: Less friction = more bookings

---

## Rollback Plan

If you need to roll back to hosted checkout:
1. Revert the `handleCheckout` function
2. Use `/api/stripe/create-checkout-session` endpoint
3. Remove the checkout step UI
4. Keep the webhook changes (they're backward compatible)

---

## Next Steps

1. **Review the CheckoutForm component** - It's already built and styled!
2. **Test in development** with Stripe test mode
3. **Add error handling** for edge cases
4. **Consider adding** loading states and better UX
5. **Deploy** when ready!

---

**Questions or issues? Check the Stripe docs or reach out!** 🚀

