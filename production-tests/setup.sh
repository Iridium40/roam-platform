#!/bin/bash

# ROAM Platform - Production Testing Setup Script
# This script sets up the production testing environment

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║    ROAM Platform - Production Testing Setup               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -d "production-tests" ]; then
    echo -e "${RED}Error: Please run this script from the project root directory${NC}"
    exit 1
fi

# Check Node.js version
echo "Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Error: Node.js 18+ required. Current version: $(node -v)${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js version: $(node -v)${NC}"

# Check if .env.production.test exists
echo ""
echo "Checking environment configuration..."
if [ ! -f ".env.production.test" ]; then
    echo -e "${YELLOW}⚠ .env.production.test not found${NC}"
    echo "Creating from example..."
    cp .env.production.test.example .env.production.test
    echo -e "${GREEN}✓ Created .env.production.test${NC}"
    echo -e "${YELLOW}⚠ Please edit .env.production.test with your credentials${NC}"
else
    echo -e "${GREEN}✓ .env.production.test exists${NC}"
fi

# Install dependencies
echo ""
echo "Installing production test dependencies..."
cd production-tests

if [ ! -d "node_modules" ]; then
    npm install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Dependencies already installed${NC}"
fi

# Install Playwright browsers
echo ""
echo "Installing Playwright browsers (this may take a few minutes)..."
if command -v playwright &> /dev/null; then
    playwright install chromium
    echo -e "${GREEN}✓ Playwright browsers installed${NC}"
else
    npm run install:playwright
    echo -e "${GREEN}✓ Playwright browsers installed${NC}"
fi

cd ..

# Create results directory
echo ""
echo "Creating results directory..."
mkdir -p production-tests/results
echo -e "${GREEN}✓ Results directory created${NC}"

# Test the setup
echo ""
echo "Testing configuration..."

# Check if Supabase URL is set
if grep -q "your_supabase" .env.production.test; then
    echo -e "${YELLOW}⚠ Please update Supabase configuration in .env.production.test${NC}"
else
    echo -e "${GREEN}✓ Supabase configuration appears to be set${NC}"
fi

# Print summary
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    Setup Complete!                         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo ""
echo "1. Edit .env.production.test with your production URLs and credentials"
echo "   ${YELLOW}nano .env.production.test${NC}"
echo ""
echo "2. Run smoke tests to verify setup:"
echo "   ${GREEN}npm run test:smoke${NC}"
echo ""
echo "3. Start the monitoring dashboard:"
echo "   ${GREEN}npm run monitor${NC}"
echo ""
echo "Available test commands:"
echo "  - ${GREEN}npm run test:smoke${NC}  - Quick health checks (~2 min)"
echo "  - ${GREEN}npm run test:api${NC}    - Comprehensive API tests (~5-10 min)"
echo "  - ${GREEN}npm run test:e2e${NC}    - End-to-end tests (~15-30 min)"
echo "  - ${GREEN}npm run test:all${NC}    - Run smoke + API tests"
echo "  - ${GREEN}npm run monitor${NC}     - Real-time monitoring dashboard"
echo ""
echo "Documentation:"
echo "  - Production Testing Guide: ${YELLOW}PRODUCTION_TESTING_GUIDE.md${NC}"
echo "  - Test Suite README: ${YELLOW}production-tests/README.md${NC}"
echo ""
echo -e "${GREEN}Happy Testing! 🚀${NC}"

