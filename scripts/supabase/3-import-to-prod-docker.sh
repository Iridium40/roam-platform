#!/bin/bash

# ROAM Platform - Import to Production Database (Docker Version)
# Uses Docker to run PostgreSQL 17 for compatibility

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  ROAM Platform - Production Database Import (Docker)      ║"
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
    echo -e "${YELLOW}⚠ Docker not found - will try local psql${NC}"
    USE_DOCKER=false
fi
echo ""

echo -e "${RED}⚠ WARNING: This will modify your PRODUCTION database!${NC}"
echo ""

read -p "Are you ABSOLUTELY sure you want to continue? (type 'YES' to confirm): " CONFIRM

if [ "$CONFIRM" != "YES" ]; then
    echo "Import cancelled."
    exit 0
fi

# Check if schema export exists
LATEST_MIGRATION=$(ls -t ../../supabase/migrations/*.sql 2>/dev/null | head -1)

if [ ! -f "$LATEST_MIGRATION" ]; then
    echo -e "${RED}Error: No migration file found${NC}"
    echo "Run ./scripts/supabase/1-export-dev-schema-docker.sh first"
    exit 1
fi

echo ""
echo -e "${GREEN}✓ Found migration file: $LATEST_MIGRATION${NC}"
FILE_SIZE=$(du -h "$LATEST_MIGRATION" | cut -f1)
echo -e "${BLUE}File size: $FILE_SIZE${NC}"
echo ""

# Get production project ref
if [ -f "../../supabase/migration-config.txt" ]; then
    source ../../supabase/migration-config.txt
    if [ ! -z "$PROD_PROJECT_REF" ]; then
        echo -e "${BLUE}Found saved production project ref: $PROD_PROJECT_REF${NC}"
        read -p "Use this? (yes/no): " USE_SAVED
        if [ "$USE_SAVED" != "yes" ]; then
            PROD_PROJECT_REF=""
        fi
    fi
fi

if [ -z "$PROD_PROJECT_REF" ]; then
    echo -e "${YELLOW}Enter your PRODUCTION Supabase project reference:${NC}"
    echo "(Found in dashboard URL: https://supabase.com/dashboard/project/[PROJECT_REF])"
    read -p "Prod Project Ref: " PROD_PROJECT_REF

    if [ -z "$PROD_PROJECT_REF" ]; then
        echo -e "${RED}Error: Project reference is required${NC}"
        exit 1
    fi
    
    echo "PROD_PROJECT_REF=$PROD_PROJECT_REF" >> ../../supabase/migration-config.txt
fi

echo ""
echo "Enter your PRODUCTION database connection details:"
echo ""
read -p "Host (db.$PROD_PROJECT_REF.supabase.co): " PROD_HOST
PROD_HOST=${PROD_HOST:-db.$PROD_PROJECT_REF.supabase.co}
read -sp "Password: " PROD_PASSWORD
echo ""
echo ""

if [ -z "$PROD_PASSWORD" ]; then
    echo -e "${RED}Error: Password is required${NC}"
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

# Get absolute path to migration file
MIGRATION_FILE_ABS=$(cd ../../supabase/migrations && pwd)/$(basename $LATEST_MIGRATION)

if [ "$USE_DOCKER" = true ]; then
    # Use Docker with PostgreSQL 17
    echo -e "${BLUE}Using Docker with PostgreSQL 17...${NC}"
    docker run --rm -i \
        -e PGPASSWORD="$PROD_PASSWORD" \
        -v "$MIGRATION_FILE_ABS:/migration.sql:ro" \
        postgres:17-alpine \
        psql \
        -h $PROD_HOST \
        -p 5432 \
        -U postgres \
        -d postgres \
        -f /migration.sql
    
    IMPORT_RESULT=$?
else
    # Use local psql
    echo -e "${YELLOW}Using local psql...${NC}"
    PGPASSWORD=$PROD_PASSWORD psql \
        -h $PROD_HOST \
        -p 5432 \
        -U postgres \
        -d postgres \
        -f $LATEST_MIGRATION
    
    IMPORT_RESULT=$?
fi

if [ $IMPORT_RESULT -ne 0 ]; then
    echo ""
    echo -e "${RED}Failed to import schema to production${NC}"
    echo ""
    echo "Common issues:"
    echo "  - Objects already exist (drop them or use clean database)"
    echo "  - Permission errors"
    echo "  - Syntax errors in migration file"
    echo ""
    exit 1
fi

echo ""
echo -e "${GREEN}✓ Schema imported to production!${NC}"
echo ""

# Verify by listing tables
echo -e "${BLUE}Verifying tables in production...${NC}"

if [ "$USE_DOCKER" = true ]; then
    TABLE_COUNT=$(docker run --rm \
        -e PGPASSWORD="$PROD_PASSWORD" \
        postgres:17-alpine \
        psql \
        -h $PROD_HOST \
        -p 5432 \
        -U postgres \
        -d postgres \
        -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
else
    TABLE_COUNT=$(PGPASSWORD=$PROD_PASSWORD psql \
        -h $PROD_HOST \
        -p 5432 \
        -U postgres \
        -d postgres \
        -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
fi

if [ ! -z "$TABLE_COUNT" ]; then
    echo -e "${GREEN}✓ Found $TABLE_COUNT tables in production${NC}"
else
    echo -e "${YELLOW}⚠ Could not verify table count${NC}"
fi

echo ""

# Ask about data import
LATEST_DATA=$(ls -t ../../supabase/data/*.sql 2>/dev/null | head -1)

if [ -f "$LATEST_DATA" ]; then
    echo -e "${BLUE}Found reference data export: $(basename $LATEST_DATA)${NC}"
    echo ""
    read -p "Import reference data to production? (yes/no): " IMPORT_DATA
    
    if [ "$IMPORT_DATA" = "yes" ]; then
        echo ""
        echo -e "${BLUE}Importing reference data...${NC}"
        
        DATA_FILE_ABS=$(cd ../../supabase/data && pwd)/$(basename $LATEST_DATA)
        
        if [ "$USE_DOCKER" = true ]; then
            docker run --rm -i \
                -e PGPASSWORD="$PROD_PASSWORD" \
                -v "$DATA_FILE_ABS:/data.sql:ro" \
                postgres:17-alpine \
                psql \
                -h $PROD_HOST \
                -p 5432 \
                -U postgres \
                -d postgres \
                -f /data.sql
        else
            PGPASSWORD=$PROD_PASSWORD psql \
                -h $PROD_HOST \
                -p 5432 \
                -U postgres \
                -d postgres \
                -f $LATEST_DATA
        fi
        
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
echo "1. Update environment variables:"
echo "   ROAM_ENV=production"
echo "   VITE_PUBLIC_SUPABASE_URL=https://$PROD_PROJECT_REF.supabase.co"
echo "   VITE_PUBLIC_SUPABASE_ANON_KEY=[get from dashboard]"
echo ""
echo "2. Verify RLS policies in Supabase Dashboard"
echo ""
echo "3. Run production tests:"
echo -e "   ${BLUE}ROAM_ENV=production npm run test:smoke${NC}"
echo ""
echo "4. Create first admin user via Supabase dashboard"
echo ""
echo -e "${GREEN}🎉 Your production database is ready!${NC}"
echo ""

