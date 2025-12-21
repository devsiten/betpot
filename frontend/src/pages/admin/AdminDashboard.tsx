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
          'bg-gradient-to-br from-primary-500/20 to-accent-500/20'
        )}>
          <Icon className="w-6 h-6 text-primary-400" />
        </div>
        {change && (
          <div className={clsx(
            'flex items-center gap-1 text-sm font-medium',
            changeType === 'up' && 'text-green-400',
            changeType === 'down' && 'text-red-400',
            changeType === 'neutral' && 'text-dark-400'
          )}>
            {changeType === 'up' && <ArrowUpRight className="w-4 h-4" />}
            {changeType === 'down' && <ArrowDownRight className="w-4 h-4" />}
            {change}
          </div>
        )}
      </div>
      <div className="mt-4">
        {loading ? (
          <div className="h-8 w-24 bg-dark-800 animate-pulse rounded" />
        ) : (
          <p className="text-3xl font-bold text-white">{value}</p>
        )}
        <p className="text-sm text-dark-400 mt-1">{label}</p>
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
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-dark-400">Failed to load dashboard data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-dark-400 mt-1">Overview of your platform performance</p>
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
          <h3 className="text-lg font-semibold text-white mb-4">Ticket Sales (7 Days)</h3>
          <div className="h-64">
            {isLoading ? (
              <div className="h-full bg-dark-800 animate-pulse rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="ticketGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="tickets" 
                    stroke="#0ea5e9" 
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
          <h3 className="text-lg font-semibold text-white mb-4">Volume (7 Days)</h3>
          <div className="h-64">
            {isLoading ? (
              <div className="h-full bg-dark-800 animate-pulse rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#fff' }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Volume']}
                  />
                  <Bar dataKey="volume" fill="#d946ef" radius={[4, 4, 0, 0]} />
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
          <h3 className="text-lg font-semibold text-white mb-4">Recent Admin Activity</h3>
          <div className="space-y-4">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-dark-800 animate-pulse rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 w-32 bg-dark-800 animate-pulse rounded mb-2" />
                    <div className="h-3 w-24 bg-dark-800 animate-pulse rounded" />
                  </div>
                </div>
              ))
            ) : dashboard?.recentActivity?.length ? (
              dashboard.recentActivity.map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-dark-800/50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-primary-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">
                      <span className="font-medium">{log.admin?.email || 'Unknown'}</span>
                      {' '}
                      <span className="text-dark-400">{log.action.replace(/_/g, ' ').toLowerCase()}</span>
                    </p>
                    <p className="text-xs text-dark-500 mt-1">
                      {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-dark-400 text-center py-8">No recent activity</p>
            )}
          </div>
        </div>

        {/* Top Events */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Active Events</h3>
          <div className="space-y-4">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-12 w-full bg-dark-800 animate-pulse rounded-lg" />
                </div>
              ))
            ) : dashboard?.topEvents?.length ? (
              dashboard.topEvents.map((event) => (
                <div 
                  key={event.id} 
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-dark-800/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{event.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={clsx(
                        'badge text-xs',
                        event.status === 'open' && 'badge-success',
                        event.status === 'locked' && 'badge-warning',
                        event.status === 'upcoming' && 'badge-info'
                      )}>
                        {event.status}
                      </span>
                      <span className="text-xs text-dark-400">
                        {event.ticketCount || 0} tickets
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">
                      ${(event.totalPool || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-dark-400">pool</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-dark-400 text-center py-8">No active events</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Ticket Stats</h3>
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-white">{dashboard?.ticketStats.today || 0}</p>
            <p className="text-sm text-dark-400 mt-1">Today</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-white">{dashboard?.ticketStats.week || 0}</p>
            <p className="text-sm text-dark-400 mt-1">This Week</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-white">{dashboard?.ticketStats.month || 0}</p>
            <p className="text-sm text-dark-400 mt-1">This Month</p>
          </div>
        </div>
      </div>
    </div>
  );
}
