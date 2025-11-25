# Database Migrations

## Overview

This directory contains database migration scripts for the CycleScope API project.

---

## Migration 001: Add Delta V2 Columns

**Date:** 2025-11-25  
**Purpose:** Add 10 new columns to support Delta V2 assistant output

### Files

- `001_add_delta_v2_columns.sql` - Forward migration (adds columns)
- `001_add_delta_v2_columns_rollback.sql` - Rollback migration (removes columns)

### What This Migration Does

Adds the following columns to `daily_snapshots` table:

1. `delta_v2_asof_date` (TEXT) - Analysis date
2. `delta_v2_schema_version` (TEXT) - Schema version (default: "2.0")
3. `delta_v2_market_condition` (TEXT) - Layer 1: Market condition summary
4. `delta_v2_turning_point` (TEXT) - Layer 1: Turning point classification
5. `delta_v2_outlook_1_2_month` (TEXT) - Layer 1: 1-2 month outlook
6. `delta_v2_domains` (JSONB) - Layer 2: 7 domain analysis paragraphs
7. `delta_v2_turning_point_evidence` (JSONB) - Layer 2: 3 turning point evidence paragraphs
8. `delta_v2_outlook_paragraph` (TEXT) - Layer 2: Detailed outlook paragraph
9. `delta_v2_full_analysis` (JSONB) - Complete JSON response
10. `delta_v2_created_at` (TIMESTAMP) - Creation timestamp

Also creates 5 indexes for query performance.

---

## How to Run Migrations

### Option 1: Using psql (Recommended)

```bash
# Set database URL
export DATABASE_URL="postgresql://postgres:PASSWORD@HOST:PORT/railway"

# Run forward migration
psql $DATABASE_URL < migrations/001_add_delta_v2_columns.sql

# Verify migration
psql $DATABASE_URL -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'daily_snapshots' AND column_name LIKE 'delta_v2%' ORDER BY column_name;"

# If needed, rollback
psql $DATABASE_URL < migrations/001_add_delta_v2_columns_rollback.sql
```

### Option 2: Using Railway CLI

```bash
# Connect to Railway database
railway connect

# In the psql prompt, run:
\i migrations/001_add_delta_v2_columns.sql

# Verify
\d daily_snapshots
```

### Option 3: Using Railway Dashboard

1. Go to Railway dashboard
2. Open your database service
3. Click "Query" tab
4. Copy and paste the contents of `001_add_delta_v2_columns.sql`
5. Click "Execute"

---

## Verification

After running the migration, verify that all columns were added:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'daily_snapshots' AND column_name LIKE 'delta_v2%'
ORDER BY column_name;
```

Expected output: 10 rows (10 new columns)

---

## Rollback

If you need to undo this migration:

```bash
psql $DATABASE_URL < migrations/001_add_delta_v2_columns_rollback.sql
```

**WARNING:** This will delete all Delta V2 data!

---

## Safety Features

- Uses `IF NOT EXISTS` / `IF EXISTS` to prevent errors if run multiple times
- Wrapped in transactions (BEGIN/COMMIT) for atomicity
- Rollback script provided for easy undo
- No modification to existing columns (Delta V1 data is safe)

---

## Next Steps After Migration

1. ✅ Verify columns were added
2. ✅ Update backend code to populate Delta V2 columns
3. ✅ Update API to return Delta V2 data
4. ✅ Update frontend to display Delta V2 data
5. ✅ Test end-to-end flow

---

## Troubleshooting

### Error: "relation 'daily_snapshots' does not exist"

**Solution:** Make sure you're connected to the correct database.

### Error: "column already exists"

**Solution:** Migration was already run. This is safe to ignore if using `IF NOT EXISTS`.

### Error: "permission denied"

**Solution:** Make sure you're using the correct database credentials with ALTER TABLE permissions.

---

## Migration History

| Version | Date | Description | Status |
|---------|------|-------------|--------|
| 001 | 2025-11-25 | Add Delta V2 columns | Pending |

---

**Last Updated:** 2025-11-25

