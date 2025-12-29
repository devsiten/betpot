import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
    Search,
    User,
    Ticket,
    Trophy,
    AlertTriangle,
    DollarSign,
    Copy,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { api } from '@/services/api';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const statusColors: Record<string, string> = {
    active: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    won: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    lost: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    claimed: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    refunded: 'bg-gray-100 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400',
};

export function AdminUserLookup() {
    const [wallet, setWallet] = useState('');
    const [userData, setUserData] = useState<any>(null);
    const [expandedSection, setExpandedSection] = useState<string | null>('tickets');

    const lookupMutation = useMutation({
        mutationFn: () => api.userLookup(wallet),
        onSuccess: (data) => {
            if (data.success && data.data) {
                setUserData(data.data);
            }
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'User not found');
            setUserData(null);
        },
    });

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied!');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (wallet.length >= 32) {
            lookupMutation.mutate();
        } else {
            toast.error('Enter a valid wallet address (32+ characters)');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Search className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
                    User Lookup
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Search users by wallet address</p>
            </div>

            {/* Search Form */}
            <form onSubmit={handleSubmit} className="card p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Wallet Address
                        </label>
                        <input
                            type="text"
                            value={wallet}
                            onChange={(e) => setWallet(e.target.value)}
                            placeholder="Enter wallet address..."
                            className="input w-full"
                        />
                    </div>
                    <div className="flex items-end">
                        <button
                            type="submit"
                            disabled={lookupMutation.isPending || wallet.length < 32}
                            className="btn btn-primary w-full sm:w-auto"
                        >
                            {lookupMutation.isPending ? 'Searching...' : 'Search'}
                        </button>
                    </div>
                </div>
            </form>

            {/* Results */}
            {userData && (
                <div className="space-y-4 sm:space-y-6">
                    {/* User Profile Card */}
                    <div className="card p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xl sm:text-2xl flex-shrink-0">
                                    {(userData.user.username || userData.user.email)?.[0]?.toUpperCase() || 'U'}
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">
                                        {userData.user.username || userData.user.email}
                                    </h2>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-mono truncate max-w-[150px] sm:max-w-[250px]">
                                            {userData.user.walletAddress}
                                        </span>
                                        <button
                                            onClick={() => copyToClipboard(userData.user.walletAddress)}
                                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                                        >
                                            <Copy className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="text-left sm:text-right">
                                <span className={clsx(
                                    'badge',
                                    userData.user.role === 'admin' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' : 'bg-gray-100 dark:bg-gray-800'
                                )}>
                                    {userData.user.role}
                                </span>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                    Joined {format(new Date(userData.user.createdAt), 'MMM d, yyyy')}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                        <div className="card p-3 sm:p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Ticket className="w-4 h-4 text-blue-500" />
                                <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Total Bets</span>
                            </div>
                            <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">{userData.stats.totalBets}</p>
                        </div>
                        <div className="card p-3 sm:p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Trophy className="w-4 h-4 text-green-500" />
                                <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Win Rate</span>
                            </div>
                            <p className="text-lg sm:text-2xl font-bold text-green-600 dark:text-green-400">{userData.stats.winRate}%</p>
                        </div>
                        <div className="card p-3 sm:p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <DollarSign className="w-4 h-4 text-purple-500" />
                                <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Total Spent</span>
                            </div>
                            <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">${userData.stats.totalSpent.toFixed(2)}</p>
                        </div>
                        <div className="card p-3 sm:p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <DollarSign className="w-4 h-4 text-yellow-500" />
                                <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Unclaimed</span>
                            </div>
                            <p className="text-lg sm:text-2xl font-bold text-yellow-600 dark:text-yellow-400">${userData.stats.unclaimedWinnings.toFixed(2)}</p>
                        </div>
                    </div>

                    {/* Tickets Section */}
                    <div className="card overflow-hidden">
                        <button
                            onClick={() => setExpandedSection(expandedSection === 'tickets' ? null : 'tickets')}
                            className="w-full p-4 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50"
                        >
                            <div className="flex items-center gap-2">
                                <Ticket className="w-5 h-5 text-blue-500" />
                                <span className="font-medium text-gray-900 dark:text-white">Tickets ({userData.tickets.length})</span>
                            </div>
                            {expandedSection === 'tickets' ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>

                        {expandedSection === 'tickets' && (
                            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                {userData.tickets.length === 0 ? (
                                    <p className="p-4 text-center text-gray-500 dark:text-gray-400">No tickets found</p>
                                ) : (
                                    userData.tickets.map((ticket: any) => (
                                        <div key={ticket.id} className="p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="font-medium text-gray-900 dark:text-white truncate">{ticket.eventTitle}</p>
                                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                                            Option: {ticket.optionLabel}
                                                        </span>
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                                            ${ticket.purchasePrice}
                                                        </span>
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                                            {format(new Date(ticket.createdAt), 'MMM d, HH:mm')}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <span className={clsx('badge text-xs', statusColors[ticket.status] || '')}>
                                                        {ticket.status}
                                                    </span>
                                                    {ticket.payoutAmount > 0 && (
                                                        <span className="text-sm font-medium text-green-600 dark:text-green-400">
                                                            +${ticket.payoutAmount.toFixed(2)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* Failed Transactions Section */}
                    {userData.failedTransactions.length > 0 && (
                        <div className="card overflow-hidden">
                            <button
                                onClick={() => setExpandedSection(expandedSection === 'failed' ? null : 'failed')}
                                className="w-full p-4 flex items-center justify-between bg-red-50 dark:bg-red-900/20"
                            >
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-red-500" />
                                    <span className="font-medium text-gray-900 dark:text-white">Failed Transactions ({userData.failedTransactions.length})</span>
                                </div>
                                {expandedSection === 'failed' ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </button>

                            {expandedSection === 'failed' && (
                                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {userData.failedTransactions.map((tx: any) => (
                                        <div key={tx.id} className="p-3 sm:p-4">
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="font-medium text-gray-900 dark:text-white">{tx.type}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{tx.error}</p>
                                                </div>
                                                <div className="text-left sm:text-right">
                                                    <p className="text-sm font-medium text-red-600 dark:text-red-400">${tx.amount}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        {format(new Date(tx.createdAt), 'MMM d, HH:mm')}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Empty State */}
            {!userData && !lookupMutation.isPending && (
                <div className="card p-8 sm:p-12 text-center">
                    <User className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">Enter a wallet address to search for a user</p>
                </div>
            )}
        </div>
    );
}
