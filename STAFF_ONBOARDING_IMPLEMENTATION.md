# Staff Onboarding & Role-Based Permissions Implementation

## Overview
This document outlines the implementation of differentiated staff onboarding flows for Dispatchers and Providers, along with role-based permissions in the provider dashboard.

## Implementation Date
October 7, 2025

## Onboarding Flows

### Dispatcher Onboarding (Simpler)
**Steps:**
1. **Welcome** - Show invitation details and what to expect
2. **Account Setup** - Name, email, phone, password
3. **Profile & Photo** - Bio, avatar image (optional)
4. **Availability** - Set working hours/schedule (defaults to business hours)
5. **Review & Complete** - Summary and confirmation

**Key Features:**
- Pre-filled availability based on business hours
- Simpler profile without professional details
- Focused on scheduling and coordination

### Provider Onboarding (More Comprehensive)
**Steps:**
1. **Welcome** - Show invitation details and what to expect
2. **Account Setup** - Name, email, phone, password
3. **Personal Profile** - Bio, professional title, years of experience, avatar & cover images
4. **Services** - Select which business services they can provide
5. **Review & Complete** - Summary and confirmation

**Key Features:**
- Service selection with inherited business pricing
- Professional profile with title and experience
- Business services and add-ons displayed with configured prices
- All pricing inherited from business settings (read-only)

## Files Created

### Onboarding Flow Components
1. **`roam-provider-app/client/pages/onboarding/StaffOnboardingFlow.tsx`**
   - Main coordinator component for staff onboarding
   - Handles routing between different steps based on role
   - Validates invitation token
   - Manages onboarding data state

2. **`roam-provider-app/client/pages/onboarding/StaffSteps/StaffWelcomeStep.tsx`**
   - Displays invitation details
   - Shows overview of onboarding steps
   - Different messaging for dispatcher vs provider

3. **`roam-provider-app/client/pages/onboarding/StaffSteps/StaffAccountSetup.tsx`**
   - Collects basic account information
   - Password validation
   - Email pre-filled from invitation

4. **`roam-provider-app/client/pages/onboarding/StaffSteps/StaffProfileSetup.tsx`**
   - Handles both dispatcher and provider profiles
   - Conditional fields based on role:
     - **Dispatcher**: Bio, avatar (optional)
     - **Provider**: Professional title, years of experience, bio, avatar, cover image
   - Image upload integration with Supabase storage

5. **`roam-provider-app/client/pages/onboarding/StaffSteps/StaffAvailabilitySetup.tsx`** (Dispatcher only)
   - Weekly schedule configuration
   - Pre-filled with business hours
   - Toggle days on/off
   - Set custom hours per day

6. **`roam-provider-app/client/pages/onboarding/StaffSteps/StaffServicesSetup.tsx`** (Provider only)
   - Display business services with prices and delivery types
   - Display business add-ons with prices
   - Multi-select service assignment
   - All pricing inherited from business settings (read-only)
   - Visual indicators for selected services

7. **`roam-provider-app/client/pages/onboarding/StaffSteps/StaffReviewComplete.tsx`**
   - Summary of all entered information
   - Different sections shown based on role
   - Submit button to complete onboarding
   - Redirects to provider portal login after completion

## Files Modified

### Routing
1. **`roam-provider-app/client/App.tsx`**
   - Updated import from `StaffOnboarding` to `StaffOnboardingFlow`
   - Route path remains `/staff-onboarding`

### API Endpoints
2. **`roam-provider-app/server/routes/staff.ts`**
   - **`completeStaffOnboarding` function updated:**
     - Accepts new fields: `professionalTitle`, `yearsExperience`, `avatarUrl`, `coverImageUrl`, `availability`, `selectedServices`
     - Creates or updates provider record with role-specific data
     - Uses `provider_role` field (not `role`)
     - Handles service assignments for providers
     - Maps service_id to business_service_id for provider_service_assignments table
     - No password confirmation check (handled client-side)

### Dashboard Permissions
3. **`roam-provider-app/client/pages/ProviderDashboard.tsx`**
   - **Added `hasAccess` permission checker function:**
     - Owner: Full access to all features
     - Dispatcher: Dashboard, Bookings, Messages, Staff (read-only), Services (read-only)
       - NO access to: Financials, Business Settings
     - Provider: Dashboard, My Bookings, Messages, My Profile, My Services (read-only)
       - NO access to: Staff, Financials, Business Settings
   
   - **Updated navigation:**
     - Desktop navigation buttons conditionally rendered based on role
     - "My Bookings" label for providers, "Bookings" for others
     - "My Services" label for providers, "Services" for others
     - "My Profile" label for providers in settings menu
   
   - **Updated Settings dropdown:**
     - Profile option only shown if user has access
     - Business Settings only shown to owners
     - Sign out always available

## Role-Based Permissions Matrix

| Feature | Owner | Dispatcher | Provider |
|---------|-------|------------|----------|
| Dashboard | ✅ Full | ✅ View | ✅ View |
| Bookings | ✅ All | ✅ Manage/Assign | ✅ My Bookings Only |
| Messages | ✅ Full | ✅ Full | ✅ Full |
| Services | ✅ Edit | ✅ Read-Only | ✅ Read-Only (My Services) |
| Staff Management | ✅ Full | ✅ Read-Only | ❌ No Access |
| Financials | ✅ Full | ❌ No Access | ❌ No Access |
| Profile | ✅ Full | ✅ Own Profile | ✅ Own Profile |
| Business Settings | ✅ Full | ❌ No Access | ❌ No Access |

## Database Integration

### Tables Used
1. **`providers`** - Staff member profiles
   - Fields: `provider_role`, `professional_title`, `years_experience`, `image_url`, `cover_image_url`, `availability_schedule`, `bio`
   
2. **`business_services`** - Business service offerings
   - Read by providers during onboarding to select services
   
3. **`business_addons`** - Business add-on offerings
   - Displayed to providers (informational)
   
4. **`provider_service_assignments`** - Provider-to-service mappings
   - Created during provider onboarding
   - Links `provider_id` to `business_service_id`

### Service Assignment Flow
1. Provider selects services by `service_id`
2. System queries `business_services` to get `business_service_id` for each selected service
3. Creates records in `provider_service_assignments` linking provider to business services
4. All pricing and configuration inherited from business_services table

## Image Upload Integration

### Storage Paths
- **Provider Avatars**: `provider_avatar` type → `{businessId}/providers/{userId}/avatar.{ext}`
- **Provider Cover Images**: `provider_cover` type → `{businessId}/providers/{userId}/cover.{ext}`

### Validation
- File types: JPG, PNG, WebP
- Max size: 5MB
- Dimensions validated via ImageStorageService

### Process
1. Client validates file
2. Generates preview URL for immediate display
3. Uploads to Supabase storage via ImageStorageService
4. Receives public URL
5. Saves URL to provider record in `completeStaffOnboarding`

## Security Considerations

### Invitation Tokens
- JWT-based with 7-day expiration
- Type: `staff_invitation`
- Contains: `businessId`, `email`, `role`, `locationId`
- Secret: `process.env.JWT_SECRET`

### Password Security
- Minimum 6 characters (validated client-side)
- Hashed by Supabase Auth
- Auto-confirmed email (invited users)

### Email Verification
- Auto-confirmed since users are invited by business owner
- No additional verification required

## Testing Workflow

### Dispatcher Onboarding Test
1. Owner sends dispatcher invitation from Staff Management tab
2. Dispatcher receives email with onboarding link
3. Clicks link → `/staff-onboarding?token=...`
4. Completes 5 steps:
   - Welcome
   - Account (name, phone, password)
   - Profile (bio, optional avatar)
   - Availability (defaults to business hours)
   - Review & Complete
5. Redirects to `/provider-portal` for login
6. Logs in → Dashboard shows: Dashboard, Bookings, Messages, Staff (read-only), Services (read-only)
7. Settings menu shows only "Sign out" (no Profile, no Business Settings)

### Provider Onboarding Test
1. Owner sends provider invitation from Staff Management tab
2. Provider receives email with onboarding link
3. Clicks link → `/staff-onboarding?token=...`
4. Completes 5 steps:
   - Welcome
   - Account (name, phone, password)
   - Personal Profile (title, experience, bio, avatar, cover)
   - Services (select from business services)
   - Review & Complete
5. Redirects to `/provider-portal` for login
6. Logs in → Dashboard shows: Dashboard, My Bookings, Messages, My Profile, My Services
7. Settings menu shows "My Profile" and "Sign out" (no Business Settings)

## Known Limitations & Future Enhancements

### Current Limitations
1. Providers can only see business services that are already configured
2. No ability to request new services during onboarding
3. Availability is stored but not yet used for scheduling
4. No certification/credential validation for providers

### Recommended Future Enhancements
1. **Bookings Tab Enhancement:**
   - Filter bookings by provider_id for providers
   - Show only "My Bookings" for providers
   
2. **Services Tab Enhancement:**
   - Make truly read-only for dispatchers and providers
   - Remove edit/delete buttons for non-owners
   
3. **Staff Tab Enhancement:**
   - Read-only view for dispatchers
   - Hide edit/delete/invite buttons
   
4. **API Authorization:**
   - Add provider_role checks to all API endpoints
   - Prevent unauthorized modifications via API
   
5. **Availability Integration:**
   - Use dispatcher availability for booking assignments
   - Display provider availability on booking screens
   
6. **Certification Management:**
   - Add certifications/licenses for providers
   - Verify credentials before approval
   
7. **Service Requests:**
   - Allow providers to request new services
   - Workflow for owner approval

## API Endpoints

### Existing (No Changes)
- `POST /api/staff/validate-invitation` - Validates invitation token
- `POST /api/staff/send-invite` - Sends staff invitation email

### Modified
- `POST /api/staff/complete-onboarding` - Now handles role-specific fields

### Required (Not Yet Implemented)
- Role-based authorization middleware for protected endpoints
- Provider-specific booking queries
- Read-only enforcement for non-owner roles

## Environment Variables
No new environment variables required. Uses existing:
- `JWT_SECRET` - For invitation tokens
- `VITE_PUBLIC_SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase admin access

## Migration Notes
- No database migrations required
- All fields already exist in `providers` table
- `provider_role` enum already includes 'owner', 'dispatcher', 'provider'

## Success Criteria
✅ Dispatcher onboarding flow created
✅ Provider onboarding flow created
✅ Role-based navigation implemented
✅ Service selection with inherited pricing
✅ Availability configuration
✅ Image upload integration
✅ Professional profile fields
✅ Review and completion flow
✅ Redirect to login after completion

## Next Steps
1. Test complete onboarding flows for both roles
2. Implement API-level authorization checks
3. Update BookingsTab to filter by provider for non-owners
4. Update ServicesTab and StaffTab to be truly read-only for non-owners
5. Test permissions thoroughly in provider dashboard
6. Document any edge cases or issues found during testing

