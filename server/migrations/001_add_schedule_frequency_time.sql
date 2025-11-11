-- Add frequency and time columns to schedules table
-- This migration allows the new user-friendly scheduling system

ALTER TABLE schedules
  ADD COLUMN IF NOT EXISTS frequency TEXT,
  ADD COLUMN IF NOT EXISTS time TEXT;

-- Make cron_expression nullable since we're using frequency/time instead
ALTER TABLE schedules
  ALTER COLUMN cron_expression DROP NOT NULL;

-- Update any existing schedules with cron expressions to have default values
UPDATE schedules
SET
  frequency = 'daily',
  time = '02:00'
WHERE
  frequency IS NULL
  AND time IS NULL;
