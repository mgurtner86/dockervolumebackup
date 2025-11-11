import { useState, useEffect } from 'react';
import { Server, LogIn, Key } from 'lucide-react';
import { useAuth } from './AuthProvider';

export function Login() {
  const { login } = useAuth();
  const [needsSetup, setNeedsSetup] = useState(false);
  const [entraEnabled, setEntraEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showLocalLogin, setShowLocalLogin] = useState(false);
  const [loginLogo, setLoginLogo] = useState('');

  const [setupUsername, setSetupUsername] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupConfirmPassword, setSetupConfirmPassword] = useState('');

  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    checkSetup();
  }, []);

  const checkSetup = async () => {
    try {
      const setupResponse = await fetch('/auth/check-setup');
      const setupData = await setupResponse.json();
      setNeedsSetup(setupData.needsSetup);

      const configResponse = await fetch('/auth/config');
      const configData = await configResponse.json();
      setEntraEnabled(configData.entraEnabled);

      const settingsResponse = await fetch('/api/settings');
      const settingsData = await settingsResponse.json();
      setLoginLogo(settingsData.login_logo || '');
    } catch (error) {
      console.error('Error checking setup:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (setupPassword !== setupConfirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (setupPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    try {
      const response = await fetch('/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: setupUsername,
          password: setupPassword,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to create admin user');
        return;
      }

      window.location.reload();
    } catch (error) {
      console.error('Error during setup:', error);
      setError('Failed to create admin user');
    }
  };

  const handleLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('/auth/login/local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: loginUsername,
          password: loginPassword,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Invalid credentials');
        return;
      }

      window.location.reload();
    } catch (error) {
      console.error('Error during login:', error);
      setError('Login failed');
    }
  };

  const handleEntraLogin = async () => {
    try {
      const response = await fetch('/auth/login/entra');
      const data = await response.json();

      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        setError('Entra ID authentication not configured');
      }
    } catch (error) {
      console.error('Error during Entra login:', error);
      setError('Failed to initiate Entra login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (needsSetup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            {loginLogo ? (
              <img src={loginLogo} alt="Logo" className="max-h-24 object-contain" />
            ) : (
              <div className="flex items-center gap-3">
                <Server className="text-blue-600" size={48} />
                <h1 className="text-3xl font-bold text-slate-800">
                  Docker Volume<br />Backup Manager
                </h1>
              </div>
            )}

            <div className="w-full">
              <h2 className="text-xl font-semibold text-slate-800 mb-2">Initial Setup</h2>
              <p className="text-sm text-slate-600 mb-6">
                Create an admin account to get started
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                  {error}
                </div>
              )}

              <form onSubmit={handleSetup} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    value={setupUsername}
                    onChange={(e) => setSetupUsername(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="admin"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={setupPassword}
                    onChange={(e) => setSetupPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    value={setupConfirmPassword}
                    onChange={(e) => setSetupConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <Key size={20} />
                  Create Admin Account
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="flex flex-col items-center gap-6">
          {loginLogo ? (
            <img src={loginLogo} alt="Logo" className="max-h-24 object-contain" />
          ) : (
            <div className="flex items-center gap-3">
              <Server className="text-blue-600" size={48} />
              <h1 className="text-3xl font-bold text-slate-800">
                Docker Volume<br />Backup Manager
              </h1>
            </div>
          )}

          <div className="w-full space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                {error}
              </div>
            )}

            {showLocalLogin ? (
              <form onSubmit={handleLocalLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="admin"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <LogIn size={20} />
                  Sign in
                </button>

                {entraEnabled && (
                  <button
                    type="button"
                    onClick={() => setShowLocalLogin(false)}
                    className="w-full text-sm text-slate-600 hover:text-slate-800"
                  >
                    Sign in with Microsoft instead
                  </button>
                )}
              </form>
            ) : (
              <>
                {entraEnabled && (
                  <button
                    onClick={handleEntraLogin}
                    className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    <LogIn size={20} />
                    Sign in with Microsoft
                  </button>
                )}

                <button
                  onClick={() => setShowLocalLogin(true)}
                  className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                >
                  <Key size={20} />
                  Sign in as Admin
                </button>

                {entraEnabled && (
                  <p className="text-xs text-slate-500 text-center">
                    Microsoft users must be members of the authorized group
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
