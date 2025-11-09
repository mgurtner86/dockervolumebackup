/*
  # Create Schedule Groups

  1. New Tables
    - `schedule_groups`
      - `id` (uuid, primary key)
      - `name` (text) - Name of the schedule group
      - `description` (text) - Optional description
      - `cron_expression` (text) - When to run this group
      - `enabled` (boolean) - Whether the group is active
      - `last_run` (timestamptz) - Last execution time
      - `next_run` (timestamptz) - Next scheduled execution
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `schedule_group_volumes`
      - `id` (uuid, primary key)
      - `group_id` (uuid, foreign key to schedule_groups)
      - `volume_id` (uuid, foreign key to volumes)
      - `execution_order` (integer) - Order in which volumes are backed up
      - `created_at` (timestamptz)
    
    - `schedule_group_runs`
      - `id` (uuid, primary key)
      - `group_id` (uuid, foreign key to schedule_groups)
      - `status` (text) - pending, in_progress, completed, failed
      - `current_volume_index` (integer) - Which volume is currently being backed up
      - `total_volumes` (integer) - Total number of volumes in this run
      - `started_at` (timestamptz)
      - `completed_at` (timestamptz)
      - `error_message` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all new tables
    - Add policies for authenticated access

  3. Important Notes
    - Schedule groups allow multiple volumes to be backed up sequentially
    - Each volume in a group has an execution order
    - Progress tracking shows which volume is currently being backed up
    - The old schedules table remains for individual volume schedules
*/

CREATE TABLE IF NOT EXISTS schedule_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  cron_expression text NOT NULL,
  enabled boolean DEFAULT true,
  last_run timestamptz,
  next_run timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS schedule_group_volumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES schedule_groups(id) ON DELETE CASCADE,
  volume_id uuid NOT NULL REFERENCES volumes(id) ON DELETE CASCADE,
  execution_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(group_id, volume_id)
);

CREATE TABLE IF NOT EXISTS schedule_group_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES schedule_groups(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  current_volume_index integer DEFAULT 0,
  total_volumes integer DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE schedule_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_group_volumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_group_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on schedule_groups"
  ON schedule_groups
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on schedule_group_volumes"
  ON schedule_group_volumes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on schedule_group_runs"
  ON schedule_group_runs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_schedule_group_volumes_group_id ON schedule_group_volumes(group_id);
CREATE INDEX IF NOT EXISTS idx_schedule_group_volumes_volume_id ON schedule_group_volumes(volume_id);
CREATE INDEX IF NOT EXISTS idx_schedule_group_runs_group_id ON schedule_group_runs(group_id);
CREATE INDEX IF NOT EXISTS idx_schedule_group_runs_status ON schedule_group_runs(status);
