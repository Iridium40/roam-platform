#!/bin/bash

# ROAM Platform - Export Reference Data from Development
# Step 2 of 3 (OPTIONAL): Export reference/lookup data only

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  ROAM Platform - Development Data Export (Reference Data) ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${YELLOW}⚠ WARNING: Only export reference/lookup data!${NC}"
echo ""
echo -e "${RED}DO NOT export:${NC}"
echo "  - User accounts"
echo "  - Bookings"
echo "  - Businesses"
echo "  - Providers"
echo "  - Any PII or sensitive data"
echo ""
echo -e "${GREEN}DO export:${NC}"
echo "  - Service categories"
echo "  - Service subcategories"
echo "  - Default services"
echo "  - Default addons"
echo "  - Subscription plans"
echo ""

read -p "Continue with data export? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Export cancelled."
    exit 0
fi

# Load config
if [ ! -f "../../supabase/migration-config.txt" ]; then
    echo -e "${RED}Error: Migration config not found${NC}"
    echo "Run ./scripts/supabase/1-export-dev-schema.sh first"
    exit 1
fi

source ../../supabase/migration-config.txt

echo ""
echo -e "${BLUE}Connecting to development database...${NC}"

# Ask for connection details
echo ""
echo "Enter development database connection details:"
echo "(Found in Supabase Dashboard → Settings → Database)"
echo ""
read -p "Host (e.g., db.abc123.supabase.co): " DEV_HOST
read -sp "Password: " DEV_PASSWORD
echo ""

if [ -z "$DEV_HOST" ] || [ -z "$DEV_PASSWORD" ]; then
    echo -e "${RED}Error: Host and password are required${NC}"
    exit 1
fi

# Create data export directory
mkdir -p ../../supabase/data

EXPORT_FILE="../../supabase/data/reference-data-$(date +%Y%m%d_%H%M%S).sql"

echo ""
echo -e "${BLUE}Exporting reference data...${NC}"
echo ""

# Define tables to export (REFERENCE DATA ONLY)
REFERENCE_TABLES=(
    "service_categories"
    "service_subcategories"
    "services"
    "addons"
    "subscription_plans"
)

# Export each table
for table in "${REFERENCE_TABLES[@]}"; do
    echo -e "${BLUE}Exporting $table...${NC}"
    
    PGPASSWORD=$DEV_PASSWORD pg_dump \
        -h $DEV_HOST \
        -p 5432 \
        -U postgres \
        -d postgres \
        --data-only \
        --table=public.$table \
        >> $EXPORT_FILE 2>/dev/null || echo -e "${YELLOW}  ⚠ Table $table not found or empty${NC}"
done

if [ -f "$EXPORT_FILE" ]; then
    echo ""
    echo -e "${GREEN}✓ Reference data exported!${NC}"
    echo ""
    echo -e "${GREEN}Export file:${NC} $EXPORT_FILE"
    
    # Show file size
    SIZE=$(du -h "$EXPORT_FILE" | cut -f1)
    echo -e "${BLUE}File size:${NC} $SIZE"
    
    # Count INSERT statements
    INSERT_COUNT=$(grep -c "INSERT INTO" "$EXPORT_FILE" || echo "0")
    echo -e "${BLUE}Records:${NC} ~$INSERT_COUNT rows"
    echo ""
    
    echo -e "${YELLOW}⚠ IMPORTANT: Review this file before importing to production!${NC}"
    echo ""
    echo "Review with:"
    echo -e "  ${BLUE}cat $EXPORT_FILE${NC}"
    echo ""
else
    echo -e "${YELLOW}No data exported. Tables may be empty or not exist.${NC}"
fi

echo "╔════════════════════════════════════════════════════════════╗"
echo "║              Data Export Complete!                         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}Next Step:${NC}"
echo ""
echo "Import to production:"
echo -e "  ${BLUE}./scripts/supabase/3-import-to-prod.sh${NC}"
echo ""

