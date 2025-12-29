import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  MoreVertical,
  Eye,
  Edit,
  Lock,
  XCircle,
  Trophy,
  Calendar,
  Ticket,
} from 'lucide-react';
import { format } from 'date-fns';
import { api } from '@/services/api';
import { EventStatus, EventCategory } from '@/types';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const statusColors: Record<EventStatus, string> = {
  draft: 'badge-neutral',
  upcoming: 'badge-info',
  open: 'badge-success',
  locked: 'badge-warning',
  resolved: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  cancelled: 'badge-error',
};

const categoryColors: Record<EventCategory, string> = {
  sports: 'bg-green-500/10 text-green-400',
  finance: 'bg-blue-500/10 text-blue-400',
  crypto: 'bg-orange-500/10 text-orange-400',
  politics: 'bg-red-500/10 text-red-400',
  entertainment: 'bg-pink-500/10 text-pink-400',
  news: 'bg-purple-500/10 text-purple-400',
  other: 'bg-gray-500/10 text-gray-400',
};

export function AdminEvents() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'live' | 'week' | 'locked' | 'resolve' | 'results'>('live');
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    search: '',
    page: 1,
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionMenu, setActionMenu] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'events', filters],
    queryFn: () => api.getAdminEvents({
      status: filters.status as EventStatus || undefined,
      category: filters.category as EventCategory || undefined,
      search: filters.search || undefined,
      page: filters.page,
      limit: 50,
    }),
  });

  // Fetch pending resolve events from server (accurate server-side time)
  const { data: pendingResolveData } = useQuery({
    queryKey: ['admin', 'events', 'pending-resolve'],
    queryFn: () => api.getAdminPendingResolve(),
    enabled: activeTab === 'resolve', // Only fetch when on Resolve tab
  });

  const lockMutation = useMutation({
    mutationFn: (id: string) => api.lockEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'events'] });
      toast.success('Event locked successfully');
    },
    onError: () => toast.error('Failed to lock event'),
  });

  const allEvents = data?.data || [];
  const pendingResolveEvents = pendingResolveData?.data || [];
  const pagination = data?.pagination;

  // Filter events based on active tab
  const getFilteredEvents = () => {
    switch (activeTab) {
      case 'live':
        // Live tab: only open events
        return allEvents.filter(e => e.status === 'open');
      case 'week':
        // Event of Week: upcoming jackpot events only
        return allEvents.filter((e: any) => e.isJackpot && e.status === 'upcoming');
      case 'locked':
        return allEvents.filter(e => e.status === 'locked');
      case 'resolve':
        // Resolve tab: use server-side filtered data (accurate server time)
        return pendingResolveEvents;
      case 'results':
        return allEvents.filter(e => e.status === 'resolved' || e.status === 'cancelled');
      default:
        return allEvents;
    }
  };

  // Group events by weekday for "Event of Week" tab
  const getEventsByWeekday = () => {
    const events = getFilteredEvents();
    const grouped: Record<string, typeof events> = {};
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    events.forEach(event => {
      const dayName = days[new Date(event.eventTime).getDay()];
      if (!grouped[dayName]) grouped[dayName] = [];
      grouped[dayName].push(event);
    });

    return grouped;
  };

  const events = getFilteredEvents();
  const eventsByWeekday = activeTab === 'week' ? getEventsByWeekday() : {};

  const tabs = [
    { id: 'live' as const, label: 'Live', count: allEvents.filter(e => e.status === 'open').length, color: 'text-green-500 border-green-500' },
    { id: 'week' as const, label: 'Event of Week', count: allEvents.filter((e: any) => e.isJackpot && e.status === 'upcoming').length, color: 'text-blue-500 border-blue-500' },
    { id: 'locked' as const, label: 'Locked', count: allEvents.filter(e => e.status === 'locked').length, color: 'text-yellow-500 border-yellow-500' },
    { id: 'resolve' as const, label: 'Resolve', count: pendingResolveEvents.length, color: 'text-orange-500 border-orange-500' },
    { id: 'results' as const, label: 'Results', count: allEvents.filter(e => e.status === 'resolved' || e.status === 'cancelled').length, color: 'text-purple-500 border-purple-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Events</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage prediction events</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
        >
          <Plus className="w-4 h-4" />
          Create Event
        </button>
      </div>

      {/* Tab Bar */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-1 overflow-x-auto scrollbar-hide -mb-px" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                activeTab === tab.id
                  ? tab.color
                  : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              )}
            >
              {tab.label}
              <span className={clsx(
                'px-2 py-0.5 text-xs rounded-full',
                activeTab === tab.id
                  ? 'bg-current/10'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
            <input
              type="text"
              placeholder="Search events..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
              className="input pl-10"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
            className="input w-full md:w-40"
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="upcoming">Upcoming</option>
            <option value="open">Open</option>
            <option value="locked">Locked</option>
            <option value="resolved">Resolved</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Category Filter */}
          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value, page: 1 })}
            className="input w-full md:w-40"
          >
            <option value="">All Categories</option>
            <option value="sports">Sports</option>
            <option value="finance">Finance</option>
            <option value="crypto">Crypto</option>
            <option value="politics">Politics</option>
            <option value="entertainment">Entertainment</option>
            <option value="news">News</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Events Table / Weekday Groups */}
      {activeTab === 'week' ? (
        /* Event of Week - Grouped by Weekday */
        <div className="space-y-6">
          {Object.keys(eventsByWeekday).length === 0 ? (
            <div className="card p-12 text-center">
              <Calendar className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No events scheduled this week</p>
            </div>
          ) : (
            ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
              .filter(day => eventsByWeekday[day]?.length > 0)
              .map(day => (
                <div key={day} className="card overflow-hidden">
                  <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-500" />
                      {day}
                      <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                        ({eventsByWeekday[day].length} event{eventsByWeekday[day].length !== 1 ? 's' : ''})
                      </span>
                    </h3>
                  </div>
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {eventsByWeekday[day].map(event => (
                      <div
                        key={event.id}
                        onClick={() => navigate(`/admin/events/${event.id}`)}
                        className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-blue-400" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{event.title}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {format(new Date(event.eventTime), 'HH:mm')} • {event.ticketCount || 0} tickets
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={clsx('badge', statusColors[event.status])}>
                            {event.status === 'locked' && event.category === 'sports' ? 'LIVE' : event.status}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            ${(event.totalPool || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
          )}
        </div>
      ) : (
        /* Standard Table View */
        <div className="card overflow-hidden">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Tickets</th>
                  <th>Pool</th>
                  <th>Event Time</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={7}>
                        <div className="h-12 bg-gray-200 dark:bg-gray-800 animate-pulse rounded" />
                      </td>
                    </tr>
                  ))
                ) : events.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-500 dark:text-gray-400">
                      No events found
                    </td>
                  </tr>
                ) : (
                  events.map((event) => (
                    <tr
                      key={event.id}
                      className="group cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      onClick={() => navigate(`/admin/events/${event.id}`)}
                    >
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-500/20 to-purple-500/20 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-brand-400" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{event.title}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                              {event.id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={clsx('badge', categoryColors[event.category])}>
                          {event.category}
                        </span>
                      </td>
                      <td>
                        <span className={clsx('badge', statusColors[event.status])}>
                          {event.status === 'locked' && event.category === 'sports' ? 'LIVE' : event.status}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                          <Ticket className="w-4 h-4 text-gray-400" />
                          <span>{event.ticketCount || 0}</span>
                        </div>
                      </td>
                      <td className="font-medium text-gray-900 dark:text-white">
                        ${(event.totalPool || 0).toLocaleString()}
                      </td>
                      <td className="text-gray-600 dark:text-gray-300">
                        {format(new Date(event.eventTime), 'MMM dd, yyyy HH:mm')}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="relative">
                          <button
                            onClick={() => setActionMenu(actionMenu === event.id ? null : event.id)}
                            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-white"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {actionMenu === event.id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setActionMenu(null)}
                              />
                              <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-20 py-1">
                                <button
                                  onClick={() => {
                                    navigate(`/admin/events/${event.id}`);
                                    setActionMenu(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                >
                                  <Eye className="w-4 h-4" />
                                  View Details
                                </button>

                                {['draft', 'upcoming', 'open'].includes(event.status) && (
                                  <button
                                    onClick={() => {
                                      navigate(`/admin/events/${event.id}?edit=true`);
                                      setActionMenu(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                  >
                                    <Edit className="w-4 h-4" />
                                    Edit Event
                                  </button>
                                )}

                                {event.status === 'open' && (
                                  <button
                                    onClick={() => {
                                      lockMutation.mutate(event.id);
                                      setActionMenu(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-yellow-600 dark:text-yellow-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                  >
                                    <Lock className="w-4 h-4" />
                                    Lock Event
                                  </button>
                                )}

                                {event.status === 'locked' && (
                                  <button
                                    onClick={() => {
                                      navigate(`/admin/events/${event.id}?resolve=true`);
                                      setActionMenu(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-green-600 dark:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                  >
                                    <Trophy className="w-4 h-4" />
                                    Resolve Event
                                  </button>
                                )}

                                {!['resolved', 'cancelled'].includes(event.status) && (
                                  <button
                                    onClick={() => {
                                      navigate(`/admin/events/${event.id}?cancel=true`);
                                      setActionMenu(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                  >
                                    <XCircle className="w-4 h-4" />
                                    Cancel Event
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} events
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                  disabled={filters.page === 1}
                  className="btn btn-secondary text-sm"
                >
                  Previous
                </button>
                <button
                  onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                  disabled={filters.page >= pagination.pages}
                  className="btn btn-secondary text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Event Modal */}
      {showCreateModal && (
        <CreateEventModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}

// Create Event Modal Component
function CreateEventModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'sports' as EventCategory,
    ticketPrice: 10,
    totalTickets: 1000,
    options: [
      { label: '', ticketLimit: 1000 },
      { label: '', ticketLimit: 1000 },
    ],
    startTime: '',
    lockTime: '',
    endTime: '',
    status: 'upcoming' as 'draft' | 'upcoming',
  });

  const createMutation = useMutation({
    mutationFn: () => {
      // Calculate ticket limit per option (total / number of options)
      const ticketLimitPerOption = Math.floor(form.totalTickets / form.options.length);

      // Convert datetime-local format to ISO format for backend
      const formData = {
        title: form.title,
        description: form.description,
        category: form.category,
        ticketPrice: form.ticketPrice,
        options: form.options.map(opt => ({
          label: opt.label,
          ticketLimit: ticketLimitPerOption,
        })),
        status: form.status,
        startTime: form.startTime ? new Date(form.startTime).toISOString() : '',
        lockTime: form.lockTime ? new Date(form.lockTime).toISOString() : '',
        eventTime: form.endTime ? new Date(form.endTime).toISOString() : '',
      };
      console.log('Creating event with data:', JSON.stringify(formData, null, 2));
      return api.createEvent(formData);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'events'] });
      toast.success('Event created successfully');
      onClose();
      if (data.data?.id) {
        navigate(`/admin/events/${data.data.id}`);
      }
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || 'Failed to create event';
      toast.error(message);
    },
  });

  const addOption = () => {
    if (form.options.length < 6) {
      setForm({
        ...form,
        options: [...form.options, { label: '', ticketLimit: 1000 }],
      });
    }
  };

  const removeOption = (index: number) => {
    if (form.options.length > 2) {
      setForm({
        ...form,
        options: form.options.filter((_, i) => i !== index),
      });
    }
  };

  const updateOption = (index: number, field: 'label' | 'ticketLimit', value: string | number) => {
    const newOptions = [...form.options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setForm({ ...form, options: newOptions });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white lg:bg-dark-900 border border-gray-200 lg:border-dark-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-6 border-b border-gray-200 lg:border-dark-800">
          <h2 className="text-xl font-bold text-gray-900 lg:text-white">Create New Event</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="label">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input"
              placeholder="e.g., Super Bowl LVIII Winner"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="label">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input min-h-[100px]"
              placeholder="Describe the event..."
            />
          </div>

          {/* Category & Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as EventCategory })}
                className="input"
              >
                <option value="sports">Sports</option>
                <option value="finance">Finance</option>
                <option value="crypto">Crypto</option>
                <option value="politics">Politics</option>
                <option value="entertainment">Entertainment</option>
              </select>
            </div>
            <div>
              <label className="label">Ticket Price ($)</label>
              <input
                type="number"
                value={form.ticketPrice}
                onChange={(e) => setForm({ ...form, ticketPrice: parseFloat(e.target.value) })}
                className="input"
                min={1}
                max={10000}
              />
            </div>
            <div>
              <label className="label">Total Tickets</label>
              <input
                type="number"
                value={form.totalTickets}
                onChange={(e) => setForm({ ...form, totalTickets: parseInt(e.target.value) })}
                className="input"
                min={10}
                max={100000}
              />
            </div>
          </div>

          {/* Options */}
          <div>
            <label className="label">Betting Options</label>
            <div className="space-y-3">
              {form.options.map((option, index) => (
                <div key={index} className="flex gap-3 items-center">
                  <input
                    type="text"
                    value={option.label}
                    onChange={(e) => updateOption(index, 'label', e.target.value)}
                    className="input flex-1"
                    placeholder={`Option ${index + 1} (e.g. Yes, No, Home, Away)`}
                    required
                  />
                  {form.options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      className="btn btn-ghost text-red-400"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {form.options.length < 6 && (
              <button
                type="button"
                onClick={addOption}
                className="btn btn-ghost text-primary-400 mt-3"
              >
                <Plus className="w-4 h-4" />
                Add Option
              </button>
            )}
          </div>

          {/* Times */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Start Time</label>
              <p className="text-gray-500 text-xs mb-1">When betting opens</p>
              <input
                type="datetime-local"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">Lock Time</label>
              <p className="text-gray-500 text-xs mb-1">When betting closes</p>
              <input
                type="datetime-local"
                value={form.lockTime}
                onChange={(e) => setForm({ ...form, lockTime: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">End Time</label>
              <p className="text-gray-500 text-xs mb-1">When event ends</p>
              <input
                type="datetime-local"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                className="input"
                required
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="label">Initial Status</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="draft"
                  checked={form.status === 'draft'}
                  onChange={() => setForm({ ...form, status: 'draft' })}
                  className="text-primary-500"
                />
                <span className="text-dark-300">Draft</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="upcoming"
                  checked={form.status === 'upcoming'}
                  onChange={() => setForm({ ...form, status: 'upcoming' })}
                  className="text-primary-500"
                />
                <span className="text-dark-300">Upcoming (visible)</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-dark-800">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
