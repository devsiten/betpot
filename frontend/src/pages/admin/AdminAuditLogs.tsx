import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Shield, Clock, User, Activity, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { api } from '@/services/api';
import clsx from 'clsx';

const actionColors: Record<string, string> = {
    UPDATE_EVENT: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    LOCK_EVENT: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
    UNLOCK_EVENT: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    RESOLVE_EVENT: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    CANCEL_EVENT: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    CREATE_EVENT: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400',
    DELETE_EVENT: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
};

const actionLabels: Record<string, string> = {
    UPDATE_EVENT: 'Updated Event',
    LOCK_EVENT: 'Locked Event',
    UNLOCK_EVENT: 'Unlocked Event',
    RESOLVE_EVENT: 'Resolved Event',
    CANCEL_EVENT: 'Cancelled Event',
    CREATE_EVENT: 'Created Event',
    DELETE_EVENT: 'Deleted Event',
};

export function AdminAuditLogs() {
    const [page, setPage] = useState(1);
    const [actionFilter, setActionFilter] = useState('');

    const { data, isLoading } = useQuery({
        queryKey: ['admin', 'audit-logs', page, actionFilter],
        queryFn: () => api.getAdminAuditLogs({ page, limit: 20, action: actionFilter || undefined }),
    });

    const logs = data?.data || [];
    const pagination = data?.pagination;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Shield className="w-6 h-6 text-purple-500" />
                        Audit Logs
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Track all admin actions</p>
                </div>
            </div>

            {/* Filter */}
            <div className="card p-4">
                <div className="flex items-center gap-4">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <select
                        value={actionFilter}
                        onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
                        className="input max-w-xs"
                    >
                        <option value="">All Actions</option>
                        <option value="CREATE_EVENT">Create Event</option>
                        <option value="UPDATE_EVENT">Update Event</option>
                        <option value="LOCK_EVENT">Lock Event</option>
                        <option value="UNLOCK_EVENT">Unlock Event</option>
                        <option value="RESOLVE_EVENT">Resolve Event</option>
                        <option value="CANCEL_EVENT">Cancel Event</option>
                    </select>
                </div>
            </div>

            {/* Logs Table */}
            <div className="card overflow-hidden">
                {isLoading ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        Loading audit logs...
                    </div>
                ) : logs.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        No audit logs found
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Action</th>
                                    <th>Entity</th>
                                    <th>Admin ID</th>
                                    <th>IP Address</th>
                                    <th>Time</th>
                                    <th>Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log: any) => (
                                    <tr key={log.id}>
                                        <td>
                                            <span className={clsx('badge', actionColors[log.action] || 'bg-gray-100 dark:bg-gray-800')}>
                                                {actionLabels[log.action] || log.action}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <Activity className="w-4 h-4 text-gray-400" />
                                                <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                                                    {log.entityType}: {log.entityId?.slice(0, 8)}...
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <User className="w-4 h-4 text-gray-400" />
                                                <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                                                    {log.adminId?.slice(0, 8)}...
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                                {log.ipAddress || 'N/A'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-gray-400" />
                                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                                    {format(new Date(log.createdAt), 'MMM d, HH:mm:ss')}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            {log.details ? (
                                                <button
                                                    onClick={() => alert(JSON.stringify(JSON.parse(log.details), null, 2))}
                                                    className="text-xs text-blue-500 hover:underline"
                                                >
                                                    View Details
                                                </button>
                                            ) : (
                                                <span className="text-xs text-gray-400">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {pagination && pagination.pages > 1 && (
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            Page {pagination.page} of {pagination.pages} ({pagination.total} logs)
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className="btn btn-secondary btn-sm"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                                disabled={page >= pagination.pages}
                                className="btn btn-secondary btn-sm"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
