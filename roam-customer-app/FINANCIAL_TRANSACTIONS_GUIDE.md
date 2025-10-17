# 💰 Financial Transactions - Complete Guide

## 🎯 Three Tables, Three Purposes

You have 3 financial transaction tables. Here's when to use each:

---

## 📊 Table Breakdown

### **1. `financial_transactions`** - General Ledger
**Purpose:** Record EVERY money movement for accounting  
**Think:** Your company's accounting book

**Use For:**
- ✅ Customer payments received
- ✅ Refunds issued
- ✅ Tips received
- ✅ Any money in/out
- ✅ Audit trail
- ✅ Financial reporting

**When:** **Every single payment event**

---

### **2. `payment_transactions`** - Payment Splits
**Purpose:** Track where money is allocated (platform vs provider)  
**Think:** Payment routing/splitting

**Use For:**
- ✅ Platform fees (your 12%)
- ✅ Provider payments (their 88%)
- ✅ Add-on charges
- ✅ Refund tracking
- ✅ Cancellation fees

**When:** **When splitting payments** between parties

---

### **3. `business_payment_transactions`** - Tax & Payouts
**Purpose:** Provider earnings for **IRS 1099 reporting**  
**Think:** Provider tax records

**Use For:**
- ✅ Provider payout tracking
- ✅ 1099-K tax forms
- ✅ Annual earnings reports
- ✅ Tax year tracking
- ✅ IRS compliance

**When:** **When actually paying provider** via Stripe Connect

---

## 🔄 Complete Payment Flow

### **Step 1: Customer Pays** (Embedded Checkout)

**What Happens:**
```
Customer enters card → Stripe processes → Payment succeeds
```

**Record in:**
1. ✅ `bookings` table (update status to 'confirmed')
2. ✅ `financial_transactions` (overall payment)
3. ✅ `payment_transactions` (split: platform fee + provider amount)

**Code:** (Already implemented in webhook!)
```typescript
// In webhook: handlePaymentIntentSucceeded()

// 1. Update booking
booking_status: 'confirmed'
payment_status: 'completed'

// 2. Record in financial_transactions
amount: $100.00
transaction_type: 'service_payment'
status: 'completed'

// 3a. Record platform fee
transaction_type: 'service_fee'
amount: $12.00 (12%)
destination_account: 'roam_platform'
status: 'completed'

// 3b. Record provider payment
transaction_type: 'remaining_balance'  
amount: $88.00 (88%)
destination_account: 'provider_connected'
status: 'pending' (not transferred yet)
```

---

### **Step 2: Service Completed** (Later)

**What Happens:**
```
Provider completes service → Booking marked 'completed'
```

**Record in:**
- ✅ `bookings` table (update to 'completed')
- No new transactions needed (already recorded)

---

### **Step 3: Provider Gets Paid** (Stripe Connect Transfer)

**What Happens:**
```
You transfer provider's portion via Stripe Connect → Arrives in their bank
```

**Record in:**
- ✅ `business_payment_transactions` (for tax reporting!)
- ✅ Update `payment_transactions` (mark as 'completed')

**Code:**
```typescript
// When doing Stripe Connect transfer
const transfer = await stripe.transfers.create({
  amount: providerAmount * 100,
  currency: 'usd',
  destination: business.stripe_account_id,
  transfer_group: bookingId,
}, {
  idempotencyKey: `transfer_${bookingId}`
});

// Record for tax reporting
await supabase.from('business_payment_transactions').insert({
  booking_id: bookingId,
  business_id: businessId,
  payment_date: new Date().toISOString().split('T')[0],
  gross_payment_amount: booking.total_amount,
  platform_fee: booking.total_amount * 0.12,
  net_payment_amount: booking.total_amount * 0.88,
  tax_year: new Date().getFullYear(),
  stripe_transfer_id: transfer.id,
  stripe_payment_intent_id: booking.stripe_payment_intent_id,
  stripe_connect_account_id: business.stripe_account_id,
  booking_reference: booking.booking_reference
});

// Update payment_transaction to completed
await supabase.from('payment_transactions')
  .update({ 
    status: 'completed',
    processed_at: new Date().toISOString(),
    stripe_transfer_id: transfer.id
  })
  .eq('booking_id', bookingId)
  .eq('destination_account', 'provider_connected');
```

---

## 📊 Visual Flow Diagram

```
CUSTOMER PAYMENT ($100)
        ↓
┌───────────────────────────────────┐
│  financial_transactions           │
│  amount: $100                     │
│  type: service_payment            │
│  status: completed                │
└───────────────────────────────────┘
        ↓
        ↓ SPLIT
        ↓
    ┌───────┴────────┐
    ↓                ↓
┌─────────┐    ┌──────────────┐
│Platform │    │ Provider     │
│Fee $12  │    │ Amount $88   │
└─────────┘    └──────────────┘
    ↓                ↓
┌─────────────────────────────┐
│ payment_transactions (2 rows)│
│                              │
│ Row 1: service_fee → platform│
│   $12, completed             │
│                              │
│ Row 2: remaining_balance     │
│   $88, pending → provider    │
└──────────────────────────────┘
        ↓
    (Later when provider paid)
        ↓
┌─────────────────────────────────┐
│ business_payment_transactions   │
│ gross: $100                     │
│ platform_fee: $12               │
│ net: $88                        │
│ tax_year: 2025                  │
│ (For 1099 reporting)            │
└─────────────────────────────────┘
```

---

## 🎯 Summary: When to Use Each Table

| Event | financial_transactions | payment_transactions | business_payment_transactions |
|-------|----------------------|---------------------|------------------------------|
| Customer pays | ✅ Yes (overall) | ✅ Yes (splits) | ❌ No |
| Refund issued | ✅ Yes | ✅ Yes | ❌ No |
| Tip paid | ✅ Yes | ✅ Yes | ❌ No |
| Provider payout | ❌ No (already recorded) | ✅ Yes (update status) | ✅ Yes (for 1099) |
| Cancellation fee | ✅ Yes | ✅ Yes | ❌ No |

---

## ✅ Current Implementation

### **What We've Implemented:**

1. ✅ **financial_transactions** - Records overall payment
2. ✅ **payment_transactions** - Records platform fee and provider split
3. ⏳ **business_payment_transactions** - TODO: Add when implementing provider payouts

### **What Happens Now:**

When customer pays via embedded checkout:
1. ✅ Booking confirmed
2. ✅ Payment recorded in `financial_transactions`
3. ✅ Split recorded in `payment_transactions`:
   - Platform gets $12 immediately (completed)
   - Provider gets $88 eventually (pending)

---

## 🔮 Future: Provider Payout System

When you're ready to pay providers, create a payout function:

```typescript
async function payoutToProvider(bookingId: string) {
  // 1. Get pending provider payments
  const { data: pendingPayment } = await supabase
    .from('payment_transactions')
    .select('*')
    .eq('booking_id', bookingId)
    .eq('destination_account', 'provider_connected')
    .eq('status', 'pending')
    .single();

  // 2. Transfer via Stripe Connect
  const transfer = await stripe.transfers.create({
    amount: pendingPayment.amount * 100,
    currency: 'usd',
    destination: business.stripe_account_id,
  });

  // 3. Record for tax reporting
  await supabase.from('business_payment_transactions').insert({
    booking_id: bookingId,
    business_id: business.id,
    payment_date: new Date(),
    gross_payment_amount: booking.total_amount,
    platform_fee: booking.total_amount * 0.12,
    net_payment_amount: pendingPayment.amount,
    tax_year: new Date().getFullYear(),
    stripe_transfer_id: transfer.id,
    stripe_connect_account_id: business.stripe_account_id
  });

  // 4. Mark payment transaction as completed
  await supabase.from('payment_transactions')
    .update({ 
      status: 'completed',
      processed_at: new Date()
    })
    .eq('id', pendingPayment.id);
}
```

---

## 📈 Benefits of This Approach

### **Complete Financial Tracking:**
- ✅ Every dollar accounted for
- ✅ Platform fees separated
- ✅ Provider earnings tracked
- ✅ Tax reporting automated
- ✅ Audit trail complete

### **For Your Business:**
- 📊 Know platform revenue instantly
- 💰 Track provider payables
- 📝 Generate 1099s automatically
- 🔍 Full transaction transparency
- 📈 Financial analytics ready

### **For Providers:**
- 💵 See pending earnings
- 📋 Access tax documents
- 🏦 Track payouts
- ✅ IRS compliance automatic

---

## 🧪 Testing

### **After Customer Payment:**

**Check `financial_transactions`:**
```sql
SELECT * FROM financial_transactions 
WHERE booking_id = 'abc-123';

-- Should show:
-- 1 row: $100, service_payment, completed
```

**Check `payment_transactions`:**
```sql
SELECT * FROM payment_transactions 
WHERE booking_id = 'abc-123';

-- Should show 2 rows:
-- Row 1: $12, service_fee, roam_platform, completed
-- Row 2: $88, remaining_balance, provider_connected, pending
```

**Check `business_payment_transactions`:**
```sql
SELECT * FROM business_payment_transactions 
WHERE booking_id = 'abc-123';

-- Should show:
-- 0 rows (until you implement provider payouts)
```

---

## 🎯 Recommended Next Steps

1. ✅ **Done:** Record payments in `financial_transactions` and `payment_transactions`
2. ⏳ **TODO:** Implement provider payout system
3. ⏳ **TODO:** Use `business_payment_transactions` for tax reporting
4. ⏳ **TODO:** Generate 1099-K forms from `business_payment_transactions`

---

## 📚 Related Documentation

- **Provider Financials Page:** See `roam-provider-app/FINANCIALS_PAGE_GUIDE.md`
- **Stripe Dashboard:** See `roam-provider-app/STRIPE_EMBEDDED_DASHBOARD_IMPLEMENTATION.md`
- **Database Schema:** See `/DATABASE_SCHEMA_REFERENCE.md`

---

## ✅ Summary

**Use ALL THREE tables:**

1. **financial_transactions** ✅ Implemented in webhook
   - Records every payment
   - General ledger style
   - For accounting

2. **payment_transactions** ✅ Implemented in webhook
   - Splits payments
   - Platform vs provider
   - For revenue tracking

3. **business_payment_transactions** ⏳ Implement later
   - Provider payouts
   - Tax reporting
   - 1099 generation

**Your embedded checkout now has complete financial tracking! 🎉**

