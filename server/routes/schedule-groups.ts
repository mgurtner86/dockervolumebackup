import { Router } from 'express';
import pool from '../db.js';

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
  const { name, description, cron_expression, volume_ids } = req.body;

  if (!name || !cron_expression) {
    return res.status(400).json({ error: 'name and cron_expression are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const groupResult = await client.query(
      `INSERT INTO schedule_groups (name, description, cron_expression, enabled)
       VALUES ($1, $2, $3, true)
       RETURNING *`,
      [name, description || '', cron_expression]
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
  const { name, description, cron_expression, enabled, volume_ids } = req.body;

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
    if (cron_expression !== undefined) {
      updateFields.push(`cron_expression = $${paramCount++}`);
      values.push(cron_expression);
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
      `SELECT COUNT(*) as count FROM schedule_group_volumes WHERE group_id = $1`,
      [id]
    );

    const totalVolumes = parseInt(volumesResult.rows[0].count);

    const runResult = await pool.query(
      `INSERT INTO schedule_group_runs (group_id, status, total_volumes, started_at)
       VALUES ($1, 'in_progress', $2, CURRENT_TIMESTAMP)
       RETURNING *`,
      [id, totalVolumes]
    );

    res.json(runResult.rows[0]);
  } catch (error) {
    console.error('Error starting schedule group run:', error);
    res.status(500).json({ error: 'Failed to start schedule group run' });
  }
});

export default router;
