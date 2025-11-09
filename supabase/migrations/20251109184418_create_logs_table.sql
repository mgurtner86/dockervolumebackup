/*
  # Create Logs Table

  1. New Tables
    - `logs`
      - `id` (serial, primary key)
      - `timestamp` (timestamptz) - When the log entry was created
      - `level` (text) - Log level: 'info', 'success', 'warning', 'error'
      - `category` (text) - Log category: 'backup', 'restore', 'schedule', 'system', 'auth'
      - `message` (text) - The log message
      - `details` (jsonb) - Additional details as JSON
      - `volume_id` (text) - Optional reference to volume
      - `backup_id` (integer) - Optional reference to backup
      - `user_id` (text) - Optional reference to user who triggered the action
      - `created_at` (timestamptz) - Timestamp of log creation
  
  2. Indexes
    - Index on timestamp for efficient time-based queries
    - Index on level for filtering by severity
    - Index on category for filtering by type
  
  3. Security
    - Enable RLS on `logs` table
    - Add policy for authenticated users to read logs
*/

CREATE TABLE IF NOT EXISTS logs (
  id serial PRIMARY KEY,
  timestamp timestamptz NOT NULL DEFAULT now(),
  level text NOT NULL CHECK (level IN ('info', 'success', 'warning', 'error')),
  category text NOT NULL CHECK (category IN ('backup', 'restore', 'schedule', 'system', 'auth', 'general')),
  message text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  volume_id text,
  backup_id integer,
  user_id text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
CREATE INDEX IF NOT EXISTS idx_logs_category ON logs(category);
CREATE INDEX IF NOT EXISTS idx_logs_volume_id ON logs(volume_id);

ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read logs"
  ON logs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert logs"
  ON logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
