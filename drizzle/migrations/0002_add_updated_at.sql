-- Add updatedAt column to daily_snapshots table
ALTER TABLE daily_snapshots 
ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT NOW();

-- Set updatedAt to createdAt for existing records
UPDATE daily_snapshots 
SET updated_at = created_at 
WHERE updated_at IS NULL;
