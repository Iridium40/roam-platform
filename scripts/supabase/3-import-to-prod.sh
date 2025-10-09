#!/bin/bash

# ROAM Platform - Import to Production Database
# Step 3 of 3: Import schema (and optionally data) to production

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  ROAM Platform - Production Database Import               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${RED}⚠ WARNING: This will modify your PRODUCTION database!${NC}"
echo ""
echo "This script will:"
echo "  1. Link to your production Supabase project"
echo "  2. Push the schema from development"
echo "  3. (Optional) Import reference data"
echo ""

read -p "Are you ABSOLUTELY sure you want to continue? (type 'YES' to confirm): " CONFIRM

if [ "$CONFIRM" != "YES" ]; then
    echo "Import cancelled. Smart choice to double-check!"
    exit 0
fi

# Check if schema export exists
LATEST_MIGRATION=$(ls -t ../../supabase/migrations/*.sql 2>/dev/null | head -1)

if [ ! -f "$LATEST_MIGRATION" ]; then
    echo -e "${RED}Error: No migration file found${NC}"
    echo "Run ./scripts/supabase/1-export-dev-schema.sh first"
    exit 1
fi

echo ""
echo -e "${GREEN}✓ Found migration file: $LATEST_MIGRATION${NC}"
echo ""

# Get production project reference
echo -e "${YELLOW}Enter your PRODUCTION Supabase project reference:${NC}"
echo "(Found in dashboard URL: https://supabase.com/dashboard/project/[PROJECT_REF])"
read -p "Prod Project Ref: " PROD_PROJECT_REF

if [ -z "$PROD_PROJECT_REF" ]; then
    echo -e "${RED}Error: Project reference is required${NC}"
    exit 1
fi

# Save to config
echo "PROD_PROJECT_REF=$PROD_PROJECT_REF" >> ../../supabase/migration-config.txt

echo ""
echo -e "${BLUE}Linking to PRODUCTION database...${NC}"
cd ../..
supabase link --project-ref $PROD_PROJECT_REF

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to link to production project${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Linked to PRODUCTION database${NC}"
echo ""

# Final confirmation
echo -e "${RED}═══════════════════════════════════════════════════════════${NC}"
echo -e "${RED}           FINAL WARNING: PRODUCTION IMPORT                ${NC}"
echo -e "${RED}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "You are about to push schema to PRODUCTION."
echo "This will:"
echo "  - Create all tables"
echo "  - Create all functions"
echo "  - Apply RLS policies"
echo "  - Create indexes"
echo ""
read -p "Type the production project ref to confirm: " CONFIRM_REF

if [ "$CONFIRM_REF" != "$PROD_PROJECT_REF" ]; then
    echo -e "${RED}Project reference does not match. Aborting.${NC}"
    supabase unlink
    exit 1
fi

echo ""
echo -e "${BLUE}Pushing schema to PRODUCTION...${NC}"
echo "This may take a few minutes..."
echo ""

supabase db push

if [ $? -ne 0 ]; then
    echo ""
    echo -e "${RED}Failed to push schema to production${NC}"
    echo ""
    echo "Common issues:"
    echo "  - Conflicting objects already exist"
    echo "  - Permission errors"
    echo "  - Syntax errors in migration"
    echo ""
    echo "Check errors above and try again."
    supabase unlink
    exit 1
fi

echo ""
echo -e "${GREEN}✓ Schema imported to production!${NC}"
echo ""

# Verify
echo -e "${BLUE}Verifying schema...${NC}"
supabase db diff

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Schema verification passed${NC}"
else
    echo -e "${YELLOW}⚠ Schema verification shows differences${NC}"
    echo "Review the diff above."
fi

echo ""

# Ask about data import
LATEST_DATA=$(ls -t ../../supabase/data/*.sql 2>/dev/null | head -1)

if [ -f "$LATEST_DATA" ]; then
    echo -e "${BLUE}Found reference data export: $LATEST_DATA${NC}"
    echo ""
    read -p "Import reference data to production? (yes/no): " IMPORT_DATA
    
    if [ "$IMPORT_DATA" = "yes" ]; then
        echo ""
        echo -e "${BLUE}Importing reference data...${NC}"
        
        # Ask for connection details
        echo ""
        echo "Enter PRODUCTION database connection details:"
        read -p "Host (e.g., db.xyz789.supabase.co): " PROD_HOST
        read -sp "Password: " PROD_PASSWORD
        echo ""
        
        if [ -z "$PROD_HOST" ] || [ -z "$PROD_PASSWORD" ]; then
            echo -e "${YELLOW}Skipping data import (missing credentials)${NC}"
        else
            PGPASSWORD=$PROD_PASSWORD psql \
                -h $PROD_HOST \
                -p 5432 \
                -U postgres \
                -d postgres \
                -f $LATEST_DATA
            
            if [ $? -eq 0 ]; then
                echo ""
                echo -e "${GREEN}✓ Reference data imported!${NC}"
            else
                echo ""
                echo -e "${YELLOW}⚠ Data import had errors (see above)${NC}"
            fi
        fi
    fi
fi

# Unlink from production
echo ""
echo -e "${BLUE}Unlinking from production database...${NC}"
supabase unlink
echo -e "${GREEN}✓ Unlinked${NC}"
echo ""

echo "╔════════════════════════════════════════════════════════════╗"
echo "║           Production Import Complete!                      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}Migration Summary:${NC}"
echo "  ✓ Schema migrated to production"
echo "  ✓ Database structure ready"
if [ "$IMPORT_DATA" = "yes" ]; then
    echo "  ✓ Reference data imported"
fi
echo ""
echo -e "${YELLOW}Post-Migration Tasks:${NC}"
echo ""
echo "1. Update environment variables:"
echo "   - VITE_PUBLIC_SUPABASE_URL"
echo "   - VITE_PUBLIC_SUPABASE_ANON_KEY"
echo "   - SUPABASE_SERVICE_ROLE_KEY"
echo ""
echo "2. Verify database in Supabase dashboard"
echo ""
echo "3. Run production tests:"
echo -e "   ${BLUE}ROAM_ENV=production npm run test:smoke${NC}"
echo ""
echo "4. Create first admin user via Supabase dashboard"
echo ""
echo -e "${GREEN}🎉 Your production database is ready!${NC}"
echo ""

