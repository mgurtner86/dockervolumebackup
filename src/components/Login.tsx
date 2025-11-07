import { Server, LogIn } from 'lucide-react';
import { useAuth } from './AuthProvider';

export function Login() {
  const { login } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-3">
            <Server className="text-blue-600" size={48} />
            <h1 className="text-3xl font-bold text-slate-800">
              Docker Volume<br />Backup Manager
            </h1>
          </div>

          <div className="w-full text-center space-y-4">
            <p className="text-slate-600">
              Sign in with your Microsoft account to manage your Docker volume backups
            </p>

            <button
              onClick={login}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <LogIn size={20} />
              Sign in with Microsoft
            </button>

            <p className="text-sm text-slate-500">
              You must be a member of the authorized group to access this application
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
