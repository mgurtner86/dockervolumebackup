import { Router } from 'express';
import pool from '../db';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { promises as fs } from 'fs';
import { getSetting } from './settings';

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
    const backupStoragePath = await getSetting('backup_storage_path') || '/backups';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${backupStoragePath}/${volume.name}_${timestamp}.tar.gz`;

    const result = await pool.query(
      `INSERT INTO backups (volume_id, backup_path, status, started_at)
       VALUES ($1, $2, 'in_progress', CURRENT_TIMESTAMP)
       RETURNING *`,
      [volume_id, backupPath]
    );

    const backup = result.rows[0];

    performBackup(backup.id, volume.path, backupPath);

    res.json(backup);
  } catch (error) {
    console.error('Error triggering backup:', error);
    res.status(500).json({ error: 'Failed to trigger backup' });
  }
});

async function performBackup(
  backupId: number,
  sourcePath: string,
  backupPath: string
) {
  try {
    await fs.mkdir(path.dirname(backupPath), { recursive: true });

    const command = `tar -czf ${backupPath} -C ${path.dirname(sourcePath)} ${path.basename(sourcePath)}`;
    await execAsync(command);

    const stats = await fs.stat(backupPath);

    await pool.query(
      `UPDATE backups
       SET status = 'completed',
           size_bytes = $1,
           completed_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [stats.size, backupId]
    );

    console.log(`Backup ${backupId} completed successfully`);
  } catch (error) {
    console.error('Error performing backup:', error);

    await pool.query(
      `UPDATE backups
       SET status = 'failed',
           error_message = $1,
           completed_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [error instanceof Error ? error.message : 'Unknown error', backupId]
    );
  }
}

router.post('/restore', async (req, res) => {
  const { backup_id } = req.body;

  if (!backup_id) {
    return res.status(400).json({ error: 'backup_id is required' });
  }

  try {
    const result = await pool.query(
      `SELECT b.*, v.path as volume_path
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

    const command = `tar -xzf ${backup.backup_path} -C ${path.dirname(backup.volume_path)} --overwrite`;
    await execAsync(command);

    res.json({ success: true, message: 'Restore completed successfully' });
  } catch (error) {
    console.error('Error restoring backup:', error);
    res.status(500).json({ error: 'Failed to restore backup' });
  }
});

export default router;
