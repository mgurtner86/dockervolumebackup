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
  cron_expression: string;
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
