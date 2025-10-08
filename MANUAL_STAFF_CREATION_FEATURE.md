# Manual Staff Creation Feature

## ✅ New Feature: Create Staff Members Manually

Business owners can now add staff members in **two ways**:

### 1. **Email Invitation** (Existing)
- Owner enters email, role, and location
- System sends invitation email with onboarding link
- Staff member completes multi-step onboarding
- Account activated after onboarding completion

### 2. **Manual Creation** (NEW!)
- Owner fills in complete staff member information
- System creates account immediately with temporary password
- Staff member can log in right away
- Must change password on first login

---

## 🎯 How to Use Manual Staff Creation

### For Business Owners:

1. **Navigate to Staff Management Tab**
   - Log into Provider Portal
   - Click "Staff" in navigation

2. **Click "Create Manually" Button**
   - Located in top-right of "Add Staff Member" card
   - Opens a dialog form

3. **Fill in Staff Details**
   - **First Name** * (required)
   - **Last Name** * (required)
   - **Email Address** * (required)
   - **Phone Number** * (required)
   - **Role** * (required): Owner, Dispatcher, or Provider
   - **Location** (optional): Assign to specific location

4. **Create Staff Member**
   - Click "Create Staff Member" button
   - Success toast appears with temporary password
   - **IMPORTANT:** Copy the temporary password immediately!

5. **Share Credentials**
   - Give staff member their:
     - Email address (what they entered)
     - Temporary password (shown in toast)
     - Login URL: `https://roam-provider-app.vercel.app/login`

### For New Staff Members:

1. **First Login**
   - Go to Provider Portal login page
   - Enter email and temporary password
   - System will prompt for password change (coming soon)

2. **Change Password**
   - Enter new secure password
   - Confirm new password
   - Submit and continue to dashboard

3. **Access Dashboard**
   - Immediately active and can use all features
   - Role-based permissions apply

---

## 🔧 Technical Implementation

### Frontend Changes

**File:** `roam-provider-app/client/components/StaffManager.tsx`

**Added:**
- `showManualAddDialog` state
- `manualStaffData` state object
- `createStaffManually()` function
- "Create Manually" button in header
- Manual creation dialog with form fields
- Success toast showing temporary password

### Backend Changes

**File:** `roam-provider-app/server/routes/staff.ts`

**Added:**
- `generateTemporaryPassword()` helper function
- `createStaffManually()` route handler
- Automatic user account creation
- Auto-verification (no email needed)
- Temporary password generation (12 characters, mixed case, numbers, symbols)

**File:** `roam-provider-app/server/index.ts`

**Added:**
- Route: `POST /api/staff/create-manual`
- Import for `createStaffManually` handler

### API Endpoint

**POST `/api/staff/create-manual`**

**Request Body:**
```json
{
  "businessId": "uuid",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "5551234567",
  "role": "provider",
  "locationId": "uuid" (optional, null for no location)
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Staff member created successfully",
  "temporaryPassword": "aB3$xY9@zK2!",
  "provider": {
    "id": "provider-uuid",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "role": "provider"
  }
}
```

**Response (Error):**
```json
{
  "error": "Error message",
  "details": "Detailed error information"
}
```

---

## 🔐 Security Features

1. **Temporary Password Generation**
   - 12 characters long
   - Mix of uppercase, lowercase, numbers, and special characters
   - Randomly generated for each user

2. **Password Change Requirement**
   - User metadata flag: `must_change_password: true`
   - Forces password change on first login (frontend implementation needed)

3. **Auto-Verification**
   - Staff created by owner are automatically verified
   - `verification_status: 'verified'`
   - `is_active: true`

4. **Duplicate Prevention**
   - Checks if email exists in auth.users
   - Checks if email exists in providers table
   - Prevents duplicate accounts

5. **Business Association**
   - Staff can only be part of one business
   - Checks existing business associations
   - Returns error if already associated

---

## 🎨 UI/UX Features

### Manual Creation Dialog
- **Clean, professional design**
- **Two-column layout** for name fields
- **Form validation** (required fields marked with *)
- **Role selector** with icons and descriptions
- **Location dropdown** with "No specific location" option
- **Info alert** explaining temporary password
- **Disabled submit** until all required fields filled
- **Cancel button** to close without saving

### Success Feedback
- **Toast notification** with:
  - Success message
  - Staff member name
  - **Temporary password displayed for 10 seconds**
  - Allows time to copy password

### Form Reset
- Automatically clears form after successful creation
- Dialog closes automatically
- Staff list refreshes to show new member

---

## 📋 Comparison: Manual vs Email Invitation

| Feature | Email Invitation | Manual Creation |
|---------|-----------------|-----------------|
| **Setup Time** | Slower (wait for onboarding) | Instant |
| **Email Required** | Yes | No |
| **Password** | Staff sets their own | Owner gets temp password |
| **Onboarding Flow** | Multi-step wizard | Skip entirely |
| **Verification** | Auto after onboarding | Auto on creation |
| **Active Status** | After onboarding | Immediately |
| **Best For** | Remote staff, proper onboarding | Urgent needs, in-person setup |

---

## 🐛 Error Handling

### Common Errors and Solutions:

**"User is already a member of this business"**
- Email already exists for this business
- Solution: Use different email or edit existing staff

**"User is already associated with another business"**
- Email exists for a different business
- Solution: Staff can only work for one business

**"Invalid email format"**
- Email doesn't match pattern
- Solution: Ensure proper email format (e.g., user@domain.com)

**"Failed to create user account"**
- Supabase auth error
- Solution: Check logs, verify Supabase connection

**"Failed to create provider record"**
- Database error
- Solution: Check database schema, RLS policies

---

## ✅ Testing Checklist

### Manual Creation Flow:
- [ ] Log in as business owner
- [ ] Navigate to Staff tab
- [ ] Click "Create Manually" button
- [ ] Fill in all required fields
- [ ] Select role (try each: Owner, Dispatcher, Provider)
- [ ] Select location (or leave as "No specific location")
- [ ] Click "Create Staff Member"
- [ ] Copy temporary password from toast
- [ ] Verify staff appears in staff list
- [ ] Log out
- [ ] Log in as new staff with temp credentials
- [ ] Verify role-based permissions work
- [ ] Change password (when feature is implemented)

### Edge Cases:
- [ ] Try with existing email (should error)
- [ ] Try with invalid email format (should error)
- [ ] Try without required fields (button disabled)
- [ ] Cancel dialog mid-creation (form resets)
- [ ] Create multiple staff members in succession

---

## 🚀 Future Enhancements

### Coming Soon:
1. **Force Password Change on First Login**
   - Detect `must_change_password` flag
   - Show password change modal
   - Require new password before dashboard access

2. **Password Strength Validator**
   - Real-time strength indicator
   - Requirements display
   - Prevent weak passwords

3. **Temporary Password Display Options**
   - Copy to clipboard button
   - Email password to staff member
   - SMS password option
   - Print credentials button

4. **Bulk Staff Import**
   - CSV upload
   - Batch creation
   - Bulk temporary passwords

5. **Password Expiration**
   - Force password change after X days
   - Email reminders
   - Account lockout if not changed

---

## 📞 Support

If you encounter any issues with manual staff creation:

1. Check browser console for errors
2. Verify Supabase connection and environment variables
3. Check server logs for detailed error messages
4. Ensure user is logged in as business owner
5. Verify business ID is available in context

For additional help, contact the development team with:
- Error messages from console
- Steps to reproduce
- Browser and version
- Staff details being entered (except password)
