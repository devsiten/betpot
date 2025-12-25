import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Trophy,
  XCircle,
  Clock,
  Ticket,
  Download,
  Eye,
} from 'lucide-react';
import { format } from 'date-fns';
import { api } from '@/services/api';
import { TicketStatus } from '@/types';
import clsx from 'clsx';

const statusColors: Record<TicketStatus, string> = {
  active: 'badge-info',
  won: 'badge-success',
  lost: 'badge-error',
  claimed: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  refunded: 'badge-warning',
};

const quickFilters = [
  { label: 'All Bets', value: 'all', icon: Ticket },
  { label: 'Winners', value: 'winners', icon: Trophy },
  { label: 'Losers', value: 'losers', icon: XCircle },
  { label: 'Unclaimed', value: 'unclaimed', icon: Clock },
];

export function AdminBets() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    eventId: '',
    userId: '',
    status: '',
    walletAddress: '',
    quickFilter: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc' as 'asc' | 'desc',
    page: 1,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'bets', filters],
    queryFn: () => api.getAdminBets({
      eventId: filters.eventId || undefined,
      userId: filters.userId || undefined,
      status: filters.status as TicketStatus || undefined,
      walletAddress: filters.walletAddress || undefined,
      winnersOnly: filters.quickFilter === 'winners' ? true : undefined,
      losersOnly: filters.quickFilter === 'losers' ? true : undefined,
      unclaimedOnly: filters.quickFilter === 'unclaimed' ? true : undefined,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
      page: filters.page,
      limit: 50,
    }),
  });

  const tickets = data?.data || [];
  const pagination = data?.pagination;

  // Calculate summary stats
  const stats = {
    total: tickets.length,
    won: tickets.filter(t => t.status === 'won').length,
    lost: tickets.filter(t => t.status === 'lost').length,
    unclaimed: tickets.filter(t => t.status === 'won' && !t.claimedAt).length,
    totalPayout: tickets.filter(t => t.status === 'won').reduce((sum, t) => sum + (t.payoutAmount || 0), 0),
  };

  const handleQuickFilter = (value: string) => {
    setFilters({
      ...filters,
      quickFilter: value,
      status: '',
      page: 1,
    });
  };

  const toggleSort = (field: string) => {
    if (filters.sortBy === field) {
      setFilters({
        ...filters,
        sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc',
      });
    } else {
      setFilters({ ...filters, sortBy: field, sortOrder: 'desc' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary dark:text-white">Bets & Winners</h1>
          <p className="text-text-muted dark:text-gray-400 mt-1">Manage all tickets and payouts</p>
        </div>
        <button className="btn btn-secondary">
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card p-4 dark:bg-gray-900 dark:border-gray-800">
          <p className="text-2xl font-bold text-text-primary dark:text-white">{pagination?.total || tickets.length || 0}</p>
          <p className="text-xs text-text-muted dark:text-gray-400">Total Bets</p>
        </div>
        <div className="card p-4 bg-green-500/5 dark:bg-green-900/20 border-green-500/20 dark:border-green-700">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.won}</p>
          <p className="text-xs text-text-muted dark:text-gray-400">Winners (page)</p>
        </div>
        <div className="card p-4 bg-red-500/5 dark:bg-red-900/20 border-red-500/20 dark:border-red-700">
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.lost}</p>
          <p className="text-xs text-text-muted dark:text-gray-400">Losers (page)</p>
        </div>
        <div className="card p-4 bg-yellow-500/5 dark:bg-yellow-900/20 border-yellow-500/20 dark:border-yellow-700">
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.unclaimed}</p>
          <p className="text-xs text-text-muted dark:text-gray-400">Unclaimed</p>
        </div>
        <div className="card p-4 dark:bg-gray-900 dark:border-gray-800">
          <p className="text-2xl font-bold text-text-primary dark:text-white">${stats.totalPayout.toLocaleString()}</p>
          <p className="text-xs text-text-muted dark:text-gray-400">Payout (page)</p>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        {quickFilters.map((qf) => (
          <button
            key={qf.value}
            onClick={() => handleQuickFilter(qf.value)}
            className={clsx(
              'btn text-sm',
              filters.quickFilter === qf.value
                ? 'btn-primary'
                : 'btn-secondary'
            )}
          >
            <qf.icon className="w-4 h-4" />
            {qf.label}
          </button>
        ))}
      </div>

      {/* Advanced Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Event ID */}
          <div>
            <label className="label">Event ID</label>
            <input
              type="text"
              value={filters.eventId}
              onChange={(e) => setFilters({ ...filters, eventId: e.target.value, page: 1 })}
              className="input"
              placeholder="Filter by event..."
            />
          </div>

          {/* User ID */}
          <div>
            <label className="label">User ID</label>
            <input
              type="text"
              value={filters.userId}
              onChange={(e) => setFilters({ ...filters, userId: e.target.value, page: 1 })}
              className="input"
              placeholder="Filter by user..."
            />
          </div>

          {/* Wallet */}
          <div>
            <label className="label">Wallet Address</label>
            <input
              type="text"
              value={filters.walletAddress}
              onChange={(e) => setFilters({ ...filters, walletAddress: e.target.value, page: 1 })}
              className="input"
              placeholder="Filter by wallet..."
            />
          </div>

          {/* Status */}
          <div>
            <label className="label">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value, quickFilter: 'all', page: 1 })}
              className="input"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
              <option value="claimed">Claimed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bets Table */}
      <div className="card overflow-hidden">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th
                  className="cursor-pointer hover:text-white"
                  onClick={() => toggleSort('serialNumber')}
                >
                  Serial # {filters.sortBy === 'serialNumber' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th>Event</th>
                <th>User</th>
                <th>Option</th>
                <th>Status</th>
                <th
                  className="cursor-pointer hover:text-white"
                  onClick={() => toggleSort('purchasePrice')}
                >
                  Price {filters.sortBy === 'purchasePrice' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="cursor-pointer hover:text-white"
                  onClick={() => toggleSort('payoutAmount')}
                >
                  Payout {filters.sortBy === 'payoutAmount' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="cursor-pointer hover:text-white"
                  onClick={() => toggleSort('createdAt')}
                >
                  Date {filters.sortBy === 'createdAt' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={9}>
                      <div className="h-12 bg-dark-800 animate-pulse rounded" />
                    </td>
                  </tr>
                ))
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-dark-400">
                    No bets found matching your filters
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <tr key={ticket.id} className="group">
                    <td className="font-mono text-xs">{ticket.serialNumber}</td>
                    <td>
                      <div className="max-w-[150px]">
                        <p className="text-white text-sm truncate">{ticket.event?.title}</p>
                        <p className="text-dark-400 text-xs truncate">{ticket.eventId}</p>
                      </div>
                    </td>
                    <td>
                      <div>
                        <p className="text-white text-sm">{ticket.user?.email}</p>
                        <p className="text-dark-400 text-xs truncate max-w-[120px]">
                          {ticket.walletAddress}
                        </p>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className={clsx(
                          'badge',
                          ticket.option?.isWinner ? 'badge-success' : 'badge-neutral'
                        )}>
                          {ticket.optionLabel}
                        </span>
                        {ticket.option?.isWinner && (
                          <Trophy className="w-3 h-3 text-green-400" />
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={clsx('badge', statusColors[ticket.status])}>
                        {ticket.status}
                      </span>
                    </td>
                    <td>${ticket.purchasePrice}</td>
                    <td className={clsx(
                      ticket.payoutAmount && ticket.payoutAmount > 0
                        ? 'text-green-400 font-medium'
                        : 'text-dark-400'
                    )}>
                      {ticket.payoutAmount ? `$${ticket.payoutAmount.toFixed(2)}` : '-'}
                    </td>
                    <td className="text-dark-300 text-sm">
                      {format(new Date(ticket.createdAt), 'MMM dd, HH:mm')}
                    </td>
                    <td>
                      <button
                        onClick={() => navigate(`/admin/events/${ticket.eventId}`)}
                        className="p-2 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-white"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-dark-800">
            <p className="text-sm text-dark-400">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} bets
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                disabled={filters.page === 1}
                className="btn btn-secondary text-sm"
              >
                Previous
              </button>
              <span className="flex items-center px-4 text-dark-400">
                Page {filters.page} of {pagination.pages}
              </span>
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
    </div>
  );
}
