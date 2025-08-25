# ROAM Platform Deployment Guide

## 🚀 Deployment Options

The ROAM Platform supports multiple deployment strategies to fit your needs:

### Option 1: Deploy Individual Apps (Recommended)

Each app can be deployed independently from its own directory:

```bash
# Deploy admin app only
cd apps/roam-admin-app
npm run deploy

# Deploy provider app only
cd apps/roam-provider-app
npm run deploy

# Deploy customer app only
cd apps/roam-customer-app
npm run deploy
```

### Option 2: Deploy from Root with Turbo

Deploy all apps from the root directory:

```bash
# Deploy all apps
npm run deploy:all

# Deploy specific app from root
npm run deploy:admin
npm run deploy:provider
npm run deploy:customer
```

### Option 3: Deploy Services Separately

Deploy shared services as independent Vercel functions:

```bash
# Deploy auth service
cd packages/auth-service
vercel --prod

# Deploy notification service
cd packages/notification-service
vercel --prod

# Deploy payment service
cd packages/payment-service
vercel --prod
```

## 📁 Directory Structure for Deployment

```
roam-platform/
├── apps/
│   ├── roam-admin-app/          # Deploy independently
│   │   ├── package.json         # Includes @roam/shared dependency
│   │   ├── deploy.sh           # Handles shared package build
│   │   ├── vercel.json         # Vercel configuration
│   │   └── .vercelignore       # Excludes other apps
│   ├── roam-provider-app/       # Deploy independently
│   └── roam-customer-app/       # Deploy independently
├── packages/
│   ├── shared/                  # Built and included in apps
│   ├── auth-service/           # Deploy as separate service
│   ├── notification-service/   # Deploy as separate service
│   └── payment-service/        # Deploy as separate service
└── package.json                # Root workspace configuration
```

## 🔧 Deployment Process

### For Individual App Deployment

1. **Navigate to app directory**:
   ```bash
   cd apps/roam-admin-app
   ```

2. **Run deployment script**:
   ```bash
   npm run deploy
   ```

   This script will:
   - Build shared packages from root
   - Install dependencies
   - Build the app
   - Deploy to Vercel

### For Root Deployment

1. **Deploy from root directory**:
   ```bash
   npm run deploy:admin
   ```

   This will:
   - Build all shared packages
   - Deploy the specified app

## ⚙️ Vercel Configuration

### App-Level Configuration

Each app has its own `vercel.json`:

```json
{
  "buildCommand": "cd ../../ && npm run build && cd apps/roam-admin-app && npm run build",
  "outputDirectory": "dist/spa",
  "installCommand": "cd ../../ && npm install && cd apps/roam-admin-app && npm install",
  "framework": "vite"
}
```

### Environment Variables

Set these in your Vercel project:

```bash
# Supabase Configuration
VITE_PUBLIC_SUPABASE_URL=your_supabase_url
VITE_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Service URLs (if deploying services separately)
VITE_AUTH_SERVICE_URL=https://auth-service.vercel.app
VITE_NOTIFICATION_SERVICE_URL=https://notification-service.vercel.app
VITE_PAYMENT_SERVICE_URL=https://payment-service.vercel.app

# Other app-specific variables
VITE_APP_NAME=ROAM Admin
VITE_APP_ENV=production
```

## 🎯 Deployment Scenarios

### Scenario 1: Deploy Only Admin App

```bash
# Option A: From app directory
cd apps/roam-admin-app
npm run deploy

# Option B: From root directory
npm run deploy:admin
```

### Scenario 2: Deploy Admin App with Services

```bash
# 1. Deploy services first
cd packages/auth-service && vercel --prod
cd packages/notification-service && vercel --prod
cd packages/payment-service && vercel --prod

# 2. Deploy admin app
cd apps/roam-admin-app
npm run deploy
```

### Scenario 3: Deploy All Apps

```bash
# From root directory
npm run deploy:all
```

## 🔍 Troubleshooting

### Common Issues

1. **Shared package not found**:
   ```bash
   # Ensure shared packages are built
   cd ../../ && npm run build
   cd apps/roam-admin-app && npm install
   ```

2. **Build errors**:
   ```bash
   # Clean and rebuild
   npm run clean
   npm run build
   ```

3. **Vercel deployment fails**:
   ```bash
   # Check Vercel logs
   vercel logs
   
   # Redeploy with verbose output
   vercel --prod --debug
   ```

### Debug Commands

```bash
# Check if shared packages are built
ls packages/shared/dist/

# Verify dependencies
npm ls @roam/shared

# Test build locally
npm run build:with-deps

# Check Vercel configuration
vercel --debug
```

## 📊 Deployment Checklist

### Before Deployment

- [ ] Shared packages are built (`npm run build` from root)
- [ ] Environment variables are set in Vercel
- [ ] Dependencies are installed (`npm install`)
- [ ] App builds successfully locally (`npm run build`)
- [ ] TypeScript compilation passes (`npm run typecheck`)

### After Deployment

- [ ] App is accessible at the deployed URL
- [ ] Environment variables are correctly loaded
- [ ] Shared functionality works (validation, formatting, etc.)
- [ ] API endpoints are responding
- [ ] No console errors in browser

## 🚀 Production Deployment

### Recommended Production Setup

1. **Deploy services first**:
   ```bash
   # Deploy shared services
   cd packages/auth-service && vercel --prod
   cd packages/notification-service && vercel --prod
   cd packages/payment-service && vercel --prod
   ```

2. **Deploy apps**:
   ```bash
   # Deploy each app
   cd apps/roam-admin-app && npm run deploy
   cd apps/roam-provider-app && npm run deploy
   cd apps/roam-customer-app && npm run deploy
   ```

3. **Verify deployment**:
   - Check all URLs are accessible
   - Test core functionality
   - Monitor error logs

### Environment-Specific Deployments

```bash
# Development
vercel --env development

# Staging
vercel --env staging

# Production
vercel --prod
```

## 📈 Monitoring and Maintenance

### Post-Deployment Monitoring

- Monitor Vercel function logs
- Check application performance
- Verify shared package functionality
- Test cross-app integrations

### Regular Maintenance

- Update shared packages as needed
- Monitor dependency updates
- Review and update environment variables
- Check for security updates

## 🆘 Support

If you encounter deployment issues:

1. Check the troubleshooting section above
2. Review Vercel deployment logs
3. Verify environment variables
4. Test locally before deploying
5. Contact the development team

---

**Remember**: You can deploy any individual app without deploying the others. The shared packages are built and included in each app's deployment, so each app remains independent.
