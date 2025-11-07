import { Pool } from 'pg';

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

      CREATE INDEX IF NOT EXISTS idx_backups_volume_id ON backups(volume_id);
      CREATE INDEX IF NOT EXISTS idx_backups_status ON backups(status);
      CREATE INDEX IF NOT EXISTS idx_schedules_volume_id ON schedules(volume_id);
      CREATE INDEX IF NOT EXISTS idx_schedules_enabled ON schedules(enabled);

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
        ('azure_ad_enabled', 'false')
      ON CONFLICT (key) DO NOTHING;
    `);
    console.log('Database initialized successfully');
  } finally {
    client.release();
  }
};

export default pool;
