import { useState, useEffect } from 'react';
import { HardDrive, Trash2, Plus } from 'lucide-react';
import { Volume } from '../types';
import { api } from '../lib/api';

interface VolumeListProps {
  onSelectVolume: (volume: Volume) => void;
  selectedVolumeId?: string;
}

export function VolumeList({ onSelectVolume, selectedVolumeId }: VolumeListProps) {
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newVolume, setNewVolume] = useState({ name: '', path: '' });

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

  const handleAddVolume = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await api.volumes.create(newVolume);
      setVolumes([data, ...volumes]);
      setNewVolume({ name: '', path: '' });
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding volume:', error);
    }
  };

  const handleDeleteVolume = async (id: string) => {
    if (!confirm('Are you sure you want to delete this volume?')) return;

    try {
      await api.volumes.delete(id);
      setVolumes(volumes.filter(v => v.id !== id));
    } catch (error) {
      console.error('Error deleting volume:', error);
    }
  };

  if (loading) {
    return <div className="text-gray-500">Loading volumes...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Docker Volumes</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Add Volume
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddVolume} className="mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Volume Name
              </label>
              <input
                type="text"
                required
                value={newVolume.name}
                onChange={(e) => setNewVolume({ ...newVolume, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="my-volume"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Volume Path
              </label>
              <input
                type="text"
                required
                value={newVolume.path}
                onChange={(e) => setNewVolume({ ...newVolume, path: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="/var/lib/docker/volumes/my-volume/_data"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {volumes.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No volumes added yet</p>
        ) : (
          volumes.map((volume) => (
            <div
              key={volume.id}
              onClick={() => onSelectVolume(volume)}
              className={`flex items-center justify-between p-4 rounded-lg cursor-pointer transition-colors ${
                selectedVolumeId === volume.id
                  ? 'bg-blue-50 border-2 border-blue-500'
                  : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <HardDrive className="text-blue-600" size={24} />
                <div>
                  <h3 className="font-medium text-gray-800">{volume.name}</h3>
                  <p className="text-sm text-gray-500">{volume.path}</p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteVolume(volume.id);
                }}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
