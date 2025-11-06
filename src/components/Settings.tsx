import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';

export function Settings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [backupPath, setBackupPath] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await api.settings.getAll();
      setSettings(data);
      setBackupPath(data.backup_storage_path || '/backups');
    } catch (error) {
      console.error('Error loading settings:', error);
      showNotification('error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await api.settings.update('backup_storage_path', backupPath);
      showNotification('success', 'Settings saved successfully');
      await loadSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      showNotification('error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-gray-500">Loading settings...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-3 mb-6">
        <SettingsIcon className="text-blue-600" size={28} />
        <h2 className="text-2xl font-semibold text-gray-800">Settings</h2>
      </div>

      {notification && (
        <div
          className={`flex items-center gap-3 p-4 rounded-lg mb-6 ${
            notification.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <AlertCircle size={20} />
          <span>{notification.message}</span>
        </div>
      )}

      <form onSubmit={handleSave}>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Backup Storage Path
            </label>
            <p className="text-sm text-gray-500 mb-3">
              Configure the network storage path where backups will be stored. This should
              be a mounted network storage location accessible from the container.
            </p>
            <input
              type="text"
              required
              value={backupPath}
              onChange={(e) => setBackupPath(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="/mnt/network-storage/backups"
            />
            <p className="text-xs text-gray-500 mt-2">
              Example: /mnt/nfs/backups or /mnt/smb/docker-backups
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Network Storage Setup</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Mount your network storage to the Docker host</li>
              <li>• Add the mount path to docker-compose.yml volumes</li>
              <li>• Ensure the container has read/write permissions</li>
              <li>• Test the path is accessible before saving</li>
            </ul>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <Save size={20} />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
