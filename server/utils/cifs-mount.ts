import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import { getSetting } from '../routes/settings.js';

const execAsync = promisify(exec);

const MOUNT_BASE = '/mnt/backup-storage';
let mountedAtStartup = false;

export async function mountCifsAtStartup(): Promise<void> {
  try {
    const backupPath = await getSetting('backup_storage_path');

    if (!backupPath) {
      console.log('No CIFS backup path configured, using local /backups directory');
      await fs.mkdir('/backups', { recursive: true });
      return;
    }

    const username = await getSetting('cifs_username');
    const password = await getSetting('cifs_password');
    const domain = await getSetting('cifs_domain');

    await fs.mkdir(MOUNT_BASE, { recursive: true });

    const isMounted = await isAlreadyMounted();
    if (isMounted) {
      console.log(`CIFS share already mounted at ${MOUNT_BASE}`);
      mountedAtStartup = true;
      return;
    }

    let mountOptions = 'rw';
    if (username) mountOptions += `,username=${username}`;
    if (password) mountOptions += `,password=${password}`;
    if (domain) mountOptions += `,domain=${domain}`;

    console.log(`Mounting CIFS share ${backupPath} to ${MOUNT_BASE}...`);
    const mountCommand = `mount -t cifs "${backupPath}" "${MOUNT_BASE}" -o ${mountOptions}`;
    await execAsync(mountCommand);

    console.log(`✓ Successfully mounted CIFS share to ${MOUNT_BASE}`);
    mountedAtStartup = true;
  } catch (error) {
    console.error('Failed to mount CIFS share at startup:', error);
    console.log('Will use local /backups directory instead');
    await fs.mkdir('/backups', { recursive: true });
  }
}

async function isAlreadyMounted(): Promise<boolean> {
  try {
    const { stdout } = await execAsync('mount');
    return stdout.includes(MOUNT_BASE);
  } catch {
    return false;
  }
}

export function getBackupStoragePath(): string {
  return mountedAtStartup ? MOUNT_BASE : '/backups';
}

export async function unmountCifs(): Promise<void> {
  if (!mountedAtStartup) {
    return;
  }

  try {
    const isMounted = await isAlreadyMounted();
    if (isMounted) {
      await execAsync(`umount "${MOUNT_BASE}"`);
      console.log('Successfully unmounted CIFS share');
      mountedAtStartup = false;
    }
  } catch (error) {
    console.error('Failed to unmount CIFS share:', error);
  }
}
