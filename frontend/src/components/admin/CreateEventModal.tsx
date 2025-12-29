import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/services/api';
import type { EventCategory, CreateEventForm } from '@/types';

interface CreateEventModalProps {
  onClose: () => void;
}

const categories: { value: EventCategory; label: string }[] = [
  { value: 'sports', label: 'Sports' },
  { value: 'finance', label: 'Finance' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'politics', label: 'Politics' },
  { value: 'entertainment', label: 'Entertainment' },
];

export function CreateEventModal({ onClose }: CreateEventModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<CreateEventForm>({
    title: '',
    description: '',
    category: 'sports',
    ticketPrice: 10,
    options: [
      { label: '', ticketLimit: 1000 },
      { label: '', ticketLimit: 1000 },
    ],
    startTime: '',
    lockTime: '',
    eventTime: '',
    status: 'upcoming',
    isJackpot: false,
  });

  const mutation = useMutation({
    mutationFn: (data: CreateEventForm) => api.createEvent(data),
    onSuccess: () => {
      toast.success('Event created successfully!');
      queryClient.invalidateQueries({ queryKey: ['admin', 'events'] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create event');
    },
  });

  const addOption = () => {
    if (formData.options.length >= 6) return;
    setFormData({
      ...formData,
      options: [...formData.options, { label: '', ticketLimit: 1000 }],
    });
  };

  const removeOption = (index: number) => {
    if (formData.options.length <= 2) return;
    setFormData({
      ...formData,
      options: formData.options.filter((_, i) => i !== index),
    });
  };

  const updateOption = (index: number, field: 'label' | 'ticketLimit', value: string | number) => {
    const newOptions = [...formData.options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setFormData({ ...formData, options: newOptions });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate options
    if (formData.options.some(o => !o.label.trim())) {
      toast.error('All options must have labels');
      return;
    }

    // Validate times
    const start = new Date(formData.startTime);
    const lock = new Date(formData.lockTime);
    const event = new Date(formData.eventTime);

    if (start >= lock || lock >= event) {
      toast.error('Times must be: Start < Lock < Event');
      return;
    }

    mutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Create New Event</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="label">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Event title"
              required
              maxLength={200}
              className="input"
            />
          </div>

          {/* Description */}
          <div>
            <label className="label">Description (optional)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Event description..."
              rows={3}
              className="input resize-none"
            />
          </div>

          {/* Category & Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as EventCategory })}
                className="input"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Ticket Price ($)</label>
              <input
                type="number"
                min={1}
                max={10000}
                value={formData.ticketPrice}
                onChange={(e) => setFormData({ ...formData, ticketPrice: parseFloat(e.target.value) })}
                className="input"
              />
            </div>
          </div>

          {/* Options */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Betting Options</label>
              {formData.options.length < 6 && (
                <button
                  type="button"
                  onClick={addOption}
                  className="btn btn-ghost text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Option
                </button>
              )}
            </div>
            <div className="space-y-3">
              {formData.options.map((option, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-dark-700 flex items-center justify-center text-sm font-bold text-dark-400">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <input
                    type="text"
                    value={option.label}
                    onChange={(e) => updateOption(index, 'label', e.target.value)}
                    placeholder={`Option ${String.fromCharCode(65 + index)} label`}
                    required
                    className="input flex-1"
                  />
                  <input
                    type="number"
                    min={10}
                    max={1000000}
                    value={option.ticketLimit}
                    onChange={(e) => updateOption(index, 'ticketLimit', parseInt(e.target.value))}
                    className="input w-32"
                    title="Ticket limit"
                  />
                  {formData.options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      className="p-2 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-dark-500 mt-2">
              Minimum 2 options, maximum 6. Enter ticket limit for each option.
            </p>
          </div>

          {/* Times */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Start Time</label>
              <input
                type="datetime-local"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                required
                className="input"
              />
              <p className="text-xs text-dark-500 mt-1">When betting opens</p>
            </div>
            <div>
              <label className="label">Lock Time</label>
              <input
                type="datetime-local"
                value={formData.lockTime}
                onChange={(e) => setFormData({ ...formData, lockTime: e.target.value })}
                required
                className="input"
              />
              <p className="text-xs text-dark-500 mt-1">When betting closes</p>
            </div>
            <div>
              <label className="label">Event Time</label>
              <input
                type="datetime-local"
                value={formData.eventTime}
                onChange={(e) => setFormData({ ...formData, eventTime: e.target.value })}
                required
                className="input"
              />
              <p className="text-xs text-dark-500 mt-1">When event occurs</p>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="label">Initial Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as 'draft' | 'upcoming' })}
              className="input"
            >
              <option value="draft">Draft (hidden)</option>
              <option value="upcoming">Upcoming (visible)</option>
            </select>
          </div>

          {/* Jackpot Toggle */}
          <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-xl border border-yellow-500/30 dark:border-yellow-600/30">
            <input
              type="checkbox"
              id="isJackpot"
              checked={formData.isJackpot || false}
              onChange={(e) => setFormData({ ...formData, isJackpot: e.target.checked })}
              className="w-5 h-5 rounded border-yellow-400 text-yellow-500 focus:ring-yellow-500"
            />
            <label htmlFor="isJackpot" className="flex-1">
              <span className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">🏆 Featured Jackpot Event</span>
              <p className="text-xs text-yellow-600/80 dark:text-yellow-500/80 mt-0.5">Shows on the Jackpot page for users</p>
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-dark-800">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn btn-primary flex-1"
            >
              {mutation.isPending ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
