import { watch } from 'fs';
import { readdir } from 'fs/promises';
import path from 'path';
import pool from '../db.js';
import { getBackupStoragePath } from './cifs-mount.js';

export function startBackupSync() {
  const backupStoragePath = getBackupStoragePath();

  console.log(`Starting backup sync for: ${backupStoragePath}`);

  const watcher = watch(backupStoragePath, { recursive: false }, async (eventType, filename) => {
    if (eventType === 'rename' && filename) {
      const fullPath = path.join(backupStoragePath, filename);

      try {
        const result = await pool.query(
          'SELECT id FROM backups WHERE backup_path = $1',
          [fullPath]
        );

        if (result.rows.length > 0) {
          await pool.query('DELETE FROM backups WHERE backup_path = $1', [fullPath]);
          console.log(`Removed orphaned backup entry: ${fullPath}`);
        }
      } catch (error) {
        console.error('Error syncing backup deletion:', error);
      }
    }
  });

  setInterval(async () => {
    await syncOrphanedBackups();
  }, 60000);

  watcher.on('error', (error) => {
    console.error('File watcher error:', error);
  });

  return watcher;
}

export async function syncOrphanedBackups() {
  try {
    const backupStoragePath = getBackupStoragePath();

    const files = await readdir(backupStoragePath);
    const existingFiles = new Set(
      files
        .filter(f => f.endsWith('.tar.gz'))
        .map(f => path.join(backupStoragePath, f))
    );

    const result = await pool.query('SELECT id, backup_path FROM backups');

    for (const row of result.rows) {
      if (!existingFiles.has(row.backup_path)) {
        await pool.query('DELETE FROM backups WHERE id = $1', [row.id]);
        console.log(`Cleaned up orphaned DB entry: ${row.backup_path}`);
      }
    }
  } catch (error) {
    console.error('Error syncing orphaned backups:', error);
  }
}
