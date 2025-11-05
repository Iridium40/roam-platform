# Stripe Tax Setup Guide
## ROAM Platform - Sales Tax Automation

**Date:** November 5, 2025  
**Status:** ✅ Code changes complete - Dashboard configuration required

---

## 📋 What Changed

### Code Updates (✅ COMPLETED)

1. **Customer Checkout Session** (`roam-customer-app/api/stripe/create-checkout-session.ts`)
   - ✅ Enabled `automatic_tax` with platform liability
   - Tax now calculated automatically at checkout

2. **Payment Intent Creation** (`roam-customer-app/api/stripe/create-payment-intent.ts`)
   - ✅ Enabled `automatic_tax` with platform liability
   - Tax calculated for direct payment flows

3. **Provider Policy** (`roam-provider-app/client/lib/legal/provider-policy-content.ts`)
   - ✅ Updated Section 4.4 - Payment Breakdown (now shows tax)
   - ✅ Updated Section 4.7 - Tax Responsibilities (clarified sales vs income tax)

---

## 🔧 Manual Configuration Required

### Step 1: Enable Stripe Tax in Dashboard

1. **Log into Stripe Dashboard:**
   - Go to [https://dashboard.stripe.com](https://dashboard.stripe.com)
   - Make sure you're in **TEST MODE** first for testing

2. **Navigate to Tax Settings:**
   ```
   Stripe Dashboard → Settings (top right gear icon) → Tax
   ```

3. **Enable Stripe Tax:**
   - Click **"Enable Tax"** or **"Turn on Tax"**
   - Accept Stripe Tax terms of service

4. **Choose Tax Calculation Mode:**
   - Select **"Automatic tax calculation"**
   - This allows Stripe to calculate tax based on customer location

### Step 2: Register Your Business

1. **Add Business Information:**
   ```
   Tax Settings → Business locations → Add location
   ```

2. **Enter ROAM Platform Details:**
   - Business legal name: **[Your legal entity name]**
   - Business address: **[Your registered business address]**
   - Tax ID (EIN): **[Your EIN]**
   - Business type: **Platform/Marketplace**

3. **Register in States Where You Operate:**
   - Click **"Register for tax collection"**
   - Select states where you have **nexus** (economic presence)
   - Common nexus triggers:
     - Physical presence (office, employees)
     - Economic nexus (~$100k in sales per state)
     - Marketplace facilitator laws

   **Recommended Initial States:**
   - ✅ Your home state (where business is registered)
   - ✅ States with significant provider/customer volume
   - ✅ States with marketplace facilitator laws

### Step 3: Configure Tax Settings

1. **Set Product Tax Codes:**
   ```
   Tax Settings → Product tax codes
   ```
   - Default code: **`txcd_10000000`** (General services)
   - Or more specific: **`txcd_20030000`** (Personal care services)

2. **Configure Tax Behavior:**
   - ✅ **Inclusive vs Exclusive:** Select **"Exclusive"** (tax added on top)
   - ✅ **Tax Display:** Show tax as separate line item
   - ✅ **Rounding:** Use Stripe's default (standard rounding)

3. **Set Filing Preferences:**
   ```
   Tax Settings → Tax filing
   ```
   - **Option A: Stripe Tax Autopilot (Recommended)**
     - Stripe automatically files and remits taxes
     - Cost: ~1% of taxable transactions
     - Best for: Marketplace platforms with multi-state complexity
   
   - **Option B: Manual Filing**
     - Stripe calculates and collects only
     - You file and remit manually
     - Best for: Single state operations or existing tax infrastructure

### Step 4: Test in Test Mode

1. **Use Test Credit Cards:**
   - Card: `4242 4242 4242 4242`
   - Any future expiration date
   - Any CVC

2. **Test Different Tax Scenarios:**

   **Test Case 1: California Address (High Tax)**
   ```
   Address: 123 Main St
   City: Los Angeles
   State: CA
   ZIP: 90001
   Expected: ~9.5% tax
   ```

   **Test Case 2: Oregon Address (No Sales Tax)**
   ```
   Address: 456 Oak Ave
   City: Portland
   State: OR
   ZIP: 97201
   Expected: 0% tax
   ```

   **Test Case 3: New York Address**
   ```
   Address: 789 Broadway
   City: New York
   City: NY
   ZIP: 10012
   Expected: ~8.875% tax
   ```

3. **Verify Tax Calculation:**
   - Go to: `Stripe Dashboard → Payments` (in test mode)
   - Check recent test charges
   - Verify `tax` field is populated correctly
   - Check `amount` vs `amount_total` (should include tax)

### Step 5: Switch to Production

1. **Toggle to Live Mode:**
   ```
   Stripe Dashboard → Toggle "Test mode" to OFF
   ```

2. **Repeat Configuration in Live Mode:**
   - ⚠️ **Important:** Test mode and Live mode have separate configurations
   - Enable Stripe Tax in Live mode
   - Re-enter business registration details
   - Register in required states
   - Configure same tax settings

3. **Verify Live Configuration:**
   - Make a small real transaction (refundable)
   - Check tax is calculated correctly
   - Refund the test transaction

---

## 💰 Cost Analysis

### Stripe Tax Pricing

| Service | Cost | Notes |
|---------|------|-------|
| **Tax Calculation** | FREE | Included with Stripe Tax |
| **Tax Collection** | FREE | Included with Stripe Tax |
| **Tax Reporting** | FREE | Dashboard reports included |
| **Autopilot (Auto-filing)** | ~1% of taxable amount | Optional but recommended |

### Example Cost Calculation

```
Monthly Transaction Volume: $50,000
Average Tax Collected: $4,000 (8% average rate)

If using Autopilot:
- Autopilot fee: $4,000 × 1% = $40/month
- Saves: ~$500/month in accounting/filing costs
- Net Savings: $460/month
```

**Recommendation:** Use Autopilot - it's worth it for compliance peace of mind.

---

## 📊 How Tax Flows Through Your Platform

### Previous Flow (Manual Tax)
```
Customer pays: $100 (service only)
Platform keeps: $12 (fee)
Provider gets: $88
Tax responsibility: Provider's problem ❌
```

### New Flow (Automatic Tax)
```
Customer pays: $108 ($100 service + $8 tax)
├─ Service amount: $100
│  ├─ Platform keeps: $12 (fee)
│  └─ Provider gets: $88
└─ Tax collected: $8 → Remitted to state by ROAM ✅

Tax responsibility: Platform handles it ✅
```

### Benefits

**For Providers:**
- ✅ No tax complexity
- ✅ Clean, simple payouts
- ✅ No state registrations needed
- ✅ No filing requirements

**For ROAM Platform:**
- ✅ Legal compliance
- ✅ Marketplace facilitator compliance
- ✅ Professional appearance
- ✅ Competitive advantage

**For Customers:**
- ✅ Accurate tax at checkout
- ✅ No surprises
- ✅ Professional experience
- ✅ Proper receipts/invoices

---

## 🧪 Testing Checklist

### Before Production Launch

- [ ] **Test Mode Configuration**
  - [ ] Stripe Tax enabled in test mode
  - [ ] Business information added
  - [ ] At least one state registered
  - [ ] Test transactions show correct tax

- [ ] **Code Verification**
  - [ ] Checkout sessions include automatic_tax
  - [ ] Payment intents include automatic_tax
  - [ ] Webhook handles tax amounts correctly
  - [ ] Provider dashboard shows correct amounts

- [ ] **Live Mode Configuration**
  - [ ] Stripe Tax enabled in live mode
  - [ ] Business information added (production)
  - [ ] All required states registered
  - [ ] Tax settings configured

- [ ] **Documentation**
  - [ ] Provider policy updated (completed ✅)
  - [ ] Provider onboarding shows tax info
  - [ ] Customer receipts show tax correctly
  - [ ] Support documentation updated

### Testing Script

```bash
# Test in development environment
1. Create a booking with $100 service
2. Enter test card: 4242 4242 4242 4242
3. Enter address in high-tax state (CA, NY)
4. Verify:
   - Checkout shows: Service $100 + Tax $8.50 = Total $108.50
   - Payment succeeds
   - Provider payment excludes tax (receives $88)
   - Tax is recorded separately in Stripe dashboard

5. Check Stripe Dashboard → Payments → [Recent charge]
   - amount: 10000 (service price in cents)
   - amount_total: 10850 (service + tax in cents)
   - tax: 850 (tax in cents)
   - tax_amounts: [{ amount: 850, rate: "txr_..." }]
```

---

## 🚨 Important Notes

### Nexus Requirements
- You must register in states where you have economic nexus
- Most states: $100,000 in sales or 200 transactions
- Marketplace facilitator laws may require registration even without nexus
- Consult with a tax professional for your specific situation

### Marketplace Facilitator Laws
- Many states require **marketplaces** to collect tax (not individual providers)
- By collecting tax at the platform level, you comply with these laws
- Providers are relieved of this burden

### Common Issues

**Issue: Tax not showing at checkout**
- Check: Is Stripe Tax enabled in the correct mode (test vs live)?
- Check: Is customer address in a registered state?
- Check: Is automatic_tax enabled in checkout session?

**Issue: Wrong tax amount**
- Check: Is business address correct in Stripe?
- Check: Is product tax code appropriate?
- Check: Is customer address valid?

**Issue: Tax not being filed**
- Check: Is Autopilot enabled?
- Check: Are state registrations complete?
- Check: Is bank account connected for remittance?

---

## 📞 Support Resources

### Stripe Documentation
- [Stripe Tax Overview](https://stripe.com/docs/tax)
- [Tax Calculation API](https://stripe.com/docs/tax/calculate)
- [Marketplace Tax Guide](https://stripe.com/docs/tax/platforms)

### ROAM Platform Support
- Engineering team: [your team contact]
- Tax questions: Consult with tax professional
- Stripe support: [https://support.stripe.com](https://support.stripe.com)

---

## ✅ Next Steps

1. **[Action Required]** Complete Stripe Dashboard configuration (Steps 1-5 above)
2. **[Action Required]** Test tax calculation in Test Mode
3. **[Optional]** Enable Autopilot for automatic filing
4. **[Action Required]** Switch to Live Mode and re-configure
5. **[Action Required]** Test with real transaction (then refund)
6. **[Ready]** Deploy code changes to production
7. **[Ready]** Monitor first week of tax collection

---

## 📝 Completion Checklist

- [x] Code changes implemented
- [x] Provider policy updated
- [ ] Stripe Dashboard configured (Test Mode)
- [ ] Test transactions verified
- [ ] Stripe Dashboard configured (Live Mode)
- [ ] Production test transaction
- [ ] Code deployed to production
- [ ] Team trained on new tax flow
- [ ] Customer-facing documentation updated
- [ ] Provider communication sent

---

**Questions?** Refer to the implementation plan or reach out to the development team.

