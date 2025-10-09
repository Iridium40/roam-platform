#!/bin/bash

# ROAM Platform - Import to Production Database (Clean Version)
# Uses direct psql import instead of Supabase CLI

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  ROAM Platform - Production Database Import (Clean)       ║"
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
echo "This script will import the schema to production using direct psql."
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
    echo "Run ./scripts/supabase/1-export-dev-schema-clean.sh first"
    exit 1
fi

echo ""
echo -e "${GREEN}✓ Found migration file: $LATEST_MIGRATION${NC}"

# Show file info
FILE_SIZE=$(du -h "$LATEST_MIGRATION" | cut -f1)
echo -e "${BLUE}File size: $FILE_SIZE${NC}"
echo ""

# Get production credentials
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
echo "Enter your PRODUCTION database connection details:"
echo "(Found in Supabase Dashboard → Settings → Database)"
echo ""
read -p "Host (e.g., db.${PROD_PROJECT_REF}.supabase.co): " PROD_HOST
read -sp "Password: " PROD_PASSWORD
echo ""
echo ""

if [ -z "$PROD_HOST" ] || [ -z "$PROD_PASSWORD" ]; then
    echo -e "${RED}Error: Host and password are required${NC}"
    exit 1
fi

# Final confirmation
echo -e "${RED}═══════════════════════════════════════════════════════════${NC}"
echo -e "${RED}           FINAL WARNING: PRODUCTION IMPORT                ${NC}"
echo -e "${RED}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "You are about to import schema to PRODUCTION database:"
echo "  Host: $PROD_HOST"
echo "  File: $(basename $LATEST_MIGRATION)"
echo ""
read -p "Type the production project ref to confirm: " CONFIRM_REF

if [ "$CONFIRM_REF" != "$PROD_PROJECT_REF" ]; then
    echo -e "${RED}Project reference does not match. Aborting.${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Importing schema to PRODUCTION...${NC}"
echo "This may take a few minutes..."
echo ""

# Import using psql
PGPASSWORD=$PROD_PASSWORD psql \
    -h $PROD_HOST \
    -p 5432 \
    -U postgres \
    -d postgres \
    -f $LATEST_MIGRATION

if [ $? -ne 0 ]; then
    echo ""
    echo -e "${RED}Failed to import schema to production${NC}"
    echo ""
    echo "Common issues:"
    echo "  - Objects already exist (drop them first)"
    echo "  - Permission errors (check user permissions)"
    echo "  - Syntax errors in migration file"
    echo ""
    exit 1
fi

echo ""
echo -e "${GREEN}✓ Schema imported to production!${NC}"
echo ""

# Verify by listing tables
echo -e "${BLUE}Verifying tables in production...${NC}"
TABLE_COUNT=$(PGPASSWORD=$PROD_PASSWORD psql \
    -h $PROD_HOST \
    -p 5432 \
    -U postgres \
    -d postgres \
    -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null)

if [ ! -z "$TABLE_COUNT" ]; then
    echo -e "${GREEN}✓ Found $TABLE_COUNT tables in production${NC}"
else
    echo -e "${YELLOW}⚠ Could not verify table count${NC}"
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
echo "1. Update environment variables with production credentials"
echo ""
echo "2. Verify RLS policies are enabled:"
echo -e "   ${BLUE}Check in Supabase Dashboard → Database → Tables${NC}"
echo ""
echo "3. Run production tests:"
echo -e "   ${BLUE}ROAM_ENV=production npm run test:smoke${NC}"
echo ""
echo "4. Create first admin user via Supabase dashboard"
echo ""
echo -e "${GREEN}🎉 Your production database is ready!${NC}"
echo ""

