# 📋 Comprehensive Booking Testing Guide

**Date**: November 27, 2025  
**Status**: Ready for Testing  
**Environment**: Development (Local + Staging)

---

## 🎯 Testing Overview

This guide covers comprehensive testing of the ROAM Platform booking system across:
- **Customer App**: Booking creation and management
- **Provider App**: Booking acceptance and status updates  
- **Admin App**: Booking oversight and management
- **Payment Integration**: Stripe checkout and webhooks
- **Notifications**: Email and SMS notifications

---

## 🚀 Quick Start

### Prerequisites

1. **Dev Servers Running** ✅
   ```bash
   # You have this running already
   npm run dev
   ```

2. **Test Accounts Needed**
   - Customer account with email/password
   - Provider account (active with services)
   - Admin account

3. **Browser Setup**
   - Chrome DevTools open (F12)
   - Network tab enabled
   - Console tab visible

### URLs (Development)

- **Customer App**: http://localhost:3000 (or check terminal output)
- **Provider App**: http://localhost:3002 (or check terminal output)  
- **Admin App**: http://localhost:3001 ✅

### URLs (Staging/Production)

- **Customer App**: https://roamservices.app
- **Provider App**: https://roamproviders.app
- **Admin App**: https://roamadmin.app

---

## 📝 Test Cases

### Test Suite 1: Customer Booking Creation

#### Test 1.1: Browse and Select Service ⭐ CRITICAL

**Steps**:
1. Navigate to customer app home page
2. Search for a service (e.g., "massage", "car wash")
3. View search results
4. Click on a service card
5. Verify service details page loads

**Expected Results**:
- ✅ Search returns relevant services
- ✅ Service details show: price, description, providers
- ✅ Images load correctly
- ✅ Reviews/ratings display (if available)

**Browser Console Check**:
```javascript
// Check for errors
console.log('Any errors?', performance.getEntriesByType('navigation'));
```

---

#### Test 1.2: Complete Booking Form ⭐ CRITICAL

**Steps**:
1. On service details page, click "Book Service"
2. **Step 1 - Date/Time**:
   - Select a date (tomorrow or later)
   - Select a time slot
   - Click "Continue"

3. **Step 2 - Business Selection** (if multiple):
   - Select a business
   - Click "Continue"

4. **Step 3 - Provider Selection** (if applicable):
   - View available providers
   - Select a provider
   - Click "Continue"

5. **Step 4 - Delivery/Location**:
   - Select delivery type (in-person, mobile, virtual)
   - Enter address if mobile service
   - Add special instructions (optional)
   - Click "Continue"

6. **Step 5 - Summary**:
   - Review all booking details
   - Apply promo code (optional)
   - Verify pricing breakdown
   - Click "Proceed to Checkout"

**Expected Results**:
- ✅ All form steps validate correctly
- ✅ Cannot proceed without required fields
- ✅ Date picker only shows available dates
- ✅ Time slots reflect business hours
- ✅ Pricing calculates correctly
- ✅ Promo codes apply discounts

**Network Tab Check**:
Look for these API calls:
- `GET /api/services/{id}` - 200 OK
- `GET /api/businesses` - 200 OK (if applicable)
- `GET /api/providers` - 200 OK (if applicable)

---

#### Test 1.3: Authentication Flow ⭐ CRITICAL

**Scenario A: Existing Customer**

**Steps**:
1. Click "Proceed to Checkout" at summary step
2. If not logged in → Sign in modal appears
3. Enter email and password
4. Click "Sign In"

**Expected Results**:
- ✅ Sign in modal appears
- ✅ Validation on email format
- ✅ Error message for wrong password
- ✅ Successful login proceeds to checkout
- ✅ User stays on same page with context preserved

**Scenario B: New Customer**

**Steps**:
1. Click "Proceed to Checkout"
2. Click "Sign Up" tab in auth modal
3. Fill in: First name, Last name, Email, Password
4. Click "Create Account"

**Expected Results**:
- ✅ Account creation succeeds
- ✅ Verification email sent (check inbox)
- ✅ Auto-login after signup
- ✅ Proceeds to checkout

**Console Check**:
```javascript
// Check customer object
JSON.parse(localStorage.getItem('roam_customer'));

// Check auth state
supabase.auth.getSession();
```

---

#### Test 1.4: Stripe Payment Integration ⭐ CRITICAL

**Steps**:
1. After authentication, checkout step loads
2. Verify Stripe payment form appears
3. Enter test card details:
   - **Card Number**: `4242 4242 4242 4242`
   - **Expiry**: Any future date (e.g., `12/25`)
   - **CVC**: Any 3 digits (e.g., `123`)
   - **Name**: Any name
   - **ZIP**: Any 5 digits
4. Click "Pay Now" or "Complete Booking"

**Expected Results**:
- ✅ Stripe Elements loads correctly
- ✅ Card number field formats as typed
- ✅ Validation shows for invalid cards
- ✅ Loading state during payment processing
- ✅ Success message appears
- ✅ Redirect to booking confirmation page

**Test Cards (Stripe Test Mode)**:
- **Success**: `4242 4242 4242 4242`
- **Declined**: `4000 0000 0000 0002`
- **Insufficient Funds**: `4000 0000 0000 9995`
- **3D Secure Required**: `4000 0025 0000 3155`

**Network Tab Check**:
```bash
# Watch for these calls in order:
1. POST /api/stripe/create-payment-intent → 200 (returns clientSecret)
2. POST https://api.stripe.com/v1/payment_intents/{id}/confirm → 200
3. GET /api/bookings/{id} → 200 (verify booking updated)
```

**Critical Database Check**:
After payment succeeds, verify in database:
```sql
-- Check booking was created
SELECT 
  id, 
  booking_reference,
  payment_status,
  stripe_checkout_session_id,
  total_amount,
  customer_id
FROM bookings 
WHERE id = 'BOOKING_ID'
ORDER BY created_at DESC LIMIT 1;

-- Should show:
-- payment_status = 'paid' (or 'succeeded')
-- stripe_checkout_session_id IS NOT NULL
```

---

#### Test 1.5: Booking Confirmation ⭐ HIGH

**Steps**:
1. After successful payment
2. Verify redirect to confirmation page
3. Check page content

**Expected Results**:
- ✅ Booking reference number displayed
- ✅ Service details shown
- ✅ Provider info shown
- ✅ Date/time confirmed
- ✅ Payment receipt link available
- ✅ "View My Bookings" button works

**Email Check**:
Within 2-5 minutes, check customer email for:
- ✅ Booking confirmation email
- ✅ Correct service details
- ✅ Calendar invite (.ics file)
- ✅ Link to view booking

---

### Test Suite 2: Provider Booking Management

#### Test 2.1: View Incoming Bookings ⭐ CRITICAL

**Steps**:
1. Login to Provider App (https://roamproviders.app)
2. Navigate to Dashboard
3. Click "Bookings" tab
4. View booking list

**Expected Results**:
- ✅ Bookings display in table/list
- ✅ Shows: date, time, customer name, service, status
- ✅ Can filter by status (pending, confirmed, in-progress, completed)
- ✅ Can sort by date
- ✅ New bookings show "NEW" badge

**Check for Booking Created in Test 1**:
- The booking from Test 1.4 should appear here
- Status should be "pending" (awaiting provider acceptance)

---

#### Test 2.2: Accept Booking ⭐ CRITICAL

**Steps**:
1. Click on a pending booking
2. Review booking details in modal/page
3. Click "Accept Booking" button
4. Confirm acceptance (if prompted)

**Expected Results**:
- ✅ Modal shows complete booking info
- ✅ Customer contact info visible
- ✅ Service details correct
- ✅ Accept button functional
- ✅ Status updates to "confirmed"
- ✅ Success notification appears

**Email Check** (Customer receives):
- ✅ "Booking Confirmed" email
- ✅ Provider contact info included
- ✅ Service date/time confirmed

---

#### Test 2.3: Update Booking Status ⭐ HIGH

**Steps**:
1. Open a confirmed booking
2. Update status through dropdown or buttons:
   - Confirmed → In Progress
   - In Progress → Completed
3. Add completion notes (if applicable)

**Expected Results**:
- ✅ Status updates immediately in UI
- ✅ Customer receives status update notification
- ✅ Timeline/history shows status change
- ✅ Completed bookings show in "Past" section

---

#### Test 2.4: Communicate with Customer ⭐ MEDIUM

**Steps**:
1. Open booking details
2. Click "Message Customer" or chat icon
3. Send a test message
4. Check if customer receives it

**Expected Results**:
- ✅ Message interface opens
- ✅ Message sends successfully
- ✅ Customer can reply
- ✅ Chat history persists

---

### Test Suite 3: Customer Booking Management

#### Test 3.1: View My Bookings ⭐ HIGH

**Steps**:
1. Login to Customer App
2. Navigate to "My Bookings" page
3. View bookings list

**Expected Results**:
- ✅ All customer bookings displayed
- ✅ Shows upcoming and past bookings
- ✅ Displays: date, service, provider, status
- ✅ Can filter by status
- ✅ Can search bookings

**Console Check**:
```javascript
// Verify customer ID
JSON.parse(localStorage.getItem('roam_customer')).id;

// Check API call
// Network tab: GET /api/bookings?customer_id=XXX → 200
```

---

#### Test 3.2: Cancel Booking ⭐ HIGH

**Steps**:
1. Select an upcoming booking (confirmed status)
2. Click "Cancel Booking"
3. Select cancellation reason
4. Confirm cancellation

**Expected Results**:
- ✅ Cancellation reasons list appears
- ✅ Confirmation prompt shown
- ✅ Status updates to "cancelled"
- ✅ Refund policy displayed (if applicable)
- ✅ Provider receives cancellation notification

**Database Check**:
```sql
SELECT 
  id,
  booking_status,
  cancellation_reason,
  cancelled_at,
  cancelled_by
FROM bookings
WHERE id = 'BOOKING_ID';

-- Should show:
-- booking_status = 'cancelled'
-- cancellation_reason IS NOT NULL
-- cancelled_at = recent timestamp
```

---

#### Test 3.3: Reschedule Booking ⭐ HIGH

**Steps**:
1. Select an upcoming booking
2. Click "Reschedule"
3. Select new date/time
4. Add reschedule reason
5. Confirm reschedule

**Expected Results**:
- ✅ Date/time picker shows available slots
- ✅ Cannot select past dates
- ✅ Reschedule reason required
- ✅ Provider receives reschedule request
- ✅ Booking shows "pending reschedule" status
- ✅ After provider approves → new date/time confirmed

---

### Test Suite 4: Edge Cases & Error Handling

#### Test 4.1: Invalid Payment Card ⭐ MEDIUM

**Steps**:
1. Complete booking flow
2. Enter declined test card: `4000 0000 0000 0002`
3. Submit payment

**Expected Results**:
- ✅ Payment fails gracefully
- ✅ Error message displayed to user
- ✅ User can retry with different card
- ✅ Booking remains in pending state (not deleted)
- ✅ No charge in Stripe

---

#### Test 4.2: Session Timeout ⭐ MEDIUM

**Steps**:
1. Start booking flow
2. Wait 30+ minutes without action
3. Try to proceed to checkout

**Expected Results**:
- ✅ Session expires
- ✅ User prompted to login again
- ✅ Booking data preserved (or user warned)
- ✅ Can continue after re-auth

---

#### Test 4.3: Double Booking Prevention ⭐ HIGH

**Steps**:
1. Book a service for specific date/time with Provider A
2. Immediately try to book same provider, same time
3. Check if prevented

**Expected Results**:
- ✅ Second booking attempt shows "Time slot unavailable"
- ✅ Calendar updates to reflect booked slots
- ✅ Provider availability accurate

---

#### Test 4.4: Network Interruption ⭐ LOW

**Steps**:
1. Start booking flow
2. Open DevTools → Network tab
3. Enable "Offline" mode
4. Try to submit booking

**Expected Results**:
- ✅ Offline message displayed
- ✅ Form data not lost
- ✅ Retry button available
- ✅ Submits successfully when back online

---

### Test Suite 5: Admin Booking Oversight

#### Test 5.1: View All Bookings ⭐ MEDIUM

**Steps**:
1. Login to Admin App (http://localhost:3001)
2. Navigate to Bookings page
3. View all platform bookings

**Expected Results**:
- ✅ All bookings across all providers shown
- ✅ Can filter by: status, date, provider, customer
- ✅ Can search by booking reference
- ✅ Export functionality works

---

#### Test 5.2: Manage Disputed Bookings ⭐ MEDIUM

**Steps**:
1. Find a booking marked as "disputed"
2. Review dispute details
3. Take action (refund, close, etc.)

**Expected Results**:
- ✅ Dispute reason visible
- ✅ Messages between parties shown
- ✅ Admin can issue refunds
- ✅ Both parties notified of resolution

---

## 🔍 Database Verification Queries

After each test, verify database state:

### Check Booking Created
```sql
SELECT 
  b.id,
  b.booking_reference,
  b.booking_status,
  b.payment_status,
  b.booking_date,
  b.start_time,
  b.total_amount,
  b.stripe_checkout_session_id,
  c.first_name || ' ' || c.last_name as customer_name,
  s.name as service_name,
  bp.business_name
FROM bookings b
LEFT JOIN customer_profiles c ON b.customer_id = c.id
LEFT JOIN services s ON b.service_id = s.id
LEFT JOIN business_profiles bp ON b.business_id = bp.id
ORDER BY b.created_at DESC
LIMIT 5;
```

### Check Payment Transaction
```sql
SELECT 
  pt.id,
  pt.stripe_payment_intent_id,
  pt.amount,
  pt.status,
  pt.created_at,
  b.booking_reference
FROM payment_transactions pt
JOIN bookings b ON pt.booking_id = b.id
ORDER BY pt.created_at DESC
LIMIT 5;
```

### Check Notifications Sent
```sql
SELECT 
  n.id,
  n.type,
  n.title,
  n.status,
  n.created_at,
  u.email as recipient_email
FROM notifications n
JOIN auth.users u ON n.user_id = u.id
WHERE n.type LIKE '%booking%'
ORDER BY n.created_at DESC
LIMIT 10;
```

---

## 🎓 Test with Browser Automation

I can help you run automated tests using the browser tools. Here's how:

### Test Customer Booking Flow (Automated)

```typescript
// I can execute this for you:
// 1. Navigate to customer app
// 2. Search for service
// 3. Fill booking form
// 4. Complete checkout with test card
// 5. Verify confirmation
```

Would you like me to:
1. **Run automated browser tests** for the booking flow?
2. **Manually guide you** through testing specific scenarios?
3. **Create test scripts** you can run repeatedly?

---

## 📊 Testing Checklist

### Pre-Testing Setup
- [ ] Dev servers running
- [ ] Test accounts created (customer, provider, admin)
- [ ] Browser DevTools open
- [ ] Database access available
- [ ] Stripe test mode confirmed

### Customer Booking Tests
- [ ] Test 1.1: Browse and select service
- [ ] Test 1.2: Complete booking form
- [ ] Test 1.3: Authentication flow (sign in + sign up)
- [ ] Test 1.4: Stripe payment (success case)
- [ ] Test 1.5: Booking confirmation page + email

### Provider Tests
- [ ] Test 2.1: View incoming bookings
- [ ] Test 2.2: Accept booking
- [ ] Test 2.3: Update booking status
- [ ] Test 2.4: Message customer

### Customer Management Tests
- [ ] Test 3.1: View my bookings
- [ ] Test 3.2: Cancel booking
- [ ] Test 3.3: Reschedule booking

### Edge Cases
- [ ] Test 4.1: Invalid payment card
- [ ] Test 4.2: Session timeout
- [ ] Test 4.3: Double booking prevention
- [ ] Test 4.4: Network interruption

### Admin Tests
- [ ] Test 5.1: View all bookings
- [ ] Test 5.2: Manage disputed bookings

---

## 🐛 Known Issues to Watch For

Based on previous documentation:

1. **Stripe Checkout Integration**:
   - ⚠️ Some bookings created without going through Stripe
   - ⚠️ `stripe_checkout_session_id` sometimes null
   - **Fix**: Verify checkout API is called before booking creation

2. **My Bookings Page**:
   - ⚠️ May not show bookings if not authenticated
   - **Fix**: Check auth state and customer_id in console

3. **Provider Bookings Tab**:
   - ⚠️ Previous circular dependency issues (fixed)
   - **Fix**: Check console for module errors

---

## 🚨 Critical Test Scenarios

### Scenario A: End-to-End Happy Path ⭐ MUST PASS

1. Customer browses services → ✅
2. Customer books service → ✅
3. Customer pays successfully → ✅
4. Provider receives booking → ✅
5. Provider accepts booking → ✅
6. Both receive notifications → ✅

### Scenario B: Payment Failure Recovery ⭐ SHOULD HANDLE

1. Customer completes booking form → ✅
2. Payment fails (card declined) → ✅
3. User sees error message → ✅
4. User can retry with different card → ✅
5. Second attempt succeeds → ✅
6. Booking confirmed → ✅

### Scenario C: Booking Modification ⭐ SHOULD HANDLE

1. Customer has confirmed booking → ✅
2. Customer requests reschedule → ✅
3. Provider receives request → ✅
4. Provider approves new time → ✅
5. Both receive updated details → ✅

---

## 🎯 Next Steps

Choose your testing approach:

### Option 1: Automated Browser Testing
I can use the browser automation tools to:
- Navigate through the booking flow
- Fill forms automatically  
- Take screenshots at each step
- Verify expected outcomes
- Generate a test report

**Command**: "Run automated booking tests"

### Option 2: Manual Guided Testing
I'll guide you step-by-step through each test case, helping you:
- Navigate to the right pages
- Check the right console outputs
- Verify database state
- Troubleshoot issues

**Command**: "Guide me through booking tests"

### Option 3: Specific Test Scenario
Tell me which specific scenario you want to test:
- "Test customer booking creation"
- "Test provider acceptance flow"
- "Test payment integration"
- "Test cancellation flow"

---

## 📞 Ready to Start?

**What would you like to test first?**

1. Customer booking creation (end-to-end)
2. Provider booking management
3. Payment integration (Stripe)
4. Booking cancellation/rescheduling
5. All of the above (comprehensive test suite)

Let me know and I'll help you test! 🚀

