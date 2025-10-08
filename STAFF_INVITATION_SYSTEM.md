# Staff Invitation System - Implementation Guide

## ✅ Current Implementation Status

Your ROAM Provider App **already has a complete staff invitation system** implemented! Here's what's available:

### 📋 Features Implemented:

1. **Staff Management Interface** (`StaffManager.tsx`)
   - ✅ "Add Staff Member" section with:
     - Email input field
     - Role dropdown (Provider, Dispatcher, Owner)
     - Location dropdown (with "No specific location" option)
     - "Invite" button with icon
   - ✅ Staff listing with tabs (All, Owners, Dispatchers, Providers, Pending)
   - ✅ Individual staff cards showing:
     - Name, email, phone
     - Role and status badges
     - Edit and Schedule buttons
     - Activate/Deactivate toggle
     - Delete option (for non-owners)

2. **API Endpoint** (`/api/staff/invite`)
   - ✅ Email format validation
   - ✅ Role validation (provider, dispatcher, owner)
   - ✅ Business existence check
   - ✅ Duplicate user prevention
   - ✅ JWT invitation token generation (7-day expiry)
   - ✅ Creates pending provider record in database
   - ✅ Sends invitation email with onboarding link

3. **Onboarding Flow** (`/staff-onboarding`)
   - ✅ Token validation
   - ✅ Multi-step onboarding process:
     - **Dispatcher:** Welcome → Account Setup → Profile & Photo → Availability → Review
     - **Provider:** Welcome → Account Setup → Personal Profile → Services Selection → Review
   - ✅ Auto-creates user account with hashed password
   - ✅ Associates staff member with business
   - ✅ Activates account upon completion

4. **Email Service** (`EmailService.sendStaffInvitationEmail`)
   - ✅ Professional HTML email template
   - ✅ Personalized with business name and inviter name
   - ✅ Role-specific messaging
   - ✅ Secure onboarding link
   - ✅ Sent via Resend SMTP

## 🚀 How to Use

### For Business Owners:

1. **Navigate to Staff Tab**
   - Log into Provider Portal
   - Click "Staff" in the navigation menu

2. **Send an Invitation**
   - Enter the staff member's email address
   - Select their role (Provider, Dispatcher, or Owner)
   - Optionally select a specific location
   - Click "Invite" button

3. **What Happens Next:**
   - System creates a pending provider record
   - Invitation email is sent to the staff member
   - Staff member receives email with secure onboarding link
   - Link expires in 7 days

4. **Staff Member Onboarding:**
   - Staff clicks link in email
   - Completes role-specific onboarding flow
   - Sets up account, profile, and preferences
   - Account is activated and appears in your staff list

### For Staff Members:

1. **Receive Invitation Email**
   - Check email inbox for invitation from ROAM
   - Subject: "Invitation to join [Business Name] on ROAM"

2. **Click Onboarding Link**
   - Opens staff onboarding flow
   - Token is automatically validated

3. **Complete Onboarding**
   - Follow step-by-step wizard
   - Provide required information for your role
   - Set up password and profile

4. **Start Working**
   - After completion, log in to Provider Portal
   - Access features based on your role permissions

## 🔧 Technical Details

### File Locations:

```
roam-provider-app/
├── client/
│   ├── components/
│   │   └── StaffManager.tsx                    # Main staff management UI
│   ├── pages/
│   │   ├── ProviderDashboard.tsx               # Renders StaffManager on Staff tab
│   │   └── onboarding/
│   │       ├── StaffOnboardingFlow.tsx         # Onboarding coordinator
│   │       └── StaffSteps/                     # Individual onboarding steps
│   │           ├── StaffWelcomeStep.tsx
│   │           ├── StaffAccountSetup.tsx
│   │           ├── StaffProfileSetup.tsx
│   │           ├── StaffAvailabilitySetup.tsx
│   │           ├── StaffServicesSetup.tsx
│   │           └── StaffReviewComplete.tsx
├── server/
│   ├── routes/
│   │   └── staff.ts                            # API route handlers
│   └── services/
│       └── emailService.ts                     # Email sending service
└── api/
    └── staff/
        └── invite.ts                           # Vercel serverless function (production)
```

### API Endpoints:

- **POST `/api/staff/invite`** - Send staff invitation
  ```json
  {
    "businessId": "uuid",
    "email": "staff@example.com",
    "role": "provider",
    "locationId": "uuid" (optional),
    "invitedBy": "Owner Name"
  }
  ```

- **POST `/api/staff/validate-invitation`** - Validate invitation token
  ```json
  {
    "token": "jwt-token-string"
  }
  ```

- **POST `/api/staff/complete-onboarding`** - Complete staff onboarding
  ```json
  {
    "token": "jwt-token-string",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "5551234567",
    "password": "secure-password",
    // ... additional role-specific fields
  }
  ```

### Database Schema:

**providers table:**
- `invitation_token` - JWT token for onboarding
- `invitation_sent_at` - Timestamp of invitation
- `provider_role` - Role (owner, dispatcher, provider)
- `location_id` - Optional location assignment
- `business_id` - Associated business
- `is_active` - Account active status
- `verification_status` - Account verification status

## 🐛 Troubleshooting

### Issue: "Invite button doesn't work"
**Solution:** Check browser console for errors. Ensure:
- Business ID is available in context
- User is logged in as owner
- Network request reaches `/api/staff/invite`

### Issue: "Email not received"
**Solution:** Check:
- RESEND_API_KEY environment variable is set
- Email service logs in server console
- Spam/junk folders
- Email address is correct

### Issue: "Onboarding link expired"
**Solution:**
- Tokens expire after 7 days
- Send a new invitation
- Staff member must complete onboarding within 7 days

### Issue: "User already exists" error
**Solution:**
- Check if user is already part of this business
- If they're in another business, they cannot join (current limitation)
- User can only be part of one business at a time

## 📊 Role-Based Permissions

### Owner:
- ✅ All dashboard features
- ✅ Manage staff (invite, edit, delete)
- ✅ Manage business settings
- ✅ View all bookings
- ✅ View financials
- ✅ Manage services

### Dispatcher:
- ✅ Dashboard overview
- ✅ Manage all bookings
- ✅ View staff (read-only)
- ✅ View services (read-only)
- ✅ Messages
- ❌ Business settings
- ❌ Financials
- ❌ Staff management

### Provider:
- ✅ Dashboard overview
- ✅ View own bookings only
- ✅ Manage own profile
- ✅ View own services (read-only)
- ✅ Messages
- ❌ View other staff
- ❌ Business settings
- ❌ Financials
- ❌ All bookings

## ✅ Testing Checklist

- [ ] Log in as business owner
- [ ] Navigate to Staff tab
- [ ] Enter test email address
- [ ] Select role (try each role)
- [ ] Click "Invite" button
- [ ] Verify success message
- [ ] Check email inbox for invitation
- [ ] Click onboarding link in email
- [ ] Complete onboarding flow
- [ ] Verify new staff appears in staff list
- [ ] Test staff login with new credentials
- [ ] Verify role-based permissions work correctly

## 🎯 Next Steps

Your staff invitation system is **fully functional and ready to use**! Simply:

1. Log in as business owner
2. Go to Staff tab
3. Fill in the invitation form
4. Click "Invite"
5. Staff member will receive email and can complete onboarding

The system handles everything automatically from invitation to account activation!
