# Apple OAuth Quick Start - Finding Your Organization

**TL;DR**: To use "Sign in with Apple" and Xcode, you need an **Apple Developer Organization account**. Here's how to find or create it:

## Already Have an Apple Developer Account?

### Finding Your Organization

1. **Go to**: https://developer.apple.com/account/
2. **Sign in** with your Apple ID
3. **Look at the top right** - your organization name is displayed
4. **Check "Team ID"** - this is your organization identifier (e.g., `ABCD123456`)

**If you see an organization name → You have an org account! ✅**  
**If you see only your personal name → You have an individual account ❌**

## Need to Create an Organization?

### What You Need:
- A registered business entity (LLC, Corporation, etc.)
- A D-U-N-S number (free from Dun & Bradstreet)
- $99/year Apple Developer membership fee
- 1-2 business days for Apple verification

### Quick Steps:
1. Register your business entity
2. Get D-U-N-S number: https://www.dnb.com/duns-number.html (free, 5-7 days)
3. Enroll: https://developer.apple.com/programs/enroll/
4. Choose **"Company/Organization"** (NOT individual)
5. Complete payment and verification

## Why Do I Need This?

### For "Sign in with Apple" (OAuth):
- ✅ **Organization accounts** can use "Sign in with Apple" for web apps
- ❌ **Individual accounts** CANNOT use web-based Apple OAuth
- The ROAM platform already has Apple OAuth implemented in the code
- You just need to configure it with your organization credentials

### For Xcode:
- You need a Mac computer (macOS)
- Download Xcode from Mac App Store (free)
- Sign in with your Apple ID that's part of the organization
- Xcode will automatically recognize your organization membership

## What's Already Done in ROAM?

✅ **Code Implementation**: Apple OAuth is fully implemented  
✅ **UI Components**: "Sign in with Apple" buttons exist  
✅ **Auth Hooks**: `signInWithApple()` functions ready  
✅ **Callback Handling**: OAuth callback routes configured  

**What You Need to Do**: Just configure your Apple Developer credentials!

## Next Steps

**Full Setup Guide**: See [APPLE_OAUTH_SETUP_GUIDE.md](./APPLE_OAUTH_SETUP_GUIDE.md) for complete instructions on:
1. Creating Apple Developer account
2. Configuring Services ID and App ID
3. Generating private keys
4. Setting up Supabase Apple OAuth provider
5. Testing the implementation

## Quick Reference: Key Terms

| Term | What It Is | Where to Find It |
|------|-----------|-----------------|
| **Organization** | Your registered business entity | Apple Developer Console → Account Holder |
| **Team ID** | Organization identifier (10 chars) | Apple Developer Console → Top right |
| **Services ID** | OAuth client identifier | Create in Certificates, Identifiers & Profiles |
| **App ID** | App identifier for capabilities | Create in Certificates, Identifiers & Profiles |
| **Private Key** | `.p8` file for authentication | Generate in Keys section (download once!) |

## Common Questions

**Q: Can I use my personal Apple ID?**  
A: Yes, but you need to enroll it in the Developer Program as an organization account, not individual.

**Q: How much does it cost?**  
A: $99/year for Apple Developer Program membership.

**Q: How long does approval take?**  
A: 1-2 business days after submitting organization details.

**Q: Do I need to change any code in ROAM?**  
A: No! The code is ready. You only need to configure your Apple Developer credentials in Supabase.

**Q: What if I already have an individual account?**  
A: You cannot convert it. You need to create a new organization account with your business details.

## Support

- **Full Documentation**: [APPLE_OAUTH_SETUP_GUIDE.md](./APPLE_OAUTH_SETUP_GUIDE.md)
- **Apple Developer Support**: https://developer.apple.com/support/
- **D-U-N-S Number Request**: https://www.dnb.com/duns-number.html
- **Supabase Apple OAuth Docs**: https://supabase.com/docs/guides/auth/social-login/auth-apple

---

**Bottom Line**: Your "organization" is the business entity you register with Apple Developer Program. The ROAM platform is ready to use it - you just need to set it up! 🚀
