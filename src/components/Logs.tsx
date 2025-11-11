import { useState, useEffect } from 'react';
import { FileText, AlertCircle, CheckCircle, Info, AlertTriangle, Filter, Trash2, RefreshCw } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';

interface Log {
  id: number;
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error';
  category: string;
  message: string;
  details: any;
  volume_id?: string;
  backup_id?: number;
  user_id?: string;
}

interface LogStats {
  info: number;
  success: number;
  warning: number;
  error: number;
}

export function Logs() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [stats, setStats] = useState<LogStats>({ info: 0, success: 0, warning: 0, error: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    fetchLogs();
    fetchStats();
    const interval = setInterval(() => {
      fetchLogs();
      fetchStats();
    }, 10000);
    return () => clearInterval(interval);
  }, [selectedLevel, selectedCategory]);

  const fetchLogs = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedLevel) params.append('level', selectedLevel);
      if (selectedCategory) params.append('category', selectedCategory);
      params.append('limit', '200');

      const response = await fetch(`/api/logs?${params}`);
      const data = await response.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/logs/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleClearLogs = async () => {
    try {
      await fetch('/api/logs/clear', { method: 'DELETE' });
      setShowClearConfirm(false);
      fetchLogs();
      fetchStats();
    } catch (error) {
      console.error('Error clearing logs:', error);
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <AlertCircle className="text-red-600 dark:text-red-400" size={18} />;
      case 'warning':
        return <AlertTriangle className="text-yellow-600 dark:text-yellow-400" size={18} />;
      case 'success':
        return <CheckCircle className="text-green-600 dark:text-green-400" size={18} />;
      default:
        return <Info className="text-blue-600 dark:text-blue-400" size={18} />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      default:
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500 dark:text-slate-400">Loading logs...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="text-blue-600 dark:text-blue-400" size={32} />
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">System Logs</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              View all system activities and events
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchLogs}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            <RefreshCw size={18} />
            Refresh
          </button>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Trash2 size={18} />
            Clear All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Info</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-white">{stats.info}</p>
            </div>
            <Info className="text-blue-600 dark:text-blue-400" size={32} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Success</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-white">{stats.success}</p>
            </div>
            <CheckCircle className="text-green-600 dark:text-green-400" size={32} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Warnings</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-white">{stats.warning}</p>
            </div>
            <AlertTriangle className="text-yellow-600 dark:text-yellow-400" size={32} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Errors</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-white">{stats.error}</p>
            </div>
            <AlertCircle className="text-red-600 dark:text-red-400" size={32} />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
        <div className="flex items-center gap-4 mb-6">
          <Filter className="text-slate-600 dark:text-slate-400" size={20} />
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Level:</label>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All</option>
              <option value="info">Info</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Category:</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All</option>
              <option value="backup">Backup</option>
              <option value="restore">Restore</option>
              <option value="schedule">Schedule</option>
              <option value="system">System</option>
              <option value="auth">Authentication</option>
              <option value="general">General</option>
            </select>
          </div>
        </div>

        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              No logs found
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className={`p-4 rounded-lg border ${getLevelColor(log.level)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getLevelIcon(log.level)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase">
                            {log.category}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-500">
                            {formatTimestamp(log.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-800 dark:text-slate-200 font-medium break-words">
                          {log.message}
                        </p>
                        {log.details && Object.keys(log.details).length > 0 && (
                          <pre className="mt-2 text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900/50 p-2 rounded overflow-x-auto break-all whitespace-pre-wrap">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={showClearConfirm}
        title="Clear All Logs"
        message="Are you sure you want to clear all logs? This action cannot be undone."
        confirmLabel="Clear All"
        onConfirm={handleClearLogs}
        onCancel={() => setShowClearConfirm(false)}
        danger
      />
    </div>
  );
}
