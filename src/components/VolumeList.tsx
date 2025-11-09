import { useState, useEffect } from 'react';
import { HardDrive, Trash2, Plus, X, Container, CheckSquare, Square } from 'lucide-react';
import { Volume } from '../types';
import { api } from '../lib/api';
import { ConfirmDialog } from './ConfirmDialog';

interface VolumeListProps {
  onSelectVolume: (volume: Volume) => void;
  selectedVolumeId?: string;
}

interface DockerContainer {
  id: string;
  name: string;
  image: string;
  status: string;
  volumes: {
    name: string;
    source: string;
    destination: string;
  }[];
}

export function VolumeList({ onSelectVolume, selectedVolumeId }: VolumeListProps) {
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDockerModal, setShowDockerModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; volumeId?: string; volumeName?: string }>({
    isOpen: false,
  });

  useEffect(() => {
    fetchVolumes();
  }, []);

  const fetchVolumes = async () => {
    try {
      const data = await api.volumes.getAll();
      setVolumes(data);
    } catch (error) {
      console.error('Error fetching volumes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVolume = async () => {
    if (!deleteConfirm.volumeId) return;

    try {
      await api.volumes.delete(deleteConfirm.volumeId);
      setVolumes(volumes.filter(v => v.id !== deleteConfirm.volumeId));
      setDeleteConfirm({ isOpen: false });
    } catch (error) {
      console.error('Error deleting volume:', error);
    }
  };

  if (loading) {
    return <div className="text-gray-500">Loading volumes...</div>;
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Docker Volumes</h2>
        <button
          onClick={() => setShowDockerModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
        >
          <Plus size={20} />
          Add Volume
        </button>
      </div>

      <div className="space-y-2">
        {volumes.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">No volumes added yet</p>
        ) : (
          volumes.map((volume) => (
            <div
              key={volume.id}
              onClick={() => onSelectVolume(volume)}
              className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-colors ${
                selectedVolumeId === volume.id
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-500 dark:border-blue-400'
                  : 'bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 border-2 border-transparent'
              }`}
            >
              <HardDrive className="text-blue-600 flex-shrink-0" size={24} />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-800 dark:text-white truncate">{volume.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{volume.path}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteConfirm({ isOpen: true, volumeId: volume.id, volumeName: volume.name });
                }}
                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors flex-shrink-0"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Volume"
        message={`Are you sure you want to delete "${deleteConfirm.volumeName}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteVolume}
        onCancel={() => setDeleteConfirm({ isOpen: false })}
        danger
      />

      {showDockerModal && (
        <DockerVolumeModal
          onClose={() => setShowDockerModal(false)}
          onVolumesSelected={async () => {
            await fetchVolumes();
            setShowDockerModal(false);
          }}
        />
      )}
    </div>
  );
}

interface DockerVolumeModalProps {
  onClose: () => void;
  onVolumesSelected: () => void;
}

function DockerVolumeModal({ onClose, onVolumesSelected }: DockerVolumeModalProps) {
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVolumes, setSelectedVolumes] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadContainers();
  }, []);

  const loadContainers = async () => {
    try {
      const data = await api.volumes.getDockerContainers();
      setContainers(data);
    } catch (error) {
      console.error('Error loading Docker containers:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleVolume = (volumeName: string, volumeSource: string) => {
    const key = `${volumeName}::${volumeSource}`;
    const newSelected = new Set(selectedVolumes);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedVolumes(newSelected);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const volumesToAdd = Array.from(selectedVolumes).map(key => {
        const [name, source] = key.split('::');
        return { name, path: source };
      });

      await Promise.all(
        volumesToAdd.map(volume => api.volumes.create(volume))
      );

      onVolumesSelected();
    } catch (error) {
      console.error('Error saving volumes:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <Container className="text-blue-600 dark:text-blue-400" size={24} />
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white">
              Select Docker Volumes
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-slate-600 dark:text-slate-400">Loading containers...</div>
            </div>
          ) : containers.length === 0 ? (
            <div className="text-center py-8 text-slate-600 dark:text-slate-400">
              No running containers with volumes found
            </div>
          ) : (
            <div className="space-y-4">
              {containers.map((container) => (
                <div
                  key={container.id}
                  className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-slate-50 dark:bg-slate-900"
                >
                  <div className="mb-3">
                    <h3 className="font-semibold text-slate-800 dark:text-white">
                      {container.name}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {container.image} • {container.status}
                    </p>
                  </div>
                  <div className="space-y-2">
                    {container.volumes.map((volume) => {
                      const key = `${volume.name}::${volume.source}`;
                      const isSelected = selectedVolumes.has(key);
                      return (
                        <div
                          key={key}
                          onClick={() => toggleVolume(volume.name, volume.source)}
                          className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500 dark:border-blue-400'
                              : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border-2 border-transparent'
                          }`}
                        >
                          <div className="pt-0.5">
                            {isSelected ? (
                              <CheckSquare className="text-blue-600 dark:text-blue-400" size={20} />
                            ) : (
                              <Square className="text-slate-400" size={20} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-slate-800 dark:text-white">
                              {volume.name}
                            </div>
                            <div className="text-sm text-slate-600 dark:text-slate-400 truncate">
                              Source: {volume.source}
                            </div>
                            <div className="text-sm text-slate-500 dark:text-slate-500 truncate">
                              Container path: {volume.destination}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {selectedVolumes.size} volume{selectedVolumes.size !== 1 ? 's' : ''} selected
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={selectedVolumes.size === 0 || saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {saving ? 'Adding...' : 'Add Selected Volumes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
