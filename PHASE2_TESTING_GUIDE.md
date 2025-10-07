# Phase 2 Onboarding Testing Guide

## Overview
Phase 2 onboarding is the post-approval setup process where providers complete their business profile, personal profile, and configure their services.

## Testing Access

### Option 1: Phase 2 Test Page (Recommended)
**URL:** `http://localhost:3001/phase2-test`

This dedicated test page allows you to:
- Test each Phase 2 step individually
- Navigate between steps freely
- Uses test business ID: `7a79ba40-cc67-47a4-b9bf-776335c9ea9e` (Cary's Care Wash)

### Option 2: Full Phase 2 Flow with Test Mode
**URL:** `http://localhost:3001/provider-onboarding/phase2/entry?test=true`

This simulates the real Phase 2 entry point with:
- Token validation bypass (test mode)
- Sequential step progression
- Session storage management

### Option 3: Direct Phase 2 Access
**URL:** `http://localhost:3001/provider-onboarding/phase2/entry?direct=true`

Direct access mode for development testing.

---

## Phase 2 Steps

**Note:** Staff Management has been removed from Phase 2 onboarding. Staff can be added post-onboarding via the Provider Dashboard.

### 1. Welcome Back
- **Component:** `WelcomeBackStep`
- **Purpose:** Greet approved provider and show Phase 2 overview
- **What to Test:**
  - Business name displays correctly
  - Progress overview shows 5 setup steps (not 6)
  - Continue button navigates to Business Profile

### 2. Business Profile Setup
- **Component:** `BusinessProfileSetup`
- **Purpose:** Upload business logo, cover image, and refine business info
- **What to Test:**
  - ✅ Logo upload (max 5MB, square recommended)
  - ✅ Cover image upload (max 5MB, 16:9 recommended)
  - ✅ Business category refinement
  - ✅ Detailed business description
  - ✅ Website URL (optional)
  - ✅ Social media links (optional)
  - ✅ Data saves to database
  - ✅ Images upload to Supabase storage
  - ✅ Progress persists on refresh

### 3. Personal Profile Setup
- **Component:** `PersonalProfileSetup`
- **Purpose:** Provider's personal professional profile
- **What to Test:**
  - ✅ Avatar photo upload
  - ✅ Professional title
  - ✅ Professional bio
  - ✅ Years of experience
  - ✅ Specialties (multi-select)
  - ✅ Certifications (add/remove)
  - ✅ Education (add/remove)
  - ✅ Awards (add/remove)
  - ✅ Social links (LinkedIn, Twitter, Instagram, Website)
  - ✅ Data validation
  - ✅ Save progress

### 4. Business Hours Setup
- **Component:** `BusinessHoursSetup`
- **Purpose:** Set operating hours for each day of the week
- **What to Test:**
  - ✅ Toggle open/closed for each day
  - ✅ Set opening and closing times
  - ✅ Copy hours to multiple days
  - ✅ Quick presets (weekdays, weekends, 24/7)
  - ✅ Validation (closing time after opening time)
  - ✅ Save to database
  - ✅ Timezone handling

### 5. Banking & Payout Setup
- **Component:** `BankingPayoutSetup`
- **Purpose:** Connect payment processing (Stripe Connect & Plaid)
- **What to Test:**
  - ✅ Stripe Connect flow
  - ✅ Stripe Identity Verification
  - ✅ Plaid bank connection
  - ✅ Payout schedule configuration
  - ✅ Tax information collection
  - ✅ Account verification status
  - ⚠️ **Note:** Requires Stripe test keys

### 6. Service Pricing Setup
- **Component:** `ServicePricingSetup`
- **Purpose:** Configure services, pricing, and add-ons
- **What to Test:**
  - ✅ View eligible services (based on business category)
  - ✅ Enable/disable services
  - ✅ Set pricing (fixed or range)
  - ✅ Set duration
  - ✅ Configure add-ons
  - ✅ Map add-ons to services
  - ✅ Set tax rate
  - ✅ Cancellation policy
  - ✅ Delivery types (mobile, in-shop, both)
  - ✅ Save configuration

### 7. Final Review
- **Component:** `FinalReviewSetup`
- **Purpose:** Review all Phase 2 data and go live
- **What to Test:**
  - ✅ Summary of all completed steps
  - ✅ Completion percentage
  - ✅ Edit individual sections
  - ✅ Complete setup button
  - ✅ Redirect to provider dashboard
  - ✅ Business status set to "active"

---

## Test Scenarios

### Scenario 1: Complete Fresh Phase 2
1. Navigate to `/phase2-test`
2. Click through all steps from overview
3. Complete each step with valid data
4. Verify data saves between steps
5. Complete Final Review
6. Verify redirect to dashboard

### Scenario 2: Resume Incomplete Phase 2
1. Complete steps 1-3
2. Close browser/refresh page
3. Return to Phase 2 entry
4. Verify it resumes at step 4
5. Complete remaining steps

### Scenario 3: Independent Business Flow
1. Set business type to "independent"
2. Complete steps 1-3 (Business Hours)
3. Verify Staff Management is skipped
4. Continue to Banking & Payout

### Scenario 4: Image Upload Testing
1. Test logo upload (various formats: JPG, PNG, WebP)
2. Test file size limits (max 5MB)
3. Test image preview
4. Test image deletion
5. Verify images persist after save

### Scenario 5: Error Handling
1. Try invalid data (empty required fields)
2. Try invalid URLs
3. Test network errors (disable network, try to save)
4. Verify error messages display correctly
5. Verify data doesn't corrupt on error

---

## Database Verification

After testing, verify data in Supabase:

### Tables to Check
1. **businesses** - Business profile data, logo_url, cover_image_url
2. **business_providers** - Personal profile, avatar_url
3. **business_hours** - Operating hours
4. **business_staff** - Staff members (if applicable)
5. **business_services** - Enabled services with pricing
6. **business_addons** - Configured add-ons
7. **stripe_accounts** - Stripe Connect status
8. **plaid_accounts** - Bank connection status

### Storage Buckets
1. **business-logos** - Business logo images
2. **business-covers** - Business cover images  
3. **provider-avatars** - Personal profile photos

---

## Known Issues & Limitations

### Current Limitations
- Stripe Connect requires test API keys to be configured
- Plaid requires sandbox credentials
- Email notifications may not work in local development
- Some social media validations are basic

### Testing Tips
1. Use browser DevTools Network tab to monitor API calls
2. Check browser Console for errors
3. Use Supabase dashboard to verify database updates
4. Test on different browsers (Chrome, Firefox, Safari)
5. Test mobile responsive design

---

## Quick Start Commands

```bash
# Start provider app (if not running)
cd roam-provider-app
npm run dev

# Access test pages
open http://localhost:3001/phase2-test
open http://localhost:3001/provider-onboarding/phase2/entry?test=true
open http://localhost:3001/provider-onboarding/phase2/entry?direct=true
```

---

## Test Data Reference

**Test Business:**
- Business ID: `7a79ba40-cc67-47a4-b9bf-776335c9ea9e`
- Business Name: Cary's Care Wash
- User ID: `7a79ba40-cc67-47a4-b9bf-776335c9ea9e`
- Status: Approved & Ready for Phase 2

**Sample Test Data:**
- Professional Title: "Car Wash Specialist"
- Years Experience: 5
- Specialties: Car Washing, Detailing, Waxing
- Business Hours: M-F 9AM-5PM, Closed weekends

---

## Success Criteria

Phase 2 testing is successful when:
- ✅ All 8 steps can be completed without errors
- ✅ Data persists correctly in database
- ✅ Images upload and display correctly
- ✅ Progress can be saved and resumed
- ✅ Validation works as expected
- ✅ Navigation between steps is smooth
- ✅ Final Review shows complete summary
- ✅ Business becomes "active" after completion
- ✅ Provider can access dashboard after Phase 2

---

## Next Steps After Testing

1. Document any bugs found
2. Test edge cases and error scenarios
3. Verify mobile responsiveness
4. Test with real business data
5. Prepare for production deployment

---

**Last Updated:** October 7, 2025
**Testing Status:** Ready for comprehensive testing

