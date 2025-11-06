const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const api = {
  volumes: {
    getAll: () => fetch(`${API_URL}/volumes`).then((r) => r.json()),
    create: (data: { name: string; path: string }) =>
      fetch(`${API_URL}/volumes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    delete: (id: string) =>
      fetch(`${API_URL}/volumes/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    browse: (id: string, path?: string) => {
      const url = new URL(`${API_URL}/volumes/${id}/browse`);
      if (path) url.searchParams.set('path', path);
      return fetch(url.toString()).then((r) => r.json());
    },
  },
  backups: {
    getAll: (volumeId?: string) => {
      const url = new URL(`${API_URL}/backups`);
      if (volumeId) url.searchParams.set('volume_id', volumeId);
      return fetch(url.toString()).then((r) => r.json());
    },
    trigger: (volumeId: string) =>
      fetch(`${API_URL}/backups/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ volume_id: volumeId }),
      }).then((r) => r.json()),
    restore: (backupId: string) =>
      fetch(`${API_URL}/backups/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backup_id: backupId }),
      }).then((r) => r.json()),
  },
  schedules: {
    getAll: () => fetch(`${API_URL}/schedules`).then((r) => r.json()),
    create: (data: { volume_id: string; cron_expression: string }) =>
      fetch(`${API_URL}/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    update: (id: string, data: { enabled: boolean }) =>
      fetch(`${API_URL}/schedules/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    delete: (id: string) =>
      fetch(`${API_URL}/schedules/${id}`, { method: 'DELETE' }).then((r) => r.json()),
  },
  settings: {
    getAll: () => fetch(`${API_URL}/settings`).then((r) => r.json()),
    update: (settings: Record<string, string>) =>
      fetch(`${API_URL}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      }).then((r) => r.json()),
  },
};
