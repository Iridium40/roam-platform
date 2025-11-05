# ROAM Platform - Stripe Integration Improvements
## Implementation Plan

**Status:** Approved by stakeholder
**Start Date:** November 5, 2025
**Priority:** High

---

## 🎯 Approved Changes

### 1. ✅ Stripe Tax - Platform Responsibility
**Decision:** ROAM Platform handles all tax calculation, collection, and remittance

### 2. ✅ Stripe Identity - Split Phase 1 into Two Steps
**Decision:** 
- Step 3a: Personal Identity Verification (Stripe Identity - Automated)
- Step 3b: Business Document Verification (Manual Upload - Admin Review)

### 3. ✅ Phase 2 Banking - Simplify & Add Account Detection
**Decision:** Check for existing Stripe accounts, link if available, simplify redirect flow

---

## 📋 Implementation Tasks

### TASK 1: Split Phase 1 Document Upload (Priority: HIGH)
**Estimated Time:** 4-6 hours

#### Current Flow (Phase 1)
```
Step 1: Welcome
Step 2: Business Information  
Step 3: Document Upload (ALL documents together)
Step 4: Submit Application
```

#### New Flow (Phase 1)
```
Step 1: Welcome
Step 2: Business Information
Step 3a: Identity Verification (NEW - Stripe Identity)
   → Driver's License verification
   → Proof of Address verification
   → Biometric face match
   → Instant automated approval
Step 3b: Business Documents (MODIFIED - Manual Upload)
   → Liability Insurance
   → Professional License/Certification
   → Business License
   → Manual admin review required
Step 4: Submit Application
```

#### Files to Modify:
- [ ] `roam-provider-app/client/pages/onboarding/ProviderOnboarding.tsx`
  - Add new step "identity_verification" after business_info
  - Add new step "business_documents" after identity_verification
  - Update progress calculation (now 5 steps instead of 4)

- [ ] `roam-provider-app/client/components/DocumentUploadForm.tsx`
  - Remove: drivers_license, proof_of_address
  - Keep: liability_insurance, professional_license, business_license
  - Update required documents logic
  - Update UI messaging

- [ ] Create: `roam-provider-app/client/components/StripeIdentityVerification.tsx`
  - Already exists! Just need to integrate into Phase 1
  - Add clear messaging about what's being verified
  - Handle success/failure states
  - Store verification session ID in database

- [ ] `roam-provider-app/api/onboarding/submit-application.ts`
  - Check for identity_verification_status
  - Require both identity AND business docs to be complete

#### Database Changes:
```sql
-- Add identity verification fields to business_profiles
ALTER TABLE business_profiles 
ADD COLUMN identity_verification_session_id TEXT,
ADD COLUMN identity_verification_status TEXT CHECK (status IN ('pending', 'verified', 'failed', 'requires_input')),
ADD COLUMN identity_verified_at TIMESTAMPTZ;

-- Update document requirements
-- drivers_license and proof_of_address will be handled by Stripe Identity
```

---

### TASK 2: Enable Stripe Tax (Priority: HIGH)
**Estimated Time:** 2-3 hours

#### Changes Required:

1. **Enable in Stripe Dashboard:**
   - [ ] Navigate to Stripe Dashboard → Settings → Tax
   - [ ] Enable automatic tax calculation
   - [ ] Register ROAM Platform business in operating states
   - [ ] Configure tax collection settings

2. **Update Checkout Session Creation:**
   - [ ] `roam-customer-app/api/stripe/create-checkout-session.ts`
     ```typescript
     // Line 198-201: Currently disabled
     // CHANGE TO:
     automatic_tax: {
       enabled: true,
       liability: {
         type: 'self'  // ROAM Platform is responsible
       }
     }
     ```

3. **Update Payment Intent Creation:**
   - [ ] `roam-customer-app/api/stripe/create-payment-intent.ts`
     ```typescript
     // Add automatic tax calculation
     automatic_tax: {
       enabled: true
     }
     ```

4. **Update Financial Calculations:**
   - [ ] Tax is now separate from service amount
   - [ ] Provider receives their share BEFORE tax
   - [ ] Platform keeps: fee + tax collected
   - [ ] Update payment split logic in webhook

5. **Update Provider Policy:**
   - [ ] `roam-provider-app/client/lib/legal/provider-policy-content.ts`
   - [ ] Update Section 4.7 Tax Responsibilities
   - [ ] Clarify that ROAM handles sales tax, providers handle income tax

#### Example Updated Flow:
```
Service Price: $100.00
Sales Tax (calculated by Stripe): $8.00
Total Customer Pays: $108.00

Platform receives: $108.00
├─ Service amount: $100.00
│  ├─ Platform fee (12%): $12.00
│  └─ Provider payment: $88.00
└─ Sales Tax: $8.00 (remitted to state)

Provider receives: $88.00 (no tax responsibility)
```

---

### TASK 3: Simplify Phase 2 Banking Flow (Priority: HIGH)
**Estimated Time:** 6-8 hours

#### Current Flow:
```
1. Tax Info Form (manual entry)
2. Create Stripe account API call
3. Redirect to Stripe hosted onboarding
4. User re-enters same information
```

#### New Flow:
```
1. Tax Info Form (still needed for ROAM records)
2. Check if Stripe account exists
   ├─ YES → Offer to link existing account
   └─ NO → Create account with tax info (pre-filled)
3. Immediate redirect to Stripe hosted onboarding (all fields pre-filled)
4. Return and mark complete
```

#### Files to Create:
- [ ] `roam-provider-app/api/stripe/check-existing-account.ts`
  ```typescript
  // Check database for existing stripe_connect_accounts
  // Search Stripe API for accounts with matching email
  // Return status: 'found', 'not_found', 'multiple'
  ```

- [ ] `roam-provider-app/api/stripe/link-existing-account.ts`
  ```typescript
  // Link existing Stripe account to business
  // Verify ownership
  // Store in stripe_connect_accounts table
  ```

- [ ] `roam-provider-app/client/components/Phase2Components/StripeAccountConnector.tsx`
  ```typescript
  // Smart component that:
  // 1. Checks for existing account
  // 2. Shows "Link" or "Create" options
  // 3. Handles both flows
  ```

#### Files to Modify:
- [ ] `roam-provider-app/client/components/Phase2Components/BankingPayoutSetup.tsx`
  - Remove redundant StripeConnectSetup form
  - Replace with new StripeAccountConnector
  - Simplify to: Tax Info → Stripe Redirect

- [ ] `roam-provider-app/api/stripe/create-connect-account.ts`
  - Add pre-filling from tax info
  - Add better error handling for duplicate accounts
  - Return more detailed account status

#### User Experience Improvements:
```
┌────────────────────────────────────────┐
│  Banking & Payouts Setup               │
├────────────────────────────────────────┤
│                                        │
│  Step 1: Tax Information ✓             │
│  Your business tax info has been saved │
│                                        │
│  Step 2: Connect Stripe Account        │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │ ✓ Existing Account Found!        │ │
│  │                                   │ │
│  │ Email: provider@example.com      │ │
│  │ Status: Ready for payments       │ │
│  │                                   │ │
│  │ [Link This Account]  [Create New]│ │
│  └──────────────────────────────────┘ │
│                                        │
│  OR                                    │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │ No existing account found         │ │
│  │                                   │ │
│  │ We'll create a Stripe account     │ │
│  │ pre-filled with your tax info     │ │
│  │                                   │ │
│  │ [Continue to Stripe Setup →]     │ │
│  └──────────────────────────────────┘ │
└────────────────────────────────────────┘
```

---

### TASK 4: Add Stripe Identity to Phase 1 (Priority: MEDIUM)
**Estimated Time:** 4-6 hours

#### Integration Steps:

1. **Update Onboarding Flow:**
   ```typescript
   // ProviderOnboarding.tsx
   case "identity_verification":
     return (
       <StripeIdentityVerification
         userId={onboardingState.userId}
         businessId={onboardingState.businessId}
         onVerificationComplete={(result) => {
           // Save verification status
           saveIdentityVerification(result);
           // Move to business documents
           handleStepComplete("business_documents");
         }}
         onVerificationFailed={(error) => {
           // Allow manual document upload as fallback
           setShowManualFallback(true);
         }}
       />
     );
   ```

2. **Create API Endpoint:**
   - [ ] `roam-provider-app/api/stripe/create-identity-verification-session.ts`
   - [ ] `roam-provider-app/api/stripe/check-identity-verification-status.ts`

3. **Update Database:**
   ```sql
   -- Store verification results
   ALTER TABLE business_profiles
   ADD COLUMN identity_verification_id TEXT,
   ADD COLUMN identity_verified BOOLEAN DEFAULT FALSE,
   ADD COLUMN identity_verification_data JSONB;
   ```

4. **Update Admin Dashboard:**
   - [ ] Show identity verification status
   - [ ] Display verification results from Stripe
   - [ ] Only show business docs for manual review

---

## 🗓️ Implementation Schedule

### Week 1 (November 5-8)
- [ ] **Day 1-2:** Task 1 - Split Phase 1 Document Upload
- [ ] **Day 3:** Task 2 - Enable Stripe Tax
- [ ] **Day 4:** Testing & Bug Fixes

### Week 2 (November 11-15)
- [ ] **Day 1-3:** Task 3 - Simplify Phase 2 Banking
- [ ] **Day 4:** Task 4 - Stripe Identity Integration
- [ ] **Day 5:** End-to-end testing

### Week 3 (November 18-22)
- [ ] User acceptance testing
- [ ] Documentation updates
- [ ] Production deployment

---

## 📊 Success Metrics

### Before Implementation:
- Manual review time: ~30 min per application
- Phase 1 completion rate: ~65%
- Phase 2 banking setup errors: ~15%
- Tax compliance: Manual process

### After Implementation (Expected):
- Manual review time: ~5 min per application (83% reduction)
- Phase 1 completion rate: ~85% (20% increase)
- Phase 2 banking setup errors: ~2% (87% reduction)
- Tax compliance: Automated via Stripe

---

## 🚀 Ready to Start?

Shall I begin with Task 1 (Split Phase 1 Document Upload) since it's the highest priority and will provide immediate value?

The order I recommend:
1. **Split Phase 1** (immediate UX improvement)
2. **Enable Stripe Tax** (quick compliance win)
3. **Simplify Phase 2 Banking** (addresses your current pain point)
4. **Add Stripe Identity** (completes the automation)

