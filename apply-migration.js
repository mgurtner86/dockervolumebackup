import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'postgres',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'backup_manager',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
});

async function applyMigration() {
  const client = await pool.connect();
  try {
    console.log('Applying migrations...');

    const migration1 = readFileSync(
      join(__dirname, 'server/migrations/001_add_schedule_frequency_time.sql'),
      'utf-8'
    );

    const migration2 = readFileSync(
      join(__dirname, 'server/migrations/002_add_schedule_groups_frequency_time.sql'),
      'utf-8'
    );

    await client.query(migration1);
    console.log('✓ Migration 1 applied successfully');

    await client.query(migration2);
    console.log('✓ Migration 2 applied successfully');

    console.log('✓ All migrations applied successfully');
  } catch (error) {
    console.error('✗ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

applyMigration();
