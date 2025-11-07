import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import path from 'path';
import { getSetting } from '../routes/settings.js';

const execAsync = promisify(exec);

const MOUNT_BASE = '/mnt/backup-storage';

export async function ensureCifsMounted(): Promise<string> {
  const backupPath = await getSetting('backup_storage_path');
  const username = await getSetting('cifs_username');
  const password = await getSetting('cifs_password');
  const domain = await getSetting('cifs_domain');

  if (!backupPath) {
    throw new Error('Backup storage path not configured');
  }

  await fs.mkdir(MOUNT_BASE, { recursive: true });

  const isMounted = await checkIfMounted(MOUNT_BASE);

  if (isMounted) {
    console.log(`CIFS share already mounted at ${MOUNT_BASE}`);
    return MOUNT_BASE;
  }

  console.log(`Attempting to mount CIFS share to ${MOUNT_BASE}...`);

  let mountOptions = 'rw';

  if (username) {
    mountOptions += `,username=${username}`;
  }

  if (password) {
    mountOptions += `,password=${password}`;
  }

  if (domain) {
    mountOptions += `,domain=${domain}`;
  }

  try {
    const mountCommand = `mount -t cifs "${backupPath}" "${MOUNT_BASE}" -o ${mountOptions}`;
    await execAsync(mountCommand);
    console.log(`Successfully mounted CIFS share ${backupPath} to ${MOUNT_BASE}`);
    return MOUNT_BASE;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('Resource busy') || errorMessage.includes('already mounted')) {
      console.log('CIFS share is already mounted, verifying...');
      const stillMounted = await checkIfMounted(MOUNT_BASE);
      if (stillMounted) {
        console.log('Confirmed: CIFS share is mounted and accessible');
        return MOUNT_BASE;
      }
    }

    console.error('Failed to mount CIFS share:', error);
    throw new Error(`Failed to mount network storage: ${errorMessage}`);
  }
}

async function checkIfMounted(mountPoint: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync(`mount`);
    const lines = stdout.split('\n');
    const isMounted = lines.some(line => line.includes(` on ${mountPoint} `));

    if (isMounted) {
      try {
        await fs.access(mountPoint);
        const stats = await fs.stat(mountPoint);
        return stats.isDirectory();
      } catch {
        return false;
      }
    }

    return false;
  } catch (error) {
    return false;
  }
}

export async function unmountCifs(): Promise<void> {
  try {
    const isMounted = await checkIfMounted(MOUNT_BASE);
    if (isMounted) {
      await execAsync(`umount "${MOUNT_BASE}"`);
      console.log('Successfully unmounted CIFS share');
    }
  } catch (error) {
    console.error('Failed to unmount CIFS share:', error);
  }
}

export async function getBackupStoragePath(): Promise<string> {
  try {
    const mountPath = await ensureCifsMounted();
    return mountPath;
  } catch (error) {
    console.error('Error getting backup storage path:', error);
    return '/backups';
  }
}
