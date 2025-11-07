-- Migration: Change date column from timestamp to date type
-- This ensures only one record per day (UPSERT works correctly)

-- Step 1: Add a temporary date column
ALTER TABLE daily_snapshots ADD COLUMN date_temp date;

-- Step 2: Copy truncated dates to the new column
UPDATE daily_snapshots SET date_temp = date::date;

-- Step 3: Drop the old timestamp column
ALTER TABLE daily_snapshots DROP COLUMN date;

-- Step 4: Rename the new column to 'date'
ALTER TABLE daily_snapshots RENAME COLUMN date_temp TO date;

-- Step 5: Add NOT NULL and UNIQUE constraints
ALTER TABLE daily_snapshots ALTER COLUMN date SET NOT NULL;
ALTER TABLE daily_snapshots ADD CONSTRAINT daily_snapshots_date_unique UNIQUE(date);
