# Staff Onboarding Testing Guide

## Overview
This guide provides step-by-step instructions for testing the Dispatcher and Provider onboarding flows, as well as role-based permissions in the provider dashboard.

## Prerequisites

### 1. Start the Development Server
```bash
cd roam-provider-app
npm run dev
```

### 2. Ensure Database is Running
- Supabase connection must be active
- `providers` table should have existing business owner
- `business_services` and `business_addons` should be configured

### 3. Required Test Data
You'll need:
- **Business Owner Account**: To send staff invitations
- **Test Email Addresses**: For dispatcher and provider invitations
- **Business with Services**: At least one business with configured services/addons

---

## Test 1: Dispatcher Onboarding Flow

### Step 1: Send Invitation (As Owner)
1. Log in as business owner
2. Navigate to **Staff Management** tab
3. Click **"Invite Staff Member"**
4. Fill in details:
   - **Email**: `dispatcher-test@example.com`
   - **Role**: `Dispatcher`
   - **Location**: Select a location (if applicable)
5. Click **"Send Invitation"**
6. ✅ Verify: Success message appears
7. ✅ Verify: Email is sent (check console for onboarding link)

### Step 2: Access Onboarding Link
1. Copy the onboarding link from console or email
2. Open link in new incognito window
   - Format: `http://localhost:5177/staff-onboarding?token=...`
3. ✅ Verify: Redirects to Welcome page

### Step 3: Complete Welcome Step
1. Review invitation details displayed:
   - Business name
   - Role: "Dispatcher"
   - Email address
   - Location (if assigned)
2. Review "What to Expect" list
3. Click **"Get Started"**
4. ✅ Verify: Progresses to Account Setup

### Step 4: Complete Account Setup
1. Fill in form:
   - **First Name**: `John`
   - **Last Name**: `Dispatcher`
   - **Phone**: `(555) 123-4567`
   - **Password**: `test123456`
   - **Confirm Password**: `test123456`
2. ✅ Verify: Email is pre-filled and disabled
3. ✅ Verify: Privacy notice is shown
4. Click **"Continue"**
5. ✅ Verify: Progresses to Profile Setup
6. ✅ Verify: Progress bar shows ~40% (Step 2 of 5)

### Step 5: Complete Profile Setup (Dispatcher)
1. **Optional**: Upload profile photo
   - Click "Upload Photo"
   - Select image (JPG/PNG/WebP, max 5MB)
   - ✅ Verify: Preview appears immediately
2. Enter bio (optional):
   - Example: "Experienced dispatcher with 5 years in service coordination"
3. ✅ Verify: Professional Title field is NOT shown
4. ✅ Verify: Years of Experience field is NOT shown
5. ✅ Verify: Cover Image upload is NOT shown
6. Click **"Continue"**
7. ✅ Verify: Progresses to Availability Setup
8. ✅ Verify: Progress bar shows ~60% (Step 3 of 5)

### Step 6: Complete Availability Setup
1. ✅ Verify: Schedule is pre-filled with business hours
2. ✅ Verify: Info alert mentions "pre-filled with business hours"
3. Customize availability:
   - Toggle Monday to Friday ON
   - Set hours: 9:00 AM - 5:00 PM
   - Toggle Saturday and Sunday OFF
4. ✅ Verify: Time pickers appear only for enabled days
5. ✅ Verify: Disabled days show "Unavailable"
6. Click **"Continue"**
7. ✅ Verify: Progresses to Review & Complete
8. ✅ Verify: Progress bar shows ~80% (Step 4 of 5)

### Step 7: Review & Complete
1. Review displayed information:
   - ✅ Position section: Business name, Role badge (Dispatcher)
   - ✅ Account Information: Name, email, phone
   - ✅ Profile: Bio, profile photo status
   - ✅ Availability: "X days/week"
   - ✅ NO Services section shown
2. Read completion notice
3. Click **"Complete Setup"**
4. ✅ Verify: Button shows loading state
5. ✅ Verify: Success toast appears
6. ✅ Verify: Redirects to `/provider-portal` (login page)

### Step 8: Login as Dispatcher
1. Enter credentials:
   - **Email**: `dispatcher-test@example.com`
   - **Password**: `test123456`
2. Click **"Sign In"**
3. ✅ Verify: Successfully logs in
4. ✅ Verify: Redirects to `/dispatcher/dashboard`

### Step 9: Verify Dispatcher Dashboard Permissions
1. **Navigation Tabs Visible:**
   - ✅ Dashboard
   - ✅ Bookings
   - ✅ Messages
   - ✅ Services
   - ✅ Staff
2. **Navigation Tabs Hidden:**
   - ❌ Financials (should NOT be visible)
3. **Settings Menu:**
   - ❌ "Profile" should NOT be visible
   - ❌ "Business Settings" should NOT be visible
   - ✅ "Sign out" should be visible
4. **Test Tab Access:**
   - Click **Services** → ✅ Should be read-only (no edit buttons)
   - Click **Staff** → ✅ Should be read-only (no invite/edit/delete buttons)
   - Try navigating to `/dispatcher/financials` → ❌ Should be blocked or show error
   - Try navigating to `/dispatcher/business-settings` → ❌ Should be blocked or show error

---

## Test 2: Provider Onboarding Flow

### Step 1: Send Invitation (As Owner)
1. Log in as business owner
2. Navigate to **Staff Management** tab
3. Click **"Invite Staff Member"**
4. Fill in details:
   - **Email**: `provider-test@example.com`
   - **Role**: `Provider`
   - **Location**: Select a location
5. Click **"Send Invitation"**
6. ✅ Verify: Success message appears
7. ✅ Verify: Email is sent (check console for onboarding link)

### Step 2: Access Onboarding Link
1. Copy the onboarding link from console or email
2. Open link in new incognito window
   - Format: `http://localhost:5177/staff-onboarding?token=...`
3. ✅ Verify: Redirects to Welcome page

### Step 3: Complete Welcome Step
1. Review invitation details:
   - Business name
   - Role: "Provider"
   - Email address
   - Location
2. Review "What to Expect" list
3. ✅ Verify: Shows "Select your services and specialties" (not availability)
4. Click **"Get Started"**
5. ✅ Verify: Progresses to Account Setup

### Step 4: Complete Account Setup
1. Fill in form:
   - **First Name**: `Jane`
   - **Last Name**: `Provider`
   - **Phone**: `(555) 987-6543`
   - **Password**: `test123456`
   - **Confirm Password**: `test123456`
2. Click **"Continue"**
3. ✅ Verify: Progresses to Personal Profile Setup
4. ✅ Verify: Progress bar shows ~40% (Step 2 of 5)

### Step 5: Complete Personal Profile Setup (Provider)
1. **Upload Profile Photo** (Optional):
   - Click "Upload Photo"
   - Select image
   - ✅ Verify: Preview appears with remove button
2. **Upload Cover Image** (Optional):
   - Click "Upload Cover Image"
   - Select image
   - ✅ Verify: Preview appears with remove button
3. **Enter Professional Title** (Required):
   - Example: "Licensed Massage Therapist"
   - ✅ Verify: Field is marked as required with red asterisk
4. **Enter Years of Experience**:
   - Example: `8`
5. **Enter Bio** (Required):
   - Example: "Specializing in deep tissue and sports massage with 8 years of experience"
   - ✅ Verify: Field is marked as required
6. ✅ Verify: All provider-specific fields are shown
7. Click **"Continue"**
8. ✅ Verify: Progresses to Services Setup
9. ✅ Verify: Progress bar shows ~60% (Step 3 of 5)

### Step 6: Complete Services Setup
1. ✅ Verify: Info alert mentions "pricing is inherited from business settings"
2. ✅ Verify: "Available Services" section shows business services
3. ✅ Verify: Each service card shows:
   - Service name and description
   - Price (e.g., "$75")
   - Duration (e.g., "60 min")
   - Delivery type badge (e.g., "Business", "Mobile", "Both", "Virtual")
4. **Select Services**:
   - Click on 2-3 service cards to select them
   - ✅ Verify: Selected services show green border and checkmark
   - ✅ Verify: "X Selected" badge updates
5. ✅ Verify: "Available Add-ons" section shows business addons (informational)
6. ✅ Verify: No edit buttons or price inputs (read-only, inherited pricing)
7. Click **"Continue"**
8. ✅ Verify: Button is disabled if no services selected
9. Select at least one service, then click **"Continue"**
10. ✅ Verify: Progresses to Review & Complete
11. ✅ Verify: Progress bar shows ~80% (Step 4 of 5)

### Step 7: Review & Complete
1. Review displayed information:
   - ✅ Position section: Business name, Role badge (Provider)
   - ✅ Account Information: Name, email, phone
   - ✅ Profile: Professional title, years of experience, bio, photo status
   - ✅ Services: "X services" badge
   - ✅ NO Availability section shown
2. Read completion notice
3. Click **"Complete Setup"**
4. ✅ Verify: Button shows loading state
5. ✅ Verify: Success toast appears
6. ✅ Verify: Redirects to `/provider-portal` (login page)

### Step 8: Login as Provider
1. Enter credentials:
   - **Email**: `provider-test@example.com`
   - **Password**: `test123456`
2. Click **"Sign In"**
3. ✅ Verify: Successfully logs in
4. ✅ Verify: Redirects to `/provider/dashboard`

### Step 9: Verify Provider Dashboard Permissions
1. **Navigation Tabs Visible:**
   - ✅ Dashboard
   - ✅ My Bookings (labeled "My Bookings", not "Bookings")
   - ✅ Messages
   - ✅ My Services (labeled "My Services", not "Services")
2. **Navigation Tabs Hidden:**
   - ❌ Staff (should NOT be visible)
   - ❌ Financials (should NOT be visible)
3. **Settings Menu:**
   - ✅ "My Profile" should be visible
   - ❌ "Business Settings" should NOT be visible
   - ✅ "Sign out" should be visible
4. **Test Tab Access:**
   - Click **My Services** → ✅ Should show only assigned services (read-only)
   - Click **My Bookings** → ✅ Should show only bookings assigned to this provider
   - Try navigating to `/provider/staff` → ❌ Should be blocked or show error
   - Try navigating to `/provider/financials` → ❌ Should be blocked or show error
   - Try navigating to `/provider/business-settings` → ❌ Should be blocked or show error
5. **Test Profile Access:**
   - Click Settings → My Profile
   - ✅ Should show own profile with edit capability
   - ✅ Should show professional title and experience fields

---

## Test 3: Owner Dashboard Permissions (Baseline)

### Verify Owner Has Full Access
1. Log in as business owner
2. **Navigation Tabs Visible:**
   - ✅ Dashboard
   - ✅ Bookings
   - ✅ Messages
   - ✅ Services
   - ✅ Staff
   - ✅ Financials
3. **Settings Menu:**
   - ✅ Profile
   - ✅ Business Settings
   - ✅ Sign out
4. ✅ All tabs should be fully functional with edit/delete/create capabilities

---

## Common Test Scenarios

### Error Handling

#### Test: Invalid Invitation Token
1. Navigate to: `http://localhost:5177/staff-onboarding?token=invalid`
2. ✅ Verify: Shows "Invalid invitation link" error
3. ✅ Verify: "Go to Homepage" button works

#### Test: Expired Token
1. (If applicable) Use expired token
2. ✅ Verify: Shows appropriate error message

#### Test: Duplicate Email
1. Send invitation to existing user email
2. ✅ Verify: Shows "User already exists" error during onboarding completion

### Image Upload Testing

#### Test: Valid Image Upload
1. Upload JPG, PNG, or WebP (under 5MB)
2. ✅ Verify: Preview appears immediately
3. ✅ Verify: Remove button works
4. ✅ Verify: Can replace image

#### Test: Invalid Image Upload
1. Try uploading file > 5MB
2. ✅ Verify: Shows size error
3. Try uploading non-image file (e.g., PDF)
4. ✅ Verify: Shows file type error

### Form Validation

#### Test: Required Fields
1. Try continuing without filling required fields
2. ✅ Verify: Shows field-specific error messages
3. ✅ Verify: Fields highlighted in red

#### Test: Password Validation
1. Enter password < 6 characters
2. ✅ Verify: Shows "minimum 6 characters" error
3. Enter mismatched passwords
4. ✅ Verify: Shows "passwords do not match" error

### Navigation Testing

#### Test: Back Button
1. At any step, click "Back"
2. ✅ Verify: Returns to previous step
3. ✅ Verify: Previously entered data is preserved

#### Test: Browser Back Button
1. Use browser back button during onboarding
2. ✅ Verify: Onboarding state is maintained
3. ✅ Verify: Can continue from current step

#### Test: Progress Indicator
1. Observe progress bar at each step
2. ✅ Verify: Percentage increases correctly
3. ✅ Verify: Step indicators show completed/current states

---

## Database Verification

### After Dispatcher Onboarding
Run these queries to verify data:

```sql
-- Check provider record
SELECT id, first_name, last_name, email, provider_role, image_url, bio, availability_schedule
FROM providers
WHERE email = 'dispatcher-test@example.com';

-- Verify no service assignments
SELECT COUNT(*) as assignment_count
FROM provider_service_assignments
WHERE provider_id = (SELECT id FROM providers WHERE email = 'dispatcher-test@example.com');
-- Should be: 0
```

### After Provider Onboarding
Run these queries to verify data:

```sql
-- Check provider record
SELECT id, first_name, last_name, email, provider_role, image_url, cover_image_url, 
       professional_title, years_experience, bio
FROM providers
WHERE email = 'provider-test@example.com';

-- Check service assignments
SELECT psa.*, bs.service_id, s.name as service_name
FROM provider_service_assignments psa
JOIN business_services bs ON psa.business_service_id = bs.id
JOIN services s ON bs.service_id = s.id
WHERE psa.provider_id = (SELECT id FROM providers WHERE email = 'provider-test@example.com');
-- Should match selected services
```

---

## Troubleshooting

### Issue: Onboarding link doesn't work
- **Check**: Token is complete (not truncated in copy/paste)
- **Check**: Server is running on correct port
- **Check**: JWT_SECRET is configured

### Issue: Images not uploading
- **Check**: Supabase storage bucket is configured
- **Check**: File size under 5MB
- **Check**: Valid image format (JPG/PNG/WebP)

### Issue: Services not showing
- **Check**: Business has configured services in business_services table
- **Check**: Services are marked as `is_active = true`
- **Check**: Business ID matches invitation

### Issue: Can't log in after completion
- **Check**: Using correct email (from invitation)
- **Check**: Using password created during onboarding
- **Check**: Provider record created in database
- **Check**: Supabase auth user created

### Issue: Wrong permissions in dashboard
- **Check**: `provider_role` in database matches expected role
- **Check**: Logged in with correct account
- **Check**: Clear browser cache/localStorage

---

## Success Criteria Checklist

### Dispatcher Onboarding
- [ ] Can receive invitation email
- [ ] Can access onboarding link
- [ ] Can complete all 5 steps
- [ ] Profile photo upload works (optional)
- [ ] Availability defaults to business hours
- [ ] Can customize availability
- [ ] Redirects to login after completion
- [ ] Can log in successfully
- [ ] Dashboard shows correct tabs (no Financials)
- [ ] Settings menu has no Profile/Business Settings
- [ ] Services and Staff tabs are read-only
- [ ] Database record created correctly
- [ ] No service assignments created

### Provider Onboarding
- [ ] Can receive invitation email
- [ ] Can access onboarding link
- [ ] Can complete all 5 steps
- [ ] Profile and cover photo upload works
- [ ] Professional fields appear and are required
- [ ] Services display with inherited pricing
- [ ] Can select multiple services
- [ ] Add-ons shown (informational only)
- [ ] Redirects to login after completion
- [ ] Can log in successfully
- [ ] Dashboard shows "My Bookings" and "My Services"
- [ ] No access to Staff or Financials
- [ ] Settings menu shows "My Profile"
- [ ] Services tab shows only assigned services
- [ ] Database record created correctly
- [ ] Service assignments created correctly

### Role-Based Permissions
- [ ] Owner has access to all features
- [ ] Dispatcher can't access Financials or Business Settings
- [ ] Provider can't access Staff, Financials, or Business Settings
- [ ] URL-based access control works (can't bypass via direct URL)
- [ ] Appropriate labels ("My Bookings" vs "Bookings")

---

## Next Steps After Testing
1. Document any bugs found
2. Test edge cases (network failures, duplicate submissions, etc.)
3. Performance testing with large service lists
4. Mobile responsiveness testing
5. Email template verification (actual emails, not just console logs)

