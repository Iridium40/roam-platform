# 🤖 AI Assistant Database Schema Workflow

## Before Any Database Implementation

### 1. Always Check Schema First
```bash
# Check the confirmed database schemas
cat DATABASE_SCHEMA_REFERENCE.md
```

### 2. Key Questions to Ask
- What table am I querying?
- What are the exact field names for this table?
- Are there naming differences between related tables?
- Has this schema been confirmed working?

### 3. Common Schema Mistakes to Avoid
❌ `customer_locations.address_line1` → ✅ `customer_locations.street_address`
❌ `services.service_name` → ✅ `services.name`
❌ `customer_locations.postal_code` → ✅ `customer_locations.zip_code`

### 4. Update Schema Reference
When confirming a new working schema:
1. Add the SQL CREATE statement
2. Note the file where it's used
3. Add to the quick reference tables
4. Update the "Last Updated" date

## Schema Memory Aids

### Field Name Patterns
- **Customer locations**: `street_address`, `unit_number`, `zip_code`
- **Business locations**: `address_line1`, `address_line2`, `postal_code`  
- **Services**: `name` (not `service_name`)

### Always Reference This Workflow
Before implementing any database query, table join, or API endpoint that touches the database.