const API_URL = import.meta.env.VITE_API_URL || '';

function buildUrl(path: string, params?: Record<string, string>): string {
  let url = `${API_URL}/api${path}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }
  return url;
}

export const api = {
  volumes: {
    getAll: () => fetch(buildUrl('/volumes')).then((r) => r.json()),
    getDockerContainers: () => fetch(buildUrl('/volumes/docker-containers')).then((r) => r.json()),
    create: (data: { name: string; path: string }) =>
      fetch(buildUrl('/volumes'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    delete: (id: string) =>
      fetch(buildUrl(`/volumes/${id}`), { method: 'DELETE' }).then((r) => r.json()),
    browse: (id: string, path?: string) => {
      const params = path ? { path } : undefined;
      return fetch(buildUrl(`/volumes/${id}/browse`, params)).then((r) => r.json());
    },
  },
  backups: {
    getAll: (volumeId?: string) => {
      const params = volumeId ? { volume_id: volumeId } : undefined;
      return fetch(buildUrl('/backups', params)).then((r) => r.json());
    },
    trigger: (volumeId: string) =>
      fetch(buildUrl('/backups/trigger'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ volume_id: volumeId }),
      }).then((r) => r.json()),
    restore: (backupId: string) =>
      fetch(buildUrl('/backups/restore'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backup_id: backupId }),
      }).then((r) => r.json()),
    delete: (backupId: string) =>
      fetch(buildUrl(`/backups/${backupId}`), { method: 'DELETE' }).then((r) => r.json()),
  },
  schedules: {
    getAll: () => fetch(buildUrl('/schedules')).then((r) => r.json()),
    create: (data: { volume_id: string; cron_expression: string }) =>
      fetch(buildUrl('/schedules'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    update: (id: string, data: { enabled: boolean }) =>
      fetch(buildUrl(`/schedules/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    delete: (id: string) =>
      fetch(buildUrl(`/schedules/${id}`), { method: 'DELETE' }).then((r) => r.json()),
  },
  settings: {
    getAll: () => fetch(buildUrl('/settings')).then((r) => r.json()),
    update: (settings: Record<string, string>) =>
      fetch(buildUrl('/settings'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      }).then((r) => r.json()),
  },
  scheduleGroups: {
    getAll: () => fetch(buildUrl('/schedule-groups')).then((r) => r.json()),
    get: (id: string) => fetch(buildUrl(`/schedule-groups/${id}`)).then((r) => r.json()),
    create: (data: { name: string; description?: string; cron_expression: string; volume_ids: string[] }) =>
      fetch(buildUrl('/schedule-groups'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    update: (id: string, data: { name?: string; description?: string; cron_expression?: string; enabled?: boolean; volume_ids?: string[] }) =>
      fetch(buildUrl(`/schedule-groups/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    delete: (id: string) =>
      fetch(buildUrl(`/schedule-groups/${id}`), { method: 'DELETE' }).then((r) => r.json()),
    getRuns: (id: string) =>
      fetch(buildUrl(`/schedule-groups/${id}/runs`)).then((r) => r.json()),
    triggerRun: (id: string) =>
      fetch(buildUrl(`/schedule-groups/${id}/run`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }).then((r) => r.json()),
  },
};
