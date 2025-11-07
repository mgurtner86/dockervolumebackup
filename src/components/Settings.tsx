import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, AlertCircle, Shield } from 'lucide-react';
import { api } from '../lib/api';

export function Settings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [backupPath, setBackupPath] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [domain, setDomain] = useState('');

  const [azureClientId, setAzureClientId] = useState('');
  const [azureClientSecret, setAzureClientSecret] = useState('');
  const [azureTenantId, setAzureTenantId] = useState('');
  const [azureGroupId, setAzureGroupId] = useState('');
  const [azureEnabled, setAzureEnabled] = useState(false);

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
      setBackupPath(data.backup_storage_path || '//server/share');
      setUsername(data.cifs_username || '');
      setPassword(data.cifs_password || '');
      setDomain(data.cifs_domain || '');

      setAzureClientId(data.azure_ad_client_id || '');
      setAzureClientSecret(data.azure_ad_client_secret || '');
      setAzureTenantId(data.azure_ad_tenant_id || '');
      setAzureGroupId(data.azure_ad_required_group_id || '');
      setAzureEnabled(data.azure_ad_enabled === 'true');
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
      await api.settings.update({
        backup_storage_path: backupPath,
        cifs_username: username,
        cifs_password: password,
        cifs_domain: domain,
        azure_ad_client_id: azureClientId,
        azure_ad_client_secret: azureClientSecret,
        azure_ad_tenant_id: azureTenantId,
        azure_ad_required_group_id: azureGroupId,
        azure_ad_enabled: azureEnabled ? 'true' : 'false',
      });
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
    <div className="space-y-6">
      {notification && (
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
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-6">
          <SettingsIcon className="text-blue-600" size={28} />
          <h2 className="text-2xl font-semibold text-gray-800">Storage Settings</h2>
        </div>

        <form onSubmit={handleSave}>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Network Storage Path (CIFS/SMB)
              </label>
              <p className="text-sm text-gray-500 mb-3">
                Enter the UNC path to your network storage. The application will automatically
                mount this storage using the credentials provided below.
              </p>
              <input
                type="text"
                required
                value={backupPath}
                onChange={(e) => setBackupPath(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="//server/share"
              />
              <p className="text-xs text-gray-500 mt-2">
                Example: //192.168.1.100/backups or //nas.local/docker-backups
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Domain (Optional)
              </label>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="WORKGROUP"
              />
              <p className="text-xs text-gray-500 mt-2">
                Leave empty if not using a domain
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">CIFS/SMB Network Storage</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Storage will be automatically mounted when creating backups</li>
                <li>• Credentials are stored securely in the database</li>
                <li>• Ensure the network storage is accessible from the container</li>
                <li>• The application requires cifs-utils to be installed</li>
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

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="text-blue-600" size={28} />
          <h2 className="text-2xl font-semibold text-gray-800">Authentication Settings</h2>
        </div>

        <form onSubmit={handleSave}>
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
              <input
                type="checkbox"
                id="azureEnabled"
                checked={azureEnabled}
                onChange={(e) => setAzureEnabled(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="azureEnabled" className="text-sm font-medium text-gray-700 cursor-pointer">
                Enable Microsoft Entra ID (Azure AD) Authentication
              </label>
            </div>

            {azureEnabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client ID (Application ID)
                  </label>
                  <input
                    type="text"
                    value={azureClientId}
                    onChange={(e) => setAzureClientId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="00000000-0000-0000-0000-000000000000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client Secret
                  </label>
                  <input
                    type="password"
                    value={azureClientSecret}
                    onChange={(e) => setAzureClientSecret(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="••••••••••••••••••••••••••••••••"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tenant ID (Directory ID)
                  </label>
                  <input
                    type="text"
                    value={azureTenantId}
                    onChange={(e) => setAzureTenantId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="00000000-0000-0000-0000-000000000000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Required Group ID (Object ID)
                  </label>
                  <input
                    type="text"
                    value={azureGroupId}
                    onChange={(e) => setAzureGroupId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="00000000-0000-0000-0000-000000000000"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Users must be members of this group to access the application
                  </p>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="font-medium text-amber-900 mb-2">Microsoft Entra ID Configuration</h4>
                  <ul className="text-sm text-amber-800 space-y-1">
                    <li>• Register an app in Azure Portal</li>
                    <li>• Configure API permissions: User.Read, GroupMember.Read.All</li>
                    <li>• Set redirect URI: http://localhost:3003/auth/callback</li>
                    <li>• Create a security group and add authorized users</li>
                    <li>• Refer to AUTHENTICATION_SETUP.md for detailed instructions</li>
                  </ul>
                </div>
              </>
            )}

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
    </div>
  );
}
