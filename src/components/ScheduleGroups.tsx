import { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, Power, PowerOff, Clock, CheckCircle, XCircle, Play } from 'lucide-react';
import { api } from '../lib/api';
import { Volume, ScheduleGroup, ScheduleGroupRun } from '../types';
import { ConfirmDialog } from './ConfirmDialog';

export function ScheduleGroups() {
  const [scheduleGroups, setScheduleGroups] = useState<ScheduleGroup[]>([]);
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ScheduleGroup | null>(null);
  const [selectedGroupRuns, setSelectedGroupRuns] = useState<{ groupId: string; runs: ScheduleGroupRun[] } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; groupId?: string; groupName?: string }>({
    isOpen: false,
  });

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [groupsData, volumesData] = await Promise.all([
        api.scheduleGroups.getAll(),
        api.volumes.getAll(),
      ]);
      setScheduleGroups(Array.isArray(groupsData) ? groupsData : []);
      setVolumes(Array.isArray(volumesData) ? volumesData : []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setScheduleGroups([]);
      setVolumes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleGroup = async (group: ScheduleGroup) => {
    try {
      await api.scheduleGroups.update(group.id, { enabled: !group.enabled });
      await fetchData();
    } catch (error) {
      console.error('Error toggling group:', error);
    }
  };

  const handleDeleteGroup = async () => {
    if (!deleteConfirm.groupId) return;

    try {
      await api.scheduleGroups.delete(deleteConfirm.groupId);
      setDeleteConfirm({ isOpen: false });
      await fetchData();
    } catch (error) {
      console.error('Error deleting group:', error);
    }
  };

  const handleRunGroup = async (groupId: string) => {
    try {
      await api.scheduleGroups.triggerRun(groupId);
      await fetchData();
    } catch (error) {
      console.error('Error running group:', error);
    }
  };

  const handleViewRuns = async (groupId: string) => {
    try {
      const runs = await api.scheduleGroups.getRuns(groupId);
      setSelectedGroupRuns({ groupId, runs });
    } catch (error) {
      console.error('Error fetching runs:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600 dark:text-slate-400">Loading schedule groups...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="text-blue-600 dark:text-blue-400" size={28} />
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Schedule Groups</h1>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Create Group
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        {scheduleGroups.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="mx-auto text-slate-400 dark:text-slate-600 mb-4" size={48} />
            <p className="text-slate-600 dark:text-slate-400 mb-4">No schedule groups configured</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              Create Your First Group
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {scheduleGroups.map((group) => (
              <div key={group.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-800 dark:text-white">{group.name}</h3>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          group.enabled
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {group.enabled ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {group.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{group.description}</p>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="text-slate-400" size={16} />
                        <span className="text-slate-600 dark:text-slate-400">Schedule:</span>
                        <code className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs font-mono">
                          {group.cron_expression}
                        </code>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-slate-600 dark:text-slate-400">Volumes:</span>
                        <span className="font-medium text-slate-800 dark:text-white">{group.volumes.length}</span>
                      </div>
                      {group.last_run && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-slate-600 dark:text-slate-400">Last run:</span>
                          <span className="text-slate-800 dark:text-white">
                            {new Date(group.last_run).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                    {group.volumes.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Execution Order:</p>
                        <div className="flex flex-wrap gap-2">
                          {group.volumes
                            .sort((a, b) => a.execution_order - b.execution_order)
                            .map((vol, idx) => (
                              <div
                                key={vol.id}
                                className="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-sm"
                              >
                                <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{idx + 1}.</span>
                                <span className="text-slate-700 dark:text-slate-300">{vol.volume_name}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleRunGroup(group.id)}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="Run now"
                    >
                      <Play size={18} />
                    </button>
                    <button
                      onClick={() => handleViewRuns(group.id)}
                      className="p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 rounded-lg transition-colors"
                      title="View runs"
                    >
                      <Clock size={18} />
                    </button>
                    <button
                      onClick={() => setEditingGroup(group)}
                      className="p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Calendar size={18} />
                    </button>
                    <button
                      onClick={() => handleToggleGroup(group)}
                      className={`p-2 rounded-lg transition-colors ${
                        group.enabled
                          ? 'text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20'
                          : 'text-slate-400 hover:bg-slate-100 dark:text-slate-500 dark:hover:bg-slate-700'
                      }`}
                      title={group.enabled ? 'Disable' : 'Enable'}
                    >
                      {group.enabled ? <Power size={18} /> : <PowerOff size={18} />}
                    </button>
                    <button
                      onClick={() => setDeleteConfirm({ isOpen: true, groupId: group.id, groupName: group.name })}
                      className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {(showCreateModal || editingGroup) && (
        <GroupModal
          group={editingGroup}
          volumes={volumes}
          onClose={() => {
            setShowCreateModal(false);
            setEditingGroup(null);
          }}
          onSave={() => {
            fetchData();
            setShowCreateModal(false);
            setEditingGroup(null);
          }}
        />
      )}

      {selectedGroupRuns && (
        <RunsModal
          groupId={selectedGroupRuns.groupId}
          runs={selectedGroupRuns.runs}
          onClose={() => setSelectedGroupRuns(null)}
        />
      )}
    </div>
  );
}

interface GroupModalProps {
  group: ScheduleGroup | null;
  volumes: Volume[];
  onClose: () => void;
  onSave: () => void;
}

function GroupModal({ group, volumes, onClose, onSave }: GroupModalProps) {
  const [name, setName] = useState(group?.name || '');
  const [description, setDescription] = useState(group?.description || '');
  const [cronExpression, setCronExpression] = useState(group?.cron_expression || '0 0 * * *');
  const [selectedVolumeIds, setSelectedVolumeIds] = useState<string[]>(
    group?.volumes.map((v) => v.volume_id) || []
  );
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (group) {
        await api.scheduleGroups.update(group.id, {
          name,
          description,
          cron_expression: cronExpression,
          volume_ids: selectedVolumeIds,
        });
      } else {
        await api.scheduleGroups.create({
          name,
          description,
          cron_expression: cronExpression,
          volume_ids: selectedVolumeIds,
        });
      }
      onSave();
    } catch (error) {
      console.error('Error saving group:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleVolume = (volumeId: string) => {
    setSelectedVolumeIds((prev) =>
      prev.includes(volumeId) ? prev.filter((id) => id !== volumeId) : [...prev, volumeId]
    );
  };

  const moveVolumeUp = (volumeId: string) => {
    const index = selectedVolumeIds.indexOf(volumeId);
    if (index > 0) {
      const newIds = [...selectedVolumeIds];
      [newIds[index - 1], newIds[index]] = [newIds[index], newIds[index - 1]];
      setSelectedVolumeIds(newIds);
    }
  };

  const moveVolumeDown = (volumeId: string) => {
    const index = selectedVolumeIds.indexOf(volumeId);
    if (index < selectedVolumeIds.length - 1) {
      const newIds = [...selectedVolumeIds];
      [newIds[index], newIds[index + 1]] = [newIds[index + 1], newIds[index]];
      setSelectedVolumeIds(newIds);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-white">
            {group ? 'Edit Schedule Group' : 'Create Schedule Group'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Group Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Cron Expression
            </label>
            <input
              type="text"
              value={cronExpression}
              onChange={(e) => setCronExpression(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 font-mono"
              placeholder="0 0 * * *"
              required
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Example: 0 0 * * * (daily at midnight)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Select Volumes (in execution order)
            </label>
            <div className="space-y-2 max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-3">
              {volumes.map((volume) => {
                const isSelected = selectedVolumeIds.includes(volume.id);
                const selectedIndex = selectedVolumeIds.indexOf(volume.id);
                return (
                  <div
                    key={volume.id}
                    className={`flex items-center gap-3 p-2 rounded ${
                      isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleVolume(volume.id)}
                      className="rounded text-blue-600"
                    />
                    {isSelected && (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => moveVolumeUp(volume.id)}
                          disabled={selectedIndex === 0}
                          className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveVolumeDown(volume.id)}
                          disabled={selectedIndex === selectedVolumeIds.length - 1}
                          className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                        >
                          ↓
                        </button>
                      </div>
                    )}
                    <span className="text-slate-800 dark:text-white">
                      {isSelected && <span className="font-mono text-xs text-slate-500 mr-2">{selectedIndex + 1}.</span>}
                      {volume.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving || selectedVolumeIds.length === 0}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : group ? 'Update Group' : 'Create Group'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface RunsModalProps {
  groupId: string;
  runs: ScheduleGroupRun[];
  onClose: () => void;
}

function RunsModal({ runs, onClose }: RunsModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-white">Run History</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          {runs.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              No runs yet
            </div>
          ) : (
            <div className="space-y-3">
              {runs.map((run) => (
                <div
                  key={run.id}
                  className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {run.status === 'completed' ? (
                        <CheckCircle className="text-green-600 dark:text-green-400" size={20} />
                      ) : run.status === 'failed' ? (
                        <XCircle className="text-red-600 dark:text-red-400" size={20} />
                      ) : (
                        <Clock className="text-blue-600 dark:text-blue-400" size={20} />
                      )}
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          run.status === 'completed'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : run.status === 'failed'
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        }`}
                      >
                        {run.status}
                      </span>
                    </div>
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {new Date(run.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Progress: {run.current_volume_index} / {run.total_volumes} volumes
                  </div>
                  {run.error_message && (
                    <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                      Error: {run.error_message}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Schedule Group"
        message={`Are you sure you want to delete "${deleteConfirm.groupName}"? This will remove the schedule group but not the volumes or their backups.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteGroup}
        onCancel={() => setDeleteConfirm({ isOpen: false })}
        danger
      />
    </div>
  );
}
