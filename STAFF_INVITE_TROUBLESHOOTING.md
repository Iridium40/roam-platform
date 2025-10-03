# Staff Invitation Email - Troubleshooting Guide

## Overview

The staff invitation feature allows business owners to invite team members (providers, dispatchers, owners) to join their business on the ROAM platform via email.

## How It Works

### Flow
1. **Owner fills out invite form** → Email, Role, Location
2. **API creates invitation record** → Stored in `providers` table with pending status
3. **Email sent via Resend** → Contains unique onboarding link
4. **Staff member clicks link** → Complete onboarding process
5. **Account activated** → Staff can access platform

### Database
```sql
-- Invitation record created in providers table
INSERT INTO providers (
  email,
  provider_role,
  location_id,
  business_id,
  verification_status, -- 'pending'
  is_active,           -- false
  invitation_token,    -- JWT token
  invitation_sent_at   -- timestamp
)
```

---

## Common Issues & Solutions

### 1. Email Not Sending

**Symptoms:**
- Success message shows but email never arrives
- Console shows "Email may not have been delivered"
- Warning: "Invitation created (email delivery pending)"

**Possible Causes:**

#### A. RESEND_API_KEY Not Configured
```bash
# Check Vercel environment variables
# Should see: RESEND_API_KEY=re_xxxxxxxxxxxxx
```

**Solution:**
1. Go to Vercel Dashboard → roam-provider-app → Settings → Environment Variables
2. Add/Update `RESEND_API_KEY` with value from Resend dashboard
3. Redeploy the application

#### B. Invalid API Key Format
**Error in logs:** `❌ RESEND_API_KEY appears to be invalid`

**Solution:**
- API key must start with `re_`
- Get correct key from [Resend Dashboard](https://resend.com/api-keys)
- Update environment variable and redeploy

#### C. Sender Email Not Verified
**Error from Resend:** `Domain not verified` or `Email not verified`

**Solution:**
1. Go to [Resend Dashboard](https://resend.com/domains)
2. Verify `providersupport@roamyourbestlife.com` or the entire domain
3. Follow Resend's verification process (DNS records)
4. Wait for verification to complete (can take a few minutes)

---

### 2. 500 Internal Server Error

**Symptoms:**
- API returns 500 error
- Toast shows "Failed to Send Invitation"
- No invitation record created

**Debugging Steps:**

#### Check Vercel Logs
```bash
# In Vercel Dashboard
1. Go to roam-provider-app → Deployments
2. Click on latest deployment
3. Go to Functions tab
4. Find /api/staff/invite
5. Check logs for detailed error
```

**Look for:**
- `❌ Resend API error:` - Email service issue
- `Error creating pending provider record:` - Database issue
- `Business not found` - Invalid business_id
- `Missing required fields` - Form validation issue

#### Common Errors:

**Database Connection Issue**
```
Error: Failed to create invitation record
```
**Solution:** Check `SUPABASE_SERVICE_ROLE_KEY` environment variable

**JWT Secret Missing**
```
Error: JWT_SECRET not configured
```
**Solution:** Add `JWT_SECRET` to Vercel environment variables

**Business Not Found**
```
Error: Business not found
```
**Solution:** Verify business_id exists in database

---

### 3. Duplicate Email Error

**Symptoms:**
- Error: "This email is already associated with your business"
- Invitation form rejects submission

**Cause:**
A provider record already exists with this email for this business

**Solutions:**

1. **If staff member already has account:**
   - They can login directly
   - No need for new invitation

2. **If previous invitation was sent:**
   - Check providers table for pending invitation
   - Resend the original invitation link
   - Or delete the old record and create new one

3. **Manual cleanup (if needed):**
```sql
-- Find pending invitation
SELECT * FROM providers 
WHERE email = 'staff@example.com' 
  AND business_id = 'your-business-id'
  AND verification_status = 'pending';

-- Delete if necessary (be careful!)
DELETE FROM providers 
WHERE email = 'staff@example.com' 
  AND business_id = 'your-business-id'
  AND verification_status = 'pending'
  AND is_active = false;
```

---

### 4. Email Goes to Spam

**Symptoms:**
- Email sends successfully
- Staff member doesn't receive it
- Found in spam folder

**Solutions:**

1. **Ask staff to check spam/junk folder**
2. **Whitelist sender address:**
   - Add `providersupport@roamyourbestlife.com` to contacts
3. **Domain reputation:**
   - Configure SPF, DKIM, DMARC records in Resend
   - Warm up domain by sending emails gradually
4. **Email content:**
   - Already follows best practices
   - Professional subject line
   - Clear sender name
   - Proper HTML formatting

---

### 5. Invitation Link Expired

**Symptoms:**
- Staff clicks link
- Error: "Invalid or expired invitation"
- Link doesn't work

**Cause:**
Invitation tokens expire after 7 days

**Solutions:**

1. **Resend invitation:**
   - Delete old invitation record
   - Send new invitation
   - New 7-day token generated

2. **Extend token expiry (if needed):**
```typescript
// In api/staff/invite.ts
const invitationToken = jwt.sign(
  { businessId, email, role, locationId },
  process.env.JWT_SECRET,
  { expiresIn: '14d' } // Change from 7d to 14d
);
```

---

## Verification Checklist

### Before Testing:
- [ ] `RESEND_API_KEY` set in Vercel env vars
- [ ] API key starts with `re_`
- [ ] `providersupport@roamyourbestlife.com` verified in Resend
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configured
- [ ] `JWT_SECRET` configured
- [ ] Latest code deployed to Vercel

### During Testing:
- [ ] Fill out invitation form correctly
- [ ] Submit invitation
- [ ] Check console for logs
- [ ] Verify success/warning message
- [ ] Check Vercel function logs
- [ ] Check Resend dashboard for email status

### After Sending:
- [ ] Verify invitation record in database
- [ ] Check staff member's inbox (and spam)
- [ ] Test onboarding link
- [ ] Confirm account activation

---

## Enhanced Logging

### Console Logs to Look For:

**Success Path:**
```
📧 Attempting to send email to: staff@example.com
📧 From: ROAM Provider Support <providersupport@roamyourbestlife.com>
📧 Subject: 🎉 You're Invited to Join Business Name on ROAM
✅ Email sent successfully: email-id-from-resend
```

**Failure Path:**
```
❌ RESEND_API_KEY is not properly configured
❌ Resend API error: {error details}
❌ Email service exception: {exception message}
```

**Warning Path:**
```
⚠️ Email service returned false. Check Resend API configuration.
⚠️ Invitation created but email may not have been delivered
```

---

## API Response Structure

### Success (Email Sent)
```json
{
  "success": true,
  "message": "Staff invitation sent successfully",
  "email": "staff@example.com",
  "businessName": "Business Name",
  "role": "provider",
  "emailSent": true
}
```

### Success (Email Pending)
```json
{
  "success": true,
  "message": "Staff invitation created (email delivery pending)",
  "email": "staff@example.com",
  "businessName": "Business Name",
  "role": "provider",
  "emailSent": false,
  "warning": "Invitation created but email may not have been delivered"
}
```

### Error Response
```json
{
  "error": "Error message here",
  "details": "Detailed error information"
}
```

---

## Manual Testing Steps

### 1. Test Full Flow
```bash
# 1. Open Staff page in provider app
# 2. Click "Invite Staff Member"
# 3. Fill in:
#    - Email: test+staff@yourdomain.com
#    - Role: Provider
#    - Location: Select location
# 4. Click "Send Invitation"
# 5. Check for success message
# 6. Check email inbox
# 7. Click invitation link
# 8. Complete onboarding
```

### 2. Test Error Handling
```bash
# Test duplicate email
# Try inviting same email twice

# Test invalid email format
# Use: notanemail

# Test missing fields
# Leave email blank
```

### 3. Test Email Delivery
```bash
# Check Resend dashboard
# https://resend.com/emails

# Look for:
# - Email sent status
# - Delivery confirmation
# - Any errors or bounces
```

---

## Environment Variables Required

### Vercel (roam-provider-app)
```bash
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=ey...
VITE_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
JWT_SECRET=your-secret-key-here
FRONTEND_URL=https://roamprovider.app
```

### Resend Dashboard
- Domain verified: `roamyourbestlife.com`
- Sender email verified: `providersupport@roamyourbestlife.com`
- API key active and not expired

---

## Quick Fixes

### Email Not Sending → Check API Key
```bash
# Vercel Dashboard
Settings → Environment Variables → RESEND_API_KEY
```

### 500 Error → Check Logs
```bash
# Vercel Dashboard
Deployments → Functions → /api/staff/invite → Logs
```

### Duplicate Email → Clean Database
```sql
-- Find and remove pending invitation
DELETE FROM providers 
WHERE email = 'duplicate@email.com' 
  AND verification_status = 'pending' 
  AND is_active = false;
```

### Email in Spam → Whitelist
```
Add providersupport@roamyourbestlife.com to contacts
Check spam folder
Configure DNS records in Resend
```

---

## Support Resources

- **Resend Documentation:** https://resend.com/docs
- **Resend Support:** https://resend.com/support
- **Vercel Logs:** Vercel Dashboard → Functions
- **Supabase Dashboard:** Check providers table
- **Email Testing:** Use [mail-tester.com](https://www.mail-tester.com)

---

## Recent Updates

### Latest Improvements (Current Deployment)
✅ Enhanced error logging with emoji indicators  
✅ API key validation and format checking  
✅ Graceful handling of email failures  
✅ Warning messages when email doesn't send  
✅ Detailed error messages in logs  
✅ Invitation record created even if email fails  

### What This Means
- **Invitations won't fail silently** - you'll see warnings
- **Better debugging** - detailed logs help identify issues
- **Graceful degradation** - invitation record created even if email fails
- **Manual resend possible** - use invitation_token from database

---

## Next Steps

If you're still experiencing issues:

1. **Check Vercel Logs** - Look for ❌ error indicators
2. **Verify Resend Setup** - Ensure domain/email verified
3. **Test with Different Email** - Try personal email address
4. **Check Database** - Verify invitation record was created
5. **Contact Support** - Provide logs and error messages

Remember: The invitation record is created in the database even if the email fails, so the invitation can be manually resent or the link can be shared directly with the staff member.
