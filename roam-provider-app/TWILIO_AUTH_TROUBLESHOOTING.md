# Twilio Authentication Error (20003) - Troubleshooting Guide

## Error Message
```
❌ SMS service error: {
  error: 'Authenticate',
  code: 20003,
  status: 401
}
```

## What This Means
Error 20003 indicates that Twilio rejected your authentication credentials. This typically means:
- The Account SID is incorrect
- The Auth Token is incorrect
- The credentials are not properly set in Vercel environment variables

## Solution Steps

### Step 1: Choose Authentication Method

Twilio supports two authentication methods:

**Option A: API Keys (Recommended - More Secure)**
- Can be revoked without affecting other services
- Better for production environments
- Requires: Account SID + API Key SID + API Key Secret

**Option B: Auth Token (Simpler)**
- Uses your main account credentials
- Requires: Account SID + Auth Token

### Step 2: Get Your Credentials from Twilio Console

1. Log into [Twilio Console](https://console.twilio.com/)
2. Go to **Account** → **API Keys & Tokens**

**For API Key Authentication (Recommended):**
- Copy your **Account SID** (starts with `AC`)
- Create a new API Key (or use existing):
  - Click **Create API Key**
  - Give it a friendly name (e.g., "ROAM SMS Service")
  - Copy the **API Key SID** (starts with `SK`)
  - Copy the **API Key Secret** (shown only once - save it!)

**For Auth Token Authentication:**
- Copy your **Account SID** (starts with `AC`)
- Copy your **Auth Token** (click "Show" to reveal it)

### Step 3: Set Environment Variables in Vercel

The SMS service supports both authentication methods and checks for credentials in this order:

**For API Key Authentication (Preferred):**
1. `TWILIO_ACCOUNT_SID` or `VITE_TWILIO_ACCOUNT_SID`
2. `TWILIO_API_KEY_SID` or `VITE_TWILIO_API_KEY_SID`
3. `TWILIO_API_KEY_SECRET` or `VITE_TWILIO_API_KEY_SECRET`
4. `TWILIO_PHONE_NUMBER` or `TWILIO_FROM_NUMBER`

**For Auth Token Authentication (Fallback):**
1. `TWILIO_ACCOUNT_SID` or `VITE_TWILIO_ACCOUNT_SID`
2. `TWILIO_AUTH_TOKEN` or `VITE_TWILIO_AUTH_TOKEN`
3. `TWILIO_PHONE_NUMBER` or `TWILIO_FROM_NUMBER`

**Note:** If both API Key and Auth Token are provided, API Key will be used (more secure).

#### Option A: Via Vercel Dashboard

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add/Update these variables:

**Using API Keys (Recommended):**
```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_KEY_SID=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_KEY_SECRET=your_api_key_secret_here
TWILIO_PHONE_NUMBER=+1234567890
```

**OR Using Auth Token:**
```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

**Important:**
- Do NOT include quotes around the values
- Do NOT include spaces before or after the `=` sign
- The Account SID should start with `AC`
- The phone number should include country code (e.g., `+1` for US)

#### Option B: Via Vercel CLI

**Using API Keys (Recommended):**
```bash
# Set Account SID
vercel env add TWILIO_ACCOUNT_SID production

# Set API Key SID
vercel env add TWILIO_API_KEY_SID production

# Set API Key Secret
vercel env add TWILIO_API_KEY_SECRET production

# Set Phone Number
vercel env add TWILIO_PHONE_NUMBER production
```

**OR Using Auth Token:**
```bash
# Set Account SID
vercel env add TWILIO_ACCOUNT_SID production

# Set Auth Token
vercel env add TWILIO_AUTH_TOKEN production

# Set Phone Number
vercel env add TWILIO_PHONE_NUMBER production
```

### Step 4: Verify Environment Variables Are Set

After setting the variables, check the logs on your next deployment. You should see:

**If using API Keys:**
```
🔐 Using Twilio credentials: {
  accountSidLength: 34,
  authMethod: 'API Key',
  fromNumber: '+1234567890',
  accountSidPrefix: 'AC'
}
```

**If using Auth Token:**
```
🔐 Using Twilio credentials: {
  accountSidLength: 34,
  authMethod: 'Auth Token',
  fromNumber: '+1234567890',
  accountSidPrefix: 'AC'
}
```

If you see `⚠️ Twilio is not configured`, the environment variables are not being read correctly.

### Step 5: Redeploy Your Application

After setting environment variables:

1. **For Production**: Variables are automatically available on next deployment
2. **For Preview**: You may need to redeploy or set variables for preview environment
3. **For Development**: Restart your local dev server

### Step 6: Test SMS Sending

Use the test script to verify:

```bash
cd roam-provider-app
npx tsx scripts/test-booking-completion-sms.ts [your_phone_number]
```

## Common Issues

### Issue 1: Variables Set but Not Available

**Symptom**: Logs show `hasAccountSid: false` even though variables are set in Vercel

**Solution**:
- Ensure variables are set for the correct environment (Production/Preview/Development)
- Redeploy the application after setting variables
- Check that variable names match exactly (case-sensitive)

### Issue 2: Wrong Credentials

**Symptom**: Error 20003 persists after setting variables

**Solution**:
- Double-check credentials in Twilio Console
- **If using API Keys:** Ensure you're using:
  - Account SID (starts with `AC`)
  - API Key SID (starts with `SK`)
  - API Key Secret (not the Auth Token)
- **If using Auth Token:** Ensure you're using:
  - Account SID (starts with `AC`)
  - Auth Token (not API Key Secret)
- Verify credentials haven't been rotated/changed
- For API Keys: Ensure the API Key hasn't been revoked

### Issue 3: Phone Number Format

**Symptom**: SMS fails with phone number errors

**Solution**:
- Use E.164 format: `+[country code][number]`
- Example: `+15044171014` (US number)
- Remove spaces, dashes, and parentheses
- Ensure the phone number is verified in Twilio (for trial accounts)

### Issue 4: VITE_ Prefix Confusion

**Symptom**: Variables with `VITE_` prefix not working

**Solution**:
- The code now checks both `TWILIO_*` and `VITE_TWILIO_*` variants
- For server-side API routes, prefer `TWILIO_*` (without VITE_ prefix)
- `VITE_` prefix is primarily for client-side code

## Verification Checklist

**For API Key Authentication:**
- [ ] Twilio Account SID starts with `AC` and is 34 characters
- [ ] API Key SID starts with `SK` and is 34 characters
- [ ] API Key Secret is 32 characters
- [ ] Phone number is in E.164 format (`+1...`)
- [ ] Environment variables set in Vercel (correct environment)
- [ ] Application redeployed after setting variables
- [ ] No quotes or spaces in environment variable values
- [ ] Credentials match Twilio Console exactly
- [ ] API Key hasn't been revoked

**For Auth Token Authentication:**
- [ ] Twilio Account SID starts with `AC` and is 34 characters
- [ ] Auth Token is 32 characters
- [ ] Phone number is in E.164 format (`+1...`)
- [ ] Environment variables set in Vercel (correct environment)
- [ ] Application redeployed after setting variables
- [ ] No quotes or spaces in environment variable values
- [ ] Credentials match Twilio Console exactly

## Testing After Fix

Once you've fixed the credentials, test again:

1. **Update a booking to "completed"** via the API
2. **Check logs** for:
   ```
   🔐 Using Twilio credentials: ...
   📱 Sending SMS: { to: '+1...', from: '+1...', bodyLength: ... }
   ✅ SMS sent successfully: SM...
   ```
3. **Check notification_logs** table:
   ```sql
   SELECT * FROM notification_logs 
   WHERE notification_type = 'customer_booking_completed' 
     AND channel = 'sms'
   ORDER BY created_at DESC 
   LIMIT 1;
   ```
4. **Verify SMS received** on customer's phone

## Additional Resources

- [Twilio Error 20003 Documentation](https://www.twilio.com/docs/errors/20003)
- [Twilio Environment Variables Guide](https://www.twilio.com/docs/usage/secure-credentials)
- [Vercel Environment Variables Guide](https://vercel.com/docs/concepts/projects/environment-variables)

