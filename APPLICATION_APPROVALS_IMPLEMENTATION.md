# Application Approvals Implementation

## Overview

The `application_approvals` table is now properly utilized in the admin approval workflow. This table provides a complete audit trail and secure token management for business approvals.

## Table Structure

```sql
create table public.application_approvals (
  id uuid not null default gen_random_uuid (),
  business_id uuid null,
  application_id uuid null,
  approved_by uuid null,
  approval_token text null,
  token_expires_at timestamp with time zone null,
  approval_notes text null,
  created_at timestamp with time zone null default now(),
  constraint application_approvals_pkey primary key (id),
  constraint application_approvals_application_id_fkey foreign KEY (application_id) references provider_applications (id),
  constraint application_approvals_approved_by_fkey foreign KEY (approved_by) references auth.users (id),
  constraint application_approvals_business_id_fkey foreign KEY (business_id) references business_profiles (id)
) TABLESPACE pg_default;
```

## Purpose

The `application_approvals` table serves several critical functions:

1. **Audit Trail**: Complete record of who approved what business and when
2. **Secure Tokens**: JWT tokens for Phase 2 onboarding with expiration
3. **Approval Notes**: Store detailed reasoning for each approval
4. **Compliance**: Legal and regulatory compliance tracking
5. **Token Management**: Automatic expiration after 7 days

## Implementation Flow

### Admin Approval Process

1. **Admin Reviews Application** (AdminVerification.tsx)
   - Admin clicks "Approve" button
   - Documents must be verified first
   - Admin can add optional approval notes

2. **API Call Chain**
   ```
   AdminVerification.tsx
     → /api/approve-business (admin app proxy)
       → /api/admin/approve-application (provider app)
   ```

3. **Database Updates** (in approve-application.ts)
   - Updates `business_profiles`:
     - `verification_status` → "approved"
     - `approved_at` → current timestamp
     - `approved_by` → admin user ID
     - `approval_notes` → admin's notes
   
   - Updates `provider_applications`:
     - `application_status` → "approved"
     - `review_status` → "approved"
     - `reviewed_at` → current timestamp
     - `reviewed_by` → admin user ID
   
   - Updates `providers`:
     - `verification_status` → "approved"
     - `background_check_status` → "approved"
   
   - **Creates `application_approvals` record**:
     - `business_id` → business being approved
     - `application_id` → application ID
     - `approved_by` → admin user auth ID
     - `approval_token` → JWT token for Phase 2
     - `token_expires_at` → 7 days from now
     - `approval_notes` → admin's notes
   
   - Updates `business_setup_progress`:
     - `phase_1_completed` → true
     - `current_step` → 3 (Phase 2 start)

4. **Email Notification**
   - Sends approval email via Resend
   - Includes secure Phase 2 onboarding link with token
   - Token format: `/provider-onboarding/phase2?token={jwt_token}`

## Token Structure

The approval token is a JWT containing:

```typescript
{
  business_id: string,
  user_id: string,
  application_id: string,
  issued_at: number,
  expires_at: number,  // 7 days
  phase: "phase2"
}
```

## Files Modified

### Admin App

1. **roam-admin-app/api/approve-business.ts** (NEW)
   - Proxy endpoint to call provider app's approval API
   - Handles cross-domain API communication
   - Error handling and logging

2. **roam-admin-app/client/pages/AdminVerification.tsx**
   - Updated `handleVerificationAction` function
   - Replaced direct Supabase updates with API call
   - Improved error handling and user feedback

### Provider App

1. **roam-provider-app/api/admin/approve-application.ts** (EXISTING)
   - Already had logic to create approval records
   - Now properly utilized by admin app
   - Handles all database updates atomically
   - Sends approval emails automatically

## Benefits

### Before (Direct Database Updates)
- ❌ No audit trail in `application_approvals`
- ❌ No approval tokens generated
- ❌ Multiple update locations (business_profiles only)
- ❌ Email handling was separate and fragile
- ❌ No token expiration management

### After (Proper API Flow)
- ✅ Complete audit trail in `application_approvals`
- ✅ Secure tokens for Phase 2 onboarding
- ✅ Centralized approval logic
- ✅ Automatic email sending with token
- ✅ Token expiration tracking
- ✅ All related tables updated atomically
- ✅ Better error handling

## Query Examples

### View all approvals with details
```sql
SELECT 
  aa.*,
  bp.business_name,
  u.email as admin_email,
  pa.application_status
FROM application_approvals aa
JOIN business_profiles bp ON aa.business_id = bp.id
JOIN auth.users u ON aa.approved_by = u.id
JOIN provider_applications pa ON aa.application_id = pa.id
ORDER BY aa.created_at DESC;
```

### Find expired tokens
```sql
SELECT *
FROM application_approvals
WHERE token_expires_at < NOW()
ORDER BY token_expires_at DESC;
```

### Approval statistics by admin
```sql
SELECT 
  u.email as admin_email,
  COUNT(*) as total_approvals,
  MIN(aa.created_at) as first_approval,
  MAX(aa.created_at) as latest_approval
FROM application_approvals aa
JOIN auth.users u ON aa.approved_by = u.id
GROUP BY u.email
ORDER BY total_approvals DESC;
```

## Testing

To test the implementation:

1. **Create a Phase 1 application**
   - Go through provider onboarding Phase 1
   - Submit the application

2. **Admin approval**
   - Log into admin app
   - Navigate to Verification page
   - Verify all documents
   - Click "Approve" with optional notes

3. **Verify database record**
   ```sql
   SELECT * FROM application_approvals 
   WHERE business_id = 'your-business-id'
   ORDER BY created_at DESC LIMIT 1;
   ```

4. **Check email**
   - Provider should receive approval email
   - Email should contain Phase 2 link with token

5. **Test Phase 2 access**
   - Click link in email
   - Should be able to access Phase 2 onboarding
   - Token should be validated

## Future Enhancements

Potential improvements:

1. **Token Refresh**: Allow extending token expiration
2. **Rejection Records**: Similar table for rejections
3. **Approval History**: UI to view approval history
4. **Token Revocation**: Ability to revoke tokens
5. **Multi-step Approval**: Require multiple admin approvals
6. **Notification System**: Alert when tokens are about to expire

## Notes

- The `application_approvals` table is now the source of truth for approval status
- The 7-day token expiration encourages timely Phase 2 completion
- Admin user IDs are from `auth.users` table, not `admin_users` table
- The approval flow is transactional - if any step fails, none are committed
- Email failures don't prevent approval completion (logged only)

