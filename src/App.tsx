import { useState } from 'react';
import { Server, AlertCircle, Settings as SettingsIcon, Home, LogOut, LayoutDashboard, Moon, Sun, Calendar } from 'lucide-react';
import { useTheme } from './contexts/ThemeContext';
import { VolumeList } from './components/VolumeList';
import { BackupList } from './components/BackupList';
import { ScheduleManager } from './components/ScheduleManager';
import { Settings } from './components/Settings';
import { RestoreWizard, RestoreOptions } from './components/RestoreWizard';
import { Dashboard } from './components/Dashboard';
import { ScheduleGroups } from './components/ScheduleGroups';
import { useAuth } from './components/AuthProvider';
import { Volume, Backup } from './types';
import { api } from './lib/api';

function App() {
  const { user, logout, isLocalAdmin } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [currentPage, setCurrentPage] = useState<'home' | 'settings' | 'dashboard' | 'schedules'>('dashboard');
  const [selectedVolume, setSelectedVolume] = useState<Volume | undefined>();
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [showRestoreWizard, setShowRestoreWizard] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleTriggerBackup = async () => {
    if (!selectedVolume) return;

    try {
      await api.backups.trigger(selectedVolume.id);
      showNotification('success', 'Backup started successfully');
    } catch (error) {
      showNotification('error', 'Error starting backup');
      console.error('Error triggering backup:', error);
    }
  };

  const handleSelectBackup = (backup: Backup) => {
    setSelectedBackup(backup);
    setShowRestoreWizard(true);
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

      showNotification(
        'success',
        `Restore completed for ${selectedBackup?.volumes?.name || 'volume'}`
      );
    } catch (error) {
      showNotification('error', 'Failed to restore backup');
      console.error('Error restoring backup:', error);
    } finally {
      setShowRestoreWizard(false);
      setSelectedBackup(null);
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    if (!confirm('Are you sure you want to delete this backup? This action cannot be undone.')) {
      return;
    }

    try {
      await api.backups.delete(backupId);
      showNotification('success', 'Backup deleted successfully');
    } catch (error) {
      showNotification('error', 'Failed to delete backup');
      console.error('Error deleting backup:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Server className="text-blue-600" size={32} />
              <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                  Docker Volume Backup Manager
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Backup and restore your Docker volumes with ease
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {user && (
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-800 dark:text-white">{user.name}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{user.email}</p>
                </div>
              )}
              <nav className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <button
                onClick={() => setCurrentPage('dashboard')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  currentPage === 'dashboard'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                <LayoutDashboard size={20} />
                Dashboard
              </button>
              <button
                onClick={() => setCurrentPage('home')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  currentPage === 'home'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                <Home size={20} />
                Volumes
              </button>
              <button
                onClick={() => setCurrentPage('schedules')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  currentPage === 'schedules'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                <Calendar size={20} />
                Schedules
              </button>
              {isLocalAdmin && (
                <button
                  onClick={() => setCurrentPage('settings')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    currentPage === 'settings'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  <SettingsIcon size={20} />
                  Settings
                </button>
              )}
              <button
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                <LogOut size={20} />
                Logout
              </button>
            </nav>
            </div>
          </div>
        </div>
      </header>

      {notification && (
        <div className="max-w-7xl mx-auto px-6 mt-4">
          <div
            className={`flex items-center gap-3 p-4 rounded-lg ${
              notification.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
            }`}
          >
            <AlertCircle size={20} />
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-6 py-8">
        {currentPage === 'dashboard' ? (
          <Dashboard onSelectVolume={(volume) => {
            setSelectedVolume(volume);
            setCurrentPage('home');
          }} />
        ) : currentPage === 'schedules' ? (
          <ScheduleGroups />
        ) : currentPage === 'settings' ? (
          <Settings />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <VolumeList
                onSelectVolume={setSelectedVolume}
                selectedVolumeId={selectedVolume?.id}
              />
            </div>

            <div className="lg:col-span-2 space-y-6">
              {selectedVolume ? (
                <>
                  <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-1">Selected Volume</h3>
                    <p className="text-sm text-blue-700 dark:text-blue-400">
                      {selectedVolume.name} - {selectedVolume.path}
                    </p>
                  </div>

                  <BackupList
                    volumeId={selectedVolume.id}
                    onTriggerBackup={handleTriggerBackup}
                    onSelectBackup={handleSelectBackup}
                    onDeleteBackup={handleDeleteBackup}
                  />

                  <ScheduleManager volumeId={selectedVolume.id} />
                </>
              ) : (
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-12 text-center">
                  <Server className="mx-auto text-slate-300 dark:text-slate-600 mb-4" size={64} />
                  <h3 className="text-xl font-medium text-slate-600 dark:text-slate-300 mb-2">
                    No Volume Selected
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400">
                    Select a volume from the list to view backups and schedules
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {showRestoreWizard && selectedBackup && (
        <RestoreWizard
          backup={selectedBackup}
          onClose={() => {
            setShowRestoreWizard(false);
            setSelectedBackup(null);
          }}
          onRestore={handleRestore}
        />
      )}
    </div>
  );
}

export default App;
