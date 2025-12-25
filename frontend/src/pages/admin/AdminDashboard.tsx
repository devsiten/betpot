import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Calendar,
  Ticket,
  DollarSign,
  TrendingUp,
  Clock,
  Trophy,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { format, formatDistanceToNow } from 'date-fns';
import { api } from '@/services/api';
import clsx from 'clsx';

function StatCard({
  icon: Icon,
  label,
  value,
  change,
  changeType = 'neutral',
  loading = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  change?: string;
  changeType?: 'up' | 'down' | 'neutral';
  loading?: boolean;
}) {
  return (
    <div className="card p-6">
      <div className="flex items-start justify-between">
        <div className={clsx(
          'w-12 h-12 rounded-xl flex items-center justify-center',
          'bg-gradient-to-br from-brand-100 to-positive-100 border border-brand-200'
        )}>
          <Icon className="w-6 h-6 text-brand-600" />
        </div>
        {change && (
          <div className={clsx(
            'flex items-center gap-1 text-sm font-medium',
            changeType === 'up' && 'text-positive-600',
            changeType === 'down' && 'text-negative-500',
            changeType === 'neutral' && 'text-text-muted'
          )}>
            {changeType === 'up' && <ArrowUpRight className="w-4 h-4" />}
            {changeType === 'down' && <ArrowDownRight className="w-4 h-4" />}
            {change}
          </div>
        )}
      </div>
      <div className="mt-4">
        {loading ? (
          <div className="h-8 w-24 bg-background-secondary dark:bg-gray-800 animate-pulse rounded" />
        ) : (
          <p className="text-3xl font-bold text-text-primary dark:text-white">{value}</p>
        )}
        <p className="text-sm text-text-muted dark:text-gray-400 mt-1">{label}</p>
      </div>
    </div>
  );
}

export function AdminDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => api.getAdminDashboard(),
    refetchInterval: 30000,
  });

  const dashboard = data?.data;

  const chartData = dashboard?.salesTrend?.map(item => ({
    date: format(new Date(item.date), 'MMM dd'),
    tickets: item.ticketCount,
    volume: item.volume,
  })) || [];

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-negative-500 mx-auto mb-4" />
          <p className="text-text-primary dark:text-white font-semibold mb-2">Failed to load dashboard data</p>
          <p className="text-text-muted dark:text-gray-400 text-sm">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary dark:text-white">Dashboard</h1>
        <p className="text-text-secondary dark:text-gray-300 mt-1">Overview of your platform performance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Users"
          value={dashboard?.overview.totalUsers?.toLocaleString() || 0}
          loading={isLoading}
        />
        <StatCard
          icon={Calendar}
          label="Active Events"
          value={dashboard?.overview.activeEvents || 0}
          change={`${dashboard?.overview.pendingResolution || 0} pending`}
          loading={isLoading}
        />
        <StatCard
          icon={Ticket}
          label="Total Tickets"
          value={dashboard?.overview.totalTickets?.toLocaleString() || 0}
          change={`+${dashboard?.ticketStats.today || 0} today`}
          changeType="up"
          loading={isLoading}
        />
        <StatCard
          icon={DollarSign}
          label="Total Volume"
          value={`$${(dashboard?.overview.totalVolume || 0).toLocaleString()}`}
          loading={isLoading}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={Trophy}
          label="Total Winners"
          value={dashboard?.overview.totalWinners?.toLocaleString() || 0}
          loading={isLoading}
        />
        <StatCard
          icon={TrendingUp}
          label="Total Payouts"
          value={`$${(dashboard?.overview.totalPayouts || 0).toLocaleString()}`}
          loading={isLoading}
        />
        <StatCard
          icon={DollarSign}
          label="Platform Fees Earned"
          value={`$${((dashboard?.overview.totalVolume || 0) * 0.01).toFixed(2)}`}
          change="1% of volume"
          changeType="up"
          loading={isLoading}
        />
        <StatCard
          icon={Clock}
          label="Events Pending Resolution"
          value={dashboard?.overview.pendingResolution || 0}
          loading={isLoading}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ticket Sales Chart */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Ticket Sales (7 Days)</h3>
          <div className="h-64">
            {isLoading ? (
              <div className="h-full bg-background-secondary animate-pulse rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="ticketGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#A78BFA" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#A78BFA" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="date" stroke="#6B7280" fontSize={12} />
                  <YAxis stroke="#6B7280" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#1F2937' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="tickets"
                    stroke="#A78BFA"
                    fillOpacity={1}
                    fill="url(#ticketGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Volume Chart */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Volume (7 Days)</h3>
          <div className="h-64">
            {isLoading ? (
              <div className="h-full bg-background-secondary animate-pulse rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="date" stroke="#6B7280" fontSize={12} />
                  <YAxis stroke="#6B7280" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#1F2937' }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Volume']}
                  />
                  <Bar dataKey="volume" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity & Top Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Recent Admin Activity</h3>
          <div className="space-y-4">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-background-secondary animate-pulse rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 w-32 bg-background-secondary animate-pulse rounded mb-2" />
                    <div className="h-3 w-24 bg-background-secondary animate-pulse rounded" />
                  </div>
                </div>
              ))
            ) : dashboard?.recentActivity?.length ? (
              dashboard.recentActivity.map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-background-secondary transition-colors">
                  <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0 border border-brand-200">
                    <Calendar className="w-5 h-5 text-brand-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary">
                      <span className="font-medium">{log.admin?.email || 'Unknown'}</span>
                      {' '}
                      <span className="text-text-secondary">{log.action.replace(/_/g, ' ').toLowerCase()}</span>
                    </p>
                    <p className="text-xs text-text-muted mt-1">
                      {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-text-muted text-center py-8">No recent activity</p>
            )}
          </div>
        </div>

        {/* Top Events */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Active Events</h3>
          <div className="space-y-4">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-12 w-full bg-background-secondary animate-pulse rounded-lg" />
                </div>
              ))
            ) : dashboard?.topEvents?.length ? (
              dashboard.topEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-background-secondary transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{event.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={clsx(
                        'badge text-xs',
                        event.status === 'open' && 'badge-success',
                        event.status === 'locked' && 'badge-warning',
                        event.status === 'upcoming' && 'badge-info'
                      )}>
                        {event.status}
                      </span>
                      <span className="text-xs text-text-muted">
                        {event.ticketCount || 0} tickets
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-text-primary">
                      ${(event.totalPool || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-text-muted">pool</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-text-muted text-center py-8">No active events</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Ticket Stats</h3>
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-text-primary">{dashboard?.ticketStats.today || 0}</p>
            <p className="text-sm text-text-muted mt-1">Today</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-text-primary">{dashboard?.ticketStats.week || 0}</p>
            <p className="text-sm text-text-muted mt-1">This Week</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-text-primary">{dashboard?.ticketStats.month || 0}</p>
            <p className="text-sm text-text-muted mt-1">This Month</p>
          </div>
        </div>
      </div>
    </div>
  );
}
