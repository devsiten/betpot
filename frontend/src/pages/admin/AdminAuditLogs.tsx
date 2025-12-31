import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Shield, Clock, User, Activity, ChevronLeft, ChevronRight, Filter, X, FileText } from 'lucide-react';
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

// Details Modal Component - now accepts full log object
function DetailsModal({ log, onClose }: { log: any; onClose: () => void }) {
    let parsedDetails: any = {};
    try {
        parsedDetails = log.details ? JSON.parse(log.details) : {};
    } catch {
        parsedDetails = { raw: log.details };
    }

    // Combine admin info with details
    const allDetails = {
        'Admin ID': log.adminId || 'N/A',
        'Admin Wallet': log.admin?.walletAddress || log.adminWallet || 'N/A',
        'Admin Username': log.admin?.username || log.adminUsername || 'N/A',
        'Action': log.action,
        'Entity Type': log.entityType,
        'Entity ID': log.entityId,
        'IP Address': log.ipAddress || 'N/A',
        'User Agent': log.userAgent || 'N/A',
        'Timestamp': log.createdAt ? new Date(log.createdAt).toLocaleString() : 'N/A',
        ...parsedDetails, // Spread the parsed details
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl max-h-[80vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-500" />
                        Action Details
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                <div className="p-4 overflow-y-auto max-h-[60vh]">
                    <div className="space-y-3">
                        {Object.entries(allDetails).map(([key, value]) => (
                            <div key={key} className="flex flex-col gap-1">
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}
                                </span>
                                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 font-mono text-sm text-gray-700 dark:text-gray-300 break-all">
                                    {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value || 'N/A')}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <button onClick={onClose} className="btn btn-secondary w-full">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

export function AdminAuditLogs() {
    const [page, setPage] = useState(1);
    const [actionFilter, setActionFilter] = useState('');
    const [selectedLog, setSelectedLog] = useState<any>(null);

    const { data, isLoading } = useQuery({
        queryKey: ['admin', 'audit-logs', page, actionFilter],
        queryFn: () => api.getAdminAuditLogs({ page, limit: 20, action: actionFilter || undefined }),
    });

    const logs = data?.data || [];
    const pagination = data?.pagination;

    return (
        <div className="space-y-6">
            {/* Details Modal */}
            {selectedLog && (
                <DetailsModal log={selectedLog} onClose={() => setSelectedLog(null)} />
            )}

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
                                            <button
                                                onClick={() => setSelectedLog(log)}
                                                className="text-xs text-blue-500 hover:text-blue-600 hover:underline font-medium"
                                            >
                                                View Details
                                            </button>
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
