#!/bin/bash

# ROAM Admin App Deployment Script
# This script handles deployment of the admin app with shared package dependencies

set -e

echo "🚀 Starting ROAM Admin App deployment..."

# Get the current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

echo "📁 Project root: $PROJECT_ROOT"
echo "📁 App directory: $SCRIPT_DIR"

# Change to project root to build shared packages
cd "$PROJECT_ROOT"

echo "📦 Building shared packages..."
npm run build

# Change back to app directory
cd "$SCRIPT_DIR"

echo "🔧 Installing dependencies..."
npm install

echo "🏗️ Building admin app..."
npm run build

echo "🚀 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment complete!"
