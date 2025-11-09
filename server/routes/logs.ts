import { Router } from 'express';
import pool from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { level, category, volumeId, limit = '100', offset = '0' } = req.query;

    let query = 'SELECT * FROM logs WHERE 1=1';
    const params: any[] = [];
    let paramCount = 0;

    if (level) {
      paramCount++;
      query += ` AND level = $${paramCount}`;
      params.push(level);
    }

    if (category) {
      paramCount++;
      query += ` AND category = $${paramCount}`;
      params.push(category);
    }

    if (volumeId) {
      paramCount++;
      query += ` AND volume_id = $${paramCount}`;
      params.push(volumeId);
    }

    query += ` ORDER BY timestamp DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        level,
        COUNT(*) as count
      FROM logs
      WHERE timestamp > NOW() - INTERVAL '24 hours'
      GROUP BY level
    `);

    const stats = {
      info: 0,
      success: 0,
      warning: 0,
      error: 0,
    };

    result.rows.forEach((row: any) => {
      stats[row.level as keyof typeof stats] = parseInt(row.count);
    });

    res.json(stats);
  } catch (error) {
    console.error('Error fetching log stats:', error);
    res.status(500).json({ error: 'Failed to fetch log stats' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { level, category, message, details, volumeId, backupId, userId } = req.body;

    if (!level || !category || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await pool.query(
      `INSERT INTO logs (level, category, message, details, volume_id, backup_id, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [level, category, message, details || {}, volumeId || null, backupId || null, userId || null]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating log:', error);
    res.status(500).json({ error: 'Failed to create log' });
  }
});

router.delete('/clear', async (req, res) => {
  try {
    const { olderThan } = req.query;

    if (olderThan) {
      await pool.query('DELETE FROM logs WHERE timestamp < $1', [olderThan]);
    } else {
      await pool.query('DELETE FROM logs');
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing logs:', error);
    res.status(500).json({ error: 'Failed to clear logs' });
  }
});

export default router;
