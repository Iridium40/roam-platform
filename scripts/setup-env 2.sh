#!/bin/bash

# ROAM Platform - Environment Setup Script
# Quickly set up development and production environment files

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║       ROAM Platform - Environment Setup                   ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if template files exist
if [ ! -f ".env.development.template" ] || [ ! -f ".env.production.template" ]; then
    echo -e "${RED}Error: Template files not found${NC}"
    echo "Make sure you're in the project root directory"
    exit 1
fi

echo -e "${BLUE}This script will help you set up your environment files.${NC}"
echo ""

# Development environment
if [ -f ".env.development" ]; then
    echo -e "${YELLOW}.env.development already exists${NC}"
    read -p "Overwrite? (yes/no): " OVERWRITE_DEV
    if [ "$OVERWRITE_DEV" = "yes" ]; then
        cp .env.development.template .env.development
        echo -e "${GREEN}✓ Created .env.development${NC}"
    else
        echo -e "${BLUE}Skipped .env.development${NC}"
    fi
else
    cp .env.development.template .env.development
    echo -e "${GREEN}✓ Created .env.development${NC}"
fi

# Production environment
if [ -f ".env.production" ]; then
    echo -e "${YELLOW}.env.production already exists${NC}"
    read -p "Overwrite? (yes/no): " OVERWRITE_PROD
    if [ "$OVERWRITE_PROD" = "yes" ]; then
        cp .env.production.template .env.production
        echo -e "${GREEN}✓ Created .env.production${NC}"
    else
        echo -e "${BLUE}Skipped .env.production${NC}"
    fi
else
    cp .env.production.template .env.production
    echo -e "${GREEN}✓ Created .env.production${NC}"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                  Setup Complete!                           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}Environment files created:${NC}"
echo "  - .env.development (for local development)"
echo "  - .env.production (for production)"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo ""
echo "1. Add your Development Supabase credentials:"
echo -e "   ${BLUE}nano .env.development${NC}"
echo "   Get from: https://supabase.com/dashboard/project/vssomyuyhicaxsgiaupo/settings/api"
echo ""
echo "2. Add your Production Supabase credentials:"
echo -e "   ${BLUE}nano .env.production${NC}"
echo "   Get from: https://supabase.com/dashboard/project/[YOUR_PROD_REF]/settings/api"
echo ""
echo "3. Set active environment:"
echo -e "   ${BLUE}cp .env.development .env${NC}  (for local dev)"
echo -e "   ${BLUE}cp .env.production .env${NC}   (for prod testing)"
echo ""
echo "4. Test your setup:"
echo -e "   ${BLUE}ROAM_ENV=development npm run test:smoke${NC}"
echo -e "   ${BLUE}ROAM_ENV=production npm run test:smoke${NC}"
echo ""
echo -e "${GREEN}For detailed guide, see: QUICK_ENV_SETUP.md${NC}"
echo ""

