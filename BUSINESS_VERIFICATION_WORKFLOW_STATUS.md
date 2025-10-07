# Business Verification & Approval Workflow - Status Check

**Date**: October 6, 2025  
**Priority**: 🔴 High - Core Business Feature

---

## 📋 Workflow Overview

### Phase 1: Business Onboarding (Provider App)
1. **Step 1**: Account Creation (email, password, name)
2. **Step 2**: Business Information (name, type, contact, etc.)
3. **Step 3**: Document Upload (licenses, certificates, etc.)
4. **Step 4**: Application Review & Submit
5. **Status**: Application submitted → `verification_status = 'under_review'`

### Admin Review (Admin App)
1. Admin reviews business information
2. Admin reviews & verifies each document
3. Admin approves or rejects business
4. **On Approval**: Send email with Phase 2 secure link via Resend

### Phase 2: Business Setup (Provider App)
1. Business clicks secure link from email
2. Complete Phase 2 setup steps:
   - Welcome/Overview
   - Business Profile Details
   - Personal Profile
   - Business Hours
   - Staff Management
   - Banking/Payout Setup (Stripe Connect)
   - Service Selection
   - Service Pricing
   - Go Live Review

---

## ✅ What's Already Built

### Provider App - Phase 1 Onboarding
- [x] Signup flow (4 steps)
- [x] Business information collection
- [x] Document upload system
- [x] Application submission
- [x] Status tracking (under_review, submitted)
- [x] API: `/api/onboarding/submit-application.ts`

### Admin App - Verification System
- [x] **AdminVerification Page** (`roam-admin-app/client/pages/AdminVerification.tsx`)
  - Business list with filtering
  - Document viewing & verification
  - Individual document actions (verify/reject/review)
  - Business-level actions (approve/reject/suspend)
  - Rejection modal with reason
  - Full document review modal
- [x] **Business document verification UI**
- [x] **Document status badges** (pending, verified, rejected, under_review)
- [x] **Priority system** (normal, high, urgent)
- [x] **Stats dashboard** (total, pending, approved, rejected, overdue)

### Email System
- [x] **Resend Integration** configured
- [x] **EmailService** class in provider app
- [x] **send-approval-email.ts** API route in admin app
  - Generates Phase 2 secure token (JWT)
  - Creates Phase 2 link with token
  - Sends email via Resend
  - Professional HTML email template
- [x] Email templates:
  - Application submitted confirmation
  - Application approved (with Phase 2 link)
  - Application rejected

### Provider App - Phase 2 Setup
- [x] **Phase 2 entry page** (`/provider-onboarding/phase2?token=xxx`)
- [x] **Token validation** API route
- [x] **Phase 2 step components**:
  - Welcome
  - Business Profile
  - Personal Profile
  - Business Hours
  - Staff Management
  - Banking/Payout
  - Service Selection
  - Pricing
  - Go Live
- [x] **Progress tracking** table (`business_setup_progress`)

### Database
- [x] `business_profiles` table with verification fields
- [x] `business_documents` table
- [x] `business_setup_progress` table
- [x] `provider_applications` table
- [x] Enum types for statuses

---

## ⚠️ What Needs to Be Completed/Fixed

### 1. Admin Approval Flow Integration 🔴 CRITICAL

**Issue**: The approval email sending may not be fully integrated or working correctly.

**Files to Check/Fix**:
```
roam-admin-app/client/pages/AdminVerification.tsx (lines 760-880)
roam-admin-app/server/routes/send-approval-email.ts
roam-admin-app/server/services/tokenService.ts
```

**What to Verify**:
- [ ] When admin clicks "Approve Business", does it:
  - [ ] Update `business_profiles.verification_status = 'approved'`?
  - [ ] Set `approved_at` and `approved_by` fields?
  - [ ] Call the email API endpoint correctly?
  - [ ] Generate valid Phase 2 token?
  - [ ] Send email via Resend successfully?
  - [ ] Show success/error toast to admin?

**Code Location** (AdminVerification.tsx):
```typescript
// Around line 790-850
const handleVerificationAction = async (
  businessId: string,
  action: "approve" | "reject" | "suspend" | "pending",
  notes?: string,
) => {
  // ... updates business_profiles ...
  
  // Send approval email if business was approved
  if (action === "approve") {
    try {
      // Email sending logic
      const response = await fetch("/api/send-approval-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emailPayload),
      });
      // ... handle response ...
    } catch (emailError) {
      // Error handling
    }
  }
}
```

### 2. Environment Variables Check 🟡 IMPORTANT

**Required in Admin App** (`.env` or Vercel):
```bash
RESEND_API_KEY=re_...
JWT_SECRET=your-secret-key-here
PHASE2_TOKEN_EXPIRATION=7d
```

**Check**:
- [ ] Are these variables set in `roam-admin-app/.env`?
- [ ] Is `RESEND_API_KEY` valid (not the test key)?
- [ ] Is `JWT_SECRET` a secure random string?

### 3. Token Service Implementation 🟡 IMPORTANT

**File**: `roam-admin-app/server/services/tokenService.ts`

**Should Include**:
```typescript
import jwt from 'jsonwebtoken';

export class TokenService {
  static generatePhase2Token(businessId: string, userId: string, applicationId: string) {
    const payload = {
      business_id: businessId,
      user_id: userId,
      application_id: applicationId,
      phase: "phase2",
      issued_at: Date.now(),
      expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
    };
    
    return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' });
  }
  
  static generatePhase2URL(businessId: string, userId: string) {
    const token = this.generatePhase2Token(businessId, userId, businessId);
    const baseUrl = process.env.PROVIDER_APP_URL || 'http://localhost:5177';
    return `${baseUrl}/provider-onboarding/phase2?token=${token}`;
  }
  
  static getTokenExpirationDate() {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }
  
  static verifyPhase2Token(token: string) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!);
      return { valid: true, payload: decoded };
    } catch (error) {
      return { valid: false, error: 'Invalid or expired token' };
    }
  }
}
```

**Check**:
- [ ] Does file exist?
- [ ] Are all methods implemented?
- [ ] Does it use `jsonwebtoken` package?
- [ ] Is error handling in place?

### 4. Provider App Token Validation 🟡 IMPORTANT

**File**: `roam-admin-app/server/routes/validate-phase2-token.ts`

**Should Validate**:
- [ ] Token signature
- [ ] Token expiration
- [ ] Business exists
- [ ] Business is approved (`verification_status = 'approved'`)
- [ ] Business hasn't completed Phase 2 yet

**Returns**:
- `{ valid: true, business_id, user_id, ... }` OR
- `{ valid: false, error: '...' }`

### 5. Email Template Verification 🟢 NICE TO HAVE

**File**: `roam-admin-app/server/routes/send-approval-email.ts`

**Email Should Include**:
- [x] Business name
- [x] Congratulations message
- [x] Phase 2 link (button)
- [x] Link expiration notice (7 days)
- [x] What to expect in Phase 2
- [x] Support contact info
- [x] Professional ROAM branding

**Check**:
- [ ] Does email render correctly?
- [ ] Is link clickable?
- [ ] Does it look good on mobile?

### 6. Phase 2 Entry Point 🟡 IMPORTANT

**File**: `roam-provider-app/client/pages/onboarding/ProviderOnboardingPhase2.tsx`

**Should**:
- [ ] Extract token from URL query params
- [ ] Validate token via API
- [ ] Show loading state during validation
- [ ] Handle expired token error
- [ ] Handle invalid token error
- [ ] Redirect to Phase 2 flow if valid
- [ ] Store business_id and user_id in state/context

### 7. Testing Checklist 🔴 CRITICAL

**Manual Testing Steps**:
1. [ ] Create test business in provider app
2. [ ] Submit application
3. [ ] Log in to admin app
4. [ ] Navigate to AdminVerification page
5. [ ] Find pending business
6. [ ] Verify all documents
7. [ ] Click "Approve Business"
8. [ ] Check toast notification
9. [ ] Check database: `verification_status = 'approved'`
10. [ ] Check email inbox (use real email or Resend logs)
11. [ ] Click Phase 2 link in email
12. [ ] Verify token validation works
13. [ ] Complete Phase 2 flow

---

## 🐛 Known Issues

### Issue 1: Email Not Sending
**Symptom**: Admin approves business, but no email is sent  
**Possible Causes**:
- Missing `RESEND_API_KEY`
- API key not authorized (using test key)
- Email endpoint not returning 200
- Network error catching approval before email

**Debug**:
```bash
# Check admin app server logs
cd roam-admin-app
npm run dev

# Look for:
# "=== SENDING EMAIL VIA RESEND ==="
# "Approval email sent successfully"
# OR
# "Failed to send approval email"
```

### Issue 2: Token Validation Failing
**Symptom**: Phase 2 link shows "Invalid token" error  
**Possible Causes**:
- `JWT_SECRET` mismatch between apps
- Token expired
- Business not approved in database
- Token format incorrect

**Debug**:
```typescript
// Add to validate-phase2-token.ts
console.log("Token received:", token);
console.log("Token decoded:", jwt.decode(token));
console.log("JWT_SECRET present:", !!process.env.JWT_SECRET);
```

### Issue 3: Business Status Not Updating
**Symptom**: Admin clicks approve, but business stays "pending"  
**Possible Causes**:
- Supabase RLS policy blocking update
- Admin user not authorized
- Incorrect businessId
- Database connection error

**Debug**:
```typescript
// In AdminVerification.tsx handleVerificationAction
console.log("Updating business:", businessId);
console.log("Update data:", updateData);
console.log("Supabase error:", error);
```

---

## 🔧 Quick Fix Priority

### Priority 1 (Must Fix Now) 🔴
1. **Verify TokenService exists and works**
2. **Test admin approval flow end-to-end**
3. **Confirm email sending via Resend**
4. **Test Phase 2 token validation**

### Priority 2 (Fix Soon) 🟡
1. Error handling improvements
2. Toast notifications consistency
3. Email template testing on mobile
4. Add retry logic for email failures

### Priority 3 (Nice to Have) 🟢
1. Email delivery tracking
2. Resend webhook for bounces
3. Admin notification when email fails
4. Phase 2 completion tracking

---

## 📝 Implementation Checklist

### Step 1: Verify TokenService
- [ ] Check if `roam-admin-app/server/services/tokenService.ts` exists
- [ ] If not, create it with JWT implementation
- [ ] Add `jsonwebtoken` to admin app dependencies
- [ ] Set `JWT_SECRET` in admin app `.env`

### Step 2: Test Email Sending
- [ ] Set valid `RESEND_API_KEY` in admin app
- [ ] Test `/api/send-approval-email` endpoint directly (Postman/curl)
- [ ] Verify email arrives in inbox
- [ ] Check Resend dashboard for delivery logs

### Step 3: Test Admin Approval Flow
- [ ] Create test business in provider app
- [ ] Submit application
- [ ] Approve in admin app
- [ ] Verify database update
- [ ] Verify email sent
- [ ] Check email content

### Step 4: Test Phase 2 Entry
- [ ] Click Phase 2 link from email
- [ ] Verify token validation works
- [ ] Check business_id and user_id extracted correctly
- [ ] Verify Phase 2 flow loads

### Step 5: End-to-End Test
- [ ] Complete full workflow from signup to Phase 2
- [ ] Test with multiple businesses
- [ ] Test rejection flow
- [ ] Test expired token handling

---

## 🚀 Next Steps

**Immediate Actions**:
1. Check if TokenService file exists
2. Verify environment variables are set
3. Test email sending manually
4. Run end-to-end test

**Commands to Run**:
```bash
# 1. Check if TokenService exists
ls -la roam-admin-app/server/services/tokenService.ts

# 2. Check environment variables
cat roam-admin-app/.env | grep -E "RESEND|JWT"

# 3. Start admin app
cd roam-admin-app && npm run dev

# 4. Test email endpoint
curl -X POST http://localhost:3001/api/send-approval-email \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "Test Business",
    "contactEmail": "test@example.com",
    "businessId": "test-id",
    "userId": "test-user-id"
  }'
```

---

**Status**: Ready for testing and fixes  
**Estimated Time**: 2-4 hours to complete and test

Would you like me to start by checking which parts are missing or need fixes?
