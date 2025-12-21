import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Ticket, 
  Trophy, 
  XCircle, 
  Clock, 
  Wallet,
  DollarSign,
  TrendingUp,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import clsx from 'clsx';

export function MyTicketsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'won' | 'lost'>('all');

  const { data: statsData } = useQuery({
    queryKey: ['my-stats'],
    queryFn: () => api.getMyStats(),
  });

  const { data: ticketsData, isLoading } = useQuery({
    queryKey: ['my-tickets', activeTab],
    queryFn: () => api.getMyTickets({
      status: activeTab === 'all' ? undefined : activeTab,
      limit: 50,
    }),
  });

  const { data: claimableData } = useQuery({
    queryKey: ['claimable-tickets'],
    queryFn: () => api.getClaimableTickets(),
  });

  const claimMutation = useMutation({
    mutationFn: (ticketId: string) => 
      api.claimTicket(ticketId, user?.walletAddress || '', 'signature_placeholder'),
    onSuccess: () => {
      toast.success('Payout claimed successfully!');
      queryClient.invalidateQueries({ queryKey: ['my-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['claimable-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['my-stats'] });
    },
    onError: () => toast.error('Failed to claim payout'),
  });

  const stats = statsData?.data;
  const tickets = ticketsData?.data || [];
  const claimable = claimableData?.data;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">My Tickets</h1>
        <p className="text-dark-400 mt-1">Track your bets and winnings</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
              <Ticket className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats?.totalTickets || 0}</p>
              <p className="text-sm text-dark-400">Total Tickets</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats?.wonTickets || 0}</p>
              <p className="text-sm text-dark-400">Wins</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-500/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-accent-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">${(stats?.totalWinnings || 0).toFixed(2)}</p>
              <p className="text-sm text-dark-400">Total Won</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {stats?.totalTickets ? ((stats.wonTickets / stats.totalTickets) * 100).toFixed(0) : 0}%
              </p>
              <p className="text-sm text-dark-400">Win Rate</p>
            </div>
          </div>
        </div>
      </div>

      {/* Claimable Alert */}
      {claimable && claimable.count > 0 && (
        <div className="card p-6 mb-8 bg-gradient-to-r from-green-500/10 to-accent-500/10 border-green-500/50">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-lg font-semibold text-white">
                  You have {claimable.count} unclaimed winning{claimable.count > 1 ? 's' : ''}!
                </p>
                <p className="text-green-400 font-bold text-xl">
                  ${claimable.totalClaimable.toFixed(2)} available to claim
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                claimable.tickets.forEach(t => claimMutation.mutate(t.id));
              }}
              disabled={claimMutation.isPending}
              className="btn btn-success"
            >
              <Wallet className="w-4 h-4" />
              Claim All
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-dark-800 mb-6">
        <nav className="flex gap-4">
          {[
            { key: 'all', label: 'All Tickets' },
            { key: 'active', label: 'Active' },
            { key: 'won', label: 'Won' },
            { key: 'lost', label: 'Lost' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={clsx(
                'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.key
                  ? 'text-primary-400 border-primary-400'
                  : 'text-dark-400 border-transparent hover:text-white'
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tickets List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card p-4">
              <div className="h-16 bg-dark-800 animate-pulse rounded" />
            </div>
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-16">
          <Ticket className="w-16 h-16 text-dark-600 mx-auto mb-4" />
          <p className="text-dark-400 text-lg">No tickets found</p>
          <Link to="/events" className="btn btn-primary mt-4">
            Browse Events
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <div 
              key={ticket.id}
              className={clsx(
                'card p-4 border-l-4',
                ticket.status === 'won' && 'border-l-green-500',
                ticket.status === 'lost' && 'border-l-red-500',
                ticket.status === 'active' && 'border-l-blue-500',
                ticket.status === 'claimed' && 'border-l-green-500',
                ticket.status === 'refunded' && 'border-l-yellow-500'
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={clsx(
                      'badge',
                      ticket.status === 'won' && 'badge-success',
                      ticket.status === 'lost' && 'badge-error',
                      ticket.status === 'active' && 'badge-info',
                      ticket.status === 'claimed' && 'badge-success',
                      ticket.status === 'refunded' && 'badge-warning'
                    )}>
                      {ticket.status === 'won' && <Trophy className="w-3 h-3 mr-1" />}
                      {ticket.status === 'lost' && <XCircle className="w-3 h-3 mr-1" />}
                      {ticket.status === 'active' && <Clock className="w-3 h-3 mr-1" />}
                      {ticket.status === 'claimed' && <CheckCircle className="w-3 h-3 mr-1" />}
                      {ticket.status}
                    </span>
                    <span className="text-sm text-dark-500 font-mono">{ticket.serialNumber}</span>
                  </div>
                  
                  <Link 
                    to={`/events/${ticket.eventId}`}
                    className="text-lg font-semibold text-white hover:text-primary-400 transition-colors"
                  >
                    {ticket.event?.title || 'Unknown Event'}
                    <ExternalLink className="w-4 h-4 inline ml-2" />
                  </Link>
                  
                  <div className="flex items-center gap-4 mt-2 text-sm text-dark-400">
                    <span>Option: <span className="text-white">{ticket.optionLabel}</span></span>
                    <span>Paid: <span className="text-white">${ticket.purchasePrice}</span></span>
                    <span>{format(new Date(ticket.createdAt), 'MMM dd, yyyy')}</span>
                  </div>
                </div>

                <div className="text-right">
                  {ticket.status === 'won' && !ticket.claimedAt && (
                    <button
                      onClick={() => claimMutation.mutate(ticket.id)}
                      disabled={claimMutation.isPending}
                      className="btn btn-success btn-sm mb-2"
                    >
                      <Wallet className="w-4 h-4" />
                      Claim
                    </button>
                  )}
                  {ticket.payoutAmount !== undefined && ticket.payoutAmount > 0 && (
                    <p className={clsx(
                      'text-xl font-bold',
                      ticket.status === 'won' || ticket.status === 'claimed' ? 'text-green-400' : 'text-white'
                    )}>
                      +${ticket.payoutAmount.toFixed(2)}
                    </p>
                  )}
                  {ticket.status === 'lost' && (
                    <p className="text-red-400 font-medium">-${ticket.purchasePrice}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
