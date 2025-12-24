import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Wallet, Trophy, XCircle, Clock, Check, Edit2, X, LogOut, ExternalLink, Copy, TrendingUp, Zap, Search, Ticket, ChevronLeft, ChevronRight, Hash } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { format } from 'date-fns';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const TICKETS_PER_PAGE = 10;

export function DashboardPage() {
    const navigate = useNavigate();
    const { publicKey, connected, disconnect } = useWallet();
    const { logout, isAuthenticated } = useAuthStore();
    const [editingUsername, setEditingUsername] = useState(false);
    const [username, setUsername] = useState('');
    const [copied, setCopied] = useState(false);
    const [copiedTicketId, setCopiedTicketId] = useState<string | null>(null);
    const [searchTicketId, setSearchTicketId] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

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

    // Filter tickets by search
    const filteredTickets = searchTicketId.trim()
        ? tickets.filter(ticket => ticket.id.toLowerCase().includes(searchTicketId.toLowerCase()))
        : tickets;

    // Pagination
    const totalPages = Math.ceil(filteredTickets.length / TICKETS_PER_PAGE);
    const startIndex = (currentPage - 1) * TICKETS_PER_PAGE;
    const paginatedTickets = filteredTickets.slice(startIndex, startIndex + TICKETS_PER_PAGE);

    // Reset to page 1 when search changes
    const handleSearchChange = (value: string) => {
        setSearchTicketId(value);
        setCurrentPage(1);
    };

    // Format ticket ID for display (show shortened version)
    const formatTicketId = (id: string) => {
        if (id.length <= 12) return id;
        return `${id.slice(0, 8)}`;
    };

    // Copy ticket ID to clipboard
    const copyTicketId = (id: string) => {
        navigator.clipboard.writeText(id);
        setCopiedTicketId(id);
        toast.success('Ticket ID copied!');
        setTimeout(() => setCopiedTicketId(null), 2000);
    };

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
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-100 to-positive-100 flex items-center justify-center mx-auto mb-6">
                    <Wallet className="w-10 h-10 text-brand-600" />
                </div>
                <h1 className="text-2xl font-bold text-text-primary mb-2">Connect Your Wallet</h1>
                <p className="text-text-secondary">Connect and sign in to view your dashboard</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">Dashboard</h1>
                    <p className="text-text-secondary text-sm sm:text-base">Manage your bets and track winnings</p>
                </div>

                {/* Sign Out Button */}
                <button
                    onClick={handleDisconnect}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-negative-500 hover:text-negative-600 hover:bg-negative-50 rounded-lg transition-all text-xs font-medium"
                >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                </button>
            </div>

            {/* Wallet Card - Light theme fintech style */}
            <div className="bg-gradient-to-br from-background-card to-background-secondary rounded-2xl p-5 sm:p-6 mb-6 sm:mb-8 border border-border shadow-card relative overflow-hidden">
                {/* Subtle gradient decoration */}
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-brand-100 rounded-full blur-3xl opacity-30" />
                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-positive-100 rounded-full blur-3xl opacity-20" />

                <div className="relative">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-soft">
                                <Wallet className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                            </div>
                            <div>
                                <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Connected Wallet</p>
                                <div className="flex items-center gap-2">
                                    <p className="text-lg sm:text-xl font-mono text-text-primary font-medium">
                                        {formatAddress(publicKey?.toBase58() || '')}
                                    </p>
                                    <button
                                        onClick={copyAddress}
                                        className="p-1.5 rounded-lg hover:bg-background-secondary text-text-muted hover:text-text-primary transition-colors"
                                    >
                                        {copied ? <Check className="w-4 h-4 text-positive-600" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                    <a
                                        href={`https://explorer.solana.com/address/${publicKey?.toBase58()}?cluster=devnet`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 rounded-lg hover:bg-background-secondary text-text-muted hover:text-text-primary transition-colors"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1.5 bg-brand-100 text-brand-700 rounded-full text-xs font-bold uppercase tracking-wide border border-brand-200">
                                Devnet
                            </span>
                        </div>
                    </div>

                    {/* Username Section */}
                    <div className="mt-6 pt-6 border-t border-border">
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <p className="text-xs text-text-muted uppercase tracking-wider mb-2">Display Name</p>
                                {editingUsername ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            placeholder="Enter display name"
                                            className="bg-background-secondary border border-border rounded-lg px-3 py-2 text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 w-full max-w-xs text-sm"
                                        />
                                        <button
                                            onClick={() => {
                                                toast.success('Display name saved!');
                                                setEditingUsername(false);
                                            }}
                                            className="p-2 bg-positive-500 text-white rounded-lg hover:bg-positive-600 transition-colors"
                                        >
                                            <Check className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setEditingUsername(false)}
                                            className="p-2 bg-background-secondary text-text-muted rounded-lg hover:bg-border-light transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <p className="text-text-primary font-medium">{username || 'Not set'}</p>
                                        <button
                                            onClick={() => setEditingUsername(true)}
                                            className="p-1.5 rounded-lg hover:bg-background-secondary text-text-muted hover:text-text-primary transition-colors"
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

            {/* Stats Grid - Light theme cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
                <div className="bg-gradient-to-br from-positive-100 to-positive-50 rounded-xl p-4 sm:p-5 border border-positive-200">
                    <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-4 h-4 text-positive-600" />
                        <p className="text-xs text-positive-700 uppercase tracking-wider font-medium">Total Bets</p>
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-text-primary">{stats?.totalTickets || 0}</p>
                </div>

                <div className="bg-gradient-to-br from-positive-100 to-positive-50 rounded-xl p-4 sm:p-5 border border-positive-200">
                    <div className="flex items-center gap-2 mb-2">
                        <Trophy className="w-4 h-4 text-positive-600" />
                        <p className="text-xs text-positive-700 uppercase tracking-wider font-medium">Wins</p>
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-positive-600">{stats?.wonTickets || 0}</p>
                </div>

                <div className="bg-gradient-to-br from-negative-100 to-negative-50 rounded-xl p-4 sm:p-5 border border-negative-200">
                    <div className="flex items-center gap-2 mb-2">
                        <XCircle className="w-4 h-4 text-negative-500" />
                        <p className="text-xs text-negative-600 uppercase tracking-wider font-medium">Losses</p>
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-negative-500">{stats?.lostTickets || 0}</p>
                </div>

                <div className="bg-gradient-to-br from-brand-100 to-brand-50 rounded-xl p-4 sm:p-5 border border-brand-200">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-brand-600" />
                        <p className="text-xs text-brand-700 uppercase tracking-wider font-medium">Earnings</p>
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-brand-600">${stats?.totalWinnings?.toFixed(2) || '0.00'}</p>
                </div>
            </div>

            {/* Bet History - Light theme table */}
            <div className="bg-background-card rounded-2xl border border-border overflow-hidden shadow-card">
                <div className="p-4 sm:p-5 border-b border-border">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                        <div className="flex items-center gap-2">
                            <Ticket className="w-5 h-5 text-brand-600" />
                            <h2 className="text-lg font-bold text-text-primary">Ticket History</h2>
                        </div>
                        <span className="text-xs text-text-muted bg-background-secondary px-2 py-1 rounded-full">
                            {filteredTickets.length} ticket{filteredTickets.length !== 1 ? 's' : ''}
                        </span>
                    </div>

                    {/* Search Input */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                        <input
                            type="text"
                            placeholder="Search by Ticket ID..."
                            value={searchTicketId}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-background-secondary border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-colors text-sm"
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="p-12 text-center">
                        <div className="animate-spin w-10 h-10 border-3 border-brand-500 border-t-transparent rounded-full mx-auto"></div>
                    </div>
                ) : filteredTickets.length === 0 ? (
                    <div className="p-12 text-center">
                        <Ticket className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-50" />
                        <p className="text-text-muted">
                            {searchTicketId ? 'No tickets found matching your search' : 'No tickets yet'}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Ticket Cards */}
                        <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
                            {paginatedTickets.map((ticket: any, index: number) => (
                                <div key={ticket.id} className="p-4 sm:p-5 hover:bg-background-secondary/50 transition-colors">
                                    {/* Ticket Header with Number */}
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-1.5 bg-background-secondary px-2.5 py-1 rounded-lg border border-border">
                                                <Hash className="w-3.5 h-3.5 text-brand-600" />
                                                <span className="text-xs font-mono font-semibold text-text-primary">
                                                    {formatTicketId(ticket.id)}
                                                </span>
                                                <button
                                                    onClick={() => copyTicketId(ticket.id)}
                                                    className="p-0.5 hover:bg-border rounded transition-colors ml-1"
                                                    title="Copy full ticket ID"
                                                >
                                                    {copiedTicketId === ticket.id ? (
                                                        <Check className="w-3 h-3 text-positive-600" />
                                                    ) : (
                                                        <Copy className="w-3 h-3 text-text-muted" />
                                                    )}
                                                </button>
                                            </div>
                                            <span className="text-[10px] text-text-muted">
                                                #{startIndex + index + 1}
                                            </span>
                                        </div>

                                        {/* Status Badge */}
                                        <span className={clsx(
                                            'text-[10px] sm:text-xs uppercase font-bold px-2.5 py-1 rounded-full',
                                            (ticket.status === 'won' || ticket.status === 'claimed') && 'bg-positive-100 text-positive-700 border border-positive-200',
                                            ticket.status === 'lost' && 'bg-negative-100 text-negative-600 border border-negative-200',
                                            ticket.status === 'active' && 'bg-brand-100 text-brand-700 border border-brand-200',
                                            ticket.status === 'refunded' && 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                                        )}>
                                            {ticket.status === 'claimed' ? 'WON' : ticket.status === 'refunded' ? 'REFUND' : ticket.status}
                                        </span>
                                    </div>

                                    {/* Ticket Content */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div className="flex items-start sm:items-center gap-3">
                                            {/* Status Icon */}
                                            <div className={clsx(
                                                'w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0',
                                                (ticket.status === 'won' || ticket.status === 'claimed') && 'bg-gradient-to-br from-positive-100 to-positive-50 border border-positive-200',
                                                ticket.status === 'lost' && 'bg-gradient-to-br from-negative-100 to-negative-50 border border-negative-200',
                                                ticket.status === 'active' && 'bg-gradient-to-br from-brand-100 to-brand-50 border border-brand-200',
                                                ticket.status === 'refunded' && 'bg-gradient-to-br from-yellow-100 to-yellow-50 border border-yellow-200'
                                            )}>
                                                {(ticket.status === 'won' || ticket.status === 'claimed') && <Trophy className="w-5 h-5 text-positive-600" />}
                                                {ticket.status === 'lost' && <XCircle className="w-5 h-5 text-negative-500" />}
                                                {ticket.status === 'active' && <Clock className="w-5 h-5 text-brand-600" />}
                                                {ticket.status === 'refunded' && <Clock className="w-5 h-5 text-yellow-600" />}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <p className="text-text-primary font-semibold truncate text-sm sm:text-base">
                                                    {ticket.event?.title || 'Unknown Event'}
                                                </p>
                                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-text-secondary mt-1">
                                                    <span className="flex items-center gap-1">
                                                        <span className="text-text-muted">Pick:</span>
                                                        <span className="text-text-primary font-medium">{ticket.optionLabel}</span>
                                                    </span>
                                                    <span className="text-border-dark hidden sm:inline">•</span>
                                                    <span className="text-text-muted">
                                                        {format(new Date(ticket.createdAt), 'MMM dd, yyyy')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Amount */}
                                        <div className="flex items-center justify-between sm:justify-end gap-3 pl-13 sm:pl-0">
                                            <p className={clsx(
                                                'text-lg sm:text-xl font-bold',
                                                (ticket.status === 'won' || ticket.status === 'claimed') && 'text-positive-600',
                                                ticket.status === 'lost' && 'text-negative-500',
                                                ticket.status === 'active' && 'text-text-primary',
                                                ticket.status === 'refunded' && 'text-yellow-600'
                                            )}>
                                                {(ticket.status === 'won' || ticket.status === 'claimed') && `+$${ticket.payoutAmount?.toFixed(2) || ticket.purchasePrice}`}
                                                {ticket.status === 'lost' && `-$${ticket.purchasePrice.toFixed(2)}`}
                                                {ticket.status === 'active' && `$${ticket.purchasePrice.toFixed(2)}`}
                                                {ticket.status === 'refunded' && `$${ticket.purchasePrice.toFixed(2)}`}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="p-4 border-t border-border bg-background-secondary/30">
                                <div className="flex items-center justify-between">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className={clsx(
                                            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                                            currentPage === 1
                                                ? 'text-text-muted cursor-not-allowed'
                                                : 'text-text-primary hover:bg-background-secondary border border-border'
                                        )}
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                        <span className="hidden sm:inline">Previous</span>
                                    </button>

                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-text-secondary">
                                            Page <span className="font-semibold text-text-primary">{currentPage}</span> of <span className="font-semibold text-text-primary">{totalPages}</span>
                                        </span>
                                    </div>

                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className={clsx(
                                            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                                            currentPage === totalPages
                                                ? 'text-text-muted cursor-not-allowed'
                                                : 'text-text-primary hover:bg-background-secondary border border-border'
                                        )}
                                    >
                                        <span className="hidden sm:inline">Next</span>
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
