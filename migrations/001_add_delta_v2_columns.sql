-- ============================================================
-- Migration: Add Delta V2 Columns to daily_snapshots
-- Version: 001
-- Date: 2025-11-25
-- Description: Add 10 new columns to support Delta V2 assistant output
-- ============================================================

-- Start transaction for safety
BEGIN;

-- Add Delta V2 columns to daily_snapshots table
ALTER TABLE daily_snapshots
  ADD COLUMN IF NOT EXISTS delta_v2_asof_date TEXT,
  ADD COLUMN IF NOT EXISTS delta_v2_schema_version TEXT DEFAULT '2.0',
  ADD COLUMN IF NOT EXISTS delta_v2_market_condition TEXT,
  ADD COLUMN IF NOT EXISTS delta_v2_turning_point TEXT,
  ADD COLUMN IF NOT EXISTS delta_v2_outlook_1_2_month TEXT,
  ADD COLUMN IF NOT EXISTS delta_v2_domains JSONB,
  ADD COLUMN IF NOT EXISTS delta_v2_turning_point_evidence JSONB,
  ADD COLUMN IF NOT EXISTS delta_v2_outlook_paragraph TEXT,
  ADD COLUMN IF NOT EXISTS delta_v2_full_analysis JSONB,
  ADD COLUMN IF NOT EXISTS delta_v2_created_at TIMESTAMP DEFAULT NOW();

-- Add indexes for performance (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_delta_v2_asof_date 
  ON daily_snapshots(delta_v2_asof_date);

CREATE INDEX IF NOT EXISTS idx_delta_v2_turning_point 
  ON daily_snapshots(delta_v2_turning_point);

CREATE INDEX IF NOT EXISTS idx_delta_v2_outlook 
  ON daily_snapshots(delta_v2_outlook_1_2_month);

-- Add GIN indexes for JSONB fields (for advanced queries)
CREATE INDEX IF NOT EXISTS idx_delta_v2_domains_gin 
  ON daily_snapshots USING GIN (delta_v2_domains);

CREATE INDEX IF NOT EXISTS idx_delta_v2_turning_point_evidence_gin 
  ON daily_snapshots USING GIN (delta_v2_turning_point_evidence);

-- Commit transaction
COMMIT;

-- Verification query (run separately to verify)
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'daily_snapshots' AND column_name LIKE 'delta_v2%'
-- ORDER BY column_name;

