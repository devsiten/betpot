import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Wallet, Trophy, XCircle, Clock, Check, Edit2, X, LogOut, ExternalLink, Copy, TrendingUp, Zap } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { format } from 'date-fns';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export function DashboardPage() {
    const navigate = useNavigate();
    const { publicKey, connected, disconnect } = useWallet();
    const { logout, isAuthenticated } = useAuthStore();
    const [editingUsername, setEditingUsername] = useState(false);
    const [username, setUsername] = useState('');
    const [copied, setCopied] = useState(false);

    // Fetch user stats
    const { data: statsData } = useQuery({
        queryKey: ['user-stats'],
        queryFn: () => api.getMyStats(),
        enabled: connected && isAuthenticated,
    });

    // Fetch user tickets (bet history)
    const { data: ticketsData, isLoading } = useQuery({
        queryKey: ['user-tickets'],
        queryFn: () => api.getMyTickets({ limit: 50 }),
        enabled: connected && isAuthenticated,
    });

    const stats = statsData?.data;
    const tickets = ticketsData?.data || [];

    const formatAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    const copyAddress = () => {
        if (publicKey) {
            navigator.clipboard.writeText(publicKey.toBase58());
            setCopied(true);
            toast.success('Address copied!');
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleDisconnect = () => {
        localStorage.removeItem('betpot_wallet');
        localStorage.removeItem('betpot_token');
        logout();
        disconnect();
        navigate('/');
        toast.success('Disconnected');
    };

    if (!connected) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-16 text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 flex items-center justify-center mx-auto mb-6">
                    <Wallet className="w-10 h-10 text-teal-400" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h1>
                <p className="text-gray-400">Connect and sign in to view your dashboard</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white">Dashboard</h1>
                    <p className="text-gray-400 text-sm sm:text-base">Manage your bets and track winnings</p>
                </div>

                {/* Sign Out Button */}
                <button
                    onClick={handleDisconnect}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all text-xs font-medium"
                >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                </button>
            </div>

            {/* Wallet Card - Professional Web3 Style */}
            <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] rounded-2xl p-5 sm:p-6 mb-6 sm:mb-8 border border-white/10 relative overflow-hidden">
                {/* Gradient orb decoration */}
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-teal-500/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl" />

                <div className="relative">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
                                <Wallet className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Connected Wallet</p>
                                <div className="flex items-center gap-2">
                                    <p className="text-lg sm:text-xl font-mono text-white font-medium">
                                        {formatAddress(publicKey?.toBase58() || '')}
                                    </p>
                                    <button
                                        onClick={copyAddress}
                                        className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                    >
                                        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                    <a
                                        href={`https://explorer.solana.com/address/${publicKey?.toBase58()}?cluster=devnet`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-bold uppercase tracking-wide border border-yellow-500/30">
                                Devnet
                            </span>
                        </div>
                    </div>

                    {/* Username Section */}
                    <div className="mt-6 pt-6 border-t border-white/10">
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Display Name</p>
                                {editingUsername ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            placeholder="Enter display name"
                                            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 w-full max-w-xs text-sm"
                                        />
                                        <button
                                            onClick={() => {
                                                toast.success('Display name saved!');
                                                setEditingUsername(false);
                                            }}
                                            className="p-2 bg-teal-500 text-white rounded-lg hover:bg-teal-400 transition-colors"
                                        >
                                            <Check className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setEditingUsername(false)}
                                            className="p-2 bg-white/5 text-gray-400 rounded-lg hover:bg-white/10 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <p className="text-white font-medium">{username || 'Not set'}</p>
                                        <button
                                            onClick={() => setEditingUsername(true)}
                                            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Grid - Professional Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
                <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-xl p-4 sm:p-5 border border-blue-500/20">
                    <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-4 h-4 text-blue-400" />
                        <p className="text-xs text-blue-400 uppercase tracking-wider font-medium">Total Bets</p>
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-white">{stats?.totalTickets || 0}</p>
                </div>

                <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-xl p-4 sm:p-5 border border-green-500/20">
                    <div className="flex items-center gap-2 mb-2">
                        <Trophy className="w-4 h-4 text-green-400" />
                        <p className="text-xs text-green-400 uppercase tracking-wider font-medium">Wins</p>
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-green-400">{stats?.wonTickets || 0}</p>
                </div>

                <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 rounded-xl p-4 sm:p-5 border border-red-500/20">
                    <div className="flex items-center gap-2 mb-2">
                        <XCircle className="w-4 h-4 text-red-400" />
                        <p className="text-xs text-red-400 uppercase tracking-wider font-medium">Losses</p>
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-red-400">{stats?.lostTickets || 0}</p>
                </div>

                <div className="bg-gradient-to-br from-teal-500/10 to-cyan-600/5 rounded-xl p-4 sm:p-5 border border-teal-500/20">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-teal-400" />
                        <p className="text-xs text-teal-400 uppercase tracking-wider font-medium">Earnings</p>
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-teal-400">${stats?.totalWinnings?.toFixed(2) || '0.00'}</p>
                </div>
            </div>

            {/* Bet History - Professional Table */}
            <div className="bg-[#1e293b]/50 rounded-2xl border border-white/10 overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white">Ticket History</h2>
                    <span className="text-xs text-gray-400">{tickets.length} tickets</span>
                </div>

                {isLoading ? (
                    <div className="p-12 text-center">
                        <div className="animate-spin w-10 h-10 border-3 border-teal-500 border-t-transparent rounded-full mx-auto"></div>
                    </div>
                ) : tickets.length === 0 ? (
                    <div className="p-12 sm:p-16 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                            <Clock className="w-8 h-8 text-gray-600" />
                        </div>
                        <p className="text-gray-400 font-medium mb-1">No bets yet</p>
                        <p className="text-gray-500 text-sm">Place your first bet to see history here</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {tickets.map((ticket: any) => (
                            <div key={ticket.id} className="p-4 sm:p-5 hover:bg-white/[0.02] transition-colors">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                                        {/* Status Icon */}
                                        <div className={clsx(
                                            'w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0',
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

                                        <div className="min-w-0 flex-1">
                                            <p className="text-white font-medium truncate">{ticket.event?.title || 'Unknown Event'}</p>
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-gray-400 mt-1">
                                                <span className="flex items-center gap-1">
                                                    <span className="text-gray-500">Pick:</span>
                                                    <span className="text-white">{ticket.optionLabel}</span>
                                                </span>
                                                <span className="hidden sm:inline text-gray-600">•</span>
                                                <span>{format(new Date(ticket.createdAt), 'MMM dd, yyyy')}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between sm:flex-col sm:items-end gap-1 pl-14 sm:pl-0">
                                        <p className={clsx(
                                            'text-lg sm:text-xl font-bold',
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
                                        <span className={clsx(
                                            'text-[10px] sm:text-xs uppercase font-bold px-2 py-0.5 rounded',
                                            (ticket.status === 'won' || ticket.status === 'claimed') && 'bg-green-500/20 text-green-400',
                                            ticket.status === 'lost' && 'bg-red-500/20 text-red-400',
                                            ticket.status === 'active' && 'bg-yellow-500/20 text-yellow-400',
                                            ticket.status === 'refunded' && 'bg-gray-500/20 text-gray-400'
                                        )}>
                                            {ticket.status === 'claimed' ? 'WON' : ticket.status}
                                        </span>
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
