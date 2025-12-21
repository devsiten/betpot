import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Shield,
  User,
  Ticket,
  Trophy,
  DollarSign,
  MoreVertical,
} from 'lucide-react';
import { format } from 'date-fns';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const roleColors = {
  user: 'badge-neutral',
  admin: 'badge-info',
};

const roleIcons = {
  user: User,
  admin: Shield,
};

export function AdminUsers() {
  const queryClient = useQueryClient();
  const { user: currentUser, isAdmin } = useAuthStore();
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    page: 1,
  });
  const [actionMenu, setActionMenu] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', filters],
    queryFn: () => api.getAdminUsers({
      search: filters.search || undefined,
      role: filters.role || undefined,
      page: filters.page,
      limit: 50,
    }),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      api.updateUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('User role updated');
    },
    onError: () => toast.error('Failed to update role'),
  });

  const users = data?.data || [];
  const pagination = data?.pagination;

  const handleRoleChange = (userId: string, newRole: string) => {
    if (!isAdmin()) {
      toast.error('Only admins can change roles');
      return;
    }
    updateRoleMutation.mutate({ userId, role: newRole });
    setActionMenu(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Users</h1>
        <p className="text-dark-400 mt-1">Manage platform users and permissions</p>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
            <input
              type="text"
              placeholder="Search by email or wallet..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
              className="input pl-10"
            />
          </div>

          {/* Role Filter */}
          <select
            value={filters.role}
            onChange={(e) => setFilters({ ...filters, role: e.target.value, page: 1 })}
            className="input w-full md:w-40"
          >
            <option value="">All Roles</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Wallet</th>
                <th>Stats</th>
                <th>Joined</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7}>
                      <div className="h-16 bg-dark-800 animate-pulse rounded" />
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-dark-400">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const RoleIcon = roleIcons[user.role] || User;
                  const isCurrentUser = user.id === currentUser?.id;

                  return (
                    <tr key={user.id} className="group">
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold">
                            {user.email?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-white">
                              {user.email}
                              {isCurrentUser && (
                                <span className="ml-2 text-xs text-primary-400">(You)</span>
                              )}
                            </p>
                            <p className="text-xs text-dark-400 font-mono">{user.id}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <RoleIcon className="w-4 h-4 text-dark-400" />
                          <span className={clsx('badge', roleColors[user.role])}>
                            {user.role}
                          </span>
                        </div>
                      </td>
                      <td>
                        {user.walletAddress ? (
                          <span className="font-mono text-xs text-dark-300 truncate block max-w-[150px]">
                            {user.walletAddress}
                          </span>
                        ) : (
                          <span className="text-dark-500 text-sm">Not connected</span>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1" title="Total Tickets">
                            <Ticket className="w-4 h-4 text-dark-400" />
                            <span>{user.stats?.totalTickets || 0}</span>
                          </div>
                          <div className="flex items-center gap-1 text-green-400" title="Wins">
                            <Trophy className="w-4 h-4" />
                            <span>{user.stats?.totalWins || 0}</span>
                          </div>
                          <div className="flex items-center gap-1" title="Total Won">
                            <DollarSign className="w-4 h-4 text-dark-400" />
                            <span>${(user.stats?.totalWon || 0).toLocaleString()}</span>
                          </div>
                        </div>
                      </td>
                      <td className="text-dark-300 text-sm">
                        {user.createdAt && format(new Date(user.createdAt), 'MMM dd, yyyy')}
                      </td>
                      <td className="text-dark-300 text-sm">
                        {user.lastLogin && format(new Date(user.lastLogin), 'MMM dd, HH:mm')}
                      </td>
                      <td>
                        <div className="relative">
                          <button
                            onClick={() => setActionMenu(actionMenu === user.id ? null : user.id)}
                            className="p-2 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-white"
                            disabled={!isAdmin() || isCurrentUser}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {actionMenu === user.id && isAdmin() && !isCurrentUser && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setActionMenu(null)}
                              />
                              <div className="absolute right-0 top-full mt-1 w-48 bg-dark-800 border border-dark-700 rounded-lg shadow-xl z-20 py-1">
                                <div className="px-4 py-2 text-xs text-dark-400 uppercase">
                                  Change Role
                                </div>
                                <button
                                  onClick={() => handleRoleChange(user.id, 'user')}
                                  disabled={user.role === 'user'}
                                  className={clsx(
                                    'w-full px-4 py-2 text-left text-sm flex items-center gap-2',
                                    user.role === 'user'
                                      ? 'text-dark-500 cursor-not-allowed'
                                      : 'text-white hover:bg-dark-700'
                                  )}
                                >
                                  <User className="w-4 h-4" />
                                  User
                                </button>
                                <button
                                  onClick={() => handleRoleChange(user.id, 'admin')}
                                  disabled={user.role === 'admin'}
                                  className={clsx(
                                    'w-full px-4 py-2 text-left text-sm flex items-center gap-2',
                                    user.role === 'admin'
                                      ? 'text-dark-500 cursor-not-allowed'
                                      : 'text-white hover:bg-dark-700'
                                  )}
                                >
                                  <Shield className="w-4 h-4" />
                                  Admin
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
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
              {pagination.total} users
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

      {/* Role Legend */}
      <div className="card p-4">
        <h3 className="text-sm font-medium text-white mb-3">Role Permissions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-start gap-2">
            <User className="w-5 h-5 text-dark-400 mt-0.5" />
            <div>
              <p className="font-medium text-white">User</p>
              <p className="text-dark-400">Can purchase tickets and claim winnings</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Shield className="w-5 h-5 text-blue-400 mt-0.5" />
            <div>
              <p className="font-medium text-white">Admin</p>
              <p className="text-dark-400">Full access: manage events, users, settings, and platform</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
