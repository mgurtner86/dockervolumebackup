import { Router } from 'express';
import pool from '../db';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM settings');
    const settings: Record<string, string> = {};
    result.rows.forEach((row) => {
      settings[row.key] = row.value;
    });
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.put('/', async (req, res) => {
  const { key, value } = req.body;

  if (!key || value === undefined) {
    return res.status(400).json({ error: 'Key and value are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO settings (key, value, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (key)
       DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [key, value]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

export const getSetting = async (key: string): Promise<string | null> => {
  try {
    const result = await pool.query('SELECT value FROM settings WHERE key = $1', [key]);
    return result.rows.length > 0 ? result.rows[0].value : null;
  } catch (error) {
    console.error('Error getting setting:', error);
    return null;
  }
};

export default router;
