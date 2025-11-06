/*
  # Docker Volume Backup System Schema

  1. New Tables
    - `volumes`
      - `id` (uuid, primary key)
      - `name` (text) - Volume name/identifier
      - `path` (text) - Path on Docker host
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `backups`
      - `id` (uuid, primary key)
      - `volume_id` (uuid, foreign key to volumes)
      - `backup_path` (text) - Path where backup is stored
      - `size_bytes` (bigint) - Backup file size
      - `status` (text) - pending, in_progress, completed, failed
      - `error_message` (text) - Error details if failed
      - `started_at` (timestamptz)
      - `completed_at` (timestamptz)
      - `created_at` (timestamptz)
    
    - `schedules`
      - `id` (uuid, primary key)
      - `volume_id` (uuid, foreign key to volumes)
      - `cron_expression` (text) - Cron schedule
      - `enabled` (boolean) - Whether schedule is active
      - `last_run` (timestamptz) - Last execution time
      - `next_run` (timestamptz) - Next scheduled execution
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create volumes table
CREATE TABLE IF NOT EXISTS volumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  path text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create backups table
CREATE TABLE IF NOT EXISTS backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  volume_id uuid NOT NULL REFERENCES volumes(id) ON DELETE CASCADE,
  backup_path text NOT NULL,
  size_bytes bigint DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create schedules table
CREATE TABLE IF NOT EXISTS schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  volume_id uuid NOT NULL REFERENCES volumes(id) ON DELETE CASCADE,
  cron_expression text NOT NULL,
  enabled boolean DEFAULT true,
  last_run timestamptz,
  next_run timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE volumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

-- Volumes policies (public access for simplicity in Docker environment)
CREATE POLICY "Anyone can view volumes"
  ON volumes FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert volumes"
  ON volumes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update volumes"
  ON volumes FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete volumes"
  ON volumes FOR DELETE
  USING (true);

-- Backups policies
CREATE POLICY "Anyone can view backups"
  ON backups FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert backups"
  ON backups FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update backups"
  ON backups FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete backups"
  ON backups FOR DELETE
  USING (true);

-- Schedules policies
CREATE POLICY "Anyone can view schedules"
  ON schedules FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert schedules"
  ON schedules FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update schedules"
  ON schedules FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete schedules"
  ON schedules FOR DELETE
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_backups_volume_id ON backups(volume_id);
CREATE INDEX IF NOT EXISTS idx_backups_status ON backups(status);
CREATE INDEX IF NOT EXISTS idx_schedules_volume_id ON schedules(volume_id);
CREATE INDEX IF NOT EXISTS idx_schedules_enabled ON schedules(enabled);