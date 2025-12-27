import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Trophy, ArrowLeft, DollarSign, Ticket, RefreshCw, Calendar, CheckCircle, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { api } from '@/services/api';
import clsx from 'clsx';

interface ResolvedEvent {
    id: string;
    title: string;
    status: 'resolved' | 'cancelled';
    resolvedAt: string | null;
    winningOption?: {
        label: string;
        ticketsSold: number;
        poolAmount: number;
    };
    totalPool: number;
    totalTickets: number;
    winningTickets: number;
    losingTickets: number;
    totalPayout: number;
}

export function JackpotResultsPage() {
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['jackpot-results'],
        queryFn: () => api.getJackpotResults(),
        refetchInterval: 60000, // Refresh every minute
    });

    const results: ResolvedEvent[] = data?.data || [];

    if (isLoading) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded" />
                    <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
                    <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link
                        to="/jackpot"
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <Trophy className="w-8 h-8 text-yellow-500" />
                            Jackpot Results
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            Results from the last 3 days
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => refetch()}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                    title="Refresh"
                >
                    <RefreshCw className="w-5 h-5" />
                </button>
            </div>

            {/* Results List */}
            {results.length === 0 ? (
                <div className="card p-12 text-center">
                    <Trophy className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        No Recent Results
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                        Check back soon for jackpot results!
                    </p>
                    <Link to="/jackpot" className="btn btn-primary">
                        View Active Jackpots
                    </Link>
                </div>
            ) : (
                <div className="space-y-6">
                    {results.map((result) => (
                        <div
                            key={result.id}
                            className={clsx(
                                'card overflow-hidden',
                                result.status === 'cancelled' && 'border-amber-500/50 dark:border-amber-500/30'
                            )}
                        >
                            {/* Status Banner */}
                            <div className={clsx(
                                'px-6 py-3 flex items-center justify-between',
                                result.status === 'resolved'
                                    ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 dark:from-green-900/30 dark:to-emerald-900/30 border-b border-green-500/20 dark:border-green-700/30'
                                    : 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 dark:from-amber-900/30 dark:to-orange-900/30 border-b border-amber-500/20 dark:border-amber-700/30'
                            )}>
                                <div className="flex items-center gap-2">
                                    {result.status === 'resolved' ? (
                                        <>
                                            <Trophy className="w-5 h-5 text-green-500" />
                                            <span className="font-semibold text-green-700 dark:text-green-400">Resolved</span>
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw className="w-5 h-5 text-amber-500" />
                                            <span className="font-semibold text-amber-700 dark:text-amber-400">Cancelled & Refunded</span>
                                        </>
                                    )}
                                </div>
                                {result.resolvedAt && (
                                    <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                        <Calendar className="w-4 h-4" />
                                        {formatDistanceToNow(new Date(result.resolvedAt), { addSuffix: true })}
                                    </span>
                                )}
                            </div>

                            {/* Event Info */}
                            <div className="p-6">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                                    {result.title}
                                </h3>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                    {/* Winning Option */}
                                    {result.winningOption && (
                                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Trophy className="w-4 h-4 text-green-500" />
                                                <span className="text-xs font-medium text-green-600 dark:text-green-400 uppercase">Winner</span>
                                            </div>
                                            <p className="text-lg font-bold text-green-700 dark:text-green-300">
                                                {result.winningOption.label}
                                            </p>
                                        </div>
                                    )}

                                    {/* Total Payout */}
                                    <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <DollarSign className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total Payout</span>
                                        </div>
                                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                                            ${result.totalPayout?.toLocaleString() || result.totalPool?.toLocaleString() || '0'}
                                        </p>
                                    </div>

                                    {/* Winning Tickets */}
                                    <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <CheckCircle className="w-4 h-4 text-green-500" />
                                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Won</span>
                                        </div>
                                        <p className="text-lg font-bold text-green-600 dark:text-green-400">
                                            {result.winningTickets || 0} tickets
                                        </p>
                                    </div>

                                    {/* Losing Tickets */}
                                    <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <XCircle className="w-4 h-4 text-red-500 dark:text-red-400" />
                                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Lost</span>
                                        </div>
                                        <p className="text-lg font-bold text-red-600 dark:text-red-400">
                                            {result.losingTickets || 0} tickets
                                        </p>
                                    </div>
                                </div>

                                {/* Action & Message */}
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {result.status === 'resolved'
                                            ? '🎉 Winners can claim in Dashboard. Better luck next time to others!'
                                            : '💰 All ticket holders have been refunded.'}
                                    </p>
                                    <Link
                                        to="/dashboard"
                                        className="btn btn-primary text-sm whitespace-nowrap"
                                    >
                                        <Ticket className="w-4 h-4" />
                                        Go to Dashboard
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Footer Link */}
            <div className="mt-8 text-center">
                <Link
                    to="/jackpot"
                    className="text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 font-medium"
                >
                    ← Back to Active Jackpots
                </Link>
            </div>
        </div>
    );
}
