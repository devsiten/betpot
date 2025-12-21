import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Wallet, Trophy, XCircle, Clock, Check, Edit2, X } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { format } from 'date-fns';
import { api } from '@/services/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export function DashboardPage() {
    const { publicKey, connected } = useWallet();
    const [editingUsername, setEditingUsername] = useState(false);
    const [username, setUsername] = useState('');

    // Fetch user stats
    const { data: statsData } = useQuery({
        queryKey: ['user-stats'],
        queryFn: () => api.getMyStats(),
        enabled: connected,
    });

    // Fetch user tickets (bet history)
    const { data: ticketsData, isLoading } = useQuery({
        queryKey: ['user-tickets'],
        queryFn: () => api.getMyTickets({ limit: 50 }),
        enabled: connected,
    });

    const stats = statsData?.data;
    const tickets = ticketsData?.data || [];

    const formatAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    if (!connected) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-16 text-center">
                <Wallet className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <h1 className="text-2xl font-semibold text-white mb-2">Connect Your Wallet</h1>
                <p className="text-gray-400">Connect your wallet to view your dashboard</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-semibold text-white mb-1">Dashboard</h1>
                <p className="text-gray-400">Manage your bets and wallet</p>
            </div>

            {/* Wallet Card */}
            <div className="card p-6 mb-8">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                            <Wallet className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-400 mb-1">Connected Wallet</p>
                            <p className="text-lg font-mono text-white">{formatAddress(publicKey?.toBase58() || '')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-medium">
                            Devnet
                        </span>
                    </div>
                </div>

                {/* Username Section */}
                <div className="mt-6 pt-6 border-t border-white/10">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-400 mb-1">Username</p>
                            {editingUsername ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="Enter username"
                                        className="input py-2 w-48"
                                    />
                                    <button
                                        onClick={() => {
                                            toast.success('Username saved!');
                                            setEditingUsername(false);
                                        }}
                                        className="p-2 bg-teal-500 text-white rounded-lg hover:bg-teal-400"
                                    >
                                        <Check className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setEditingUsername(false)}
                                        className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <p className="text-white font-medium">{username || 'Not set'}</p>
                                    <button
                                        onClick={() => setEditingUsername(true)}
                                        className="p-1 text-gray-400 hover:text-white"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="card p-4">
                    <p className="text-xs text-gray-400 mb-1">Total Bets</p>
                    <p className="text-2xl font-bold text-white">{stats?.totalTickets || 0}</p>
                </div>
                <div className="card p-4">
                    <p className="text-xs text-gray-400 mb-1">Wins</p>
                    <p className="text-2xl font-bold text-green-400">{stats?.wonTickets || 0}</p>
                </div>
                <div className="card p-4">
                    <p className="text-xs text-gray-400 mb-1">Losses</p>
                    <p className="text-2xl font-bold text-red-400">{stats?.lostTickets || 0}</p>
                </div>
                <div className="card p-4">
                    <p className="text-xs text-gray-400 mb-1">Total Winnings</p>
                    <p className="text-2xl font-bold text-teal-400">${stats?.totalWinnings?.toFixed(2) || '0.00'}</p>
                </div>
            </div>

            {/* Bet History */}
            <div className="card">
                <div className="p-4 border-b border-white/10">
                    <h2 className="text-lg font-semibold text-white">Bet History</h2>
                </div>

                {isLoading ? (
                    <div className="p-8 text-center">
                        <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mx-auto"></div>
                    </div>
                ) : tickets.length === 0 ? (
                    <div className="p-12 text-center">
                        <Clock className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-400">No bets yet</p>
                        <p className="text-gray-500 text-sm">Your betting history will appear here</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {tickets.map((ticket) => (
                            <div key={ticket.id} className="p-4 hover:bg-white/5 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        {/* Status Icon */}
                                        <div className={clsx(
                                            'w-10 h-10 rounded-lg flex items-center justify-center',
                                            ticket.status === 'won' && 'bg-green-500/20',
                                            ticket.status === 'claimed' && 'bg-green-500/20',
                                            ticket.status === 'lost' && 'bg-red-500/20',
                                            ticket.status === 'active' && 'bg-yellow-500/20',
                                            ticket.status === 'refunded' && 'bg-gray-500/20'
                                        )}>
                                            {(ticket.status === 'won' || ticket.status === 'claimed') && <Trophy className="w-5 h-5 text-green-400" />}
                                            {ticket.status === 'lost' && <XCircle className="w-5 h-5 text-red-400" />}
                                            {ticket.status === 'active' && <Clock className="w-5 h-5 text-yellow-400" />}
                                            {ticket.status === 'refunded' && <Clock className="w-5 h-5 text-gray-400" />}
                                        </div>

                                        <div>
                                            <p className="text-white font-medium">{ticket.event?.title || 'Unknown Event'}</p>
                                            <div className="flex items-center gap-3 text-sm text-gray-400">
                                                <span>Picked: {ticket.optionLabel}</span>
                                                <span>•</span>
                                                <span>{format(new Date(ticket.createdAt), 'MMM dd, yyyy')}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <p className={clsx(
                                            'font-semibold',
                                            (ticket.status === 'won' || ticket.status === 'claimed') && 'text-green-400',
                                            ticket.status === 'lost' && 'text-red-400',
                                            ticket.status === 'active' && 'text-white',
                                            ticket.status === 'refunded' && 'text-gray-400'
                                        )}>
                                            {(ticket.status === 'won' || ticket.status === 'claimed') && `+$${ticket.payoutAmount?.toFixed(2) || ticket.purchasePrice}`}
                                            {ticket.status === 'lost' && `-$${ticket.purchasePrice.toFixed(2)}`}
                                            {ticket.status === 'active' && `$${ticket.purchasePrice.toFixed(2)}`}
                                            {ticket.status === 'refunded' && `$${ticket.purchasePrice.toFixed(2)}`}
                                        </p>
                                        <p className={clsx(
                                            'text-xs uppercase font-medium',
                                            (ticket.status === 'won' || ticket.status === 'claimed') && 'text-green-400',
                                            ticket.status === 'lost' && 'text-red-400',
                                            ticket.status === 'active' && 'text-yellow-400',
                                            ticket.status === 'refunded' && 'text-gray-400'
                                        )}>
                                            {ticket.status === 'claimed' ? 'WON' : ticket.status}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
