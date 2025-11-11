import { Router } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { promises as fs } from 'fs';
import pool from '../db.js';
import { getBackupStoragePath } from '../utils/cifs-mount.js';
import { sendScheduleGroupCompleteEmail } from '../utils/email-service.js';
import { log } from '../utils/logger.js';

const execAsync = promisify(exec);
const router = Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        sg.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', sgv.id,
              'volume_id', sgv.volume_id,
              'volume_name', v.name,
              'volume_path', v.path,
              'execution_order', sgv.execution_order
            ) ORDER BY sgv.execution_order
          ) FILTER (WHERE sgv.id IS NOT NULL),
          '[]'
        ) as volumes
      FROM schedule_groups sg
      LEFT JOIN schedule_group_volumes sgv ON sg.id = sgv.group_id
      LEFT JOIN volumes v ON sgv.volume_id = v.id
      GROUP BY sg.id
      ORDER BY sg.created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching schedule groups:', error);
    res.status(500).json({ error: 'Failed to fetch schedule groups' });
  }
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(`
      SELECT
        sg.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', sgv.id,
              'volume_id', sgv.volume_id,
              'volume_name', v.name,
              'volume_path', v.path,
              'execution_order', sgv.execution_order
            ) ORDER BY sgv.execution_order
          ) FILTER (WHERE sgv.id IS NOT NULL),
          '[]'
        ) as volumes
      FROM schedule_groups sg
      LEFT JOIN schedule_group_volumes sgv ON sg.id = sgv.group_id
      LEFT JOIN volumes v ON sgv.volume_id = v.id
      WHERE sg.id = $1
      GROUP BY sg.id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule group not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching schedule group:', error);
    res.status(500).json({ error: 'Failed to fetch schedule group' });
  }
});

router.post('/', async (req, res) => {
  const { name, description, frequency, time, volume_ids } = req.body;

  if (!name || !frequency || !time) {
    return res.status(400).json({ error: 'name, frequency, and time are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const groupResult = await client.query(
      `INSERT INTO schedule_groups (name, description, frequency, time, enabled)
       VALUES ($1, $2, $3, $4, true)
       RETURNING *`,
      [name, description || '', frequency, time]
    );

    const group = groupResult.rows[0];

    if (volume_ids && Array.isArray(volume_ids) && volume_ids.length > 0) {
      for (let i = 0; i < volume_ids.length; i++) {
        await client.query(
          `INSERT INTO schedule_group_volumes (group_id, volume_id, execution_order)
           VALUES ($1, $2, $3)`,
          [group.id, volume_ids[i], i]
        );
      }
    }

    await client.query('COMMIT');

    const finalResult = await pool.query(`
      SELECT
        sg.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', sgv.id,
              'volume_id', sgv.volume_id,
              'volume_name', v.name,
              'volume_path', v.path,
              'execution_order', sgv.execution_order
            ) ORDER BY sgv.execution_order
          ) FILTER (WHERE sgv.id IS NOT NULL),
          '[]'
        ) as volumes
      FROM schedule_groups sg
      LEFT JOIN schedule_group_volumes sgv ON sg.id = sgv.group_id
      LEFT JOIN volumes v ON sgv.volume_id = v.id
      WHERE sg.id = $1
      GROUP BY sg.id
    `, [group.id]);

    res.json(finalResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating schedule group:', error);
    res.status(500).json({ error: 'Failed to create schedule group' });
  } finally {
    client.release();
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, frequency, time, enabled, volume_ids } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updateFields.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (frequency !== undefined) {
      updateFields.push(`frequency = $${paramCount++}`);
      values.push(frequency);
    }
    if (time !== undefined) {
      updateFields.push(`time = $${paramCount++}`);
      values.push(time);
    }
    if (enabled !== undefined) {
      updateFields.push(`enabled = $${paramCount++}`);
      values.push(enabled);
    }

    if (updateFields.length > 0) {
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      await client.query(
        `UPDATE schedule_groups SET ${updateFields.join(', ')} WHERE id = $${paramCount}`,
        values
      );
    }

    if (volume_ids && Array.isArray(volume_ids)) {
      await client.query('DELETE FROM schedule_group_volumes WHERE group_id = $1', [id]);

      for (let i = 0; i < volume_ids.length; i++) {
        await client.query(
          `INSERT INTO schedule_group_volumes (group_id, volume_id, execution_order)
           VALUES ($1, $2, $3)`,
          [id, volume_ids[i], i]
        );
      }
    }

    await client.query('COMMIT');

    const finalResult = await pool.query(`
      SELECT
        sg.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', sgv.id,
              'volume_id', sgv.volume_id,
              'volume_name', v.name,
              'volume_path', v.path,
              'execution_order', sgv.execution_order
            ) ORDER BY sgv.execution_order
          ) FILTER (WHERE sgv.id IS NOT NULL),
          '[]'
        ) as volumes
      FROM schedule_groups sg
      LEFT JOIN schedule_group_volumes sgv ON sg.id = sgv.group_id
      LEFT JOIN volumes v ON sgv.volume_id = v.id
      WHERE sg.id = $1
      GROUP BY sg.id
    `, [id]);

    if (finalResult.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule group not found' });
    }

    res.json(finalResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating schedule group:', error);
    res.status(500).json({ error: 'Failed to update schedule group' });
  } finally {
    client.release();
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM schedule_groups WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting schedule group:', error);
    res.status(500).json({ error: 'Failed to delete schedule group' });
  }
});

router.get('/:id/runs', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(`
      SELECT * FROM schedule_group_runs
      WHERE group_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `, [id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching schedule group runs:', error);
    res.status(500).json({ error: 'Failed to fetch schedule group runs' });
  }
});

router.post('/:id/run', async (req, res) => {
  const { id } = req.params;

  try {
    const groupResult = await pool.query(
      'SELECT * FROM schedule_groups WHERE id = $1',
      [id]
    );

    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule group not found' });
    }

    const volumesResult = await pool.query(
      `SELECT sgv.*, v.id as volume_id, v.name as volume_name, v.path as volume_path
       FROM schedule_group_volumes sgv
       JOIN volumes v ON sgv.volume_id = v.id
       WHERE sgv.group_id = $1
       ORDER BY sgv.execution_order`,
      [id]
    );

    const volumes = volumesResult.rows;
    const totalVolumes = volumes.length;

    if (totalVolumes === 0) {
      return res.status(400).json({ error: 'No volumes in this schedule group' });
    }

    const runResult = await pool.query(
      `INSERT INTO schedule_group_runs (group_id, status, total_volumes, started_at)
       VALUES ($1, 'in_progress', $2, CURRENT_TIMESTAMP)
       RETURNING *`,
      [id, totalVolumes]
    );

    const run = runResult.rows[0];
    const group = groupResult.rows[0];

    await log({
      level: 'info',
      category: 'schedule',
      message: `Schedule group "${group.name}" started with ${totalVolumes} volumes`,
      details: {
        groupId: id,
        runId: run.id,
        volumeCount: totalVolumes
      }
    });

    executeScheduleGroup(run.id, id, volumes).catch((error) => {
      console.error('Error executing schedule group:', error);
    });

    res.json(run);
  } catch (error) {
    console.error('Error starting schedule group run:', error);
    res.status(500).json({ error: 'Failed to start schedule group run' });
  }
});

async function executeScheduleGroup(runId: number, groupId: string, volumes: any[]) {
  const startTimeResult = await pool.query(
    'SELECT started_at FROM schedule_group_runs WHERE id = $1',
    [runId]
  );
  const startTime = new Date(startTimeResult.rows[0].started_at);

  const groupResult = await pool.query(
    'SELECT name FROM schedule_groups WHERE id = $1',
    [groupId]
  );
  const groupName = groupResult.rows[0].name;

  let currentIndex = 0;
  const volumeStatuses: Array<{ name: string; status: string }> = [];

  for (const volume of volumes) {
    try {
      await pool.query(
        `UPDATE schedule_group_runs
         SET current_volume_index = $1
         WHERE id = $2`,
        [currentIndex + 1, runId]
      );

      const backupResult = await pool.query(
        `INSERT INTO backups (volume_id, backup_path, status, started_at)
         VALUES ($1, '', 'in_progress', CURRENT_TIMESTAMP)
         RETURNING id`,
        [volume.volume_id]
      );

      const backupId = backupResult.rows[0].id;

      await triggerBackup(backupId, volume.volume_id, volume.volume_path, volume.volume_name);

      volumeStatuses.push({ name: volume.volume_name, status: 'completed' });
      currentIndex++;
    } catch (error) {
      console.error(`Error backing up volume ${volume.volume_name}:`, error);

      volumeStatuses.push({ name: volume.volume_name, status: 'failed' });

      await pool.query(
        `UPDATE schedule_group_runs
         SET status = 'failed',
             error_message = $1,
             completed_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [`Failed at volume: ${volume.volume_name}`, runId]
      );

      await log({
        level: 'error',
        category: 'schedule',
        message: `Schedule group "${groupName}" failed at volume "${volume.volume_name}"`,
        details: {
          groupId,
          runId,
          failedVolume: volume.volume_name,
          volumeStatuses
        }
      });

      const endTime = new Date();
      await sendScheduleGroupCompleteEmail(groupName, volumeStatuses, startTime, endTime);

      return;
    }
  }

  const endTime = new Date();

  await pool.query(
    `UPDATE schedule_group_runs
     SET status = 'completed',
         current_volume_index = $1,
         completed_at = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [currentIndex, runId]
  );

  await pool.query(
    `UPDATE schedule_groups
     SET last_run = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [groupId]
  );

  await log({
    level: 'success',
    category: 'schedule',
    message: `Schedule group "${groupName}" completed successfully`,
    details: {
      groupId,
      runId,
      volumeCount: volumes.length,
      volumeStatuses,
      duration: Math.round((endTime.getTime() - startTime.getTime()) / 1000)
    }
  });

  await sendScheduleGroupCompleteEmail(groupName, volumeStatuses, startTime, endTime);
}

async function triggerBackup(backupId: number, volumeId: string, volumePath: string, volumeName: string) {
  const backupStoragePath = await getBackupStoragePath();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `${volumeName}_${timestamp}.tar.gz`;
  const backupPath = path.join(backupStoragePath, backupFileName);

  try {
    await execAsync(
      `tar -czf "${backupPath}" -C "${path.dirname(volumePath)}" "${path.basename(volumePath)}"`
    );

    const stats = await fs.stat(backupPath);
    const sizeBytes = stats.size;

    await pool.query(
      `UPDATE backups
       SET status = 'completed',
           backup_path = $1,
           size_bytes = $2,
           completed_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [backupPath, sizeBytes, backupId]
    );
  } catch (error) {
    console.error('Backup error:', error);
    await pool.query(
      `UPDATE backups
       SET status = 'failed',
           error_message = $1,
           completed_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [error instanceof Error ? error.message : 'Unknown error', backupId]
    );
    throw error;
  }
}

export default router;
