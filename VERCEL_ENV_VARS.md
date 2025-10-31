# Vercel Environment Variables Setup

Copy and paste these environment variables into your Vercel project settings.

## Required Variables

### Turnstile CAPTCHA

Add these two variables to your Vercel project:

### For All Environments (Production, Preview, Development)

```
VITE_TURNSTILE_SITE_KEY=0x4AAAAAAB9zmfe1ptXiTDgH
```

```
TURNSTILE_SECRET_KEY=0x4AAAAAAB9zmVx5NPATYoBZ5FXSLHgfeEM
```

### Email Verification (Emailable)

Add this variable for email validation on the marketing landing page:

```
EMAILABLE_API_KEY=live_72231e69c75c1a8c1d0e
```

## How to Add in Vercel

1. Go to your project dashboard on [vercel.com](https://vercel.com)
2. Click on **Settings** → **Environment Variables**
3. Click **Add New**
4. Add each variable:
   - **Name**: `VITE_TURNSTILE_SITE_KEY`
   - **Value**: `0x4AAAAAAB9zmfe1ptXiTDgH`
   - **Environment**: Select all (Production, Preview, Development)
5. Click **Add**
6. Repeat for `TURNSTILE_SECRET_KEY`
7. Repeat for `EMAILABLE_API_KEY` with the value: `live_72231e69c75c1a8c1d0e`

## After Adding

1. Go to **Deployments** tab
2. Click the three dots (⋯) on your latest deployment
3. Click **Redeploy** to apply the new environment variables

Or push a new commit to trigger an automatic deployment.

## Verification

Once deployed, the Turnstile widget should appear on the email registration form at:
`https://roamyourbestlife.com`

If the widget doesn't appear, check:
1. Environment variables are set in Vercel
2. Deployment includes the new variables
3. Browser console for any errors

## Testing

You can test locally by creating a `.env.local` file:

```bash
cd roam-customer-app
echo "VITE_TURNSTILE_SITE_KEY=0x4AAAAAAB9zmfe1ptXiTDgH" >> .env.local
echo "TURNSTILE_SECRET_KEY=0x4AAAAAAB9zmVx5NPATYoBZ5FXSLHgfeEM" >> .env.local
echo "EMAILABLE_API_KEY=live_72231e69c75c1a8c1d0e" >> .env.local
```

Then run `npm run dev` to test locally.

