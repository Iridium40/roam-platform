# Cloudflare Turnstile CAPTCHA Setup

This document describes the implementation of Cloudflare Turnstile for bot protection on the marketing landing page email registration form.

## Overview

Cloudflare Turnstile has been integrated into the ROAM marketing landing page to prevent spam submissions on the email registration form at `roamyourbestlife.com`.

## Environment Variables Required

You need to add the following environment variables to your deployment:

### Client-Side (Vercel/Environment)
- `VITE_TURNSTILE_SITE_KEY` - The public site key from Cloudflare Turnstile

### Server-Side (Vercel/Environment)
- `TURNSTILE_SECRET_KEY` - The secret key from Cloudflare Turnstile for server-side verification

## Setup Steps

### 1. Create a Cloudflare Turnstile Account
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to "Turnstile" in the sidebar
3. Click "Add Site"

### 2. Configure Your Site
- **Site name**: ROAM Marketing Landing
- **Domain**: roamyourbestlife.com
- **Widget mode**: Choose "Managed" for automatic challenge management, or "Non-interactive" for completely invisible protection
- **Preclearance**: Optional, provides better UX but requires proxy settings

### 3. Get Your Keys
After creating the site, you'll receive:
- **Site Key** (public) - Add this to your environment as `VITE_TURNSTILE_SITE_KEY`
- **Secret Key** (private) - Add this to your environment as `TURNSTILE_SECRET_KEY`

**Your Current Keys:**
```
VITE_TURNSTILE_SITE_KEY=0x4AAAAAAB9zmfe1ptXiTDgH
TURNSTILE_SECRET_KEY=0x4AAAAAAB9zmVx5NPATYoBZ5FXSLHgfeEM
```

### 4. Add Environment Variables to Vercel
1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add:
   - `VITE_TURNSTILE_SITE_KEY` = your site key
   - `TURNSTILE_SECRET_KEY` = your secret key
4. Redeploy your application

## Implementation Details

### Frontend (`MarketingLanding.tsx`)
- Uses `react-turnstile` package for the widget
- Widget displays below the email input field
- Token is validated before form submission
- Token resets after successful or failed submission

### Backend (`api/subscribe.ts`)
- Validates Turnstile token with Cloudflare's verification endpoint
- Returns 400 error if verification fails
- Processing continues only after successful verification

## Testing

### Development Testing
1. Get test keys from Cloudflare (always pass):
   - Site Key: `1x00000000000000000000AA`
   - Secret Key: `1x0000000000000000000000000000000AA`

2. Replace environment variables temporarily for testing

### Production
- Cloudflare provides analytics in the dashboard
- Monitor "Passed" vs "Failed" rates
- Review any suspicious activity

## Benefits

- **Zero user friction**: Managed mode automatically challenges only suspicious traffic
- **Privacy-first**: No tracking, GDPR compliant
- **Free tier**: 1 million free verifications per month
- **Better performance**: Lightweight compared to traditional CAPTCHAs
- **Mobile-friendly**: Works seamlessly on all devices

## Troubleshooting

### Widget Not Appearing
- Check that `VITE_TURNSTILE_SITE_KEY` is set correctly
- Verify domain is whitelisted in Cloudflare dashboard
- Check browser console for errors

### Verification Always Fails
- Ensure `TURNSTILE_SECRET_KEY` matches your Cloudflare site
- Check server logs for detailed error messages
- Verify the token is being sent correctly from frontend

### Too Many Challenges
- Adjust challenge sensitivity in Cloudflare dashboard
- Consider using preclearance for better UX
- Review firewall rules that might be too aggressive

## Additional Resources

- [Cloudflare Turnstile Documentation](https://developers.cloudflare.com/turnstile/)
- [Cloudflare Turnstile Dashboard](https://dash.cloudflare.com/?to=/:account/turnstile)
- [react-turnstile NPM Package](https://www.npmjs.com/package/react-turnstile)

## Support

For issues with this implementation, contact the development team.
For Cloudflare Turnstile issues, consult Cloudflare support or documentation.

