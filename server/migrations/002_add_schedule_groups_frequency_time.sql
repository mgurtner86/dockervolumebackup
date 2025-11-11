-- Add frequency and time columns to schedule_groups table
-- This migration allows the new user-friendly scheduling system for groups

ALTER TABLE schedule_groups
  ADD COLUMN IF NOT EXISTS frequency TEXT,
  ADD COLUMN IF NOT EXISTS time TEXT;

-- Make cron_expression nullable since we're using frequency/time instead
ALTER TABLE schedule_groups
  ALTER COLUMN cron_expression DROP NOT NULL;

-- Update any existing schedule groups with cron expressions to have default values
UPDATE schedule_groups
SET
  frequency = 'daily',
  time = '02:00'
WHERE
  frequency IS NULL
  AND time IS NULL;
