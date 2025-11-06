import { useState, useEffect } from 'react';
import { Folder, File, ChevronRight, Home } from 'lucide-react';
import { api } from '../lib/api';

interface FileItem {
  name: string;
  isDirectory: boolean;
  size: number;
  modified: string;
  path: string;
}

interface FileBrowserProps {
  volumeId: string;
}

export function FileBrowser({ volumeId }: FileBrowserProps) {
  const [currentPath, setCurrentPath] = useState('');
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDirectory(currentPath);
  }, [volumeId, currentPath]);

  const loadDirectory = async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.volumes.browse(volumeId, path);
      setItems(data.items);
      setCurrentPath(data.currentPath);
    } catch (err) {
      setError('Failed to load directory');
      console.error('Error loading directory:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleItemClick = (item: FileItem) => {
    if (item.isDirectory) {
      setCurrentPath(item.path);
    }
  };

  const handleGoBack = () => {
    const parentPath = currentPath.split('/').slice(0, -1).join('/');
    setCurrentPath(parentPath);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
        <Folder className="text-blue-600" size={24} />
        <h3 className="text-lg font-semibold text-gray-800">Browse Volume</h3>
      </div>

      <div className="flex items-center gap-2 mb-4 text-sm">
        <button
          onClick={() => setCurrentPath('')}
          className="flex items-center gap-1 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
        >
          <Home size={16} />
          Root
        </button>
        {currentPath && (
          <>
            <ChevronRight size={16} className="text-gray-400" />
            <span className="text-gray-600">{currentPath}</span>
          </>
        )}
      </div>

      {loading && <div className="text-gray-500 py-8 text-center">Loading...</div>}

      {error && <div className="text-red-600 py-8 text-center">{error}</div>}

      {!loading && !error && (
        <div className="space-y-1">
          {currentPath && (
            <button
              onClick={handleGoBack}
              className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
            >
              <Folder className="text-gray-400" size={20} />
              <span className="text-gray-600">..</span>
            </button>
          )}

          {items.length === 0 && !currentPath && (
            <p className="text-gray-500 text-center py-8">Directory is empty</p>
          )}

          {items.map((item) => (
            <button
              key={item.path}
              onClick={() => handleItemClick(item)}
              className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {item.isDirectory ? (
                  <Folder className="text-blue-500 flex-shrink-0" size={20} />
                ) : (
                  <File className="text-gray-400 flex-shrink-0" size={20} />
                )}
                <span className="text-gray-800 truncate">{item.name}</span>
              </div>
              <div className="flex items-center gap-6 text-sm text-gray-500">
                {!item.isDirectory && <span>{formatSize(item.size)}</span>}
                <span className="hidden md:block">{formatDate(item.modified)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
