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

### Step 1: Verify Twilio Credentials in Twilio Console

1. Log into [Twilio Console](https://console.twilio.com/)
2. Go to **Account** → **API Keys & Tokens**
3. Copy your **Account SID** (starts with `AC`)
4. Copy your **Auth Token** (click "Show" to reveal it)

### Step 2: Set Environment Variables in Vercel

The SMS service checks for credentials in this order:
1. `TWILIO_ACCOUNT_SID` (preferred for server-side)
2. `VITE_TWILIO_ACCOUNT_SID` (fallback)
3. `TWILIO_AUTH_TOKEN` (preferred for server-side)
4. `VITE_TWILIO_AUTH_TOKEN` (fallback)
5. `TWILIO_PHONE_NUMBER` or `TWILIO_FROM_NUMBER`

#### Option A: Via Vercel Dashboard

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add/Update these variables:

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

```bash
# Set Account SID
vercel env add TWILIO_ACCOUNT_SID production

# Set Auth Token
vercel env add TWILIO_AUTH_TOKEN production

# Set Phone Number
vercel env add TWILIO_PHONE_NUMBER production
```

### Step 3: Verify Environment Variables Are Set

After setting the variables, check the logs on your next deployment. You should see:

```
🔐 Using Twilio credentials: {
  accountSidLength: 34,
  authTokenLength: 32,
  fromNumber: '+1234567890',
  accountSidPrefix: 'AC'
}
```

If you see `⚠️ Twilio is not configured`, the environment variables are not being read correctly.

### Step 4: Redeploy Your Application

After setting environment variables:

1. **For Production**: Variables are automatically available on next deployment
2. **For Preview**: You may need to redeploy or set variables for preview environment
3. **For Development**: Restart your local dev server

### Step 5: Test SMS Sending

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
- Ensure you're using the **Account SID** (not API Key SID)
- Ensure you're using the **Auth Token** (not API Secret)
- Verify credentials haven't been rotated/changed

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

