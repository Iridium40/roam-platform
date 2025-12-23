# Apple OAuth Setup Guide (Sign in with Apple)

*Last Updated: December 23, 2025*

## Overview

This guide walks through setting up **Sign in with Apple** for the ROAM platform. The functionality is already implemented in the codebase - you just need to configure it with your Apple Developer credentials.

## Prerequisites

### 1. Apple Developer Account
- You need an **Apple Developer Program membership** ($99/year)
- You need an **organization account** (not an individual account)
- To use Xcode and Apple Developer tools, you need:
  - macOS computer (Mac, MacBook, iMac, Mac Mini, or Mac Pro)
  - Xcode installed (free from Mac App Store)

### 2. Your Organization Details
Before setting up Apple OAuth, have this information ready:
- **Organization Name**: Your registered business/organization name
- **Website URL**: Your production domain (e.g., `https://roamyourbestlife.com`)
- **Bundle ID**: A unique identifier for your app (e.g., `com.roam.customer`)
- **Redirect URLs**: Where Apple sends users after authentication

## Step 1: Join Apple Developer Program

### Option A: If You Already Have an Apple ID
1. Go to https://developer.apple.com/programs/enroll/
2. Sign in with your Apple ID
3. Click **"Enroll"**
4. Choose **"Company/Organization"** (required for OAuth)
5. Provide your organization details:
   - Legal Entity Name
   - D-U-N-S Number (you can request one for free at https://www.dnb.com/duns-number.html)
   - Website
   - Work email
6. Complete payment ($99/year)
7. Wait for Apple to verify your organization (1-2 business days)

### Option B: If You Need to Create an Organization
1. Register a business entity (LLC, Corporation, etc.)
2. Get a D-U-N-S number from Dun & Bradstreet (free, takes 5-7 days)
3. Follow Option A steps above

**Note**: Individual Apple Developer accounts **cannot** use "Sign in with Apple" for web apps. You must have an organization account.

## Step 2: Find Your Organization in Apple Developer

Once your organization account is approved:

1. **Sign in to Apple Developer Console**
   - Go to https://developer.apple.com/account/
   - Sign in with your Apple ID

2. **Locate Your Organization Details**
   - Click on your name in the top right
   - View **"Team ID"** (you'll need this later)
   - Example Team ID: `ABCD123456`

3. **Organization Name**
   - Your organization name is displayed under **"Account Holder"**
   - This is the legal name you registered with

## Step 3: Configure Sign in with Apple

### 3.1 Create an App ID

1. Go to **Certificates, Identifiers & Profiles** → **Identifiers**
2. Click the **+** button
3. Select **"App IDs"** → **Continue**
4. Choose **"App"** → **Continue**
5. Fill in details:
   - **Description**: `ROAM Customer App` (or appropriate name)
   - **Bundle ID**: `com.roam.customer` (use explicit, not wildcard)
   - **Platform**: Check both iOS and Web (if applicable)
6. Under **Capabilities**, enable:
   - ✅ **Sign in with Apple**
7. Click **Continue** → **Register**

### 3.2 Create a Services ID (Required for Web)

This is the crucial step for web-based Sign in with Apple:

1. Go to **Identifiers** → Click **+**
2. Select **"Services IDs"** → **Continue**
3. Fill in:
   - **Description**: `ROAM Web Authentication`
   - **Identifier**: `com.roam.web` (must be different from App ID)
4. Click **Continue** → **Register**
5. Click on your newly created Services ID
6. Check **"Sign in with Apple"** → **Configure**
7. Add domains and redirect URLs:
   - **Primary App ID**: Select the App ID you created above
   - **Domains and Subdomains**: 
     ```
     roamyourbestlife.com
     www.roamyourbestlife.com
     roamservices.app
     ```
   - **Return URLs**:
     ```
     https://roamyourbestlife.com/auth/callback
     https://roamservices.app/auth/callback
     https://<your-project>.supabase.co/auth/v1/callback
     ```
8. Click **Save** → **Continue** → **Done**

### 3.3 Create a Private Key

1. Go to **Certificates, Identifiers & Profiles** → **Keys**
2. Click the **+** button
3. Enter **Key Name**: `ROAM Sign in with Apple Key`
4. Enable **"Sign in with Apple"** → **Configure**
5. Select your **Primary App ID** from the dropdown
6. Click **Save** → **Continue** → **Register**
7. **Download the key file** (`.p8` file) - **YOU CAN ONLY DOWNLOAD THIS ONCE**
8. Note your **Key ID** (e.g., `AB12CD34EF`)

⚠️ **IMPORTANT**: Store the `.p8` file securely. You cannot download it again. If lost, you must create a new key.

## Step 4: Configure Supabase

### 4.1 Add Apple OAuth Provider in Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Providers**
3. Find **"Apple"** in the list
4. Enable the toggle
5. Fill in the configuration:

```
Apple Client ID (Services ID): com.roam.web
Apple Team ID: ABCD123456
Apple Key ID: AB12CD34EF
Apple Private Key: (paste contents of your .p8 file)
```

6. Under **"Redirect URL"**, verify it shows:
   ```
   https://<your-project>.supabase.co/auth/v1/callback
   ```
7. Click **Save**

### 4.2 Add Redirect URL to Supabase

1. Still in Supabase dashboard → **Authentication** → **URL Configuration**
2. Add your app URLs to **"Redirect URLs"**:
   ```
   http://localhost:5174/auth/callback
   http://localhost:5177/auth/callback
   https://roamyourbestlife.com/auth/callback
   https://roamservices.app/auth/callback
   ```
3. Click **Save**

## Step 5: Update ROAM Environment Variables

### Customer App Environment Variables

Update `roam-customer-app/.env`:

```bash
# Existing Supabase config
VITE_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
VITE_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Apple OAuth Configuration (Optional - only if self-hosting Supabase)
# These are NOT needed if using Supabase Cloud (it handles this internally)
# VITE_APPLE_CLIENT_ID=com.roam.web
# VITE_APPLE_TEAM_ID=ABCD123456
# VITE_APPLE_KEY_ID=AB12CD34EF
```

### Provider App Environment Variables

Update `roam-provider-app/.env`:

```bash
# Same as customer app
VITE_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
VITE_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

**Note**: Apple OAuth credentials are stored in Supabase, not in your app's environment variables (for security). Your app only needs the Supabase connection details.

## Step 6: Testing Sign in with Apple

### Local Testing

1. **Start the development server**:
   ```bash
   cd roam-customer-app
   npm run dev
   ```

2. **Navigate to auth flow**:
   - Go to `http://localhost:5174`
   - Click **"Sign in with Apple"** button
   - You should be redirected to Apple's authentication page

3. **Complete authentication**:
   - Sign in with your Apple ID
   - Choose whether to share or hide your email
   - You'll be redirected back to your app

4. **Verify user creation**:
   - Check Supabase dashboard → Authentication → Users
   - You should see a new user with provider: "apple"

### Production Testing

1. Deploy your app to production (Vercel, Netlify, etc.)
2. Ensure your production domain is added to Apple's Services ID Return URLs
3. Test the complete flow on your production domain

## Step 7: Verify Implementation in Code

The ROAM codebase already has Apple OAuth implemented. Verify these files exist:

### Customer App
- ✅ `roam-customer-app/client/contexts/hooks/useOAuth.ts` - Contains `signInWithApple()`
- ✅ `roam-customer-app/client/components/CustomerAuthModal.tsx` - Apple sign-in button

### Provider App
- ✅ `roam-provider-app/client/contexts/AuthContext.tsx` - Contains `signInWithApple()`
- ✅ `roam-provider-app/client/lib/supabase/auth.ts` - Apple OAuth method

**No code changes are needed** - just configure Apple Developer and Supabase as described above.

## Troubleshooting

### Common Issues

#### 1. "Invalid client_id or redirect_uri"
**Cause**: Mismatch between Services ID and Return URLs in Apple Developer Console

**Solution**:
- Verify Services ID in Supabase matches Apple Developer Console
- Verify all redirect URLs are added to Apple's Services ID configuration
- Ensure URLs use HTTPS in production (not HTTP)

#### 2. "Unable to verify authorization signature"
**Cause**: Incorrect private key or key ID

**Solution**:
- Double-check you copied the entire `.p8` file contents (including header/footer)
- Verify Key ID matches the one shown in Apple Developer Console
- Ensure there are no extra spaces or line breaks in the private key

#### 3. "Email already exists"
**Cause**: User previously signed up with email/password

**Solution**:
- Users can only link accounts if enabled in Supabase
- Check Supabase → Authentication → Settings → "Link accounts" option

#### 4. "Redirect URL not whitelisted"
**Cause**: Missing redirect URL in Supabase configuration

**Solution**:
- Add all app URLs to Supabase → Authentication → URL Configuration
- Include localhost URLs for development

#### 5. Individual Account Error
**Cause**: Trying to use an individual Apple Developer account

**Solution**:
- You MUST use an organization account for "Sign in with Apple" on web
- Upgrade to organization account or create a new one

### Testing Tips

1. **Use Safari for best results**: Apple's auth works best in Safari on macOS/iOS
2. **Clear browser cache**: If experiencing issues, clear cookies and try again
3. **Check Supabase logs**: Go to Supabase → Logs → Authentication to see detailed errors
4. **Test with different accounts**: Try multiple Apple IDs to ensure it works consistently

### Debug Mode

Enable verbose logging in your app:

```typescript
// In your auth handler
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: "apple",
  options: {
    redirectTo: `${window.location.origin}/auth/callback`,
  },
});

if (error) {
  console.error("Apple OAuth Error:", {
    message: error.message,
    status: error.status,
    name: error.name,
  });
}
```

## Security Best Practices

1. **Never commit private keys** to version control
   - Use environment variables or secrets management
   - Add `.p8` files to `.gitignore`

2. **Rotate keys periodically**
   - Create new keys every 6-12 months
   - Revoke old keys after rotation

3. **Monitor authentication logs**
   - Check Supabase logs regularly
   - Set up alerts for unusual activity

4. **Limit redirect URLs**
   - Only add URLs you actually use
   - Remove development URLs from production configs

## Additional Resources

- [Apple Developer Documentation](https://developer.apple.com/documentation/sign_in_with_apple)
- [Supabase Apple OAuth Guide](https://supabase.com/docs/guides/auth/social-login/auth-apple)
- [Sign in with Apple Best Practices](https://developer.apple.com/design/human-interface-guidelines/sign-in-with-apple)

## Support

If you encounter issues not covered in this guide:

1. Check Supabase community forum: https://github.com/supabase/supabase/discussions
2. Review Apple Developer Forums: https://developer.apple.com/forums/
3. Contact ROAM development team with:
   - Error messages from browser console
   - Supabase authentication logs
   - Steps to reproduce the issue

---

## Quick Reference Checklist

- [ ] Apple Developer Organization account created ($99/year)
- [ ] App ID created with "Sign in with Apple" enabled
- [ ] Services ID created for web authentication
- [ ] Domains and Return URLs configured
- [ ] Private key (.p8) downloaded and stored securely
- [ ] Noted Team ID, Key ID, and Services ID
- [ ] Supabase Apple OAuth provider configured
- [ ] Redirect URLs added to Supabase
- [ ] Tested on localhost
- [ ] Tested on production domain
- [ ] User creation verified in Supabase dashboard

**Your Apple organization is the legal entity you registered with Apple Developer Program!**
