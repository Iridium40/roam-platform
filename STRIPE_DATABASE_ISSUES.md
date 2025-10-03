# Stripe Integration Database Issues

## Date: January 30, 2025

## 🚨 Critical Issues Found

### 1. **WRONG: Inconsistent Customer ID Usage** ❌

**Location:** `api/stripe/create-checkout-session.ts`

**Current Code:**
```typescript
// Line 56 - Queries by customer_profiles.id ✅
const { data: customer, error: customerError } = await supabase
  .from('customer_profiles')
  .select('*')
  .eq('id', customerId)
  .single();

// Line 68 - Queries by customer_profiles.user_id ❌ INCONSISTENT
const { data: existingProfile } = await supabase
  .from('customer_stripe_profiles')
  .select('stripe_customer_id')
  .eq('user_id', customerId)  // ❌ Assumes customerId is auth.users.id
  .single();
```

**Database Schema:**
```sql
-- customer_profiles
id uuid primary key                    -- Profile ID
user_id uuid references auth.users(id) -- Auth user ID

-- customer_stripe_profiles
user_id uuid references customer_profiles.user_id  -- Auth user ID

-- bookings
customer_id uuid references customer_profiles.id  -- Profile ID
```

**The Problem:**
- Frontend sends `customer.id` (customer_profiles.id)
- Line 56 correctly uses it as `customer_profiles.id`
- Line 68 incorrectly treats it as `auth.users.id` (user_id)
- This breaks the Stripe profile lookup

**Impact:**
- Stripe profile lookup fails
- Creates duplicate Stripe customers
- Customer payment methods not found
- Previous payment methods lost

**Fix Required:**
```typescript
// Option A: If customerId is customer_profiles.id (RECOMMENDED)
const { data: customer } = await supabase
  .from('customer_profiles')
  .select('id, user_id, email, first_name, last_name, phone')
  .eq('id', customerId)
  .single();

const { data: existingProfile } = await supabase
  .from('customer_stripe_profiles')
  .select('stripe_customer_id')
  .eq('user_id', customer.user_id)  // Use customer.user_id
  .single();

// Option B: If customerId is auth.users.id
const { data: customer } = await supabase
  .from('customer_profiles')
  .select('*')
  .eq('user_id', customerId)  // Query by user_id
  .single();

const { data: existingProfile } = await supabase
  .from('customer_stripe_profiles')
  .select('stripe_customer_id')
  .eq('user_id', customerId)
  .single();
```

---

### 2. **WRONG: Non-Existent `payments` Table** ❌

**Location:** `api/stripe/webhook.ts` lines 115-124, 141-152

**Current Code:**
```typescript
// Create payment record
await supabase
  .from('payments')  // ❌ TABLE DOESN'T EXIST
  .insert({
    booking_id: bookingId,
    stripe_payment_intent_id: paymentIntent.id,
    amount: paymentIntent.amount / 100,
    currency: paymentIntent.currency,
    status: 'succeeded',
    customer_id: paymentIntent.customer,
    created_at: new Date().toISOString(),
  });
```

**Database Reality:**
The `payments` table **does not exist**. Available tables:
- `payment_transactions` - Stripe payment tracking
- `financial_transactions` - General transaction records
- `business_payment_transactions` - Business earnings

**Impact:**
- Webhook fails with "table does not exist" error
- No payment tracking records created
- No transaction audit trail
- Financial reporting broken

**Fix Required:**
```typescript
// Use payment_transactions instead
await supabase
  .from('payment_transactions')
  .insert({
    booking_id: bookingId,
    transaction_type: 'payment',
    amount: paymentIntent.amount / 100,
    stripe_payment_intent_id: paymentIntent.id,
    stripe_charge_id: paymentIntent.charges?.data[0]?.id,
    status: 'succeeded',
    processed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  });

// Also create financial transaction for audit trail
await supabase
  .from('financial_transactions')
  .insert({
    booking_id: bookingId,
    amount: paymentIntent.amount / 100,
    currency: paymentIntent.currency,
    stripe_transaction_id: paymentIntent.id,
    payment_method: 'card',
    transaction_type: 'payment',
    status: 'completed',
    processed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  });
```

---

### 3. **MISSING: Provider Assignment** ⚠️

**Location:** `api/stripe/create-checkout-session.ts`

**Current Metadata:**
```typescript
metadata: {
  booking_id: bookingId || '',
  customer_id: customerId,
  service_id: serviceId,
  business_id: businessId,
  // ❌ MISSING: provider_id
  total_amount: totalAmount.toString(),
  // ...
}
```

**Database Schema:**
```sql
create table bookings (
  provider_id uuid null,  -- Should be populated when known
  -- ...
)
```

**Impact:**
- Bookings created without provider assignment
- Provider app can't see bookings
- Manual assignment required
- Poor user experience

**Frontend Issue:**
The `BookService.tsx` component doesn't send `providerId` to the checkout session creation.

**Fix Required:**

1. **Frontend (BookService.tsx):**
```typescript
const bookingDetails = {
  serviceId: service.id,
  businessId: selectedBusiness.id,
  customerId: customer.id,
  providerId: selectedProvider?.id || null,  // ✅ Add provider
  bookingDate: selectedDate.toISOString().split('T')[0],
  startTime: selectedTime,
  // ...
};
```

2. **Backend (create-checkout-session.ts):**
```typescript
const {
  // ... existing fields
  providerId,  // ✅ Add to destructuring
} = req.body;

// Add to metadata
metadata: {
  // ... existing fields
  provider_id: providerId || '',
}
```

---

### 4. **MISSING: Complete Transaction Records** ⚠️

**Location:** `api/stripe/webhook.ts`

**Current Behavior:**
When webhook receives `checkout.session.completed`, it:
1. ✅ Creates booking
2. ❌ Does NOT create payment_transactions record
3. ❌ Does NOT create financial_transactions record
4. ❌ Does NOT create business_payment_transactions record

**Impact:**
- No payment audit trail
- No financial reporting data
- No business earnings tracking
- No transaction history for customers
- Tax reporting incomplete

**Fix Required:**

Add comprehensive transaction tracking in webhook:

```typescript
case 'checkout.session.completed': {
  const session = event.data.object;
  const metadata = session.metadata;

  if (metadata && metadata.customer_id) {
    // 1. Create booking (existing code)
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert([bookingData])
      .select()
      .single();

    if (!bookingError && booking) {
      console.log('✅ Booking created:', booking.id);

      // 2. Create payment transaction record
      await supabase
        .from('payment_transactions')
        .insert({
          booking_id: booking.id,
          transaction_type: 'payment',
          amount: parseFloat(metadata.total_amount),
          stripe_payment_intent_id: session.payment_intent as string,
          stripe_charge_id: null, // Will be updated when charge completes
          status: 'pending',
          created_at: new Date().toISOString(),
        });

      // 3. Create financial transaction for audit
      const platformFee = parseFloat(metadata.platform_fee || '0');
      const businessAmount = parseFloat(metadata.total_amount) - platformFee;

      await supabase
        .from('financial_transactions')
        .insert({
          booking_id: booking.id,
          amount: parseFloat(metadata.total_amount),
          currency: 'USD',
          stripe_transaction_id: session.payment_intent as string,
          payment_method: 'card',
          description: `Payment for booking ${booking.booking_reference}`,
          transaction_type: 'payment',
          status: 'completed',
          processed_at: new Date().toISOString(),
          metadata: {
            platform_fee: platformFee,
            business_amount: businessAmount,
          },
        });

      // 4. Create business payment transaction
      await supabase
        .from('business_payment_transactions')
        .insert({
          business_id: metadata.business_id,
          booking_id: booking.id,
          gross_amount: parseFloat(metadata.total_amount),
          platform_fee_amount: platformFee,
          net_amount: businessAmount,
          stripe_payment_intent_id: session.payment_intent as string,
          payment_status: 'completed',
          payment_date: new Date().toISOString(),
          payout_status: 'pending',
          created_at: new Date().toISOString(),
        });

      // 5. Update customer Stripe profile with payment method
      if (session.customer && session.setup_intent) {
        await updateCustomerPaymentMethods(
          session.customer,
          session.setup_intent
        );
      }
    }
  }
  break;
}
```

---

### 5. **MISSING: Booking Reference Generation** ⚠️

**Current Code:**
```typescript
const bookingData = {
  // ... all fields
  // ❌ MISSING: booking_reference
};
```

**Database Schema:**
```sql
booking_reference text null,
```

**Impact:**
- No human-readable booking IDs
- Hard to reference bookings in support
- Poor customer experience

**Fix Required:**
```typescript
// Generate booking reference (e.g., "BK-2025-001234")
const bookingReference = `BK-${new Date().getFullYear()}-${String(
  Math.floor(Math.random() * 1000000)
).padStart(6, '0')}`;

const bookingData = {
  // ... existing fields
  booking_reference: bookingReference,
};
```

---

### 6. **MISSING: Location IDs** ⚠️

**Current Code:**
```typescript
const bookingData = {
  // ... all fields
  // ❌ MISSING: customer_location_id
  // ❌ MISSING: business_location_id
};
```

**Database Schema:**
```sql
customer_location_id uuid null,
business_location_id uuid null,
```

**Impact:**
- No location tracking for mobile services
- Can't determine service location
- Navigation features broken

**Fix Required:**

1. **Frontend:**
```typescript
const bookingDetails = {
  // ... existing fields
  customerLocationId: selectedCustomerLocation?.id || null,
  businessLocationId: selectedBusiness.primary_location_id || null,
};
```

2. **Backend:**
```typescript
const {
  // ... existing fields
  customerLocationId,
  businessLocationId,
} = req.body;

metadata: {
  // ... existing fields
  customer_location_id: customerLocationId || '',
  business_location_id: businessLocationId || '',
}
```

---

## 📋 Summary of Required Changes

### File: `api/stripe/create-checkout-session.ts`

**Changes Needed:**
1. ✅ Fix customer ID consistency (use `customer.user_id` for Stripe profile)
2. ✅ Add `providerId` to request body
3. ✅ Add `customerLocationId` and `businessLocationId`
4. ✅ Add these to session metadata

### File: `api/stripe/webhook.ts`

**Changes Needed:**
1. ✅ Change `from('payments')` to `from('payment_transactions')`
2. ✅ Add `financial_transactions` insert
3. ✅ Add `business_payment_transactions` insert
4. ✅ Generate booking reference
5. ✅ Include location IDs in booking data

### File: `client/pages/BookService.tsx`

**Changes Needed:**
1. ✅ Add `providerId` to booking details
2. ✅ Add `customerLocationId` to booking details
3. ✅ Add `businessLocationId` to booking details

---

## 🎯 Priority Order

### P0 - Critical (Breaks Functionality)
1. Fix non-existent `payments` table → Use `payment_transactions`
2. Fix customer ID inconsistency

### P1 - High (Missing Important Data)
3. Add provider assignment
4. Add transaction records (financial_transactions, business_payment_transactions)

### P2 - Medium (Nice to Have)
5. Add booking reference generation
6. Add location IDs

---

## 📊 Current vs Correct Flow

### Current Flow (Broken):
```
1. Customer completes booking
2. Frontend → create-checkout-session
3. Stripe checkout page
4. Payment succeeds
5. Webhook → Create booking in bookings table
6. Webhook → Try to create in payments table ❌ FAILS
7. Success page → Query booking ✅ Works (after fix)
```

### Correct Flow:
```
1. Customer completes booking with provider
2. Frontend → create-checkout-session (with providerId, locationIds)
3. Stripe checkout page
4. Payment succeeds
5. Webhook → Create booking with all data
6. Webhook → Create payment_transactions record ✅
7. Webhook → Create financial_transactions record ✅
8. Webhook → Create business_payment_transactions record ✅
9. Success page → Query booking with full data ✅
```

---

## 🧪 Testing After Fixes

### Test Cases:
1. ✅ Complete booking with existing customer
2. ✅ Complete booking with new customer
3. ✅ Verify Stripe profile reuse
4. ✅ Verify payment_transactions created
5. ✅ Verify financial_transactions created
6. ✅ Verify business_payment_transactions created
7. ✅ Verify booking has provider assigned
8. ✅ Verify booking has locations
9. ✅ Verify booking reference generated
10. ✅ Success page displays all data

### Database Checks:
```sql
-- Check booking created correctly
SELECT * FROM bookings 
WHERE stripe_checkout_session_id = 'cs_test_...';

-- Check payment transaction
SELECT * FROM payment_transactions 
WHERE booking_id = 'booking-id';

-- Check financial transaction
SELECT * FROM financial_transactions 
WHERE booking_id = 'booking-id';

-- Check business transaction
SELECT * FROM business_payment_transactions 
WHERE booking_id = 'booking-id';

-- Check all related data
SELECT 
  b.*,
  pt.status as payment_status,
  ft.amount as financial_amount,
  bpt.net_amount as business_net
FROM bookings b
LEFT JOIN payment_transactions pt ON pt.booking_id = b.id
LEFT JOIN financial_transactions ft ON ft.booking_id = b.id
LEFT JOIN business_payment_transactions bpt ON bpt.booking_id = b.id
WHERE b.id = 'booking-id';
```

---

## 🔗 Related Tables

### Tables That MUST Be Used:
- ✅ `bookings` - Main booking record
- ✅ `customer_profiles` - Customer data
- ✅ `customer_stripe_profiles` - Stripe customer mapping
- ✅ `payment_transactions` - Stripe payment tracking
- ✅ `financial_transactions` - Financial audit trail
- ✅ `business_payment_transactions` - Business earnings

### Tables Currently Missing:
- ❌ `payment_transactions` - Not being created
- ❌ `financial_transactions` - Not being created
- ❌ `business_payment_transactions` - Not being created

### Optional But Recommended:
- `promotion_usage` - If promotion was applied
- `booking_addons` - If addons were selected
- `booking_changes` - For audit trail of changes

---

## 📚 Database Schema References

### Correct Customer Reference Chain:
```
auth.users (id) 
  → customer_profiles (user_id) 
    → customer_stripe_profiles (user_id)
    → bookings (customer_id references customer_profiles.id)
```

### Payment Transaction Chain:
```
bookings (id)
  → payment_transactions (booking_id)
  → financial_transactions (booking_id)
  → business_payment_transactions (booking_id)
```

### Location Chain:
```
bookings (id)
  → customer_location_id → customer_locations (id)
  → business_location_id → business_locations (id)
```

---

*All fixes should be implemented and tested before deployment*
