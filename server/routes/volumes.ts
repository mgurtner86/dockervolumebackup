import { Router } from 'express';
import pool from '../db.js';
import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const router = Router();
const execAsync = promisify(exec);

router.get('/docker-containers', async (req, res) => {
  try {
    const { stdout } = await execAsync('docker ps --format "{{json .}}"');
    const containers = stdout
      .trim()
      .split('\n')
      .filter(line => line)
      .map(line => JSON.parse(line));

    const containersWithVolumes = await Promise.all(
      containers.map(async (container: any) => {
        try {
          const { stdout: inspectOutput } = await execAsync(
            `docker inspect ${container.ID}`
          );
          const inspectData = JSON.parse(inspectOutput)[0];

          const mounts = inspectData.Mounts || [];
          const volumes = mounts
            .filter((mount: any) => mount.Type === 'volume')
            .map((mount: any) => ({
              name: mount.Name,
              source: mount.Source,
              destination: mount.Destination,
            }));

          return {
            id: container.ID,
            name: container.Names,
            image: container.Image,
            status: container.Status,
            volumes,
          };
        } catch (error) {
          console.error(`Error inspecting container ${container.ID}:`, error);
          return null;
        }
      })
    );

    res.json(containersWithVolumes.filter(c => c !== null && c.volumes.length > 0));
  } catch (error) {
    console.error('Error fetching Docker containers:', error);
    res.status(500).json({ error: 'Failed to fetch Docker containers' });
  }
});

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM volumes ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching volumes:', error);
    res.status(500).json({ error: 'Failed to fetch volumes' });
  }
});

router.post('/', async (req, res) => {
  const { name, path: volumePath } = req.body;

  if (!name || !volumePath) {
    return res.status(400).json({ error: 'Name and path are required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO volumes (name, path) VALUES ($1, $2) RETURNING *',
      [name, volumePath]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating volume:', error);
    res.status(500).json({ error: 'Failed to create volume' });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM volumes WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting volume:', error);
    res.status(500).json({ error: 'Failed to delete volume' });
  }
});

router.get('/:id/browse', async (req, res) => {
  const { id } = req.params;
  const subPath = req.query.path as string || '';

  try {
    const volumeResult = await pool.query(
      'SELECT * FROM volumes WHERE id = $1',
      [id]
    );

    if (volumeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Volume not found' });
    }

    const volume = volumeResult.rows[0];
    const fullPath = path.join(volume.path, subPath);

    try {
      await fs.access(fullPath);
    } catch {
      return res.status(404).json({ error: 'Path not accessible' });
    }

    const items = await fs.readdir(fullPath, { withFileTypes: true });

    const files = await Promise.all(
      items.map(async (item) => {
        const itemPath = path.join(fullPath, item.name);
        let size = 0;
        let modified = new Date();

        try {
          const stats = await fs.stat(itemPath);
          size = stats.size;
          modified = stats.mtime;
        } catch (error) {
          console.error('Error getting stats:', error);
        }

        return {
          name: item.name,
          isDirectory: item.isDirectory(),
          size,
          modified: modified.toISOString(),
          path: path.join(subPath, item.name),
        };
      })
    );

    res.json({
      currentPath: subPath,
      items: files.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      }),
    });
  } catch (error) {
    console.error('Error browsing volume:', error);
    res.status(500).json({ error: 'Failed to browse volume' });
  }
});

export default router;
