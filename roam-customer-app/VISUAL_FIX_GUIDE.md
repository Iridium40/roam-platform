# 🎯 VISUAL FIX GUIDE - Embedded Checkout

## THE ISSUE

**BookService.tsx line 1181** is calling the wrong endpoint!

---

## 🔍 FIND THIS (Around Line 1161-1224):

```typescript
    console.log('💳 Preparing Stripe Checkout (no booking created yet):', bookingDetails);

    try {
      // Get cached auth headers for Stripe checkout
      const { getAuthHeaders } = await import('../lib/api/authUtils');
      const headers = await getAuthHeaders();

      // Prepare Stripe payload with all booking data + promotion info
      // The webhook will create the booking after successful payment
      const stripePayload = {
        ...bookingDetails,
        serviceName: service.name,
        businessName: selectedBusiness.business_name,
        // Include promotion data if exists - webhook will handle promotion_usage creation
        promotionId: promotion?.id || null,
        promotionCode: promotion?.promoCode || null,
        discountApplied: promotion?.savingsAmount || 0,
        originalAmount: service.min_price,
      };

      const response = await fetch('/api/stripe/create-checkout-session', {  // ❌ THIS IS THE PROBLEM!
        method: 'POST',
        headers,
        body: JSON.stringify(stripePayload),
      });

      console.log('📡 Response status:', response.status);
      console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ HTTP Error:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('📦 Checkout session result:', result);

      if (result.url) {
        console.log('✅ Redirecting to Stripe Checkout - booking will be created after payment');
        window.location.href = result.url;  // ❌ THIS REDIRECTS AWAY!
      } else {
        console.error('❌ Failed to create Checkout Session:', result.error || result);
        toast({
          title: "Payment Setup Failed",
          description: result.error || "Could not initialize payment. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('❌ Error creating Checkout Session:', error);
      let errorMessage = "An unexpected error occurred. Please try again.";
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        errorMessage = "Network error: Could not connect to payment service. Please check your connection and try again.";
      } else if (error instanceof Error) {
        errorMessage = `Error: ${error.message}`;
      }
      toast({
        title: "Payment Setup Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };
```

---

## ✅ REPLACE WITH THIS:

```typescript
    console.log('💳 Creating booking with pending payment status:', bookingDetails);

    try {
      // Get cached auth headers
      const { getAuthHeaders } = await import('../lib/api/authUtils');
      const headers = await getAuthHeaders();

      // Step 1: Create the booking in pending status
      const { data: newBooking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          ...bookingDetails,
          booking_status: 'pending_payment',
          payment_status: 'pending'
        })
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

        await supabase
          .from('promotions')
          .update({ current_uses: promotion.current_uses + 1 })
          .eq('id', promotion.id);
      }

      // Step 3: Create Payment Intent (embedded checkout!)
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

      const response = await fetch('/api/stripe/create-payment-intent', {  // ✅ CORRECT ENDPOINT!
        method: 'POST',
        headers,
        body: JSON.stringify(paymentPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initialize payment');
      }

      const paymentData = await response.json();
      console.log('✅ Payment Intent created:', paymentData);

      // Store client secret and move to checkout step
      setClientSecret(paymentData.clientSecret);
      setPaymentBreakdown(paymentData.breakdown);
      setCurrentStep('checkout');  // ✅ SHOWS EMBEDDED FORM!
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

## 📍 Exact Location

**File:** `roam-customer-app/client/pages/BookService.tsx`

**Starting at:** Line 1161 (`console.log('💳 Preparing Stripe Checkout...`)  
**Ending at:** Line 1223 (closing brace before the catch)

**Replace:** ~62 lines of code

---

## ✨ What Changes

### Before (Hosted Checkout - BROKEN):
- Creates Stripe payload
- Calls `/api/stripe/create-checkout-session` → **404 ERROR**
- Tries to redirect: `window.location.href = result.url`

### After (Embedded Checkout - WORKS):
- Creates booking FIRST in database
- Handles promotions
- Calls `/api/stripe/create-payment-intent` → **WORKS!**
- Shows embedded form: `setCurrentStep('checkout')`

---

## 🎯 After You Apply This

### You'll See:
```
Console Output:
💳 Creating booking with pending payment status: {service_id: ...}
✅ Booking created with ID: abc-123-def
✅ Payment Intent created: {clientSecret: "pi_xxx_secret_xxx"}
```

### NO MORE:
```
❌ 404 (Not Found)
❌ Error: Customer not found
```

---

## 🚀 Next After This Works

Once the 404 is fixed, you still need to:

1. **Add the checkout step UI** - So the embedded form actually displays
2. **Update handleBack** - So users can go back from checkout

But first, let's fix this 404! Apply the code replacement above! 👆

