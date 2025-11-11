import { Router } from 'express';
import pool from '../db.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { promises as fs } from 'fs';
import { getBackupStoragePath } from '../utils/cifs-mount.js';
import { sendBackupFailureEmail, sendRestoreCompleteEmail } from '../utils/email-service.js';
import { log } from '../utils/logger.js';

const execAsync = promisify(exec);
const router = Router();

router.get('/', async (req, res) => {
  const { volume_id } = req.query;

  try {
    let query = `
      SELECT b.*, v.name as volume_name, v.path as volume_path
      FROM backups b
      JOIN volumes v ON b.volume_id = v.id
    `;
    const params: any[] = [];

    if (volume_id) {
      query += ' WHERE b.volume_id = $1';
      params.push(volume_id);
    }

    query += ' ORDER BY b.created_at DESC';

    const result = await pool.query(query, params);

    const backups = result.rows.map((row) => ({
      id: row.id,
      volume_id: row.volume_id,
      backup_path: row.backup_path,
      size_bytes: parseInt(row.size_bytes),
      status: row.status,
      error_message: row.error_message,
      started_at: row.started_at,
      completed_at: row.completed_at,
      created_at: row.created_at,
      volumes: {
        name: row.volume_name,
        path: row.volume_path,
      },
    }));

    res.json(backups);
  } catch (error) {
    console.error('Error fetching backups:', error);
    res.status(500).json({ error: 'Failed to fetch backups' });
  }
});

router.post('/trigger', async (req, res) => {
  const { volume_id } = req.body;
  const internalToken = req.headers['x-internal-scheduler-token'];

  // Allow internal scheduler to bypass auth check
  const isInternalCall = internalToken === process.env.INTERNAL_SCHEDULER_TOKEN;

  // If not an internal call, ensure user is authenticated
  if (!isInternalCall && !req.session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!volume_id) {
    return res.status(400).json({ error: 'volume_id is required' });
  }

  try {
    const volumeResult = await pool.query(
      'SELECT * FROM volumes WHERE id = $1',
      [volume_id]
    );

    if (volumeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Volume not found' });
    }

    const volume = volumeResult.rows[0];
    const backupStoragePath = getBackupStoragePath();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupStoragePath, `${volume.name}_${timestamp}.tar.gz`);

    const result = await pool.query(
      `INSERT INTO backups (volume_id, backup_path, status, started_at)
       VALUES ($1, $2, 'in_progress', CURRENT_TIMESTAMP)
       RETURNING *`,
      [volume_id, backupPath]
    );

    const backup = result.rows[0];

    await log({
      level: 'info',
      category: 'backup',
      message: `Backup started for volume "${volume.name}"`,
      details: { volumeId: volume_id, backupPath },
      volumeId: volume.id.toString(),
      backupId: backup.id
    });

    performBackup(backup.id, volume.path, backupPath, volume.name, volume.id);

    res.json(backup);
  } catch (error) {
    console.error('Error triggering backup:', error);
    res.status(500).json({ error: 'Failed to trigger backup' });
  }
});

async function performBackup(
  backupId: number,
  sourcePath: string,
  backupPath: string,
  volumeName?: string,
  volumeId?: number
) {
  try {
    await fs.mkdir(path.dirname(backupPath), { recursive: true });

    const command = `tar -czf "${backupPath}" -C "${path.dirname(sourcePath)}" "${path.basename(sourcePath)}" --warning=no-file-changed --warning=no-file-removed 2>&1`;

    try {
      await execAsync(command);
    } catch (error: any) {
      if (error.code === 1) {
        const stderr = error.stderr || '';
        if (stderr.includes('file changed as we read it') || stderr.includes('file removed before we read it')) {
          console.log(`Backup completed with warnings (files changed during backup) - this is normal for live databases`);
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }

    const stats = await fs.stat(backupPath);

    await pool.query(
      `UPDATE backups
       SET status = 'completed',
           size_bytes = $1,
           completed_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [stats.size, backupId]
    );

    await log({
      level: 'success',
      category: 'backup',
      message: `Backup completed successfully for volume "${volumeName || 'unknown'}"`,
      details: {
        backupId,
        sizeBytes: stats.size,
        backupPath,
        sizeMB: Math.round(stats.size / (1024 * 1024))
      },
      volumeId: volumeId?.toString(),
      backupId
    });

    console.log(`Backup ${backupId} completed successfully`);
  } catch (error) {
    console.error('Error performing backup:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await pool.query(
      `UPDATE backups
       SET status = 'failed',
           error_message = $1,
           completed_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [errorMessage, backupId]
    );

    await log({
      level: 'error',
      category: 'backup',
      message: `Backup failed for volume "${volumeName || 'unknown'}"`,
      details: {
        backupId,
        error: errorMessage,
        backupPath
      },
      volumeId: volumeId?.toString(),
      backupId
    });

    if (volumeName) {
      await sendBackupFailureEmail(volumeName, errorMessage);
    }
  }
}

router.get('/:id/contents', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'SELECT backup_path, status FROM backups WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    const backup = result.rows[0];

    if (backup.status !== 'completed') {
      return res.status(400).json({ error: 'Backup is not completed' });
    }

    const { stdout } = await execAsync(`tar -tzf ${backup.backup_path}`);
    const files = stdout
      .trim()
      .split('\n')
      .filter(line => line)
      .map((line) => {
        const isDirectory = line.endsWith('/');
        const cleanPath = line.replace(/\/$/, '');
        const parts = cleanPath.split('/');
        const name = parts[parts.length - 1];

        return {
          name: name || cleanPath,
          path: cleanPath,
          isDirectory,
        };
      });

    res.json({ files });
  } catch (error) {
    console.error('Error listing backup contents:', error);
    res.status(500).json({ error: 'Failed to list backup contents' });
  }
});

router.post('/restore', async (req, res) => {
  const { backup_id, restore_type, selected_files, custom_path } = req.body;

  if (!backup_id) {
    return res.status(400).json({ error: 'backup_id is required' });
  }

  try {
    const result = await pool.query(
      `SELECT b.*, v.path as volume_path, v.name as volume_name
       FROM backups b
       JOIN volumes v ON b.volume_id = v.id
       WHERE b.id = $1`,
      [backup_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    const backup = result.rows[0];

    if (backup.status !== 'completed') {
      return res.status(400).json({ error: 'Backup is not completed' });
    }

    const restorePath = custom_path || path.dirname(backup.volume_path);
    await fs.mkdir(restorePath, { recursive: true });

    let command;
    if (restore_type === 'selective' && selected_files && selected_files.length > 0) {
      const fileList = selected_files.join(' ');
      command = `tar -xzf ${backup.backup_path} -C ${restorePath} ${fileList} --overwrite`;
    } else {
      command = `tar -xzf ${backup.backup_path} -C ${restorePath} --overwrite`;
    }

    await execAsync(command);

    await log({
      level: 'success',
      category: 'restore',
      message: `Restore completed successfully for volume "${backup.volume_name}"`,
      details: {
        backupId: backup_id,
        restoreType: restore_type,
        restorePath,
        selectedFiles: selected_files || []
      },
      volumeId: backup.volume_id.toString(),
      backupId: backup_id
    });

    const backupDate = new Date(backup.created_at).toLocaleString();
    await sendRestoreCompleteEmail(
      backup.volume_name,
      backupDate,
      restore_type || 'full',
      selected_files
    );

    res.json({ success: true, message: 'Restore completed successfully' });
  } catch (error) {
    console.error('Error restoring backup:', error);
    res.status(500).json({ error: 'Failed to restore backup' });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'SELECT backup_path FROM backups WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    const backupPath = result.rows[0].backup_path;

    try {
      await fs.unlink(backupPath);
      console.log(`Deleted backup file: ${backupPath}`);
    } catch (error) {
      console.error('Error deleting backup file:', error);
    }

    await pool.query('DELETE FROM backups WHERE id = $1', [id]);

    res.json({ success: true, message: 'Backup deleted successfully' });
  } catch (error) {
    console.error('Error deleting backup:', error);
    res.status(500).json({ error: 'Failed to delete backup' });
  }
});

router.get('/browse', async (req, res) => {
  const subPath = req.query.path as string || '';

  try {
    const backupStoragePath = getBackupStoragePath();
    const fullPath = path.join(backupStoragePath, subPath);

    try {
      await fs.access(fullPath);
    } catch {
      return res.status(404).json({ error: 'Path not accessible' });
    }

    const items = await fs.readdir(fullPath, { withFileTypes: true });

    const files = await Promise.all(
      items.map(async (item) => {
        const itemPath = path.join(fullPath, item.name);
        let size = 0;
        let modified = new Date();

        try {
          const stats = await fs.stat(itemPath);
          size = stats.size;
          modified = stats.mtime;
        } catch (error) {
          console.error('Error getting stats:', error);
        }

        return {
          name: item.name,
          isDirectory: item.isDirectory(),
          size,
          modified: modified.toISOString(),
          path: path.join(subPath, item.name),
        };
      })
    );

    res.json({
      currentPath: subPath,
      basePath: backupStoragePath,
      items: files.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      }),
    });
  } catch (error) {
    console.error('Error browsing backups:', error);
    res.status(500).json({ error: 'Failed to browse backups' });
  }
});

export default router;
