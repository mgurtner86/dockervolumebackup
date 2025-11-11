export interface Volume {
  id: string;
  name: string;
  path: string;
  created_at: string;
  updated_at: string;
}

export interface Backup {
  id: string;
  volume_id: string;
  backup_path: string;
  size_bytes: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  volumes?: {
    name: string;
    path: string;
  };
}

export interface Schedule {
  id: string;
  volume_id: string;
  frequency: string;
  time: string;
  cron_expression?: string;
  enabled: boolean;
  last_run?: string;
  next_run?: string;
  created_at: string;
  updated_at: string;
  volumes?: {
    name: string;
    path: string;
  };
}

export interface ScheduleGroupVolume {
  id: string;
  volume_id: string;
  volume_name: string;
  volume_path: string;
  execution_order: number;
}

export interface ScheduleGroup {
  id: string;
  name: string;
  description: string;
  cron_expression: string;
  enabled: boolean;
  last_run?: string;
  next_run?: string;
  created_at: string;
  updated_at: string;
  volumes: ScheduleGroupVolume[];
}

export interface ScheduleGroupRun {
  id: string;
  group_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  current_volume_index: number;
  total_volumes: number;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  created_at: string;
}
