import { useState } from 'react';
import { Server, AlertCircle } from 'lucide-react';
import { VolumeList } from './components/VolumeList';
import { BackupList } from './components/BackupList';
import { ScheduleManager } from './components/ScheduleManager';
import { Volume, Backup } from './types';
import { getApiUrl } from './lib/supabase';

function App() {
  const [selectedVolume, setSelectedVolume] = useState<Volume | undefined>();
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [restoreBackup, setRestoreBackup] = useState<Backup | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleTriggerBackup = async () => {
    if (!selectedVolume) return;

    try {
      const response = await fetch(getApiUrl('/backups/trigger'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ volume_id: selectedVolume.id }),
      });

      if (response.ok) {
        showNotification('success', 'Backup started successfully');
      } else {
        showNotification('error', 'Failed to start backup');
      }
    } catch (error) {
      showNotification('error', 'Error starting backup');
      console.error('Error triggering backup:', error);
    }
  };

  const handleRestore = (backup: Backup) => {
    setRestoreBackup(backup);
    setShowRestoreDialog(true);
  };

  const confirmRestore = () => {
    if (!restoreBackup) return;

    showNotification(
      'success',
      `Restore initiated for ${restoreBackup.volumes?.name || 'volume'}`
    );
    setShowRestoreDialog(false);
    setRestoreBackup(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <Server className="text-blue-600" size={32} />
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                Docker Volume Backup Manager
              </h1>
              <p className="text-sm text-slate-600">
                Backup and restore your Docker volumes with ease
              </p>
            </div>
          </div>
        </div>
      </header>

      {notification && (
        <div className="max-w-7xl mx-auto px-6 mt-4">
          <div
            className={`flex items-center gap-3 p-4 rounded-lg ${
              notification.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            <AlertCircle size={20} />
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-6 py-8">
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
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-medium text-blue-900 mb-1">Selected Volume</h3>
                  <p className="text-sm text-blue-700">
                    {selectedVolume.name} - {selectedVolume.path}
                  </p>
                </div>

                <BackupList
                  volumeId={selectedVolume.id}
                  onTriggerBackup={handleTriggerBackup}
                  onRestore={handleRestore}
                />

                <ScheduleManager volumeId={selectedVolume.id} />
              </>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <Server className="mx-auto text-slate-300 mb-4" size={64} />
                <h3 className="text-xl font-medium text-slate-600 mb-2">
                  No Volume Selected
                </h3>
                <p className="text-slate-500">
                  Select a volume from the list to view backups and schedules
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {showRestoreDialog && restoreBackup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-slate-800 mb-4">
              Confirm Restore
            </h3>
            <p className="text-slate-600 mb-6">
              Are you sure you want to restore the backup from{' '}
              <span className="font-medium">
                {new Date(restoreBackup.created_at).toLocaleString()}
              </span>
              ? This will overwrite the current volume data.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowRestoreDialog(false)}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmRestore}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Restore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
