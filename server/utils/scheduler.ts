import pool from '../db.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { log } from './logger.js';

const execAsync = promisify(exec);

interface Schedule {
  id: number;
  volume_id: number;
  frequency: string;
  time: string;
  enabled: boolean;
  last_run: Date | null;
}

let schedulerInterval: NodeJS.Timeout | null = null;

function parseTime(timeString: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeString.split(':').map(Number);
  return { hours, minutes };
}

function shouldRunSchedule(schedule: Schedule, now: Date): boolean {
  if (!schedule.enabled) return false;

  const { hours, minutes } = parseTime(schedule.time);
  const lastRun = schedule.last_run ? new Date(schedule.last_run) : null;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const scheduleMinutes = hours * 60 + minutes;

  const withinTimeWindow = Math.abs(nowMinutes - scheduleMinutes) < 1;

  if (!withinTimeWindow) return false;

  if (!lastRun) return true;

  const timeSinceLastRun = now.getTime() - lastRun.getTime();
  const oneHour = 60 * 60 * 1000;

  switch (schedule.frequency) {
    case 'hourly':
      return timeSinceLastRun >= oneHour;
    case 'daily':
      return timeSinceLastRun >= 24 * oneHour && lastRun.getDate() !== now.getDate();
    case 'weekly':
      const daysSinceLastRun = Math.floor(timeSinceLastRun / (24 * oneHour));
      return daysSinceLastRun >= 7;
    case 'monthly':
      return (
        lastRun.getMonth() !== now.getMonth() ||
        lastRun.getFullYear() !== now.getFullYear()
      ) && timeSinceLastRun >= 24 * oneHour;
    default:
      return false;
  }
}

async function triggerBackup(volumeId: number, scheduleId: number): Promise<void> {
  try {
    await log({
      level: 'info',
      category: 'schedule',
      message: `Triggering scheduled backup for volume ID ${volumeId}`,
      details: { volumeId, scheduleId }
    });

    const response = await fetch('http://localhost:3000/api/backups/trigger', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ volume_id: volumeId }),
    });

    if (!response.ok) {
      throw new Error(`Backup trigger failed with status ${response.status}`);
    }

    await pool.query(
      'UPDATE schedules SET last_run = CURRENT_TIMESTAMP WHERE id = $1',
      [scheduleId]
    );

    await log({
      level: 'success',
      category: 'schedule',
      message: `Successfully triggered scheduled backup for volume ID ${volumeId}`,
      details: { volumeId, scheduleId }
    });
  } catch (error) {
    console.error('Error triggering scheduled backup:', error);
    await log({
      level: 'error',
      category: 'schedule',
      message: `Failed to trigger scheduled backup for volume ID ${volumeId}`,
      details: {
        volumeId,
        scheduleId,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
}

async function checkSchedules(): Promise<void> {
  try {
    const result = await pool.query<Schedule>(`
      SELECT id, volume_id, frequency, time, enabled, last_run
      FROM schedules
      WHERE enabled = true
    `);

    const now = new Date();

    for (const schedule of result.rows) {
      if (shouldRunSchedule(schedule, now)) {
        console.log(`Running schedule ${schedule.id} for volume ${schedule.volume_id}`);
        await triggerBackup(schedule.volume_id, schedule.id);
      }
    }
  } catch (error) {
    console.error('Error checking schedules:', error);
  }
}

export function startScheduler(): void {
  if (schedulerInterval) {
    console.log('Scheduler already running');
    return;
  }

  console.log('Starting backup scheduler...');

  checkSchedules();

  schedulerInterval = setInterval(() => {
    checkSchedules();
  }, 60 * 1000);

  console.log('✓ Backup scheduler started (checking every minute)');
}

export function stopScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('Backup scheduler stopped');
  }
}
