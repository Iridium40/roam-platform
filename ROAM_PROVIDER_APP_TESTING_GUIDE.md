# ROAM Provider App - Comprehensive Testing Guide

**Last Updated:** October 14, 2025

## 📋 Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Test Types](#test-types)
4. [Manual Testing](#manual-testing)
5. [Automated Testing](#automated-testing)
6. [Testing Specific Features](#testing-specific-features)
7. [Production Testing](#production-testing)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The ROAM Provider App is a comprehensive business management and provider onboarding platform. This guide covers all testing approaches including unit tests, integration tests, E2E tests, and manual testing procedures.

### What's Included
- ✅ Unit Tests (Vitest)
- ✅ Integration Tests  
- ✅ E2E Tests (Playwright)
- ✅ Manual Testing Guides
- ✅ Production Smoke Tests
- ✅ Development Test Utilities

---

## Quick Start

### 1. Setup Development Environment

```bash
# Navigate to provider app
cd /Users/alans/Desktop/ROAM/roam-platform/roam-provider-app

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at:
- **Frontend**: http://localhost:5177
- **Backend**: http://localhost:3000

### 2. Available Test Commands

```bash
# Unit Tests (Vitest)
npm test                    # Run all unit tests once
npm run test:watch          # Watch mode
npm run test:unit          # Verbose unit tests
npm run test:coverage      # Generate coverage report

# Integration Tests
npm run test:integration   # Run integration tests

# E2E Tests (Playwright)
npm run test:e2e          # Run E2E tests

# Code Quality
npm run lint              # Check for lint errors
npm run lint.fix          # Auto-fix lint errors
npm run format.check      # Check code formatting
npm run format.fix        # Auto-fix formatting

# Security & Performance
npm run security:audit    # Check for vulnerabilities
npm run performance:analyze # Bundle analysis
```

---

## Test Types

### 1. Unit Tests

**Location**: `client/lib/__tests__/`

**Existing Tests**:
- `apiClient.test.ts` - API client functionality
- `AppError.test.ts` - Error handling

**Running Unit Tests**:
```bash
npm run test:unit
```

**Writing New Unit Tests**:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { MyComponent } from '../MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    const result = MyComponent({ prop: 'value' });
    expect(result).toBeDefined();
  });
});
```

### 2. Integration Tests

Tests that verify multiple components/modules working together.

```bash
npm run test:integration
```

### 3. E2E Tests (Playwright)

End-to-end tests simulating real user interactions.

```bash
# Install Playwright (first time only)
npx playwright install

# Run E2E tests
npm run test:e2e
```

### 4. Manual Testing

Comprehensive manual testing procedures for critical user flows.

---

## Manual Testing

### Provider Onboarding Flow

#### Phase 1: Initial Registration

**Test Steps**:
1. Navigate to `/roampro`
2. Click "Get Started" or "Sign Up"
3. Fill in business registration form:
   - Business Name
   - Email
   - Password
   - Business Type
   - Location
4. Submit form
5. ✅ Verify: Account created successfully
6. ✅ Verify: Redirected to dashboard
7. ✅ Verify: Phase 1 completion status shown

**Expected Result**: User account created, can access dashboard with limited features.

#### Phase 2: Advanced Verification

**Test Steps**:
1. From dashboard, click "Complete Phase 2 Verification"
2. **Documents Upload**:
   - Upload business license
   - Upload insurance certificate
   - Upload ID proof
   - ✅ Verify: All files upload successfully
   - ✅ Verify: Previews display correctly

3. **Stripe Connect Setup**:
   - Click "Connect with Stripe"
   - Complete Stripe onboarding
   - ✅ Verify: Stripe account linked
   - ✅ Verify: Verification status updates

4. **Plaid Bank Connection**:
   - Click "Link Bank Account"
   - Select test bank (sandbox)
   - Enter test credentials
   - ✅ Verify: Bank account linked
   - ✅ Verify: Account details displayed

5. **Submit Application**:
   - Review all information
   - Click "Submit for Review"
   - ✅ Verify: Application submitted
   - ✅ Verify: Status changes to "Pending Review"

**Expected Result**: Complete application submitted, awaiting admin approval.

---

### Staff Onboarding Flow

Detailed testing guide: See [STAFF_ONBOARDING_TESTING_GUIDE.md](./STAFF_ONBOARDING_TESTING_GUIDE.md)

#### Quick Test: Dispatcher Onboarding

1. **As Owner**: Send dispatcher invitation
2. **As Dispatcher**: 
   - Access invitation link
   - Complete 5-step onboarding:
     - Welcome
     - Account Setup
     - Profile Setup
     - Availability Setup
     - Review & Complete
3. **Verification**:
   - ✅ Login successful
   - ✅ Dashboard shows correct permissions
   - ✅ No access to Financials or Business Settings
   - ✅ Services and Staff tabs are read-only

#### Quick Test: Provider Onboarding

1. **As Owner**: Send provider invitation
2. **As Provider**:
   - Access invitation link
   - Complete 5-step onboarding:
     - Welcome
     - Account Setup
     - Profile Setup (with professional fields)
     - Services Selection
     - Review & Complete
3. **Verification**:
   - ✅ Login successful
   - ✅ "My Services" and "My Bookings" visible
   - ✅ No access to Staff or Financials
   - ✅ Can edit own profile only

---

### Dashboard Testing

#### Owner Dashboard

```bash
# Login as owner
# Test URL: http://localhost:5177/provider-portal
```

**Navigation Tabs to Test**:
- ✅ Dashboard - Overview metrics and recent activity
- ✅ Bookings - All business bookings
- ✅ Messages - Twilio Conversations integration
- ✅ Services - Business services management
- ✅ Staff - Staff management and invitations
- ✅ Financials - Payments and transactions

**Settings Menu**:
- ✅ Profile - Update owner profile
- ✅ Business Settings - Business configuration
- ✅ Sign Out

#### Dispatcher Dashboard

**Expected Tabs**:
- ✅ Dashboard
- ✅ Bookings
- ✅ Messages
- ✅ Services (read-only)
- ✅ Staff (read-only)
- ❌ Financials (hidden)

**Settings Menu**:
- ❌ Profile (hidden)
- ❌ Business Settings (hidden)
- ✅ Sign Out

#### Provider Dashboard

**Expected Tabs**:
- ✅ Dashboard
- ✅ My Bookings (personal bookings only)
- ✅ Messages
- ✅ My Services (assigned services only)
- ❌ Staff (hidden)
- ❌ Financials (hidden)

**Settings Menu**:
- ✅ My Profile
- ❌ Business Settings (hidden)
- ✅ Sign Out

---

### Services Management

#### Test: Create New Service

1. Navigate to Services tab
2. Click "Add Service"
3. Fill in service details:
   - Service name
   - Description
   - Category
   - Price
   - Duration
   - Delivery type (Business, Mobile, Both, Virtual)
4. Upload service image (optional)
5. Click "Save"
6. ✅ Verify: Service appears in list
7. ✅ Verify: Service details correct
8. ✅ Verify: Image displays properly

#### Test: Service Eligibility

1. Create or edit a service
2. Set delivery type to "Mobile" or "Both"
3. Add location restrictions
4. ✅ Verify: Eligibility rules save correctly
5. ✅ Verify: Service shows in customer app based on location

---

### Bookings Management

#### Test: View Bookings

1. Navigate to Bookings tab
2. ✅ Verify: All bookings display
3. ✅ Verify: Booking cards show:
   - Customer name
   - Service name
   - Date/time
   - Status
   - Location
4. Test filters:
   - Status filter (Pending, Confirmed, In Progress, Completed, Cancelled)
   - Date range filter
   - Service filter
5. ✅ Verify: Filters work correctly

#### Test: Update Booking Status

1. Select a booking
2. Click "Update Status"
3. Change status to "In Progress"
4. ✅ Verify: Status updates immediately
5. ✅ Verify: Customer receives notification
6. Change status to "Completed"
7. ✅ Verify: Booking moves to completed section

---

### Profile Photo Upload

Detailed guide: See [PROVIDER_PHOTO_UPLOAD_TEST_GUIDE.md](./PROVIDER_PHOTO_UPLOAD_TEST_GUIDE.md)

**Quick Test**:
1. Navigate to Profile tab
2. Upload avatar photo (< 2MB)
   - ✅ Preview appears
   - ✅ Upload succeeds
   - ✅ Photo persists after refresh
3. Upload cover photo (< 10MB)
   - ✅ Preview appears
   - ✅ Upload succeeds
   - ✅ Photo persists after refresh

---

### Document Upload

#### Test: Business Document Upload

1. Navigate to Documents tab (or Business Settings → Documents)
2. Select document type:
   - Business License
   - Insurance Certificate
   - ID Proof
3. Click "Upload" and select file
4. ✅ Verify: Upload progress shown
5. ✅ Verify: Success message appears
6. ✅ Verify: Document appears in list with preview
7. ✅ Verify: Can download document
8. ✅ Verify: Can delete document

**File Validation**:
- ✅ Test max file size (10MB)
- ✅ Test supported formats (PDF, JPG, PNG)
- ✅ Test unsupported formats (show error)

---

### Messaging (Twilio Conversations)

#### Test: Send Message

1. Navigate to Messages tab
2. Select existing conversation or start new one
3. Type message in input field
4. Click Send
5. ✅ Verify: Message appears immediately
6. ✅ Verify: Message timestamp correct
7. ✅ Verify: Other participant receives message

#### Test: Real-time Updates

1. Open Messages in two different browser windows (provider + customer)
2. Send message from one window
3. ✅ Verify: Message appears in other window immediately
4. ✅ Verify: Unread count updates
5. ✅ Verify: Conversation moves to top of list

---

## Testing Specific Features

### Business Hours Management

**Test: Set Business Hours**

1. Navigate to Business Settings → Hours
2. For each day:
   - Toggle day on/off
   - Set open/close times
   - Add breaks (optional)
3. Click "Save"
4. ✅ Verify: Hours save correctly
5. ✅ Verify: Hours display in customer app
6. ✅ Verify: Booking availability respects hours

**Test Cases**:
- 24-hour operation
- Split shifts (morning and evening)
- Closed on specific days
- Different hours per day

---

### Business Locations

**Test: Add Location**

1. Navigate to Business Settings → Locations
2. Click "Add Location"
3. Use Google Places Autocomplete:
   - Start typing address
   - Select from dropdown
4. Set as service area (for mobile services)
5. ✅ Verify: Location saves
6. ✅ Verify: Map marker appears
7. ✅ Verify: Location available for bookings

---

### Service Addons

**Test: Create Addon**

1. Navigate to Services → Addons
2. Click "Add Addon"
3. Fill details:
   - Name (e.g., "Extra foam")
   - Price
   - Duration (if applicable)
4. Link to compatible services
5. ✅ Verify: Addon appears in service settings
6. ✅ Verify: Addon available during customer booking

---

## Development Test Utilities

The provider app includes browser console utilities for testing.

### Generate Phase 2 Token

```javascript
// In browser console
window.testUtils.generatePhase2Token('business-id')
```

This generates a Phase 2 onboarding link for testing Phase 2 flow without completing Phase 1.

### Delete Test User

```javascript
window.testUtils.deleteTestUser('test@example.com')
```

Removes a test user and all associated data.

### List Test Users

```javascript
window.testUtils.listTestUsers()
```

Shows all test accounts in the database.

### Debug User-Business Relationship

```javascript
window.testUtils.debugUserBusiness('user@example.com')
```

Displays user-business relationship details for debugging.

---

## Automated Testing

### Running Smoke Tests

From the project root:

```bash
cd production-tests
npm install
npm run test:smoke
```

**What it tests**:
- ✓ Provider app accessibility
- ✓ Critical API endpoints
- ✓ Database connectivity
- ✓ Third-party integrations
- ✓ Security headers

### Running Full Production Tests

```bash
cd production-tests
npm run test:all
```

**What it tests**:
- ✓ Authentication flow
- ✓ All API endpoints
- ✓ Database queries
- ✓ Performance benchmarks

See [Production Tests README](../production-tests/README.md) for details.

---

## Production Testing

### Post-Deployment Checklist

After deploying to production:

#### Immediate (< 5 minutes)

```bash
# 1. Run smoke tests
cd production-tests
npm run test:smoke

# 2. Check application availability
curl -I https://roamprovider.app
```

✅ All critical pages load
✅ API endpoints respond
✅ Database queries work
✅ No console errors

#### Within 15 Minutes

1. **Manual Login Test**:
   - Login as test provider
   - Navigate to all tabs
   - Verify no errors in console
   - Check for visual regressions

2. **Check Monitoring**:
   - Vercel Analytics
   - Error logs
   - Response times

3. **Test Critical Flow**:
   - Create test booking
   - Send test message
   - Upload test document

#### Within 1 Hour

```bash
# Run comprehensive tests
npm run test:api
```

Review:
- Error rates
- Response times
- Database performance
- User activity

---

## Troubleshooting

### Common Issues

#### TypeScript Errors

```bash
# Rebuild shared package
cd packages/shared
npm run build

# Restart TypeScript server in VS Code
# Cmd+Shift+P → "TypeScript: Restart TS Server"
```

#### Tests Failing

```bash
# Clear cache
rm -rf node_modules/.vite
rm -rf node_modules/.cache

# Reinstall dependencies
npm install

# Run tests with verbose output
npm run test:unit
```

#### Supabase Connection Issues

1. Check `.env` file has correct values:
   ```bash
   VITE_PUBLIC_SUPABASE_URL=https://vssomyuyhicaxsgiaupo.supabase.co
   VITE_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

2. Test connection:
   ```javascript
   // In browser console
   const { data, error } = await supabase.from('providers').select('count').single();
   console.log(data, error);
   ```

#### Image Upload Fails

1. Check Supabase storage bucket exists: `roam-file-storage`
2. Check RLS policies allow uploads
3. Check file size (< 2MB for avatars, < 10MB for covers)
4. Check file format (JPG, PNG, WebP only)

#### Stripe Connect Issues

1. Verify Stripe keys in environment:
   ```bash
   STRIPE_SECRET_KEY=sk_test_...
   ```
2. Check Stripe dashboard for webhook events
3. Verify redirect URLs in Stripe settings

#### Twilio Conversations Issues

1. Check Twilio credentials:
   ```bash
   VITE_TWILIO_ACCOUNT_SID=AC...
   VITE_TWILIO_AUTH_TOKEN=...
   VITE_TWILIO_CONVERSATIONS_SERVICE_SID=IS...
   ```
2. Verify Conversations service exists in Twilio dashboard
3. Check webhook configuration

---

## Test Data Management

### Creating Test Data

#### Test Provider Account

```sql
-- Create test provider
INSERT INTO users (email, role) 
VALUES ('test-provider@roamprovider.app', 'provider');

INSERT INTO providers (user_id, first_name, last_name, email)
VALUES (
  (SELECT id FROM users WHERE email = 'test-provider@roamprovider.app'),
  'Test', 'Provider', 'test-provider@roamprovider.app'
);
```

#### Test Business

```sql
-- Create test business
INSERT INTO businesses (business_name, email, business_type)
VALUES ('Test Car Wash', 'test@roamprovider.app', 'car_wash');

-- Link provider to business
INSERT INTO business_providers (business_id, provider_id, role)
VALUES (
  (SELECT id FROM businesses WHERE email = 'test@roamprovider.app'),
  (SELECT id FROM providers WHERE email = 'test-provider@roamprovider.app'),
  'owner'
);
```

### Cleaning Test Data

```sql
-- Clean up test data (run weekly)
DELETE FROM bookings WHERE customer_id IN (
  SELECT id FROM users WHERE email LIKE '%+test%@%'
);

DELETE FROM businesses WHERE business_name LIKE 'Test %';

DELETE FROM providers WHERE email LIKE '%+test%@%';

DELETE FROM users WHERE email LIKE '%+test%@%';
```

---

## Performance Testing

### Lighthouse Audit

```bash
npm run performance:lighthouse
```

### Bundle Analysis

```bash
npm run performance:analyze
```

### Target Metrics

| Metric | Target | Current |
|--------|--------|---------|
| First Contentful Paint | < 1.5s | |
| Time to Interactive | < 3.5s | |
| Speed Index | < 3s | |
| Total Blocking Time | < 300ms | |
| Cumulative Layout Shift | < 0.1 | |

---

## Security Testing

### Security Audit

```bash
npm run security:audit
```

### Manual Security Checks

1. **Authentication**:
   - ✅ Cannot access protected routes without login
   - ✅ Tokens expire properly
   - ✅ Password reset works
   - ✅ Session management secure

2. **Authorization**:
   - ✅ Dispatcher cannot access Financials
   - ✅ Provider cannot access Staff management
   - ✅ Cannot access other business data
   - ✅ Role-based permissions enforced

3. **Data Protection**:
   - ✅ Sensitive data encrypted
   - ✅ No secrets in client code
   - ✅ CORS configured correctly
   - ✅ CSP headers present

---

## Testing Checklist

### Before Each Deployment

- [ ] All unit tests pass
- [ ] Lint checks pass
- [ ] No TypeScript errors
- [ ] Manual smoke test completed
- [ ] Critical flows tested manually
- [ ] No console errors
- [ ] Environment variables configured

### After Deployment

- [ ] Smoke tests pass
- [ ] Application accessible
- [ ] No error spikes in logs
- [ ] Monitor for 15 minutes
- [ ] Test login works
- [ ] Critical APIs respond

### Weekly

- [ ] Full test suite passes
- [ ] Manual E2E testing
- [ ] Performance audit
- [ ] Security audit
- [ ] Test data cleanup
- [ ] Review error logs

### Monthly

- [ ] Full regression testing
- [ ] Cross-browser testing
- [ ] Mobile device testing
- [ ] Load testing
- [ ] Update test documentation

---

## Resources

### Documentation

- [Provider Photo Upload Testing](./PROVIDER_PHOTO_UPLOAD_TEST_GUIDE.md)
- [Staff Onboarding Testing](./STAFF_ONBOARDING_TESTING_GUIDE.md)
- [Production Testing Guide](./PRODUCTION_TESTING_GUIDE.md)
- [API Architecture](./API_ARCHITECTURE.md)
- [Database Schema Reference](./DATABASE_SCHEMA_REFERENCE.md)

### Test Files

- Unit Tests: `roam-provider-app/client/lib/__tests__/`
- Test Pages: `roam-provider-app/client/pages/testing/`
- Test Utils: `roam-provider-app/client/utils/testUtils.ts`
- Production Tests: `production-tests/`

### Test Accounts

```
Owner Test Account:
Email: test-owner@roamprovider.app
Password: test123456

Dispatcher Test Account:
Email: test-dispatcher@roamprovider.app
Password: test123456

Provider Test Account:
Email: test-provider@roamprovider.app
Password: test123456
```

---

## Support

For testing issues or questions:

- **Documentation**: Check relevant MD files in project root
- **Development Tools**: Use browser console test utilities
- **Error Debugging**: Check Vercel logs and Supabase dashboard

---

**Last Updated**: October 14, 2025
**Maintained By**: Engineering Team
**Next Review**: November 14, 2025

