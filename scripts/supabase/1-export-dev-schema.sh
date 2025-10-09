#!/bin/bash

# ROAM Platform - Export Development Database Schema
# Step 1 of 3: Export schema from development Supabase

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  ROAM Platform - Development Schema Export                ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}Error: Supabase CLI not found${NC}"
    echo "Install with: brew install supabase/tap/supabase"
    exit 1
fi

echo -e "${GREEN}✓ Supabase CLI found${NC}"
echo ""

# Check if already logged in
echo -e "${BLUE}Checking Supabase authentication...${NC}"
if ! supabase projects list &> /dev/null; then
    echo -e "${YELLOW}Not logged in. Opening browser for authentication...${NC}"
    supabase login
else
    echo -e "${GREEN}✓ Already authenticated${NC}"
fi
echo ""

# Get development project reference
echo -e "${YELLOW}Enter your DEVELOPMENT Supabase project reference:${NC}"
echo "(Found in dashboard URL: https://supabase.com/dashboard/project/[PROJECT_REF])"
read -p "Dev Project Ref: " DEV_PROJECT_REF

if [ -z "$DEV_PROJECT_REF" ]; then
    echo -e "${RED}Error: Project reference is required${NC}"
    exit 1
fi

# Save to config file for other scripts
mkdir -p ../../supabase
cat > ../../supabase/migration-config.txt << EOF
DEV_PROJECT_REF=$DEV_PROJECT_REF
MIGRATION_DATE=$(date +%Y%m%d_%H%M%S)
EOF

echo -e "${GREEN}✓ Configuration saved${NC}"
echo ""

# Link to development project
echo -e "${BLUE}Linking to development database...${NC}"
cd ../..
supabase link --project-ref $DEV_PROJECT_REF

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to link to development project${NC}"
    echo "Please check:"
    echo "  - Project reference is correct"
    echo "  - You have access to the project"
    echo "  - Database password is correct"
    exit 1
fi

echo -e "${GREEN}✓ Linked to development database${NC}"
echo ""

# Pull schema from development
echo -e "${BLUE}Pulling schema from development database...${NC}"
echo "This may take a few minutes..."
echo ""

supabase db pull

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to pull schema${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✓ Schema exported successfully!${NC}"
echo ""

# Show what was exported
LATEST_MIGRATION=$(ls -t supabase/migrations/*.sql 2>/dev/null | head -1)

if [ -f "$LATEST_MIGRATION" ]; then
    echo -e "${GREEN}Migration file created:${NC} $LATEST_MIGRATION"
    echo ""
    
    # Count tables
    TABLE_COUNT=$(grep -c "CREATE TABLE" "$LATEST_MIGRATION" || echo "0")
    FUNCTION_COUNT=$(grep -c "CREATE.*FUNCTION" "$LATEST_MIGRATION" || echo "0")
    POLICY_COUNT=$(grep -c "CREATE POLICY" "$LATEST_MIGRATION" || echo "0")
    
    echo -e "${BLUE}Schema Summary:${NC}"
    echo "  - Tables: $TABLE_COUNT"
    echo "  - Functions: $FUNCTION_COUNT"
    echo "  - RLS Policies: $POLICY_COUNT"
    echo ""
fi

# Unlink from development
echo -e "${BLUE}Unlinking from development database...${NC}"
supabase unlink
echo -e "${GREEN}✓ Unlinked${NC}"
echo ""

echo "╔════════════════════════════════════════════════════════════╗"
echo "║                  Export Complete!                          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo ""
echo "1. Review the exported schema:"
echo -e "   ${BLUE}cat $LATEST_MIGRATION${NC}"
echo ""
echo "2. (Optional) Export reference data:"
echo -e "   ${BLUE}./scripts/supabase/2-export-dev-data.sh${NC}"
echo ""
echo "3. Import to production:"
echo -e "   ${BLUE}./scripts/supabase/3-import-to-prod.sh${NC}"
echo ""
echo -e "${YELLOW}⚠ IMPORTANT: Review the schema file before importing to production!${NC}"
echo ""

