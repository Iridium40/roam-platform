# 🚨 FIX THE 404 ERROR - STEP BY STEP

## The Problem

**Line 1181** in `BookService.tsx` is calling:
```
/api/stripe/create-checkout-session  ❌ (This endpoint doesn't exist for embedded checkout)
```

It should call:
```
/api/stripe/create-payment-intent  ✅ (This is the correct endpoint)
```

---

## 🎯 How to Fix (Choose ONE Method)

### METHOD 1: Quick Find & Replace (EASIEST) ⚡

1. Open `roam-customer-app/client/pages/BookService.tsx`
2. Press `Cmd+F` (Mac) or `Ctrl+F` (Windows) to open Find
3. Search for: `create-checkout-session`
4. You'll find it on **line 1181**
5. Replace ONLY that one line:

**CHANGE THIS:**
```typescript
const response = await fetch('/api/stripe/create-checkout-session', {
```

**TO THIS:**
```typescript
const response = await fetch('/api/stripe/create-payment-intent', {
```

6. **WAIT!** That's not enough. The whole function needs updates...

---

### METHOD 2: Replace Entire Function (RECOMMENDED) ✅

The issue is the ENTIRE `handleCheckout` function needs to be replaced.

**Step-by-Step:**

1. **Open** `BookService.tsx`
2. **Find** line 1100 (search for `const handleCheckout = async () => {`)
3. **Select** from line 1100 to line 1224 (the entire function)
4. **Delete** it all
5. **Copy** the code below and **paste** it in that spot:

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

      // Step 3: Create Payment Intent (NOT checkout session!)
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

6. **Save** the file
7. **Reload** your browser
8. **Test** again!

---

## ✅ What You Should See After the Fix

When you click "Proceed to Checkout":

1. Console log: `💳 Creating booking with pending payment status:`
2. Console log: `✅ Booking created with ID: [some-uuid]`
3. Console log: `✅ Payment Intent created:`
4. **NO 404 ERROR!**
5. Page should show checkout step (though you may not see the form yet - that's step 2)

---

## 🎯 Key Differences

| Line # | OLD (Broken) | NEW (Fixed) |
|--------|--------------|-------------|
| 1181 | `/api/stripe/create-checkout-session` | `/api/stripe/create-payment-intent` |
| 1161 | `console.log('💳 Preparing Stripe Checkout...')` | `console.log('💳 Creating booking...')` |
| Before | No booking creation | ✅ Creates booking first |
| Before | Redirects to Stripe | ✅ Stays on your site |

---

## 🚨 Still Getting Errors?

If you still see errors after this:

1. **Clear browser cache** (Cmd+Shift+R or Ctrl+Shift+R)
2. **Check line 1181** - should NOT say `create-checkout-session`
3. **Check console** - should see "Creating booking" not "Preparing Stripe Checkout"

---

## 📞 Quick Verification

After fixing, search the file for `create-checkout-session`:
- **Should find:** 0 results in the `handleCheckout` function
- **Should find:** Only in old comments or documentation

---

**This fix changes the endpoint from the old hosted checkout to the new embedded checkout!**

