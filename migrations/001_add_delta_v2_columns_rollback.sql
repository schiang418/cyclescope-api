-- ============================================================
-- Migration Rollback: Remove Delta V2 Columns from daily_snapshots
-- Version: 001
-- Date: 2025-11-25
-- Description: Remove all Delta V2 columns and indexes (rollback migration 001)
-- WARNING: This will delete all Delta V2 data!
-- ============================================================

-- Start transaction for safety
BEGIN;

-- Drop indexes first
DROP INDEX IF EXISTS idx_delta_v2_asof_date;
DROP INDEX IF EXISTS idx_delta_v2_turning_point;
DROP INDEX IF EXISTS idx_delta_v2_outlook;
DROP INDEX IF EXISTS idx_delta_v2_domains_gin;
DROP INDEX IF EXISTS idx_delta_v2_turning_point_evidence_gin;

-- Drop Delta V2 columns
ALTER TABLE daily_snapshots
  DROP COLUMN IF EXISTS delta_v2_asof_date,
  DROP COLUMN IF EXISTS delta_v2_schema_version,
  DROP COLUMN IF EXISTS delta_v2_market_condition,
  DROP COLUMN IF EXISTS delta_v2_turning_point,
  DROP COLUMN IF EXISTS delta_v2_outlook_1_2_month,
  DROP COLUMN IF EXISTS delta_v2_domains,
  DROP COLUMN IF EXISTS delta_v2_turning_point_evidence,
  DROP COLUMN IF EXISTS delta_v2_outlook_paragraph,
  DROP COLUMN IF EXISTS delta_v2_full_analysis,
  DROP COLUMN IF EXISTS delta_v2_created_at;

-- Commit transaction
COMMIT;

-- Verification query (run separately to verify)
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'daily_snapshots' AND column_name LIKE 'delta_v2%';
-- Should return 0 rows

