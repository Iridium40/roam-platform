# Business Verification & Approval - Local Testing Guide

**Date**: October 6, 2025  
**Environment**: Local Development (localhost)

---

## 🎯 Testing Goal

Test the complete business verification and approval workflow locally:
1. Business signs up in Provider App (localhost:5177)
2. Admin reviews and approves in Admin App (localhost:5175)
3. Email is sent via Resend with localhost Phase 2 link
4. Business clicks link and continues to Phase 2

---

## ⚙️ Environment Setup

### 1. Admin App Environment Variables

Create/update `roam-admin-app/.env`:

```bash
# Supabase
VITE_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
VITE_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Email Service (Resend)
RESEND_API_KEY=re_your_actual_api_key_here

# JWT Token Secret (for Phase 2 links)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long

# Frontend URL for Phase 2 links (LOCAL TESTING)
FRONTEND_URL=http://localhost:5177
VITE_FRONTEND_URL=http://localhost:5177

# Phase 2 Token Settings
PHASE2_TOKEN_EXPIRATION=7d
```

### 2. Provider App Environment Variables

Create/update `roam-provider-app/.env`:

```bash
# Supabase
VITE_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
VITE_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# JWT Token Secret (MUST MATCH ADMIN APP)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
VITE_JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long

# API Base URL
VITE_API_BASE_URL=http://localhost:3002
```

### 3. Generate JWT Secret

If you don't have a JWT secret yet:

```bash
# Generate a secure random string (Mac/Linux)
openssl rand -base64 32

# Example output:
# kX9j2mP5nQ8vR4wT7yZ1aC3bD6eF9gH2jK4lM7nP0qS=

# Use this as your JWT_SECRET in both apps
```

---

## 🚀 Step-by-Step Testing Process

### Phase 1: Business Onboarding (Provider App)

#### Start Provider App
```bash
cd roam-provider-app
npm run dev

# Should start on:
# Client: http://localhost:5177
# Server: http://localhost:3002
```

#### Create Test Business
1. Navigate to http://localhost:5177/signup
2. **Step 1** - Account Creation:
   - Email: `test-business-001@example.com`
   - Password: `TestPass123!`
   - First Name: `John`
   - Last Name: `Smith`
3. **Step 2** - Business Information:
   - Business Name: `Test Spa & Wellness`
   - Business Type: `sole_proprietorship`
   - Phone: `305-555-0123`
   - Contact Email: Use a REAL email you can access (for testing)
   - Address: `123 Test St, Miami, FL 33101`
   - Service Categories: Select at least one
4. **Step 3** - Document Upload:
   - Upload Professional License (any PDF/image)
   - Upload Professional Headshot (any image)
   - If not sole proprietor: Upload Business License
5. **Step 4** - Review & Submit:
   - Check Terms of Service
   - Check Background Check consent
   - Click "Submit Application"
   - **Expected**: Redirect to "Application Submitted" page
   - Status: `verification_status = 'under_review'`

**Verify in Database**:
```sql
-- Check business was created
SELECT id, business_name, verification_status, contact_email 
FROM business_profiles 
WHERE business_name = 'Test Spa & Wellness';

-- Check documents were uploaded
SELECT document_type, verification_status 
FROM business_documents 
WHERE business_id = 'your-business-id';

-- Check application was submitted
SELECT application_status, submitted_at 
FROM provider_applications 
WHERE business_id = 'your-business-id';
```

---

### Phase 2: Admin Review & Approval (Admin App)

#### Start Admin App
```bash
cd roam-admin-app
npm run dev

# Should start on:
# Client: http://localhost:5175
# Server: http://localhost:3001
```

#### Admin Login
1. Navigate to http://localhost:5175/login
2. Login with admin credentials
3. Navigate to "Verification" page

#### Review Business
1. **Find Test Business**:
   - Should appear in "Pending" tab
   - Business Name: "Test Spa & Wellness"
   - Status badge: "Under Review"

2. **Review Documents**:
   - Click "View Documents" or expand card
   - For each document:
     - Click "View" to open file
     - Click "Verify" ✓ if valid
     - Or click "Reject" ✗ with reason if invalid
   - All required documents must be verified

3. **Approve Business**:
   - Click "Approve Business" button
   - Add approval notes (optional): "All documents verified. Approved for onboarding."
   - Click "Confirm Approval"

**Watch for**:
- ✅ Success toast: "Business Approved - Approval email sent successfully"
- ❌ Error toast: Check console logs

**Expected Backend Actions**:
```typescript
// 1. Update business_profiles
{
  verification_status: 'approved',
  approved_at: '2025-10-06T...',
  approved_by: 'admin_user_id',
  approval_notes: 'All documents verified...'
}

// 2. Generate Phase 2 token (JWT)
{
  business_id: '...',
  user_id: '...',
  application_id: '...',
  issued_at: 1696608000000,
  expires_at: 1697212800000, // 7 days later
  phase: 'phase2'
}

// 3. Send email via Resend
{
  from: 'ROAM Provider Support <onboarding@resend.dev>',
  to: ['test-business-001@example.com'], // Real email you used
  subject: 'Application Approved - Complete Your Setup',
  html: '...' // Contains Phase 2 link
}
```

**Check Console Logs** (Admin Server):
```
=== BUSINESS APPROVAL ===
Business ID: ...
Action: approve
...
=== GENERATING PHASE 2 TOKEN ===
Generated Phase 2 link: http://localhost:5177/provider-onboarding/phase2?token=eyJ...
Token expiration date: Sunday, October 13, 2025
=== SENDING EMAIL VIA RESEND ===
Sending approval email via Resend to: your-real-email@example.com
Resend API response status: 200
Approval email sent successfully: { id: '...' }
```

**Verify in Database**:
```sql
-- Check business is approved
SELECT verification_status, approved_at, approved_by, approval_notes 
FROM business_profiles 
WHERE business_name = 'Test Spa & Wellness';
-- Should show: verification_status = 'approved'
```

**Check Email Inbox**:
- Open the email you provided during signup
- Should receive email from "ROAM Provider Support"
- Subject: "Application Approved - Complete Your Setup"
- Contains blue button: "Complete Business Setup →"
- Link should be: `http://localhost:5177/provider-onboarding/phase2?token=eyJ...`

---

### Phase 3: Phase 2 Entry & Token Validation

#### Click Email Link
1. Open email in your inbox
2. Click "Complete Business Setup →" button
3. Should redirect to: `http://localhost:5177/provider-onboarding/phase2?token=eyJ...`

**Expected Flow**:
```
1. ProviderOnboardingPhase2 component loads
2. Extracts token from URL query params
3. Calls API: /api/validate-phase2-token
4. Server validates token:
   - Verifies JWT signature (using JWT_SECRET)
   - Checks expiration (< 7 days)
   - Checks business exists
   - Checks business is approved
   - Returns business_id and user_id
5. If valid:
   - Store business_id and user_id in state
   - Redirect to Phase 2 Welcome step
6. If invalid:
   - Show error: "Invalid or expired link"
   - Provide contact support message
```

**Provider App Console Logs**:
```
Validating Phase 2 token...
Token validation response: {
  valid: true,
  business_id: '...',
  user_id: '...',
  business_name: 'Test Spa & Wellness'
}
Phase 2 token validated successfully
Loading Phase 2 flow...
```

**Verify Token Validation API**:
```bash
# Test the validation endpoint directly
curl http://localhost:3002/api/validate-phase2-token \
  -H "Content-Type: application/json" \
  -d '{"token":"YOUR_TOKEN_FROM_EMAIL"}'

# Expected response:
{
  "valid": true,
  "business_id": "...",
  "user_id": "...",
  "business": {
    "id": "...",
    "business_name": "Test Spa & Wellness",
    "verification_status": "approved"
  }
}
```

---

## 🐛 Troubleshooting Guide

### Issue 1: No Email Received

**Check 1 - Resend API Key**:
```bash
# In admin app
cd roam-admin-app
cat .env | grep RESEND_API_KEY

# Should NOT be:
# RESEND_API_KEY=re_123456789_TEST_KEY

# Should be a real key from Resend dashboard
```

**Check 2 - Admin Server Logs**:
```bash
# Look for these lines:
"=== SENDING EMAIL VIA RESEND ==="
"Resend API response status: 200"
"Approval email sent successfully"

# If you see errors:
"Failed to send approval email"
"Resend API error response"
```

**Check 3 - Resend Dashboard**:
- Go to https://resend.com/emails
- Check "Logs" for recent sends
- Status should be "delivered"

**Check 4 - Email Address**:
- Make sure you used a REAL email during signup
- Check spam folder
- Gmail users: Check "Promotions" tab

### Issue 2: "Invalid or expired token"

**Check 1 - JWT_SECRET Mismatch**:
```bash
# Admin app .env
cd roam-admin-app
cat .env | grep JWT_SECRET

# Provider app .env
cd roam-provider-app
cat .env | grep JWT_SECRET

# MUST BE IDENTICAL!
```

**Check 2 - Token Expiration**:
```bash
# Tokens expire after 7 days
# If testing old email, token may be expired
# Re-approve business to generate new token
```

**Check 3 - Token Format**:
```javascript
// Token should be a long JWT string like:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJidXNpbmVzc19pZCI6IjEyMzQ1Njc4LTkwYWItY2RlZi0xMjM0LTU2Nzg5MGFiY2RlZiIsInVzZXJfaWQiOiI5ODc2NTQzMi0xMGZlLWRjYmEtOTg3Ni01NDMyMTBmZWRjYmEiLCJhcHBsaWNhdGlvbl9pZCI6IkFQUC0xMjM0NTY3OCIsImlzc3VlZF9hdCI6MTY5NjYwODAwMDAwMCwiZXhwaXJlc19hdCI6MTY5NzIxMjgwMDAwMCwicGhhc2UiOiJwaGFzZTIiLCJpYXQiOjE2OTY2MDgwMDAsImV4cCI6MTY5NzIxMjgwMCwiaXNzIjoicm9hbS1hZG1pbiIsImF1ZCI6InJvYW0tcHJvdmlkZXItYXBwIn0.YourSignatureHere

// NOT just: "abc123" or short string
```

### Issue 3: Business Status Not Updating

**Check 1 - Database Update**:
```sql
-- Run after approval
SELECT verification_status, approved_at, approved_by 
FROM business_profiles 
WHERE business_name = 'Test Spa & Wellness';

-- If still 'under_review':
-- Check admin server console for errors
```

**Check 2 - RLS Policies**:
```sql
-- Verify admin can update business_profiles
SELECT * FROM pg_policies 
WHERE tablename = 'business_profiles';

-- Should have policy allowing admin updates
```

**Check 3 - Supabase Connection**:
```bash
# Check if SUPABASE_SERVICE_ROLE_KEY is set
cd roam-admin-app
cat .env | grep SUPABASE_SERVICE_ROLE_KEY

# Should be a valid service role key (not anon key)
```

### Issue 4: Phase 2 Page Not Loading

**Check 1 - Provider App Running**:
```bash
# Make sure provider app is running
curl http://localhost:5177

# Should return HTML, not error
```

**Check 2 - Route Configuration**:
```typescript
// Check roam-provider-app/client/App.tsx
// Should have route:
<Route path="/provider-onboarding/phase2" element={<ProviderOnboardingPhase2 />} />
```

**Check 3 - Token in URL**:
```
# URL should be:
http://localhost:5177/provider-onboarding/phase2?token=eyJ...

# NOT:
http://localhost:5177/provider-onboarding/phase2
```

---

## ✅ Success Checklist

### Phase 1: Business Signup
- [ ] Business created in `business_profiles` table
- [ ] Documents uploaded to `business_documents` table
- [ ] Application submitted (`provider_applications` table)
- [ ] Status = 'under_review'
- [ ] Confirmation email received (optional)

### Phase 2: Admin Approval
- [ ] Business appears in AdminVerification page
- [ ] All documents verified
- [ ] "Approve Business" button clicked
- [ ] Success toast displayed
- [ ] Console shows "Approval email sent successfully"
- [ ] Database updated: `verification_status = 'approved'`
- [ ] Email received in inbox with Phase 2 link

### Phase 3: Phase 2 Entry
- [ ] Email link clicked
- [ ] Redirects to localhost:5177/provider-onboarding/phase2?token=...
- [ ] Token validated successfully
- [ ] Phase 2 welcome page loads
- [ ] Can proceed through Phase 2 steps

---

## 📋 Test Data Template

Use this data for consistent testing:

```json
{
  "business": {
    "email": "test-spa-001@example.com",
    "password": "TestPass123!",
    "firstName": "John",
    "lastName": "Smith",
    "businessName": "Test Spa & Wellness",
    "businessType": "sole_proprietorship",
    "phone": "305-555-0123",
    "contactEmail": "YOUR_REAL_EMAIL@example.com", // <-- Use real email!
    "address": "123 Test St",
    "city": "Miami",
    "state": "FL",
    "zipCode": "33101"
  },
  "admin": {
    "approvalNotes": "All documents verified. Business meets all requirements. Approved for Phase 2 onboarding."
  }
}
```

---

## 🎬 Quick Test Script

Run this to quickly verify the workflow:

```bash
#!/bin/bash
# test-approval-workflow.sh

echo "🚀 Starting ROAM Approval Workflow Test..."
echo ""

# 1. Start Admin App
echo "📱 Starting Admin App (localhost:5175)..."
cd roam-admin-app
npm run dev &
ADMIN_PID=$!
sleep 5

# 2. Start Provider App  
echo "📱 Starting Provider App (localhost:5177)..."
cd ../roam-provider-app
npm run dev &
PROVIDER_PID=$!
sleep 5

echo ""
echo "✅ Apps running!"
echo "   Admin App: http://localhost:5175"
echo "   Provider App: http://localhost:5177"
echo ""
echo "📝 Next Steps:"
echo "   1. Sign up business at: http://localhost:5177/signup"
echo "   2. Review/approve at: http://localhost:5175/verification"
echo "   3. Check email for Phase 2 link"
echo ""
echo "Press Ctrl+C to stop servers"
echo ""

# Wait for Ctrl+C
trap "kill $ADMIN_PID $PROVIDER_PID; exit" INT
wait
```

---

## 📊 Expected Timeline

- **Business Signup**: 5-10 minutes
- **Admin Review**: 2-5 minutes
- **Email Delivery**: 30 seconds - 2 minutes
- **Phase 2 Entry**: 1 minute

**Total Test Time**: ~15-20 minutes

---

## 🔍 Debugging Commands

```bash
# Check if apps are running
lsof -i :5175  # Admin client
lsof -i :3001  # Admin server
lsof -i :5177  # Provider client
lsof -i :3002  # Provider server

# Check environment variables
cd roam-admin-app && cat .env | grep -E "RESEND|JWT|FRONTEND"
cd roam-provider-app && cat .env | grep -E "JWT|API"

# Check Supabase connection
curl -X GET "https://your-project.supabase.co/rest/v1/business_profiles?select=id" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Test email API directly
curl -X POST http://localhost:3001/api/send-approval-email \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "Test Business",
    "contactEmail": "your-email@example.com",
    "businessId": "test-id",
    "userId": "test-user-id"
  }'
```

---

**Status**: Ready for local testing  
**Next**: Follow the step-by-step process above to test the complete workflow
