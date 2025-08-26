# Environment Setup Guide - Fixing Supabase Configuration

## Issue
The error "Missing Supabase environment variables" occurs when the required Supabase environment variables are not properly configured in your deployment environment.

## Required Environment Variables

All ROAM applications require these Supabase environment variables:

- `VITE_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `VITE_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous/public key

## Solutions by Environment

### 1. Local Development

#### Option A: Using DevServerControl Tool (Recommended)
```bash
# Set Supabase URL
VITE_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co

# Set Supabase Anonymous Key  
VITE_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key
```

#### Option B: Create .env files
Create `.env` files in each app directory with:
```env
VITE_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
VITE_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key
```

### 2. Vercel Deployment

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add the following variables:
   - `VITE_PUBLIC_SUPABASE_URL`: `https://your-project-id.supabase.co`
   - `VITE_PUBLIC_SUPABASE_ANON_KEY`: `your-actual-anon-key`
4. Redeploy your application

### 3. Fly.io Deployment

1. Set environment variables using Fly CLI:
```bash
fly secrets set VITE_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
fly secrets set VITE_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key
```

2. Redeploy your application:
```bash
fly deploy
```

### 4. Other Platforms

For other deployment platforms, consult their documentation on setting environment variables and ensure these two variables are configured.

## Finding Your Supabase Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to Settings → API
4. Copy:
   - **URL** → Use for `VITE_PUBLIC_SUPABASE_URL`
   - **anon public** key → Use for `VITE_PUBLIC_SUPABASE_ANON_KEY`

## Verification

After setting the environment variables:

1. Restart your development server or redeploy
2. Check browser console for successful Supabase connection
3. Look for log messages like "✅ Supabase connection test successful"

## Troubleshooting

### Environment Variables Not Loading
- Ensure variable names are exact (case-sensitive)
- For Vite apps, variables must start with `VITE_`
- Restart development server after adding variables

### Still Getting Errors
- Check browser developer tools for detailed error messages
- Verify Supabase project is active and accessible
- Ensure Supabase URL format is correct (https://your-project.supabase.co)

### Security Notes
- Never commit actual environment variables to version control
- Use different Supabase projects for development/production
- Rotate keys periodically for security

## Quick Fix Commands

For immediate local development setup:
```bash
# Using DevServerControl (if available)
VITE_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
VITE_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Or create .env file
echo "VITE_PUBLIC_SUPABASE_URL=https://your-project.supabase.co" >> .env
echo "VITE_PUBLIC_SUPABASE_ANON_KEY=your-anon-key" >> .env
```
