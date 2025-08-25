#!/bin/bash

# ROAM Admin App - Vercel Deployment Script
echo "🚀 Starting ROAM Admin App deployment to Vercel..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Please install it with: npm install -g vercel"
    exit 1
fi

# Build the application
echo "📦 Building application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix the build errors before deploying."
    exit 1
fi

echo "✅ Build completed successfully!"

# Deploy to Vercel
echo "🌐 Deploying to Vercel..."
vercel --prod

if [ $? -eq 0 ]; then
    echo "🎉 Deployment completed successfully!"
    echo "📱 Your application is now live on Vercel!"
else
    echo "❌ Deployment failed. Please check the error messages above."
    exit 1
fi
