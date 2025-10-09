#!/bin/bash

# ROAM Platform - Export Development Database Schema (Clean Version)
# Handles migration history conflicts

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  ROAM Platform - Development Schema Export (Clean)        ║"
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

# Load config if exists
if [ -f "../../supabase/migration-config.txt" ]; then
    source ../../supabase/migration-config.txt
    echo -e "${BLUE}Using saved configuration${NC}"
    echo "Dev Project Ref: $DEV_PROJECT_REF"
    echo ""
else
    # Get development project reference
    echo -e "${YELLOW}Enter your DEVELOPMENT Supabase project reference:${NC}"
    echo "(Found in dashboard URL: https://supabase.com/dashboard/project/[PROJECT_REF])"
    read -p "Dev Project Ref: " DEV_PROJECT_REF

    if [ -z "$DEV_PROJECT_REF" ]; then
        echo -e "${RED}Error: Project reference is required${NC}"
        exit 1
    fi

    # Save to config file
    mkdir -p ../../supabase
    cat > ../../supabase/migration-config.txt << EOF
DEV_PROJECT_REF=$DEV_PROJECT_REF
MIGRATION_DATE=$(date +%Y%m%d_%H%M%S)
EOF
    echo -e "${GREEN}✓ Configuration saved${NC}"
    echo ""
fi

# Clear any old migration files
echo -e "${YELLOW}Cleaning old migration files...${NC}"
mkdir -p ../../supabase/migrations-backup
if [ "$(ls -A ../../supabase/migrations 2>/dev/null)" ]; then
    mv ../../supabase/migrations/* ../../supabase/migrations-backup/ 2>/dev/null || true
    echo -e "${GREEN}✓ Backed up old migrations to supabase/migrations-backup/${NC}"
else
    mkdir -p ../../supabase/migrations
    echo -e "${GREEN}✓ Created migrations directory${NC}"
fi
echo ""

# Use direct pg_dump instead of supabase db pull
echo -e "${BLUE}Getting database credentials...${NC}"
echo ""
echo "Enter your DEVELOPMENT database connection details:"
echo "(Found in Supabase Dashboard → Settings → Database)"
echo ""
read -p "Host (e.g., db.vssomyuyhicaxsgiaupo.supabase.co): " DEV_HOST
read -sp "Password: " DEV_PASSWORD
echo ""
echo ""

if [ -z "$DEV_HOST" ] || [ -z "$DEV_PASSWORD" ]; then
    echo -e "${RED}Error: Host and password are required${NC}"
    exit 1
fi

# Export schema using pg_dump
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
MIGRATION_FILE="../../supabase/migrations/${TIMESTAMP}_remote_schema.sql"

echo -e "${BLUE}Exporting schema from development database...${NC}"
echo "This may take a few minutes..."
echo ""

PGPASSWORD=$DEV_PASSWORD pg_dump \
    -h $DEV_HOST \
    -p 5432 \
    -U postgres \
    -d postgres \
    --schema-only \
    --no-owner \
    --no-acl \
    --schema=public \
    --schema=auth \
    --schema=storage \
    > $MIGRATION_FILE

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to export schema${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✓ Schema exported successfully!${NC}"
echo ""

# Show what was exported
if [ -f "$MIGRATION_FILE" ]; then
    echo -e "${GREEN}Migration file created:${NC} $MIGRATION_FILE"
    echo ""
    
    # Count objects
    TABLE_COUNT=$(grep -c "CREATE TABLE" "$MIGRATION_FILE" || echo "0")
    FUNCTION_COUNT=$(grep -c "CREATE.*FUNCTION" "$MIGRATION_FILE" || echo "0")
    POLICY_COUNT=$(grep -c "CREATE POLICY" "$MIGRATION_FILE" || echo "0")
    INDEX_COUNT=$(grep -c "CREATE.*INDEX" "$MIGRATION_FILE" || echo "0")
    
    # Get file size
    FILE_SIZE=$(du -h "$MIGRATION_FILE" | cut -f1)
    
    echo -e "${BLUE}Schema Summary:${NC}"
    echo "  - File Size: $FILE_SIZE"
    echo "  - Tables: $TABLE_COUNT"
    echo "  - Indexes: $INDEX_COUNT"
    echo "  - Functions: $FUNCTION_COUNT"
    echo "  - RLS Policies: $POLICY_COUNT"
    echo ""
fi

echo "╔════════════════════════════════════════════════════════════╗"
echo "║                  Export Complete!                          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo ""
echo "1. Review the exported schema:"
echo -e "   ${BLUE}cat $MIGRATION_FILE | less${NC}"
echo ""
echo "2. (Optional) Export reference data:"
echo -e "   ${BLUE}./scripts/supabase/2-export-dev-data.sh${NC}"
echo ""
echo "3. Import to production:"
echo -e "   ${BLUE}./scripts/supabase/3-import-to-prod-clean.sh${NC}"
echo ""
echo -e "${YELLOW}⚠ IMPORTANT: Review the schema file before importing to production!${NC}"
echo ""

