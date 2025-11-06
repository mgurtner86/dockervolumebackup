import { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, Power, PowerOff } from 'lucide-react';
import { Schedule } from '../types';
import { api } from '../lib/api';

interface ScheduleManagerProps {
  volumeId?: string;
}

export function ScheduleManager({ volumeId }: ScheduleManagerProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSchedule, setNewSchedule] = useState('');

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      const data = await api.schedules.getAll();
      setSchedules(data);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!volumeId) return;

    try {
      const data = await api.schedules.create({
        volume_id: volumeId,
        cron_expression: newSchedule,
      });
      setSchedules([data, ...schedules]);
      setNewSchedule('');
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding schedule:', error);
    }
  };

  const handleToggleSchedule = async (id: string, enabled: boolean) => {
    try {
      const data = await api.schedules.update(id, { enabled });
      setSchedules(schedules.map((s) => (s.id === id ? data : s)));
    } catch (error) {
      console.error('Error toggling schedule:', error);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;

    try {
      await api.schedules.delete(id);
      setSchedules(schedules.filter((s) => s.id !== id));
    } catch (error) {
      console.error('Error deleting schedule:', error);
    }
  };

  const getCronDescription = (cron: string) => {
    const descriptions: Record<string, string> = {
      '0 0 * * *': 'Daily at midnight',
      '0 2 * * *': 'Daily at 2:00 AM',
      '0 0 * * 0': 'Weekly on Sunday',
      '0 0 1 * *': 'Monthly on the 1st',
      '0 */6 * * *': 'Every 6 hours',
      '0 * * * *': 'Every hour',
    };
    return descriptions[cron] || cron;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return <div className="text-gray-500">Loading schedules...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Backup Schedules</h2>
        {volumeId && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Add Schedule
          </button>
        )}
      </div>

      {showAddForm && (
        <form onSubmit={handleAddSchedule} className="mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cron Expression
            </label>
            <select
              value={newSchedule}
              onChange={(e) => setNewSchedule(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select a schedule</option>
              <option value="0 0 * * *">Daily at midnight</option>
              <option value="0 2 * * *">Daily at 2:00 AM</option>
              <option value="0 0 * * 0">Weekly on Sunday</option>
              <option value="0 0 1 * *">Monthly on the 1st</option>
              <option value="0 */6 * * *">Every 6 hours</option>
              <option value="0 * * * *">Every hour</option>
            </select>
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
        {schedules.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No schedules configured</p>
        ) : (
          schedules.map((schedule) => (
            <div
              key={schedule.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3 flex-1">
                <Calendar className="text-gray-600" size={24} />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-800">
                      {schedule.volumes?.name || 'Unknown Volume'}
                    </h3>
                    {schedule.enabled ? (
                      <span className="px-2 py-1 text-xs font-medium text-green-600 bg-green-50 rounded">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-200 rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    {getCronDescription(schedule.cron_expression)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Last run: {formatDate(schedule.last_run)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleSchedule(schedule.id, !schedule.enabled)}
                  className={`p-2 rounded-lg transition-colors ${
                    schedule.enabled
                      ? 'text-green-600 hover:bg-green-50'
                      : 'text-gray-400 hover:bg-gray-200'
                  }`}
                  title={schedule.enabled ? 'Disable schedule' : 'Enable schedule'}
                >
                  {schedule.enabled ? <Power size={18} /> : <PowerOff size={18} />}
                </button>
                <button
                  onClick={() => handleDeleteSchedule(schedule.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
