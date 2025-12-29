import { useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Clock,
  Ticket,
  DollarSign,
  Users,
  Trophy,
  Lock,
  XCircle,
  CheckCircle,
  AlertCircle,
  Copy,
} from 'lucide-react';
import { format } from 'date-fns';
import { api } from '@/services/api';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const statusColors = {
  draft: 'badge-neutral',
  upcoming: 'badge-info',
  open: 'badge-success',
  locked: 'badge-warning',
  resolved: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  cancelled: 'badge-error',
};

const ticketStatusColors = {
  active: 'badge-info',
  won: 'badge-success',
  lost: 'badge-error',
  claimed: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  refunded: 'badge-warning',
};

export function AdminEventDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'overview' | 'tickets' | 'winners' | 'losers'>('overview');
  const [showResolveModal, setShowResolveModal] = useState(searchParams.get('resolve') === 'true');
  const [showCancelModal, setShowCancelModal] = useState(searchParams.get('cancel') === 'true');

  const { data: eventData, isLoading } = useQuery({
    queryKey: ['admin', 'event', id],
    queryFn: () => api.getAdminEvent(id!),
    enabled: !!id,
  });

  const { data: winnersData } = useQuery({
    queryKey: ['admin', 'event', id, 'winners'],
    queryFn: () => api.getEventWinners(id!),
    enabled: !!id && (activeTab === 'winners' || eventData?.data?.status === 'resolved'),
  });

  const { data: losersData } = useQuery({
    queryKey: ['admin', 'event', id, 'losers'],
    queryFn: () => api.getEventLosers(id!),
    enabled: !!id && activeTab === 'losers',
  });

  const lockMutation = useMutation({
    mutationFn: () => api.lockEvent(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'event', id] });
      toast.success('Event locked successfully');
    },
    onError: () => toast.error('Failed to lock event'),
  });

  const unlockMutation = useMutation({
    mutationFn: () => api.unlockEvent(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'event', id] });
      toast.success('Event unlocked successfully');
    },
    onError: () => toast.error('Failed to unlock event'),
  });

  const event = eventData?.data;
  const tickets = event?.tickets || [];
  const winners = winnersData?.data?.winners || [];
  const losers = losersData?.data?.losers || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-dark-800 animate-pulse rounded" />
        <div className="card p-6">
          <div className="h-64 bg-dark-800 animate-pulse rounded" />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-dark-400">Event not found</p>
        </div>
      </div>
    );
  }

  const totalPool = event.options?.reduce((sum, opt) => sum + (opt.poolAmount || 0), 0) || 0;
  const totalTickets = event.options?.reduce((sum, opt) => sum + (opt.ticketsSold || 0), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/events')}
            className="p-2 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{event.title}</h1>
              <span className={clsx('badge', statusColors[event.status])}>
                {event.status}
              </span>
            </div>
            <p className="text-dark-400 mt-1 flex items-center gap-2">
              <span className="font-mono text-xs">{event.id}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(event.id);
                  toast.success('ID copied');
                }}
                className="text-dark-500 hover:text-white"
              >
                <Copy className="w-3 h-3" />
              </button>
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {event.status === 'open' && (
            <button
              onClick={() => lockMutation.mutate()}
              disabled={lockMutation.isPending}
              className="btn btn-secondary"
            >
              <Lock className="w-4 h-4" />
              Lock Event
            </button>
          )}
          {/* Unlock button for locked events */}
          {event.status === 'locked' && (
            <button
              onClick={() => unlockMutation.mutate()}
              disabled={unlockMutation.isPending}
              className="btn btn-secondary"
            >
              <Lock className="w-4 h-4" />
              Unlock Event
            </button>
          )}
          {/* Show Resolve only for locked events */}
          {event.status === 'locked' && (
            <button
              onClick={() => setShowResolveModal(true)}
              className="btn btn-success"
            >
              <Trophy className="w-4 h-4" />
              Resolve Event
            </button>
          )}
          {!['resolved', 'cancelled'].includes(event.status) && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="btn btn-danger"
            >
              <XCircle className="w-4 h-4" />
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">${totalPool.toLocaleString()}</p>
              <p className="text-xs text-dark-400">Total Pool</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Ticket className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{totalTickets}</p>
              <p className="text-xs text-dark-400">Tickets Sold</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-accent-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{event.options?.length || 0}</p>
              <p className="text-xs text-dark-400">Options</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                {format(new Date(event.eventTime), 'MMM dd, HH:mm')}
              </p>
              <p className="text-xs text-dark-400">Event Time</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-dark-800">
        <div className="flex gap-4">
          {(['overview', 'tickets', 'winners', 'losers'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                'px-4 py-3 text-sm font-medium border-b-2 transition-colors capitalize',
                activeTab === tab
                  ? 'text-primary-400 border-primary-400'
                  : 'text-dark-400 border-transparent hover:text-white'
              )}
            >
              {tab}
              {tab === 'winners' && winnersData?.data?.summary && (
                <span className="ml-2 text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                  {winnersData.data.summary.totalWinners}
                </span>
              )}
              {tab === 'losers' && losersData?.data?.summary && (
                <span className="ml-2 text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
                  {losersData.data.summary.totalLosers}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Event Details */}
          <div className="card p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white">Event Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-dark-400">Category</span>
                <span className="text-white capitalize">{event.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Ticket Price</span>
                <span className="text-white">${event.ticketPrice}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Start Time</span>
                <span className="text-white">{format(new Date(event.startTime), 'PPpp')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Lock Time</span>
                <span className="text-white">{format(new Date(event.lockTime), 'PPpp')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Event Time</span>
                <span className="text-white">{format(new Date(event.eventTime), 'PPpp')}</span>
              </div>
              {event.resolvedAt && (
                <div className="flex justify-between">
                  <span className="text-dark-400">Resolved At</span>
                  <span className="text-white">{format(new Date(event.resolvedAt), 'PPpp')}</span>
                </div>
              )}
              {event.winningOption && (
                <div className="flex justify-between">
                  <span className="text-dark-400">Winning Option</span>
                  <span className="text-green-400 font-medium">{event.winningOption}</span>
                </div>
              )}
            </div>
            {event.description && (
              <div className="pt-4 border-t border-dark-800">
                <p className="text-dark-400 text-sm">{event.description}</p>
              </div>
            )}
          </div>

          {/* Options */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Betting Options</h3>
            <div className="space-y-3">
              {event.options?.map((option) => {
                const percentage = totalPool > 0 ? (option.poolAmount / totalPool) * 100 : 0;
                return (
                  <div
                    key={option.id}
                    className={clsx(
                      'p-4 rounded-lg border',
                      option.isWinner
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-dark-800/50 border-dark-700'
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-dark-700 flex items-center justify-center text-sm font-bold">
                          {option.optionId}
                        </span>
                        <span className="font-medium text-white">{option.label}</span>
                        {option.isWinner && (
                          <Trophy className="w-4 h-4 text-green-400" />
                        )}
                      </div>
                      <span className="text-dark-400 text-sm">
                        {option.ticketsSold} / {option.ticketLimit} tickets
                      </span>
                    </div>
                    <div className="relative h-2 bg-dark-700 rounded-full overflow-hidden">
                      <div
                        className={clsx(
                          'absolute inset-y-0 left-0 rounded-full',
                          option.isWinner ? 'bg-green-500' : 'bg-primary-500'
                        )}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-2 text-sm">
                      <span className="text-dark-400">${option.poolAmount?.toLocaleString()}</span>
                      <span className="text-dark-400">{percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tickets' && (
        <div className="card overflow-hidden">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Serial #</th>
                  <th>User</th>
                  <th>Option</th>
                  <th>Status</th>
                  <th>Price</th>
                  <th>Payout</th>
                  <th>Purchased</th>
                </tr>
              </thead>
              <tbody>
                {tickets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-dark-400">
                      No tickets sold yet
                    </td>
                  </tr>
                ) : (
                  tickets.map((ticket) => (
                    <tr key={ticket.id}>
                      <td className="font-mono text-xs">{ticket.serialNumber}</td>
                      <td>
                        <div>
                          <p className="text-white text-sm">{ticket.user?.email}</p>
                          <p className="text-dark-400 text-xs truncate max-w-[150px]">
                            {ticket.walletAddress}
                          </p>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-neutral">{ticket.optionLabel}</span>
                      </td>
                      <td>
                        <span className={clsx('badge', ticketStatusColors[ticket.status])}>
                          {ticket.status}
                        </span>
                      </td>
                      <td>${ticket.purchasePrice}</td>
                      <td className={ticket.payoutAmount && ticket.payoutAmount > 0 ? 'text-green-400' : 'text-dark-400'}>
                        {ticket.payoutAmount ? `$${ticket.payoutAmount.toFixed(2)}` : '-'}
                      </td>
                      <td className="text-dark-300 text-sm">
                        {format(new Date(ticket.createdAt), 'MMM dd, HH:mm')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'winners' && (
        <div className="space-y-4">
          {/* Winners Summary */}
          {winnersData?.data?.summary && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="card p-4 bg-green-500/5 border-green-500/20">
                <p className="text-2xl font-bold text-green-400">
                  {winnersData.data.summary.totalWinners}
                </p>
                <p className="text-xs text-dark-400">Total Winners</p>
              </div>
              <div className="card p-4">
                <p className="text-2xl font-bold text-white">
                  ${winnersData.data.summary.totalPayout?.toLocaleString()}
                </p>
                <p className="text-xs text-dark-400">Total Payout</p>
              </div>
              <div className="card p-4">
                <p className="text-2xl font-bold text-white">
                  {winnersData.data.summary.claimed}
                </p>
                <p className="text-xs text-dark-400">Claimed</p>
              </div>
              <div className="card p-4 bg-yellow-500/5 border-yellow-500/20">
                <p className="text-2xl font-bold text-yellow-400">
                  {winnersData.data.summary.unclaimed}
                </p>
                <p className="text-xs text-dark-400">Unclaimed</p>
              </div>
            </div>
          )}

          {/* Winners Table */}
          <div className="card overflow-hidden">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Serial #</th>
                    <th>User</th>
                    <th>Wallet</th>
                    <th>Option</th>
                    <th>Payout</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {winners.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-dark-400">
                        {event.status === 'resolved' ? 'No winners for this event' : 'Event not resolved yet'}
                      </td>
                    </tr>
                  ) : (
                    winners.map((ticket) => (
                      <tr key={ticket.id}>
                        <td className="font-mono text-xs">{ticket.serialNumber}</td>
                        <td className="text-white">{ticket.user?.email}</td>
                        <td className="font-mono text-xs text-dark-400 truncate max-w-[150px]">
                          {ticket.walletAddress}
                        </td>
                        <td>
                          <span className="badge badge-success">{ticket.option?.label}</span>
                        </td>
                        <td className="text-green-400 font-medium">
                          ${ticket.payoutAmount?.toFixed(2)}
                        </td>
                        <td>
                          {ticket.claimedAt ? (
                            <span className="badge bg-purple-500/10 text-purple-400 border border-purple-500/20">
                              Claimed
                            </span>
                          ) : (
                            <span className="badge badge-warning">Unclaimed</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'losers' && (
        <div className="space-y-4">
          {/* Losers Summary */}
          {losersData?.data?.summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card p-4 bg-red-500/5 border-red-500/20">
                <p className="text-2xl font-bold text-red-400">
                  {losersData.data.summary.totalLosers}
                </p>
                <p className="text-xs text-dark-400">Total Losers</p>
              </div>
              <div className="card p-4">
                <p className="text-2xl font-bold text-white">
                  ${losersData.data.summary.totalLost?.toLocaleString()}
                </p>
                <p className="text-xs text-dark-400">Total Lost</p>
              </div>
            </div>
          )}

          {/* Losers Table */}
          <div className="card overflow-hidden">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Serial #</th>
                    <th>User</th>
                    <th>Wallet</th>
                    <th>Option</th>
                    <th>Amount Lost</th>
                  </tr>
                </thead>
                <tbody>
                  {losers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-dark-400">
                        {event.status === 'resolved' ? 'No losers for this event' : 'Event not resolved yet'}
                      </td>
                    </tr>
                  ) : (
                    losers.map((ticket) => (
                      <tr key={ticket.id}>
                        <td className="font-mono text-xs">{ticket.serialNumber}</td>
                        <td className="text-white">{ticket.user?.email}</td>
                        <td className="font-mono text-xs text-dark-400 truncate max-w-[150px]">
                          {ticket.walletAddress}
                        </td>
                        <td>
                          <span className="badge badge-error">{ticket.option?.label}</span>
                        </td>
                        <td className="text-red-400">-${ticket.purchasePrice}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {showResolveModal && (
        <ResolveEventModal
          event={event}
          onClose={() => setShowResolveModal(false)}
        />
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <CancelEventModal
          eventId={event.id}
          onClose={() => setShowCancelModal(false)}
        />
      )}
    </div>
  );
}

// Resolve Event Modal
function ResolveEventModal({ event, onClose }: { event: any; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [selectedOption, setSelectedOption] = useState('');
  const [matchResult, setMatchResult] = useState<{
    score: string;
    winner: string;
    isLive: boolean;
    status: string;
  } | null>(null);
  const [loadingResult, setLoadingResult] = useState(false);

  // Fetch match result for sports events
  useState(() => {
    if (event.category === 'sports') {
      setLoadingResult(true);
      api.getMatchResult(event.title)
        .then((result) => {
          if (result.success && result.data) {
            setMatchResult({
              score: result.data.score,
              winner: result.data.winner,
              isLive: result.data.isLive,
              status: result.data.status,
            });
          }
        })
        .catch(() => {
          // Match not found - that's OK
        })
        .finally(() => setLoadingResult(false));
    }
  });

  const resolveMutation = useMutation({
    mutationFn: () => api.resolveEvent(event.id, selectedOption),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'event', event.id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'events'] });
      toast.success(`Event resolved! ${data.data?.winnersCount} winners, $${data.data?.payoutPerTicket?.toFixed(2)} per ticket`);
      onClose();
    },
    onError: () => toast.error('Failed to resolve event'),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Resolve Event</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Select the winning option</p>
        </div>

        {/* Match Result for Sports */}
        {event.category === 'sports' && (
          <div className="px-6 pt-4">
            {loadingResult ? (
              <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800 text-center">
                <p className="text-gray-500 dark:text-gray-400 text-sm">Loading match result...</p>
              </div>
            ) : matchResult ? (
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wider">
                    {matchResult.isLive ? '🔴 LIVE' : '✓ FINISHED'}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{matchResult.status}</span>
                </div>
                <p className="text-lg font-bold text-gray-900 dark:text-white text-center mb-2">
                  {matchResult.score}
                </p>
                <p className={clsx(
                  'text-center font-bold uppercase tracking-wider text-sm px-3 py-1 rounded-full inline-block w-full',
                  matchResult.winner === 'Home Win' && 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
                  matchResult.winner === 'Away Win' && 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
                  matchResult.winner === 'Draw' && 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                )}>
                  {matchResult.winner}
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                <p className="text-yellow-700 dark:text-yellow-400 text-sm text-center">
                  ⚠️ Match result not found. Select winner manually.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="p-6 space-y-4">
          {event.options?.map((option: any) => (
            <button
              key={option.id}
              onClick={() => setSelectedOption(option.optionId)}
              className={clsx(
                'w-full p-4 rounded-lg border text-left transition-all',
                selectedOption === option.optionId
                  ? 'bg-green-100 dark:bg-green-500/20 border-green-500 dark:border-green-400'
                  : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center font-bold text-gray-900 dark:text-white">
                    {option.optionId}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{option.label}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{option.ticketsSold} tickets</p>
                  </div>
                </div>
                {selectedOption === option.optionId && (
                  <CheckCircle className="w-6 h-6 text-green-500 dark:text-green-400" />
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button
            onClick={() => resolveMutation.mutate()}
            disabled={!selectedOption || resolveMutation.isPending}
            className="btn btn-success"
          >
            {resolveMutation.isPending ? 'Resolving...' : 'Confirm Resolution'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Cancel Event Modal
function CancelEventModal({ eventId, onClose }: { eventId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [reason, setReason] = useState('');

  const cancelMutation = useMutation({
    mutationFn: () => api.cancelEvent(eventId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'events'] });
      toast.success('Event cancelled, refunds initiated');
      onClose();
      navigate('/admin/events');
    },
    onError: () => toast.error('Failed to cancel event'),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-red-600 dark:text-red-400">Cancel Event</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">This will refund all ticket holders</p>
        </div>

        <div className="p-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cancellation Reason</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 min-h-[100px]"
            placeholder="Enter reason for cancellation..."
            required
          />
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button onClick={onClose} className="btn btn-secondary">
            Go Back
          </button>
          <button
            onClick={() => cancelMutation.mutate()}
            disabled={!reason.trim() || cancelMutation.isPending}
            className="btn btn-danger"
          >
            {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Event'}
          </button>
        </div>
      </div>
    </div>
  );
}
