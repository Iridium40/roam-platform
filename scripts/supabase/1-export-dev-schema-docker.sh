#!/bin/bash

# ROAM Platform - Export Development Database Schema (Docker Version)
# Uses Docker to run the correct PostgreSQL version

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  ROAM Platform - Development Schema Export (Docker)       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Docker is available
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓ Docker found - will use PostgreSQL 17${NC}"
    USE_DOCKER=true
else
    echo -e "${YELLOW}⚠ Docker not found - will try local pg_dump${NC}"
    USE_DOCKER=false
fi
echo ""

# Load config if exists
if [ -f "../../supabase/migration-config.txt" ]; then
    source ../../supabase/migration-config.txt
    echo -e "${BLUE}Using saved configuration${NC}"
    echo "Dev Project Ref: $DEV_PROJECT_REF"
    echo ""
else
    echo -e "${YELLOW}Enter your DEVELOPMENT Supabase project reference:${NC}"
    echo "(Found in dashboard URL: https://supabase.com/dashboard/project/[PROJECT_REF])"
    read -p "Dev Project Ref: " DEV_PROJECT_REF

    if [ -z "$DEV_PROJECT_REF" ]; then
        echo -e "${RED}Error: Project reference is required${NC}"
        exit 1
    fi

    mkdir -p ../../supabase
    cat > ../../supabase/migration-config.txt << EOF
DEV_PROJECT_REF=$DEV_PROJECT_REF
MIGRATION_DATE=$(date +%Y%m%d_%H%M%S)
EOF
    echo -e "${GREEN}✓ Configuration saved${NC}"
    echo ""
fi

# Clean old migration files
echo -e "${YELLOW}Cleaning old migration files...${NC}"
mkdir -p ../../supabase/migrations-backup
if [ "$(ls -A ../../supabase/migrations 2>/dev/null)" ]; then
    mv ../../supabase/migrations/* ../../supabase/migrations-backup/ 2>/dev/null || true
    echo -e "${GREEN}✓ Backed up old migrations${NC}"
else
    mkdir -p ../../supabase/migrations
    echo -e "${GREEN}✓ Created migrations directory${NC}"
fi
echo ""

# Get credentials
echo -e "${BLUE}Getting database credentials...${NC}"
echo ""
echo "Enter your DEVELOPMENT database connection details:"
echo ""
read -p "Host (db.$DEV_PROJECT_REF.supabase.co): " DEV_HOST
DEV_HOST=${DEV_HOST:-db.$DEV_PROJECT_REF.supabase.co}
read -sp "Password: " DEV_PASSWORD
echo ""
echo ""

if [ -z "$DEV_PASSWORD" ]; then
    echo -e "${RED}Error: Password is required${NC}"
    exit 1
fi

# Export schema
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
MIGRATION_FILE="../../supabase/migrations/${TIMESTAMP}_remote_schema.sql"

echo -e "${BLUE}Exporting schema from development database...${NC}"
echo "This may take a few minutes..."
echo ""

if [ "$USE_DOCKER" = true ]; then
    # Use Docker with PostgreSQL 17
    echo -e "${BLUE}Using Docker with PostgreSQL 17...${NC}"
    docker run --rm \
        -e PGPASSWORD="$DEV_PASSWORD" \
        postgres:17-alpine \
        pg_dump \
        -h $DEV_HOST \
        -p 5432 \
        -U postgres \
        -d postgres \
        --schema-only \
        --no-owner \
        --no-acl \
        --schema=public \
        > $MIGRATION_FILE
else
    # Use local pg_dump (may have version warnings)
    echo -e "${YELLOW}Using local pg_dump (may show version warnings)...${NC}"
    PGPASSWORD=$DEV_PASSWORD pg_dump \
        -h $DEV_HOST \
        -p 5432 \
        -U postgres \
        -d postgres \
        --schema-only \
        --no-owner \
        --no-acl \
        --schema=public \
        > $MIGRATION_FILE 2>&1 || true
fi

if [ ! -s "$MIGRATION_FILE" ]; then
    echo -e "${RED}Failed to export schema or file is empty${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✓ Schema exported successfully!${NC}"
echo ""

# Show what was exported
echo -e "${GREEN}Migration file:${NC} $MIGRATION_FILE"
echo ""

# Count objects
TABLE_COUNT=$(grep -c "CREATE TABLE" "$MIGRATION_FILE" || echo "0")
FUNCTION_COUNT=$(grep -c "CREATE.*FUNCTION" "$MIGRATION_FILE" || echo "0")
POLICY_COUNT=$(grep -c "CREATE POLICY" "$MIGRATION_FILE" || echo "0")
INDEX_COUNT=$(grep -c "CREATE.*INDEX" "$MIGRATION_FILE" || echo "0")
FILE_SIZE=$(du -h "$MIGRATION_FILE" | cut -f1)

echo -e "${BLUE}Schema Summary:${NC}"
echo "  - File Size: $FILE_SIZE"
echo "  - Tables: $TABLE_COUNT"
echo "  - Indexes: $INDEX_COUNT"
echo "  - Functions: $FUNCTION_COUNT"
echo "  - RLS Policies: $POLICY_COUNT"
echo ""

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
echo -e "   ${BLUE}./scripts/supabase/3-import-to-prod-docker.sh${NC}"
echo ""

