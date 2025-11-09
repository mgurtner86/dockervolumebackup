import { useState, useEffect } from 'react';
import { X, FolderOpen, File, CheckSquare, Square, HardDrive } from 'lucide-react';
import { Backup } from '../types';

interface RestoreWizardProps {
  backup: Backup;
  onClose: () => void;
  onRestore: (backupId: string, options: RestoreOptions) => void;
}

export interface RestoreOptions {
  restoreType: 'full' | 'selective';
  selectedFiles?: string[];
  customPath?: string;
}

interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
}

export function RestoreWizard({ backup, onClose, onRestore }: RestoreWizardProps) {
  const [step, setStep] = useState<'type' | 'files' | 'destination'>(backup.volumes ? 'type' : 'type');
  const [restoreType, setRestoreType] = useState<'full' | 'selective'>('full');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [customPath, setCustomPath] = useState('');
  const [useCustomPath, setUseCustomPath] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (step === 'files' && restoreType === 'selective') {
      fetchBackupContents();
    }
  }, [step, restoreType]);

  const fetchBackupContents = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/backups/${backup.id}/contents`);
      const data = await response.json();
      setFiles(data.files || []);
    } catch (error) {
      console.error('Error fetching backup contents:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFileSelection = (filePath: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(filePath)) {
      newSelected.delete(filePath);
    } else {
      newSelected.add(filePath);
    }
    setSelectedFiles(newSelected);
  };

  const handleNext = () => {
    if (step === 'type') {
      if (restoreType === 'selective') {
        setStep('files');
      } else {
        setStep('destination');
      }
    } else if (step === 'files') {
      setStep('destination');
    }
  };

  const handleBack = () => {
    if (step === 'destination') {
      if (restoreType === 'selective') {
        setStep('files');
      } else {
        setStep('type');
      }
    } else if (step === 'files') {
      setStep('type');
    }
  };

  const handleRestore = () => {
    const options: RestoreOptions = {
      restoreType,
      selectedFiles: restoreType === 'selective' ? Array.from(selectedFiles) : undefined,
      customPath: useCustomPath ? customPath : undefined,
    };
    onRestore(backup.id, options);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-2xl font-semibold text-slate-800 dark:text-white">Restore Wizard</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {backup.volumes?.name || 'Unknown Volume'} - {formatDate(backup.created_at)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'type' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-4">
                Choose Restore Type
              </h3>

              <div
                onClick={() => setRestoreType('full')}
                className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                  restoreType === 'full'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-1 ${
                      restoreType === 'full'
                        ? 'border-blue-600 bg-blue-600'
                        : 'border-slate-300'
                    }`}
                  >
                    {restoreType === 'full' && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-800 dark:text-white mb-2">Full Restore</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Restore the entire backup. All files and directories will be restored.
                    </p>
                    <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      Size: {formatSize(backup.size_bytes)}
                    </div>
                  </div>
                </div>
              </div>

              <div
                onClick={() => setRestoreType('selective')}
                className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                  restoreType === 'selective'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-1 ${
                      restoreType === 'selective'
                        ? 'border-blue-600 bg-blue-600'
                        : 'border-slate-300'
                    }`}
                  >
                    {restoreType === 'selective' && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-800 dark:text-white mb-2">
                      File-Level Restore
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Browse and select specific files or directories to restore.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'files' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-slate-800 dark:text-white">
                  Select Files to Restore
                </h3>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {selectedFiles.size} file(s) selected
                </div>
              </div>

              {loading ? (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                  Loading backup contents...
                </div>
              ) : files.length === 0 ? (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                  No files found in backup
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-200 dark:divide-slate-700 max-h-96 overflow-y-auto">
                  {files.map((file) => (
                    <div
                      key={file.path}
                      onClick={() => toggleFileSelection(file.path)}
                      className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                    >
                      {selectedFiles.has(file.path) ? (
                        <CheckSquare className="text-blue-600 flex-shrink-0" size={20} />
                      ) : (
                        <Square className="text-slate-400 flex-shrink-0" size={20} />
                      )}
                      {file.isDirectory ? (
                        <FolderOpen className="text-blue-500 flex-shrink-0" size={20} />
                      ) : (
                        <File className="text-slate-400 flex-shrink-0" size={20} />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-800 dark:text-white truncate">
                          {file.name}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{file.path}</div>
                      </div>
                      {file.size && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">
                          {formatSize(file.size)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 'destination' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-4">
                Choose Restore Destination
              </h3>

              <div
                onClick={() => setUseCustomPath(false)}
                className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                  !useCustomPath
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-1 ${
                      !useCustomPath
                        ? 'border-blue-600 bg-blue-600'
                        : 'border-slate-300'
                    }`}
                  >
                    {!useCustomPath && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-800 dark:text-white mb-2">
                      Original Location
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Restore to the original volume location
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded px-3 py-2">
                      <HardDrive size={16} />
                      {backup.volumes?.path || 'Unknown path'}
                    </div>
                  </div>
                </div>
              </div>

              <div
                onClick={() => setUseCustomPath(true)}
                className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                  useCustomPath
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-1 ${
                      useCustomPath
                        ? 'border-blue-600 bg-blue-600'
                        : 'border-slate-300'
                    }`}
                  >
                    {useCustomPath && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-800 dark:text-white mb-2">Custom Path</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                      Restore to a different location
                    </p>
                    {useCustomPath && (
                      <input
                        type="text"
                        value={customPath}
                        onChange={(e) => setCustomPath(e.target.value)}
                        placeholder="/path/to/restore"
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                  </div>
                </div>
              </div>

              {restoreType === 'selective' && (
                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Summary</h4>
                  <div className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
                    <div>Restore Type: File-Level Restore</div>
                    <div>Files Selected: {selectedFiles.size}</div>
                    <div>
                      Destination:{' '}
                      {useCustomPath ? customPath || 'Not specified' : backup.volumes?.path}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
          <div className="flex gap-2">
            {step !== 'type' && (
              <button
                onClick={handleBack}
                className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
              >
                Back
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
            >
              Cancel
            </button>
            {step === 'destination' ? (
              <button
                onClick={handleRestore}
                disabled={useCustomPath && !customPath}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed"
              >
                Restore
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={restoreType === 'selective' && step === 'files' && selectedFiles.size === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
