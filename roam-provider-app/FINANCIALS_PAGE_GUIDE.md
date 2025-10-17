# 💰 Provider Financials Page - Complete Guide

## 🎯 Quick Overview

The Financials page is your **complete money management hub**. Everything you need to track earnings, request payouts, manage taxes, and control your banking - all in one place!

---

## 🏠 Main Dashboard View

When you first open the Financials page, you'll see:

### **Top Actions (Always Visible)**
```
┌────────────────────────────────────────────────────────┐
│  Financials                    [Refresh] [Dashboard]    │
│  Manage your earnings, payouts, and tax information     │
└────────────────────────────────────────────────────────┘
```

**Buttons:**
- **Refresh**: Update all your financial data instantly
- **Open Stripe Dashboard**: Access full Stripe features in new tab

---

### **Balance Cards (Your Money at a Glance)**

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ Available   │  │ Pending     │  │ Total YTD   │
│ $1,234.56   │  │ $456.78     │  │ $12,345.67  │
│ Ready Now   │  │ Processing  │  │ 45 bookings │
└─────────────┘  └─────────────┘  └─────────────┘
```

**Card Meanings:**
- **Available Balance** 💚: Money you can withdraw RIGHT NOW
- **Pending Balance** 🕐: Processing (available in 2-7 days)
- **Total YTD** 📊: Your total earnings this year

---

### **Quick Actions**

```
┌──────────────────────┐  ┌──────────────────────┐
│ Request Payout       │  │ Payout Schedule      │
│ Get funds instantly  │  │ Weekly • Friday      │
│ or in 2 days        │  │ [Manage Schedule]    │
└──────────────────────┘  └──────────────────────┘
```

---

## 📑 Tabs Explained

### **Tab 1: Overview** 📊
Your business performance at a glance

**What You'll See:**
- Total Bookings (with trend ↑/↓)
- Average Order Value
- Completion Rate
- Revenue Growth %
- Top 5 Services by Revenue
- Monthly Revenue Chart
- Period selector (7/30/90/365 days)

**Use This Tab For:**
- Understanding business trends
- Seeing which services make most money
- Tracking growth month-over-month

---

### **Tab 2: Payouts** 💸
All your payout history

**What You'll See:**
```
┌────────────────────────────────────────┐
│ ✓ $500.00  [Instant]                   │
│   Mar 15, 2024 • Arrives Mar 15, 2024  │
│   Status: Paid                         │
├────────────────────────────────────────┤
│ 🕐 $1,000.00                           │
│   Mar 10, 2024 • Arrives Mar 12, 2024  │
│   Status: Pending                      │
└────────────────────────────────────────┘
```

**Status Meanings:**
- ✓ **Paid**: Money is in your bank account
- 🕐 **Pending**: Payout initiated, waiting to arrive
- 🚚 **In Transit**: On the way to your bank
- ❌ **Failed**: Issue with payout (contact support)

**Use This Tab For:**
- Tracking when money arrives
- Checking payout status
- Viewing instant vs standard payouts

---

### **Tab 3: Transactions** 🧾
Every charge, fee, and payout

**What You'll See:**
```
┌────────────────────────────────────────┐
│ Charge                                 │
│ Mar 15, 2024 • Booking #1234          │
│ +$100.00  Net: $88.00                 │
├────────────────────────────────────────┤
│ Payout                                 │
│ Mar 15, 2024                          │
│ -$500.00  Net: -$500.00               │
└────────────────────────────────────────┘
```

**Transaction Types:**
- **Charge** (green ↓): Money earned from booking
- **Payout** (blue ↑): Money sent to your bank
- **Refund** (red): Money returned to customer
- **Fee**: Platform or Stripe fees

**Use This Tab For:**
- Detailed transaction history
- Reconciling your books
- Understanding fee deductions

---

### **Tab 4: Settings** ⚙️
Tax info, bank accounts, and help

**Sections:**

**1. Tax Information**
```
┌────────────────────────────────────────┐
│ Business Entity Type: [LLC ▼]          │
│ Legal Business Name: [____________]    │
│ Tax ID Type: [EIN ▼]                  │
│ EIN: [XX-XXXXXXX]                     │
│ Address: [_____________________]      │
│ W-9 Status: [Received ▼]              │
│                                        │
│                      [Save Tax Info]   │
└────────────────────────────────────────┘
```

**2. Bank Account**
```
┌────────────────────────────────────────┐
│ Connected Bank: Chase •••• 1234        │
│ Status: Verified ✓                     │
│                                        │
│           [Update Bank Account]        │
└────────────────────────────────────────┘
```

**3. Tax Documents & 1099s**
```
┌────────────────────────────────────────┐
│ Year-to-Date Earnings: $12,345.67     │
│ ✓ Qualifies for 1099-K                │
│                                        │
│           [View in Dashboard]          │
└────────────────────────────────────────┘
```

**4. Help & Resources**
- How payouts work
- Transaction fees breakdown
- Tax reporting info

---

## 🚀 Common Actions Step-by-Step

### **How to Request an Instant Payout**

1. Click **"Request Payout"** button (top quick actions)
2. Modal opens showing your available balance
3. Select payout method:
   - **Standard** (Free, 2 days) ✓ Recommended
   - **Instant** (1.5% fee, 30 minutes)
4. Enter amount or click "Use full balance"
5. See fee calculation (for instant)
6. Click **"Request Payout"**
7. ✓ Done! You'll see confirmation with arrival time

**Example:**
```
Payout amount:        $1,000.00
Instant fee (1.5%):   -$  15.00
─────────────────────────────────
You'll receive:       $  985.00
```

---

### **How to Check Payout Status**

1. Go to **"Payouts"** tab
2. Find your payout in the list
3. Check the status badge:
   - **Paid**: Money is in your bank ✓
   - **Pending**: Processing, arriving soon
   - **In Transit**: Almost there!
   - **Failed**: Contact support

---

### **How to Update Your Bank Account**

1. Go to **"Settings"** tab
2. Find "Bank Account" section
3. Click **"Update Bank Account"**
4. Plaid window opens
5. Select your bank
6. Login securely
7. Choose account
8. ✓ Done! New account saved and verified

---

### **How to Update Tax Information**

1. Go to **"Settings"** tab
2. Find "Tax Information" section
3. Fill in all fields:
   - Business entity type
   - Legal business name
   - EIN or SSN
   - Business address
   - Contact information
   - W-9 status
4. Click **"Save Tax Info"**
5. ✓ Saved! Information used for 1099s

---

### **How to Access Full Stripe Dashboard**

1. Click **"Open Stripe Dashboard"** (top right)
2. New tab opens with secure login
3. Access all Stripe features:
   - Detailed reports
   - Download tax forms
   - Manage disputes
   - Update business details
   - Configure payout schedule

**⚠️ Note:** Link expires in 5 minutes for security

---

## 💡 Pro Tips

### **Maximize Your Earnings**
1. Check **"Top Services"** to see what makes most money
2. Focus on high-revenue services
3. Monitor **"Revenue Growth"** to track progress
4. Use **"Monthly Trend"** to spot patterns

### **Manage Cash Flow**
1. Set up **weekly payouts** for consistent income
2. Use **standard payouts** (free) for most withdrawals
3. Save **instant payouts** for emergencies
4. Check **pending balance** to know what's coming

### **Stay Tax Compliant**
1. Update tax info as soon as you start
2. Track year-to-date earnings for 1099 threshold ($600)
3. Download 1099s by January 31st each year
4. Keep W-9 status current

### **Optimize Fees**
- **Platform fee**: 12% (goes to ROAM)
- **Stripe processing**: 2.9% + $0.30 (per transaction)
- **Instant payout**: 1.5% (only if you choose instant)
- **Standard payout**: FREE (always use unless urgent)

---

## 🆘 Troubleshooting

### **Problem: Balance shows $0 but I have bookings**

**Solution:** Check **Pending Balance**. Money takes 2-7 days to become available after a booking.

---

### **Problem: Can't request payout**

**Possible Causes:**
1. Balance is $0 → Wait for pending to clear
2. Payouts not enabled → Complete Stripe verification
3. No bank account → Connect bank in Settings

---

### **Problem: "Insufficient balance" error**

**Solution:** You're trying to withdraw more than your **Available Balance**. Check the green card at the top for exact amount.

---

### **Problem: Dashboard link says "expired"**

**Solution:** Links expire after 5 minutes for security. Just click the button again to get a fresh link!

---

### **Problem: 1099 form not available**

**Possible Causes:**
1. Haven't earned $600 yet → Check YTD earnings
2. It's not January yet → Forms available by Jan 31
3. Wrong tax info → Update in Settings tab

---

## 📊 Understanding Your Money Flow

```
Customer Books Service
         ↓
Payment Collected (Stripe)
         ↓
Platform Fee (12%) Deducted
Stripe Fee (2.9% + $0.30) Deducted
         ↓
Net Amount → Pending Balance (2-7 days)
         ↓
Moves to → Available Balance
         ↓
You Request Payout OR Auto Payout
         ↓
Money Sent to Your Bank
         ↓
Arrives in 30 min (instant) or 2 days (standard)
         ↓
💰 In Your Bank Account!
```

---

## 🎯 Quick Reference

| Action | Location | Time |
|--------|----------|------|
| Request Payout | Quick Actions | Instant |
| Check Balance | Top Cards | Real-time |
| View History | Payouts Tab | All Time |
| Update Bank | Settings → Bank | 2 minutes |
| Update Tax Info | Settings → Tax | 5 minutes |
| Download 1099 | Stripe Dashboard | Jan 31+ |
| Check Schedule | Quick Actions | Instant |
| See Trends | Overview Tab | Customizable |

---

## 🎨 Visual Legend

**Colors Mean:**
- 💚 **Green** = Money in/available/good
- 🔵 **Blue** = Neutral/processing
- 🟡 **Yellow** = Pending/warning
- 🔴 **Red** = Out/refund/error
- 🟣 **Purple** = Analytics/metrics

**Icons Mean:**
- ✓ = Completed/verified
- 🕐 = Processing/pending
- 💰 = Money/earnings
- 📊 = Analytics/reports
- ⚙️ = Settings/configuration
- 🏦 = Bank/payout
- 📋 = Document/tax

---

## 📞 Need Help?

**In-App:**
- Check Settings → Help & Resources
- Open Stripe Dashboard for detailed info

**Contact Support:**
- Email: support@roam.com
- Live Chat: Click chat icon
- Phone: 1-800-ROAM-HELP

**Self-Service:**
- All actions are instant
- No approval needed
- Full self-service control

---

**Your money, your control, your way! 💪**

