import pool from '../db.js';

type LogLevel = 'info' | 'success' | 'warning' | 'error';
type LogCategory = 'backup' | 'restore' | 'schedule' | 'system' | 'auth' | 'general';

interface LogOptions {
  level: LogLevel;
  category: LogCategory;
  message: string;
  details?: Record<string, any>;
  volumeId?: string;
  backupId?: number;
  userId?: string;
}

export async function log(options: LogOptions): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO logs (level, category, message, details, volume_id, backup_id, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        options.level,
        options.category,
        options.message,
        JSON.stringify(options.details || {}),
        options.volumeId || null,
        options.backupId || null,
        options.userId || null
      ]
    );
  } catch (error) {
    console.error('Error writing log:', error);
  }
}

export const logger = {
  info: (category: LogCategory, message: string, details?: Record<string, any>) =>
    log({ level: 'info', category, message, details }),

  success: (category: LogCategory, message: string, details?: Record<string, any>) =>
    log({ level: 'success', category, message, details }),

  warning: (category: LogCategory, message: string, details?: Record<string, any>) =>
    log({ level: 'warning', category, message, details }),

  error: (category: LogCategory, message: string, details?: Record<string, any>) =>
    log({ level: 'error', category, message, details }),
};
