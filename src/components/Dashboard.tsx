import { useState, useEffect } from 'react';
import { BarChart3, HardDrive, Database, CheckCircle, XCircle, Clock, TrendingUp, Calendar, Play, Pause } from 'lucide-react';
import { api } from '../lib/api';
import { Volume, Backup, ScheduleGroup, ScheduleGroupRun } from '../types';

interface DashboardProps {
  onSelectVolume?: (volume: Volume) => void;
}

interface BackupStats {
  totalBackups: number;
  completedBackups: number;
  failedBackups: number;
  inProgressBackups: number;
  totalSize: number;
  volumeStats: Array<{
    volumeName: string;
    volumeId: string;
    backupCount: number;
    latestBackup?: string;
    totalSize: number;
    status: 'healthy' | 'warning' | 'error';
  }>;
}

export function Dashboard({ onSelectVolume }: DashboardProps) {
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [scheduleGroups, setScheduleGroups] = useState<ScheduleGroup[]>([]);
  const [groupRuns, setGroupRuns] = useState<Record<string, ScheduleGroupRun[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [volumesData, backupsData, groupsData] = await Promise.all([
        api.volumes.getAll(),
        api.backups.getAll(),
        api.scheduleGroups.getAll(),
      ]);
      setVolumes(Array.isArray(volumesData) ? volumesData : []);
      setBackups(Array.isArray(backupsData) ? backupsData : []);
      setScheduleGroups(Array.isArray(groupsData) ? groupsData : []);

      if (Array.isArray(groupsData) && groupsData.length > 0) {
        const runsData: Record<string, ScheduleGroupRun[]> = {};
        await Promise.all(
          groupsData.map(async (group: ScheduleGroup) => {
            try {
              const runs = await api.scheduleGroups.getRuns(group.id);
              runsData[group.id] = Array.isArray(runs) ? runs.slice(0, 1) : [];
            } catch (error) {
              console.error(`Error fetching runs for group ${group.id}:`, error);
              runsData[group.id] = [];
            }
          })
        );
        setGroupRuns(runsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setVolumes([]);
      setBackups([]);
      setScheduleGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (): BackupStats => {
    const totalBackups = backups.length;
    const completedBackups = backups.filter((b) => b.status === 'completed').length;
    const failedBackups = backups.filter((b) => b.status === 'failed').length;
    const inProgressBackups = backups.filter((b) => b.status === 'in_progress').length;
    const totalSize = backups.reduce((sum, b) => sum + (b.size_bytes || 0), 0);

    const volumeStats = volumes.map((volume) => {
      const volumeBackups = backups.filter((b) => b.volume_id === volume.id);
      const latestBackup = volumeBackups.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];

      const recentFailures = volumeBackups
        .slice(0, 3)
        .filter((b) => b.status === 'failed').length;

      let status: 'healthy' | 'warning' | 'error' = 'healthy';
      if (recentFailures >= 2) status = 'error';
      else if (recentFailures === 1 || !latestBackup) status = 'warning';

      return {
        volumeName: volume.name,
        volumeId: volume.id,
        backupCount: volumeBackups.length,
        latestBackup: latestBackup?.created_at,
        totalSize: volumeBackups.reduce((sum, b) => sum + (b.size_bytes || 0), 0),
        status,
      };
    });

    return {
      totalBackups,
      completedBackups,
      failedBackups,
      inProgressBackups,
      totalSize,
      volumeStats,
    };
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 MB';
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading dashboard...</div>
      </div>
    );
  }

  const stats = calculateStats();
  const successRate = stats.totalBackups > 0
    ? ((stats.completedBackups / stats.totalBackups) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Dashboard</h1>
        <p className="text-slate-600 dark:text-slate-300">
          Overview of all backup operations and volume health
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Backups</p>
              <p className="text-3xl font-bold text-slate-800 dark:text-white mt-2">
                {stats.totalBackups}
              </p>
            </div>
            <Database className="text-blue-500" size={40} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Completed</p>
              <p className="text-3xl font-bold text-slate-800 dark:text-white mt-2">
                {stats.completedBackups}
              </p>
            </div>
            <CheckCircle className="text-green-500" size={40} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Failed</p>
              <p className="text-3xl font-bold text-slate-800 dark:text-white mt-2">
                {stats.failedBackups}
              </p>
            </div>
            <XCircle className="text-red-500" size={40} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border-l-4 border-amber-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Success Rate</p>
              <p className="text-3xl font-bold text-slate-800 dark:text-white mt-2">
                {successRate}%
              </p>
            </div>
            <TrendingUp className="text-amber-500" size={40} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="text-blue-600 dark:text-blue-400" size={24} />
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white">
              Storage Usage
            </h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">Total Storage Used</span>
              <span className="text-2xl font-bold text-slate-800 dark:text-white">
                {formatSize(stats.totalSize)}
              </span>
            </div>
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-slate-600 dark:text-slate-400">Completed Backups</span>
                <span className="text-slate-800 dark:text-white font-medium">
                  {formatSize(backups.filter(b => b.status === 'completed').reduce((sum, b) => sum + (b.size_bytes || 0), 0))}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Average Backup Size</span>
                <span className="text-slate-800 dark:text-white font-medium">
                  {stats.completedBackups > 0 ? formatSize(stats.totalSize / stats.completedBackups) : '0 MB'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="text-blue-600 dark:text-blue-400" size={24} />
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white">
              Recent Activity
            </h2>
          </div>
          <div className="space-y-3">
            {backups.slice(0, 5).map((backup) => (
              <div
                key={backup.id}
                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      backup.status === 'completed'
                        ? 'bg-green-500'
                        : backup.status === 'failed'
                        ? 'bg-red-500'
                        : 'bg-blue-500'
                    }`}
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-white">
                      {backup.volumes?.name || 'Unknown'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(backup.created_at)}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  {formatSize(backup.size_bytes || 0)}
                </span>
              </div>
            ))}
            {backups.length === 0 && (
              <p className="text-center text-slate-500 dark:text-slate-400 py-8">
                No recent activity
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-6">
          <HardDrive className="text-blue-600 dark:text-blue-400" size={24} />
          <h2 className="text-xl font-semibold text-slate-800 dark:text-white">Volume Health</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.volumeStats.map((volumeStat) => {
            const volume = volumes.find((v) => v.id === volumeStat.volumeId);
            return (
            <div
              key={volumeStat.volumeName}
              onClick={() => volume && onSelectVolume && onSelectVolume(volume)}
              className={`p-4 bg-slate-50 dark:bg-slate-700 rounded-lg border-l-4 transition-all ${
                onSelectVolume ? 'cursor-pointer hover:shadow-lg hover:scale-105' : ''
              }`}
              style={{
                borderColor:
                  volumeStat.status === 'healthy'
                    ? '#10b981'
                    : volumeStat.status === 'warning'
                    ? '#f59e0b'
                    : '#ef4444',
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-slate-800 dark:text-white truncate pr-2">
                  {volumeStat.volumeName}
                </h3>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded flex-shrink-0 ${
                    volumeStat.status === 'healthy'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : volumeStat.status === 'warning'
                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                  }`}
                >
                  {volumeStat.status}
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Backups</span>
                  <span className="font-medium text-slate-800 dark:text-white">
                    {volumeStat.backupCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Last Backup</span>
                  <span className="font-medium text-slate-800 dark:text-white">
                    {formatDate(volumeStat.latestBackup)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Total Size</span>
                  <span className="font-medium text-slate-800 dark:text-white">
                    {formatSize(volumeStat.totalSize)}
                  </span>
                </div>
              </div>
            </div>
          );
          })}
          {stats.volumeStats.length === 0 && (
            <div className="col-span-full text-center py-8 text-slate-500 dark:text-slate-400">
              No volumes configured yet
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="text-blue-600 dark:text-blue-400" size={24} />
          <h2 className="text-xl font-semibold text-slate-800 dark:text-white">Schedule Groups Status</h2>
        </div>
        {scheduleGroups.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            No schedule groups configured
          </div>
        ) : (
          <div className="space-y-4">
            {scheduleGroups.map((group) => {
              const latestRun = groupRuns[group.id]?.[0];
              return (
                <div
                  key={group.id}
                  className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-slate-800 dark:text-white">{group.name}</h3>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            group.enabled
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {group.enabled ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      {group.description && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{group.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-slate-600 dark:text-slate-400">
                          {group.volumes.length} volumes
                        </span>
                        {group.last_run && (
                          <span className="text-slate-600 dark:text-slate-400">
                            Last run: {new Date(group.last_run).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    {latestRun && (
                      <div className="ml-4">
                        {latestRun.status === 'in_progress' ? (
                          <div className="flex items-center gap-2">
                            <Play className="text-blue-600 dark:text-blue-400 animate-pulse" size={20} />
                            <div className="text-right">
                              <div className="text-sm font-medium text-blue-600 dark:text-blue-400">In Progress</div>
                              <div className="text-xs text-slate-600 dark:text-slate-400">
                                {latestRun.current_volume_index} / {latestRun.total_volumes}
                              </div>
                            </div>
                          </div>
                        ) : latestRun.status === 'completed' ? (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="text-green-600 dark:text-green-400" size={20} />
                            <span className="text-sm font-medium text-green-600 dark:text-green-400">Completed</span>
                          </div>
                        ) : latestRun.status === 'failed' ? (
                          <div className="flex items-center gap-2">
                            <XCircle className="text-red-600 dark:text-red-400" size={20} />
                            <span className="text-sm font-medium text-red-600 dark:text-red-400">Failed</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Pause className="text-slate-400" size={20} />
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Pending</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {latestRun?.status === 'in_progress' && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                        <span>Progress</span>
                        <span>{Math.round((latestRun.current_volume_index / latestRun.total_volumes) * 100)}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-500"
                          style={{
                            width: `${(latestRun.current_volume_index / latestRun.total_volumes) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
