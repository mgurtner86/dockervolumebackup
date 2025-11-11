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

interface ScheduleGroup {
  id: number;
  name: string;
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

function shouldRunSchedule(schedule: Schedule | ScheduleGroup, now: Date): boolean {
  if (!schedule.enabled) {
    console.log(`  Schedule/Group ${schedule.id} is disabled`);
    return false;
  }

  const { hours, minutes } = parseTime(schedule.time);
  const lastRun = schedule.last_run ? new Date(schedule.last_run) : null;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const scheduleMinutes = hours * 60 + minutes;
  const minuteDiff = Math.abs(nowMinutes - scheduleMinutes);

  const withinTimeWindow = minuteDiff <= 1;

  const nowTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  const scheduleName = 'name' in schedule ? schedule.name : `Volume ${schedule.volume_id}`;

  console.log(`  Checking "${scheduleName}": now=${nowTime}, scheduled=${schedule.time}, diff=${minuteDiff}min, inWindow=${withinTimeWindow}`);

  if (!withinTimeWindow) return false;

  if (!lastRun) {
    console.log(`    ✓ First run - executing now`);
    return true;
  }

  const timeSinceLastRun = now.getTime() - lastRun.getTime();
  const oneHour = 60 * 60 * 1000;
  const hoursSinceLastRun = timeSinceLastRun / oneHour;

  console.log(`    Last run: ${lastRun.toISOString()} (${hoursSinceLastRun.toFixed(1)} hours ago)`);

  switch (schedule.frequency) {
    case 'hourly':
      const shouldRunHourly = timeSinceLastRun >= oneHour;
      console.log(`    Hourly check: ${shouldRunHourly ? '✓ Run' : '✗ Skip'} (need ≥1h)`);
      return shouldRunHourly;
    case 'daily':
      const shouldRunDaily = timeSinceLastRun >= 24 * oneHour && lastRun.getDate() !== now.getDate();
      console.log(`    Daily check: ${shouldRunDaily ? '✓ Run' : '✗ Skip'} (need ≥24h and different day)`);
      return shouldRunDaily;
    case 'weekly':
      const daysSinceLastRun = Math.floor(timeSinceLastRun / (24 * oneHour));
      const shouldRunWeekly = daysSinceLastRun >= 7;
      console.log(`    Weekly check: ${shouldRunWeekly ? '✓ Run' : '✗ Skip'} (${daysSinceLastRun} days since last run, need ≥7)`);
      return shouldRunWeekly;
    case 'monthly':
      const shouldRunMonthly = (
        lastRun.getMonth() !== now.getMonth() ||
        lastRun.getFullYear() !== now.getFullYear()
      ) && timeSinceLastRun >= 24 * oneHour;
      console.log(`    Monthly check: ${shouldRunMonthly ? '✓ Run' : '✗ Skip'} (different month and ≥24h)`);
      return shouldRunMonthly;
    default:
      console.log(`    ✗ Unknown frequency: ${schedule.frequency}`);
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

    const response = await fetch('http://127.0.0.1:3000/api/backups/trigger', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Scheduler-Token': process.env.INTERNAL_SCHEDULER_TOKEN || 'default-internal-token-change-this',
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

async function triggerScheduleGroup(groupId: number, groupName: string): Promise<void> {
  try {
    await log({
      level: 'info',
      category: 'schedule',
      message: `Triggering scheduled run for group: ${groupName}`,
      details: { groupId, groupName }
    });

    const response = await fetch(`http://127.0.0.1:3000/api/schedule-groups/${groupId}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Scheduler-Token': process.env.INTERNAL_SCHEDULER_TOKEN || 'default-internal-token-change-this',
      },
    });

    if (!response.ok) {
      throw new Error(`Schedule group trigger failed with status ${response.status}`);
    }

    await pool.query(
      'UPDATE schedule_groups SET last_run = CURRENT_TIMESTAMP WHERE id = $1',
      [groupId]
    );

    await log({
      level: 'success',
      category: 'schedule',
      message: `Successfully triggered scheduled run for group: ${groupName}`,
      details: { groupId, groupName }
    });
  } catch (error) {
    console.error('Error triggering scheduled group run:', error);
    await log({
      level: 'error',
      category: 'schedule',
      message: `Failed to trigger scheduled run for group: ${groupName}`,
      details: {
        groupId,
        groupName,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
}

async function checkSchedules(): Promise<void> {
  try {
    const now = new Date();
    const nowStr = now.toISOString();
    const nowTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const scheduleResult = await pool.query<Schedule>(`
      SELECT id, volume_id, frequency, time, enabled, last_run
      FROM schedules
      WHERE enabled = true
    `);

    if (scheduleResult.rows.length > 0) {
      console.log(`[${nowTime}] Checking ${scheduleResult.rows.length} individual schedules...`);
    }

    for (const schedule of scheduleResult.rows) {
      if (shouldRunSchedule(schedule, now)) {
        console.log(`[${nowTime}] Running schedule ${schedule.id} for volume ${schedule.volume_id}`);
        await triggerBackup(schedule.volume_id, schedule.id);
      }
    }

    const groupResult = await pool.query<ScheduleGroup>(`
      SELECT id, name, frequency, time, enabled, last_run
      FROM schedule_groups
      WHERE enabled = true
    `);

    if (groupResult.rows.length > 0) {
      console.log(`[${nowTime}] Checking ${groupResult.rows.length} schedule groups...`);
      groupResult.rows.forEach(group => {
        console.log(`  - Group "${group.name}": scheduled for ${group.time} (${group.frequency}), last_run: ${group.last_run || 'never'}`);
      });
    }

    for (const group of groupResult.rows) {
      if (shouldRunSchedule(group, now)) {
        console.log(`[${nowTime}] ✓ Running schedule group ${group.id}: ${group.name}`);
        await triggerScheduleGroup(group.id, group.name);
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
