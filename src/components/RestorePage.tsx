import { useState, useEffect } from 'react';
import { RotateCcw, Calendar, HardDrive, CheckCircle } from 'lucide-react';
import { api } from '../lib/api';
import { Volume, Backup } from '../types';
import { RestoreWizard, RestoreOptions } from './RestoreWizard';

interface RestorePageProps {
  onRestoreStart: () => void;
}

export function RestorePage({ onRestoreStart }: RestorePageProps) {
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [selectedVolume, setSelectedVolume] = useState<Volume | null>(null);
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showRestoreWizard, setShowRestoreWizard] = useState(false);

  useEffect(() => {
    fetchVolumes();
  }, []);

  useEffect(() => {
    if (selectedVolume) {
      fetchBackups(selectedVolume.id);
    }
  }, [selectedVolume]);

  const fetchVolumes = async () => {
    try {
      const data = await api.volumes.getAll();
      setVolumes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching volumes:', error);
      setVolumes([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBackups = async (volumeId: string) => {
    try {
      const data = await api.backups.getAll(volumeId);
      const completedBackups = (Array.isArray(data) ? data : []).filter(
        (b: Backup) => b.status === 'completed'
      );
      setBackups(completedBackups);
    } catch (error) {
      console.error('Error fetching backups:', error);
      setBackups([]);
    }
  };

  const handleRestore = async (backupId: string, options: RestoreOptions) => {
    try {
      const response = await fetch('/api/backups/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          backup_id: backupId,
          restore_type: options.restoreType,
          selected_files: options.selectedFiles,
          custom_path: options.customPath,
        }),
      });

      if (!response.ok) {
        throw new Error('Restore failed');
      }

      setShowRestoreWizard(false);
      setSelectedBackup(null);
      onRestoreStart();
    } catch (error) {
      console.error('Error restoring backup:', error);
    }
  };

  const getBackupsByDate = () => {
    const backupsByDate: Record<string, Backup[]> = {};
    backups.forEach((backup) => {
      const date = new Date(backup.created_at).toLocaleDateString();
      if (!backupsByDate[date]) {
        backupsByDate[date] = [];
      }
      backupsByDate[date].push(backup);
    });
    return backupsByDate;
  };

  const backupsByDate = getBackupsByDate();
  const dates = Object.keys(backupsByDate).sort((a, b) =>
    new Date(b).getTime() - new Date(a).getTime()
  );

  const filteredBackups = selectedDate
    ? backupsByDate[selectedDate] || []
    : [];

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600 dark:text-slate-400">Loading volumes...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <RotateCcw className="text-blue-600 dark:text-blue-400" size={28} />
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Restore Backup</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <HardDrive size={20} />
            Select Volume
          </h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {volumes.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400 text-center py-4">No volumes available</p>
            ) : (
              volumes.map((volume) => (
                <button
                  key={volume.id}
                  onClick={() => {
                    setSelectedVolume(volume);
                    setSelectedBackup(null);
                    setSelectedDate('');
                  }}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedVolume?.id === volume.id
                      ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500 dark:border-blue-400'
                      : 'bg-slate-50 dark:bg-slate-700 border-2 border-transparent hover:bg-slate-100 dark:hover:bg-slate-600'
                  }`}
                >
                  <div className="font-medium text-slate-800 dark:text-white">{volume.name}</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 truncate">{volume.path}</div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <Calendar size={20} />
            Select Date
          </h2>
          {!selectedVolume ? (
            <p className="text-slate-500 dark:text-slate-400 text-center py-4">Select a volume first</p>
          ) : dates.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 text-center py-4">No backups available</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {dates.map((date) => (
                <button
                  key={date}
                  onClick={() => {
                    setSelectedDate(date);
                    setSelectedBackup(null);
                  }}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedDate === date
                      ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500 dark:border-blue-400'
                      : 'bg-slate-50 dark:bg-slate-700 border-2 border-transparent hover:bg-slate-100 dark:hover:bg-slate-600'
                  }`}
                >
                  <div className="font-medium text-slate-800 dark:text-white">{date}</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    {backupsByDate[date].length} backup{backupsByDate[date].length !== 1 ? 's' : ''}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <CheckCircle size={20} />
            Select Backup
          </h2>
          {!selectedDate ? (
            <p className="text-slate-500 dark:text-slate-400 text-center py-4">Select a date first</p>
          ) : filteredBackups.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 text-center py-4">No backups for this date</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredBackups.map((backup) => (
                <button
                  key={backup.id}
                  onClick={() => setSelectedBackup(backup)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedBackup?.id === backup.id
                      ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500 dark:border-blue-400'
                      : 'bg-slate-50 dark:bg-slate-700 border-2 border-transparent hover:bg-slate-100 dark:hover:bg-slate-600'
                  }`}
                >
                  <div className="font-medium text-slate-800 dark:text-white">
                    {new Date(backup.created_at).toLocaleTimeString()}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Size: {formatSize(backup.size_bytes)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedBackup && (
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Selected Backup</h3>
              <p className="text-sm text-blue-800 dark:text-blue-400 mb-1">
                <strong>{selectedVolume?.name}</strong> - {new Date(selectedBackup.created_at).toLocaleString()}
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-400">
                Size: {formatSize(selectedBackup.size_bytes)}
              </p>
            </div>
            <button
              onClick={() => setShowRestoreWizard(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Start Restore
            </button>
          </div>
        </div>
      )}

      {showRestoreWizard && selectedBackup && (
        <RestoreWizard
          backup={selectedBackup}
          onClose={() => setShowRestoreWizard(false)}
          onRestore={handleRestore}
        />
      )}
    </div>
  );
}
