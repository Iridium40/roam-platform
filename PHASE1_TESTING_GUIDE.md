# Phase 1 Onboarding Testing Guide

## Overview
Phase 1 onboarding is the initial provider application process where new providers create accounts, provide business information, upload required documents, and submit their application for review.

## Testing Access

### Option 1: Direct Phase 1 Access (Recommended)
**URL:** `http://localhost:3001/provider-onboarding/phase1`

This is the main Phase 1 onboarding flow with:
- Complete user authentication flow
- Sequential step progression
- Real database integration
- Full validation and error handling

### Option 2: Phase 1 Test Mode
**URL:** `http://localhost:3001/provider-onboarding/phase1?test=true`

Test mode with:
- Bypass authentication for testing
- Test data pre-population
- Enhanced debugging information
- Skip email verification

### Option 3: Individual Step Testing
**URL:** `http://localhost:3001/provider-onboarding/phase1?step=signup`
**URL:** `http://localhost:3001/provider-onboarding/phase1?step=business_info`
**URL:** `http://localhost:3001/provider-onboarding/phase1?step=documents`
**URL:** `http://localhost:3001/provider-onboarding/phase1?step=review`

Direct access to specific steps for focused testing.

---

## Phase 1 Steps

### 1. Account Creation (Signup)
- **Component:** `ProviderSignupForm`
- **Purpose:** Create provider account with authentication
- **What to Test:**
  - ✅ Email validation (format, uniqueness)
  - ✅ Password requirements (8+ chars, complexity)
  - ✅ Password confirmation matching
  - ✅ Terms of service acceptance
  - ✅ Privacy policy acceptance
  - ✅ Account creation in Supabase Auth
  - ✅ Email verification sent
  - ✅ User session management
  - ✅ Error handling for duplicate emails
  - ✅ Form validation messages
  - ✅ Loading states during submission

### 2. Business Information
- **Component:** `BusinessInfoForm`
- **Purpose:** Collect business details and verification info
- **What to Test:**
  - ✅ Business name (required, 2-100 chars)
  - ✅ Business type selection (sole_proprietorship, llc, corporation, partnership)
  - ✅ Business category (car_wash, detailing, mobile_service, etc.)
  - ✅ Business address (street, city, state, zip)
  - ✅ Business phone number (format validation)
  - ✅ Business email (format validation)
  - ✅ Years in business (numeric, 0-50)
  - ✅ Number of employees (numeric, 1-1000)
  - ✅ Business description (optional, max 500 chars)
  - ✅ Website URL (optional, format validation)
  - ✅ Tax ID (EIN) for non-sole proprietorships
  - ✅ Data saves to business_profiles table
  - ✅ Progress persists on refresh
  - ✅ Required field validation
  - ✅ Business type conditional fields

### 3. Document Upload
- **Component:** `DocumentUploadForm`
- **Purpose:** Upload required business and professional documents
- **What to Test:**
  - ✅ Professional License upload (required)
    - File format validation (PDF, JPG, PNG)
    - File size limits (max 10MB)
    - Image preview for photos
  - ✅ Professional Headshot upload (required)
    - Image format validation (JPG, PNG, WebP)
    - File size limits (max 5MB)
    - Image preview
  - ✅ Business License upload (required for non-sole proprietorships)
    - File format validation (PDF, JPG, PNG)
    - File size limits (max 10MB)
  - ✅ Insurance Certificate upload (optional)
    - File format validation (PDF, JPG, PNG)
    - File size limits (max 10MB)
  - ✅ Additional Documents upload (optional)
    - Multiple file support
    - File format validation
    - File size limits
  - ✅ Document preview functionality
  - ✅ Document deletion
  - ✅ Upload progress indicators
  - ✅ Files save to Supabase storage
  - ✅ Document metadata saved to database
  - ✅ Required document validation
  - ✅ Business type conditional requirements

### 4. Application Review & Submission
- **Component:** `ApplicationReviewPage`
- **Purpose:** Review all information before final submission
- **What to Test:**
  - ✅ Summary of all provided information
  - ✅ Business information display
  - ✅ Document list with previews
  - ✅ Edit links for each section
  - ✅ Final submission button
  - ✅ Application status tracking
  - ✅ Email notifications sent
  - ✅ Admin notification system
  - ✅ Application ID generation
  - ✅ Database status updates
  - ✅ Redirect to confirmation page

---

## Test Scenarios

### Scenario 1: Complete Fresh Phase 1
1. Navigate to `/provider-onboarding/phase1`
2. Create new account with valid email
3. Complete business information form
4. Upload all required documents
5. Review and submit application
6. Verify email notifications sent
7. Verify admin dashboard shows new application

### Scenario 2: Resume Incomplete Phase 1
1. Complete steps 1-2 (Account + Business Info)
2. Close browser/refresh page
3. Return to Phase 1
4. Verify it resumes at step 3 (Documents)
5. Complete remaining steps

### Scenario 3: Sole Proprietorship Flow
1. Select "Sole Proprietorship" as business type
2. Verify Business License upload is not required
3. Complete with only Professional License and Headshot
4. Submit application

### Scenario 4: Corporation/LLC Flow
1. Select "Corporation" or "LLC" as business type
2. Verify Business License upload is required
3. Verify Tax ID (EIN) field is required
4. Complete all required documents
5. Submit application

### Scenario 5: Document Upload Testing
1. Test various file formats (PDF, JPG, PNG, WebP)
2. Test file size limits (try files > 10MB)
3. Test invalid file formats
4. Test image preview functionality
5. Test document deletion
6. Test multiple file uploads

### Scenario 6: Error Handling
1. Try invalid email formats
2. Try weak passwords
3. Try duplicate email addresses
4. Try invalid business information
5. Test network errors during upload
6. Test form validation messages
7. Test required field validation

### Scenario 7: Mobile Responsiveness
1. Test on mobile devices
2. Test file upload on mobile
3. Test form layout on small screens
4. Test touch interactions
5. Test mobile keyboard handling

---

## Database Verification

After testing, verify data in Supabase:

### Tables to Check
1. **auth.users** - User authentication data
2. **business_profiles** - Business information
3. **provider_documents** - Uploaded documents metadata
4. **provider_applications** - Application status and data
5. **business_setup_progress** - Onboarding progress tracking

### Storage Buckets
1. **provider-documents** - All uploaded documents
2. **business-logos** - Business logo images (if any)

### Key Fields to Verify
- `business_profiles.verification_status` = "pending"
- `provider_applications.application_status` = "submitted"
- `provider_documents.upload_status` = "uploaded"
- All required documents present
- Business type conditional requirements met

---

## API Endpoints Testing

### Authentication Endpoints
- `POST /api/auth/signup` - Account creation
- `POST /api/auth/signin` - User login
- `POST /api/auth/verify-email` - Email verification

### Onboarding Endpoints
- `GET /api/onboarding/status/:userId` - Check progress
- `POST /api/onboarding/business-info` - Save business info
- `POST /api/onboarding/upload-documents` - Upload documents
- `POST /api/onboarding/submit-application` - Submit application

### Test Each Endpoint
- ✅ Valid requests return 200/201
- ✅ Invalid requests return 400/422
- ✅ Authentication required endpoints return 401
- ✅ Rate limiting works
- ✅ Error messages are descriptive
- ✅ Response times < 2 seconds

---

## Performance Testing

### Load Testing
1. **Concurrent Users:** Test with 10+ simultaneous users
2. **File Upload:** Test multiple large file uploads
3. **Database Queries:** Monitor query performance
4. **API Response Times:** All endpoints < 2 seconds

### Stress Testing
1. **Large Files:** Test with files near size limits
2. **Network Issues:** Test with slow connections
3. **Browser Limits:** Test with multiple tabs
4. **Memory Usage:** Monitor browser memory

---

## Security Testing

### Authentication Security
- ✅ Password requirements enforced
- ✅ Email verification required
- ✅ Session management secure
- ✅ CSRF protection
- ✅ XSS prevention

### File Upload Security
- ✅ File type validation
- ✅ File size limits enforced
- ✅ Malicious file detection
- ✅ Storage access controls
- ✅ Secure file serving

### Data Security
- ✅ Sensitive data encrypted
- ✅ Database access controlled
- ✅ API rate limiting
- ✅ Input sanitization
- ✅ SQL injection prevention

---

## Known Issues & Limitations

### Current Limitations
- Email verification requires SMTP configuration
- File uploads require Supabase storage setup
- Some validations are client-side only
- Mobile file upload may have limitations

### Testing Tips
1. Use browser DevTools Network tab to monitor API calls
2. Check browser Console for errors
3. Use Supabase dashboard to verify database updates
4. Test on different browsers (Chrome, Firefox, Safari)
5. Test mobile responsive design
6. Use test email addresses for verification

---

## Quick Start Commands

```bash
# Start provider app (if not running)
cd roam-provider-app
npm run dev

# Access test pages
open http://localhost:3001/provider-onboarding/phase1
open http://localhost:3001/provider-onboarding/phase1?test=true

# Run automated tests
cd production-tests
npm run test:smoke
npm run test:api
```

---

## Test Data Reference

### Valid Test Accounts
- **Email:** test@roamprovider.app
- **Password:** TestPassword123!
- **Business Name:** Test Car Wash LLC
- **Business Type:** LLC
- **Category:** Car Wash

### Sample Documents
- **Professional License:** PDF file < 10MB
- **Professional Headshot:** JPG file < 5MB
- **Business License:** PDF file < 10MB (for LLC/Corp)

### Invalid Test Data
- **Invalid Email:** notanemail
- **Weak Password:** 123
- **Large File:** > 10MB file
- **Invalid Format:** .txt file for images

---

## Success Criteria

Phase 1 testing is successful when:
- ✅ All 4 steps can be completed without errors
- ✅ Data persists correctly in database
- ✅ Documents upload and store correctly
- ✅ Progress can be saved and resumed
- ✅ Validation works as expected
- ✅ Navigation between steps is smooth
- ✅ Application submission works
- ✅ Email notifications are sent
- ✅ Admin dashboard shows new applications
- ✅ Mobile experience is functional

---

## Automated Testing Setup

### Smoke Tests
```bash
# Quick health check
npm run test:smoke
```

### API Tests
```bash
# Comprehensive API testing
npm run test:api
```

### E2E Tests
```bash
# Full user flow testing
npm run test:e2e
```

### Monitoring
```bash
# Real-time monitoring
npm run monitor
```

---

## Next Steps After Testing

1. Document any bugs found
2. Test edge cases and error scenarios
3. Verify mobile responsiveness
4. Test with real business data
5. Prepare for production deployment
6. Set up monitoring and alerts

---

**Last Updated:** October 9, 2025
**Testing Status:** Ready for comprehensive testing
**Maintained By:** Engineering Team
