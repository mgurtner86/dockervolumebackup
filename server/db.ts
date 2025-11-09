import { Pool } from 'pg';
import bcrypt from 'bcrypt';

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'postgres',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'backup_manager',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
});

export const initDatabase = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS volumes (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        path TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS backups (
        id SERIAL PRIMARY KEY,
        volume_id INTEGER NOT NULL REFERENCES volumes(id) ON DELETE CASCADE,
        backup_path TEXT NOT NULL,
        size_bytes BIGINT DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending',
        error_message TEXT,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS schedules (
        id SERIAL PRIMARY KEY,
        volume_id INTEGER NOT NULL REFERENCES volumes(id) ON DELETE CASCADE,
        cron_expression TEXT NOT NULL,
        enabled BOOLEAN DEFAULT true,
        last_run TIMESTAMP,
        next_run TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS schedule_groups (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        cron_expression TEXT NOT NULL,
        enabled BOOLEAN DEFAULT true,
        last_run TIMESTAMP,
        next_run TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS schedule_group_volumes (
        id SERIAL PRIMARY KEY,
        group_id INTEGER NOT NULL REFERENCES schedule_groups(id) ON DELETE CASCADE,
        volume_id INTEGER NOT NULL REFERENCES volumes(id) ON DELETE CASCADE,
        execution_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(group_id, volume_id)
      );

      CREATE TABLE IF NOT EXISTS schedule_group_runs (
        id SERIAL PRIMARY KEY,
        group_id INTEGER NOT NULL REFERENCES schedule_groups(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'pending',
        current_volume_index INTEGER DEFAULT 0,
        total_volumes INTEGER DEFAULT 0,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS logs (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        level TEXT NOT NULL CHECK (level IN ('info', 'success', 'warning', 'error')),
        category TEXT NOT NULL CHECK (category IN ('backup', 'restore', 'schedule', 'system', 'auth', 'general')),
        message TEXT NOT NULL,
        details JSONB DEFAULT '{}'::jsonb,
        volume_id TEXT,
        backup_id INTEGER,
        user_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_backups_volume_id ON backups(volume_id);
      CREATE INDEX IF NOT EXISTS idx_backups_status ON backups(status);
      CREATE INDEX IF NOT EXISTS idx_schedules_volume_id ON schedules(volume_id);
      CREATE INDEX IF NOT EXISTS idx_schedules_enabled ON schedules(enabled);
      CREATE INDEX IF NOT EXISTS idx_schedule_group_volumes_group_id ON schedule_group_volumes(group_id);
      CREATE INDEX IF NOT EXISTS idx_schedule_group_volumes_volume_id ON schedule_group_volumes(volume_id);
      CREATE INDEX IF NOT EXISTS idx_schedule_group_runs_group_id ON schedule_group_runs(group_id);
      CREATE INDEX IF NOT EXISTS idx_schedule_group_runs_status ON schedule_group_runs(status);
      CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
      CREATE INDEX IF NOT EXISTS idx_logs_category ON logs(category);
      CREATE INDEX IF NOT EXISTS idx_logs_volume_id ON logs(volume_id);

      INSERT INTO settings (key, value)
      VALUES
        ('backup_storage_path', '//server/share'),
        ('cifs_username', ''),
        ('cifs_password', ''),
        ('cifs_domain', ''),
        ('azure_ad_client_id', ''),
        ('azure_ad_client_secret', ''),
        ('azure_ad_tenant_id', ''),
        ('azure_ad_required_group_id', ''),
        ('azure_ad_enabled', 'false'),
        ('email_enabled', 'false'),
        ('email_ms_tenant_id', ''),
        ('email_ms_client_id', ''),
        ('email_ms_client_secret', ''),
        ('email_from_address', ''),
        ('email_to_addresses', ''),
        ('email_notify_backup_failure', 'true'),
        ('email_notify_restore_complete', 'true'),
        ('email_notify_schedule_complete', 'true')
      ON CONFLICT (key) DO NOTHING;
    `);

    const userCheck = await client.query('SELECT COUNT(*) as count FROM users');
    const userCount = parseInt(userCheck.rows[0].count);

    if (userCount === 0) {
      const defaultPassword = 'changeme123';
      const passwordHash = await bcrypt.hash(defaultPassword, 10);

      await client.query(
        'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)',
        ['admin', passwordHash, 'admin']
      );

      console.log('Database initialized successfully');
      console.log('Default admin user created:');
      console.log('  Username: admin');
      console.log('  Password: changeme123');
      console.log('  IMPORTANT: Change this password immediately after first login!');
    } else {
      console.log('Database initialized successfully');
    }
  } finally {
    client.release();
  }
};

export default pool;
