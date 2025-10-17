# 🚨 QUICK FIX - Update handleCheckout Function

## The Problem

You're getting a **404 error** for `/api/stripe/create-checkout-session` because the code is still using the **old hosted checkout** approach. We need to switch to the **new embedded checkout** approach.

---

## 🔧 The Fix (3 Simple Steps)

### Step 1: Find & Replace handleCheckout

**Location:** `roam-customer-app/client/pages/BookService.tsx` around line 1100-1224

**Find this line:**
```typescript
const response = await fetch('/api/stripe/create-checkout-session', {
```

**Replace with:**
```typescript
const response = await fetch('/api/stripe/create-payment-intent', {
```

**BUT WAIT!** That's just a quick bandaid. The real fix requires replacing the entire function. Here's how:

---

### Step 2: Replace the Entire handleCheckout Function

**In BookService.tsx, lines 1100-1224:**

1. Delete everything from line `1100` (`const handleCheckout = async () => {`) 
2. To line `1224` (the closing `};`)
3. Paste the code from `BookService-handleCheckout-NEW.tsx` (lines 5-180)

---

### Step 3: Test

After replacing, the new flow will:
1. ✅ Create booking FIRST (pending_payment status)
2. ✅ Call `/api/stripe/create-payment-intent` (NOT create-checkout-session)
3. ✅ Get a client secret
4. ✅ Show embedded payment form
5. ✅ Complete payment on your site

---

## 🎯 Quick Copy-Paste Version

If you want a quick fix right now, here's the EXACT function to replace:

### DELETE THIS (lines 1100-1224):
```typescript
const handleCheckout = async () => {
  // ... OLD CODE THAT CALLS create-checkout-session
```

### PASTE THIS:

```typescript
const handleCheckout = async () => {
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
    const { getAuthHeaders } = await import('../lib/api/authUtils');
    const headers = await getAuthHeaders();

    const businessDeliveryTypes = getDeliveryTypes(selectedBusiness);
    const deliveryType = selectedDeliveryType || businessDeliveryTypes[0] || 'business_location';

    let formattedStartTime = selectedTime;
    if (selectedTime && selectedTime.length === 5) {
      formattedStartTime = selectedTime + ':00';
    }

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
      booking_status: 'pending_payment',
      payment_status: 'pending'
    };

    console.log('💳 Creating booking with pending payment status:', bookingDetails);

    // Create the booking in pending status
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

    // Create promotion usage if needed
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

    // Create Payment Intent (NOT checkout session!)
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

    // Store client secret and move to checkout step
    setClientSecret(paymentData.clientSecret);
    setPaymentBreakdown(paymentData.breakdown);
    setCurrentStep('checkout');
    setCheckoutLoading(false);

    toast({
      title: "Ready for Payment",
      description: "Please complete your payment to confirm the booking.",
    });

  } catch (error) {
    console.error('❌ Error preparing checkout:', error);
    setCheckoutLoading(false);
    
    // Clean up booking if created
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

## ✅ What This Changes

| Before | After |
|--------|-------|
| ❌ Calls `/api/stripe/create-checkout-session` | ✅ Calls `/api/stripe/create-payment-intent` |
| ❌ Redirects to Stripe's hosted page | ✅ Shows embedded form on your site |
| ❌ Creates booking in webhook after payment | ✅ Creates booking FIRST, then payment |
| ❌ `window.location.href = result.url` | ✅ `setCurrentStep('checkout')` |

---

## 🧪 After the Fix

When you click "Proceed to Checkout":

1. ✅ Booking will be created (you'll see console log: "Booking created with ID: ...")
2. ✅ Payment Intent will be created (you'll see: "Payment Intent created")
3. ✅ Page will show checkout step with embedded Stripe form
4. ✅ No 404 error!

---

## 🚨 Still Need To Do

After fixing handleCheckout, you still need to:

1. **Add the checkout step UI** (see `BookService-CheckoutStep.tsx`)
2. **Update handleBack** (see `BookService-handleBack-UPDATED.tsx`)

But this fix will at least **stop the 404 error** and get checkout working!

---

## 📝 Quick Checklist

- [ ] Open `BookService.tsx`
- [ ] Find line 1100 (`const handleCheckout = async () => {`)
- [ ] Delete lines 1100-1224
- [ ] Paste the new function above
- [ ] Save file
- [ ] Test again - should work!

---

**The 404 error happens because `/api/stripe/create-checkout-session` was for the OLD hosted checkout. The NEW embedded checkout uses `/api/stripe/create-payment-intent`!**

