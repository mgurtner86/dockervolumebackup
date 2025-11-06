import { Router } from 'express';
import pool from '../db';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, v.name as volume_name, v.path as volume_path
      FROM schedules s
      JOIN volumes v ON s.volume_id = v.id
      ORDER BY s.created_at DESC
    `);

    const schedules = result.rows.map((row) => ({
      id: row.id,
      volume_id: row.volume_id,
      cron_expression: row.cron_expression,
      enabled: row.enabled,
      last_run: row.last_run,
      next_run: row.next_run,
      created_at: row.created_at,
      updated_at: row.updated_at,
      volumes: {
        name: row.volume_name,
        path: row.volume_path,
      },
    }));

    res.json(schedules);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ error: 'Failed to fetch schedules' });
  }
});

router.post('/', async (req, res) => {
  const { volume_id, cron_expression } = req.body;

  if (!volume_id || !cron_expression) {
    return res.status(400).json({ error: 'volume_id and cron_expression are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO schedules (volume_id, cron_expression, enabled)
       VALUES ($1, $2, true)
       RETURNING *`,
      [volume_id, cron_expression]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating schedule:', error);
    res.status(500).json({ error: 'Failed to create schedule' });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { enabled } = req.body;

  try {
    const result = await pool.query(
      `UPDATE schedules
       SET enabled = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [enabled, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM schedules WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({ error: 'Failed to delete schedule' });
  }
});

export default router;
