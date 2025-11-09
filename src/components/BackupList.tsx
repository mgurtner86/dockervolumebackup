import { useState, useEffect } from 'react';
import { Database, Play, Clock, Trash2 } from 'lucide-react';
import { Backup } from '../types';
import { api } from '../lib/api';

interface BackupListProps {
  volumeId?: string;
  onTriggerBackup: () => void;
  onSelectBackup: (backup: Backup) => void;
  onDeleteBackup: (backupId: string) => void;
}

export function BackupList({ volumeId, onTriggerBackup, onSelectBackup, onDeleteBackup }: BackupListProps) {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBackups();
    const interval = setInterval(fetchBackups, 5000);
    return () => clearInterval(interval);
  }, [volumeId]);

  const fetchBackups = async () => {
    try {
      const data = await api.backups.getAll(volumeId);
      setBackups(data);
    } catch (error) {
      console.error('Error fetching backups:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30';
      case 'failed':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30';
      case 'in_progress':
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/30';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  if (loading) {
    return <div className="text-gray-500 dark:text-gray-400">Loading backups...</div>;
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Backups</h2>
        {volumeId && (
          <button
            onClick={onTriggerBackup}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
          >
            <Play size={20} />
            Backup Now
          </button>
        )}
      </div>

      <div className="space-y-3">
        {backups.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            {volumeId ? 'No backups for this volume yet' : 'No backups available'}
          </p>
        ) : (
          backups.map((backup) => (
            <div
              key={backup.id}
              className={`flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg transition-colors border-2 border-transparent group`}
            >
              <div
                className={`flex items-center gap-3 flex-1 ${
                  backup.status === 'completed' ? 'cursor-pointer' : ''
                }`}
                onClick={() => backup.status === 'completed' && onSelectBackup(backup)}
              >
                <Database className="text-gray-600 dark:text-gray-400" size={24} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-800 dark:text-white">
                      {backup.volumes?.name || 'Unknown Volume'}
                    </h3>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(
                        backup.status
                      )}`}
                    >
                      {backup.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{backup.backup_path}</p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {formatDate(backup.created_at)}
                    </span>
                    <span>{formatSize(backup.size_bytes)}</span>
                  </div>
                  {backup.error_message && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">{backup.error_message}</p>
                  )}
                  {backup.status === 'completed' && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">Click to restore</p>
                  )}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteBackup(backup.id.toString());
                }}
                className="flex items-center gap-2 px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                title="Delete backup"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
