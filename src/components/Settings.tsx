import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, AlertCircle, Shield, Mail, Image as ImageIcon, Upload, X, Clock, Trash2 } from 'lucide-react';
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

  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailMsTenantId, setEmailMsTenantId] = useState('');
  const [emailMsClientId, setEmailMsClientId] = useState('');
  const [emailMsClientSecret, setEmailMsClientSecret] = useState('');
  const [emailFromAddress, setEmailFromAddress] = useState('');
  const [emailToAddresses, setEmailToAddresses] = useState('');
  const [emailNotifyBackupFailure, setEmailNotifyBackupFailure] = useState(true);
  const [emailNotifyRestoreComplete, setEmailNotifyRestoreComplete] = useState(true);
  const [emailNotifyScheduleComplete, setEmailNotifyScheduleComplete] = useState(true);

  const [loginLogo, setLoginLogo] = useState('');
  const [headerLogo, setHeaderLogo] = useState('');
  const [retentionDays, setRetentionDays] = useState(30);

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

      setEmailEnabled(data.email_enabled === 'true');
      setEmailMsTenantId(data.email_ms_tenant_id || '');
      setEmailMsClientId(data.email_ms_client_id || '');
      setEmailMsClientSecret(data.email_ms_client_secret || '');
      setEmailFromAddress(data.email_from_address || '');
      setEmailToAddresses(data.email_to_addresses || '');
      setEmailNotifyBackupFailure(data.email_notify_backup_failure !== 'false');
      setEmailNotifyRestoreComplete(data.email_notify_restore_complete !== 'false');
      setEmailNotifyScheduleComplete(data.email_notify_schedule_complete !== 'false');

      setLoginLogo(data.login_logo || '');
      setHeaderLogo(data.header_logo || '');
      setRetentionDays(parseInt(data.retention_days) || 30);
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

  const handleLogoUpload = (file: File, type: 'login' | 'header') => {
    if (!file.type.startsWith('image/')) {
      showNotification('error', 'Please upload a valid image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showNotification('error', 'Image size must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      if (type === 'login') {
        setLoginLogo(base64);
      } else {
        setHeaderLogo(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = (type: 'login' | 'header') => {
    if (type === 'login') {
      setLoginLogo('');
    } else {
      setHeaderLogo('');
    }
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
        email_enabled: emailEnabled ? 'true' : 'false',
        email_ms_tenant_id: emailMsTenantId,
        email_ms_client_id: emailMsClientId,
        email_ms_client_secret: emailMsClientSecret,
        email_from_address: emailFromAddress,
        email_to_addresses: emailToAddresses,
        email_notify_backup_failure: emailNotifyBackupFailure ? 'true' : 'false',
        email_notify_restore_complete: emailNotifyRestoreComplete ? 'true' : 'false',
        email_notify_schedule_complete: emailNotifyScheduleComplete ? 'true' : 'false',
        login_logo: loginLogo,
        header_logo: headerLogo,
        retention_days: retentionDays.toString(),
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

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-6">
          <SettingsIcon className="text-blue-600 dark:text-blue-400" size={28} />
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">Storage Settings</h2>
        </div>

        <form onSubmit={handleSave}>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Network Storage Path (CIFS/SMB)
              </label>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                Enter the UNC path to your network storage. The application will automatically
                mount this storage using the credentials provided below.
              </p>
              <input
                type="text"
                required
                value={backupPath}
                onChange={(e) => setBackupPath(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="//server/share"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Example: //192.168.1.100/backups or //nas.local/docker-backups
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="WORKGROUP"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Leave empty if not using a domain
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">CIFS/SMB Network Storage</h4>
              <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                <li>• Storage will be automatically mounted when creating backups</li>
                <li>• Credentials are stored securely in the database</li>
                <li>• Ensure the network storage is accessible from the container</li>
                <li>• The application requires cifs-utils to be installed</li>
              </ul>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
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

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-6">
          <Clock className="text-orange-600 dark:text-orange-400" size={28} />
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">Backup Retention Policy</h2>
        </div>

        <form onSubmit={handleSave}>
          <div className="space-y-6">
            <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Trash2 className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <h4 className="font-medium text-amber-900 dark:text-amber-200 mb-2">Automatic Backup Cleanup</h4>
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    Backups older than the retention period will be automatically deleted to save storage space.
                    Set to 0 to keep all backups indefinitely.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Retention Period (Days)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  min="0"
                  value={retentionDays}
                  onChange={(e) => setRetentionDays(parseInt(e.target.value) || 0)}
                  className="w-32 px-4 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {retentionDays === 0
                    ? 'Keep all backups forever'
                    : `Delete backups older than ${retentionDays} day${retentionDays === 1 ? '' : 's'}`
                  }
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                The cleanup runs automatically every hour. Files will be permanently deleted from storage.
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Recommended Settings</h4>
              <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
                <li>• Daily backups: 30-90 days retention</li>
                <li>• Weekly backups: 180-365 days retention</li>
                <li>• Critical data: 0 days (manual cleanup only)</li>
                <li>• Development environments: 7-14 days retention</li>
              </ul>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
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

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="text-blue-600 dark:text-blue-400" size={28} />
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">Authentication Settings</h2>
        </div>

        <form onSubmit={handleSave}>
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
              <input
                type="checkbox"
                id="azureEnabled"
                checked={azureEnabled}
                onChange={(e) => setAzureEnabled(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="azureEnabled" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                Enable Microsoft Entra ID (Azure AD) Authentication
              </label>
            </div>

            {azureEnabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Client ID (Application ID)
                  </label>
                  <input
                    type="text"
                    value={azureClientId}
                    onChange={(e) => setAzureClientId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="00000000-0000-0000-0000-000000000000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Client Secret
                  </label>
                  <input
                    type="password"
                    value={azureClientSecret}
                    onChange={(e) => setAzureClientSecret(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="••••••••••••••••••••••••••••••••"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tenant ID (Directory ID)
                  </label>
                  <input
                    type="text"
                    value={azureTenantId}
                    onChange={(e) => setAzureTenantId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="00000000-0000-0000-0000-000000000000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Required Group ID (Object ID)
                  </label>
                  <input
                    type="text"
                    value={azureGroupId}
                    onChange={(e) => setAzureGroupId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="00000000-0000-0000-0000-000000000000"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Users must be members of this group to access the application
                  </p>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <h4 className="font-medium text-amber-900 dark:text-amber-200 mb-2">Microsoft Entra ID Configuration</h4>
                  <ul className="text-sm text-amber-800 dark:text-amber-300 space-y-1">
                    <li>• Register an app in Azure Portal</li>
                    <li>• Configure API permissions: User.Read, GroupMember.Read.All</li>
                    <li>• Set redirect URI: http://localhost:3003/auth/callback</li>
                    <li>• Create a security group and add authorized users</li>
                    <li>• Refer to AUTHENTICATION_SETUP.md for detailed instructions</li>
                  </ul>
                </div>
              </>
            )}
          </div>
        </form>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-6">
          <Mail className="text-green-600 dark:text-green-400" size={28} />
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">Email Notifications</h2>
        </div>

        <form onSubmit={handleSave}>
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-800 dark:text-white">Enable Email Notifications</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Send email alerts via Microsoft Graph API (OAuth 2.0)
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailEnabled}
                  onChange={(e) => setEmailEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
              </label>
            </div>

            {emailEnabled && (
              <>
                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Microsoft Graph Configuration</h4>
                  <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
                    <li>• Register an app in Azure Portal</li>
                    <li>• API Permissions: Mail.Send (Application permission)</li>
                    <li>• Grant admin consent for the permission</li>
                    <li>• Create a client secret and note the value</li>
                    <li>• The sender email must be a valid Microsoft 365 mailbox</li>
                  </ul>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Microsoft Tenant ID *
                    </label>
                    <input
                      type="text"
                      value={emailMsTenantId}
                      onChange={(e) => setEmailMsTenantId(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="12345678-1234-1234-1234-123456789012"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Application (Client) ID *
                    </label>
                    <input
                      type="text"
                      value={emailMsClientId}
                      onChange={(e) => setEmailMsClientId(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="12345678-1234-1234-1234-123456789012"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Client Secret *
                    </label>
                    <input
                      type="password"
                      value={emailMsClientSecret}
                      onChange={(e) => setEmailMsClientSecret(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter client secret"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      From Email Address *
                    </label>
                    <input
                      type="email"
                      value={emailFromAddress}
                      onChange={(e) => setEmailFromAddress(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="backups@company.com"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Must be a valid Microsoft 365 mailbox
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Recipient Email Addresses *
                    </label>
                    <input
                      type="text"
                      value={emailToAddresses}
                      onChange={(e) => setEmailToAddresses(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="admin@company.com, admin2@company.com"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Comma-separated list of email addresses
                    </p>
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
                  <h3 className="font-medium text-gray-800 dark:text-white mb-4">Notification Types</h3>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors">
                      <input
                        type="checkbox"
                        checked={emailNotifyBackupFailure}
                        onChange={(e) => setEmailNotifyBackupFailure(e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div>
                        <div className="font-medium text-gray-800 dark:text-white">Backup Failures</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Notify when a backup operation fails
                        </div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors">
                      <input
                        type="checkbox"
                        checked={emailNotifyRestoreComplete}
                        onChange={(e) => setEmailNotifyRestoreComplete(e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div>
                        <div className="font-medium text-gray-800 dark:text-white">Restore Completion</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Notify when a restore operation completes
                        </div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors">
                      <input
                        type="checkbox"
                        checked={emailNotifyScheduleComplete}
                        onChange={(e) => setEmailNotifyScheduleComplete(e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div>
                        <div className="font-medium text-gray-800 dark:text-white">Schedule Group Completion</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Notify with summary when a schedule group finishes
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
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

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-6">
          <ImageIcon className="text-purple-600 dark:text-purple-400" size={28} />
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">Branding</h2>
        </div>

        <form onSubmit={handleSave}>
          <div className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Custom Logos</h4>
              <p className="text-sm text-blue-800 dark:text-blue-400">
                Upload custom logos for the login page and application header. Recommended formats: PNG, SVG, or JPG. Maximum file size: 2MB.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Login Page Logo
                </label>
                <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg p-6 text-center">
                  {loginLogo ? (
                    <div className="relative">
                      <img
                        src={loginLogo}
                        alt="Login Logo"
                        className="max-h-32 mx-auto object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveLogo('login')}
                        className="absolute top-0 right-0 -mt-2 -mr-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <Upload className="mx-auto text-gray-400 mb-2" size={32} />
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Click or drag to upload
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleLogoUpload(file, 'login');
                        }}
                        className="hidden"
                        id="loginLogoInput"
                      />
                      <label
                        htmlFor="loginLogoInput"
                        className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                      >
                        Choose File
                      </label>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  This logo will appear on the login page
                </p>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Header Logo
                </label>
                <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg p-6 text-center">
                  {headerLogo ? (
                    <div className="relative">
                      <img
                        src={headerLogo}
                        alt="Header Logo"
                        className="max-h-32 mx-auto object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveLogo('header')}
                        className="absolute top-0 right-0 -mt-2 -mr-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <Upload className="mx-auto text-gray-400 mb-2" size={32} />
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Click or drag to upload
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleLogoUpload(file, 'header');
                        }}
                        className="hidden"
                        id="headerLogoInput"
                      />
                      <label
                        htmlFor="headerLogoInput"
                        className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                      >
                        Choose File
                      </label>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  This logo will appear in the application header
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
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
