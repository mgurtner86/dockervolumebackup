import pool from '../db.js';
import { promises as fs } from 'fs';
import { log } from './logger.js';

export async function cleanupOldBackups() {
  try {
    const settingsResult = await pool.query(
      'SELECT retention_days FROM settings LIMIT 1'
    );

    if (settingsResult.rows.length === 0) {
      console.log('No settings found, skipping retention cleanup');
      return;
    }

    const retentionDays = parseInt(settingsResult.rows[0].retention_days);

    if (retentionDays === 0) {
      console.log('Retention policy disabled (0 days), skipping cleanup');
      return;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const backupsToDelete = await pool.query(
      `SELECT id, backup_path, volume_id, volumes.name as volume_name
       FROM backups
       LEFT JOIN volumes ON backups.volume_id = volumes.id
       WHERE completed_at < $1 AND status = 'completed'
       ORDER BY completed_at ASC`,
      [cutoffDate]
    );

    if (backupsToDelete.rows.length === 0) {
      console.log('No backups to clean up based on retention policy');
      return;
    }

    console.log(`Found ${backupsToDelete.rows.length} backup(s) to delete (older than ${retentionDays} days)`);

    let deletedCount = 0;
    let failedCount = 0;

    for (const backup of backupsToDelete.rows) {
      try {
        await fs.unlink(backup.backup_path);

        await pool.query('DELETE FROM backups WHERE id = $1', [backup.id]);

        await log({
          level: 'info',
          category: 'retention',
          message: `Deleted backup due to retention policy: ${backup.volume_name || 'unknown'}`,
          details: {
            backupId: backup.id,
            backupPath: backup.backup_path,
            retentionDays,
            volumeId: backup.volume_id
          },
          volumeId: backup.volume_id?.toString(),
          backupId: backup.id
        });

        deletedCount++;
      } catch (error: any) {
        console.error(`Failed to delete backup ${backup.id}:`, error.message);

        if (error.code === 'ENOENT') {
          await pool.query('DELETE FROM backups WHERE id = $1', [backup.id]);
          console.log(`Backup file already missing, removed from database: ${backup.id}`);
          deletedCount++;
        } else {
          failedCount++;
          await log({
            level: 'error',
            category: 'retention',
            message: `Failed to delete backup during retention cleanup`,
            details: {
              backupId: backup.id,
              error: error.message,
              backupPath: backup.backup_path
            },
            volumeId: backup.volume_id?.toString(),
            backupId: backup.id
          });
        }
      }
    }

    console.log(`Retention cleanup completed: ${deletedCount} deleted, ${failedCount} failed`);

    if (deletedCount > 0) {
      await log({
        level: 'success',
        category: 'retention',
        message: `Retention cleanup completed: ${deletedCount} backup(s) deleted`,
        details: {
          deletedCount,
          failedCount,
          retentionDays
        }
      });
    }
  } catch (error) {
    console.error('Error during retention cleanup:', error);
    await log({
      level: 'error',
      category: 'retention',
      message: 'Retention cleanup failed',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
}
