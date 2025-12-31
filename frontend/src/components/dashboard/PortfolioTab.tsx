import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Trophy, XCircle, Clock, Check, Copy, Zap, Search, Ticket, ChevronLeft, ChevronRight, Hash, Gift, DollarSign, Loader2 } from 'lucide-react';
import { useWallet } from '@/providers/SolanaProvider';
import { format } from 'date-fns';
import { api } from '@/services/api';
import { getSolPrice } from '@/utils/sol';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const TICKETS_PER_PAGE = 10;

interface PortfolioTabProps {
    publicKey: any;
    connected: boolean;
}

export function PortfolioTab({ publicKey, connected }: PortfolioTabProps) {
    const queryClient = useQueryClient();
    const { signMessage } = useWallet();

    const [copiedTicketId, setCopiedTicketId] = useState<string | null>(null);
    const [searchTicketId, setSearchTicketId] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [isClaiming, setIsClaiming] = useState(false);
    const [statusFilter, setStatusFilter] = useState<'active' | 'won' | 'lost'>('active');
    const [solPrice, setSolPrice] = useState<number>(125);
    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [verifyTx, setVerifyTx] = useState('');
    const [verifyEventId, setVerifyEventId] = useState('');
    const [verifyOptionId, setVerifyOptionId] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);

    useEffect(() => {
        getSolPrice().then(setSolPrice);
    }, []);

    const usdToSol = (usd: number) => usd / solPrice;

    // Fetch user stats
    const { data: statsData } = useQuery({
        queryKey: ['user-stats', publicKey?.toBase58()],
        queryFn: () => api.getMyStats(),
        enabled: connected && !!publicKey,
        retry: 2,
    });

    // Fetch user tickets
    const { data: ticketsData, isLoading } = useQuery({
        queryKey: ['user-tickets', publicKey?.toBase58()],
        queryFn: () => api.getMyTickets({ limit: 50 }),
        enabled: connected && !!publicKey,
        retry: 2,
    });

    // Fetch claimable tickets
    const { data: claimableData, refetch: refetchClaimable } = useQuery({
        queryKey: ['claimable-tickets', publicKey?.toBase58()],
        queryFn: () => api.getClaimableTickets(),
        enabled: connected && !!publicKey,
        retry: 2,
    });

    const stats = statsData?.data;
    const tickets = ticketsData?.data || [];
    const claimableTickets = claimableData?.data?.tickets || [];
    const totalClaimable = claimableData?.data?.totalClaimable || 0;

    const claimableWinnings = claimableTickets
        .filter(t => t.status === 'won')
        .reduce((sum, t) => sum + (t.payoutAmount || 0), 0);
    const claimableRefunds = claimableTickets
        .filter(t => t.status === 'refunded')
        .reduce((sum, t) => sum + (t.payoutAmount || 0), 0);

    const handleClaimAll = async () => {
        if (!publicKey || !signMessage) {
            toast.error('Please connect your wallet');
            return;
        }

        setIsClaiming(true);
        try {
            const message = new TextEncoder().encode(`Claim all winnings: ${Date.now()}`);
            let signature;
            try {
                signature = await signMessage(message);
            } catch (signError: any) {
                if (signError.message?.includes('rejected')) {
                    toast.error('Signing cancelled');
                } else {
                    toast.error('Wallet signing failed');
                }
                return;
            }
            const signatureBase64 = Buffer.from(signature).toString('base64');

            const result = await api.claimAllTickets(publicKey.toBase58(), signatureBase64);

            if (result.success) {
                toast.success(`Claimed ${usdToSol(result.data?.totalPayout || 0).toFixed(4)} SOL from ${result.data?.claimedCount} tickets!`);
                refetchClaimable();
                queryClient.invalidateQueries({ queryKey: ['user-tickets'] });
                queryClient.invalidateQueries({ queryKey: ['user-stats'] });
            } else {
                toast.error(result.error || 'Failed to claim');
            }
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to claim');
        } finally {
            setIsClaiming(false);
        }
    };

    const handleVerifyPayment = async () => {
        if (!publicKey || !verifyTx.trim() || !verifyEventId.trim() || !verifyOptionId.trim()) {
            toast.error('Please fill in all fields');
            return;
        }

        setIsVerifying(true);
        try {
            const result = await api.verifyPayment({
                transactionSignature: verifyTx.trim(),
                eventId: verifyEventId.trim(),
                optionId: verifyOptionId.trim(),
                walletAddress: publicKey.toBase58(),
            });

            if (result.success) {
                toast.success(result.data?.message || 'Ticket issued successfully!');
                setShowVerifyModal(false);
                setVerifyTx('');
                setVerifyEventId('');
                setVerifyOptionId('');
                queryClient.invalidateQueries({ queryKey: ['user-tickets'] });
                queryClient.invalidateQueries({ queryKey: ['user-stats'] });
            } else {
                toast.error(result.error || 'Verification failed');
            }
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to verify payment');
        } finally {
            setIsVerifying(false);
        }
    };

    const filteredTickets = tickets.filter(ticket => {
        const matchesSearch = !searchTicketId.trim() || ticket.id.toLowerCase().includes(searchTicketId.toLowerCase());
        let matchesStatus = false;
        if (statusFilter === 'active') matchesStatus = ticket.status === 'active';
        else if (statusFilter === 'won') matchesStatus = ticket.status === 'won' || ticket.status === 'claimed';
        else if (statusFilter === 'lost') matchesStatus = ticket.status === 'lost';
        return matchesSearch && matchesStatus;
    });

    const totalPages = Math.ceil(filteredTickets.length / TICKETS_PER_PAGE);
    const startIndex = (currentPage - 1) * TICKETS_PER_PAGE;
    const paginatedTickets = filteredTickets.slice(startIndex, startIndex + TICKETS_PER_PAGE);

    const handleSearchChange = (value: string) => {
        setSearchTicketId(value);
        setCurrentPage(1);
    };

    const formatTicketId = (id: string) => id.length <= 12 ? id : `${id.slice(0, 8)}`;

    const copyTicketId = (id: string) => {
        navigator.clipboard.writeText(id);
        setCopiedTicketId(id);
        toast.success('Ticket ID copied!');
        setTimeout(() => setCopiedTicketId(null), 2000);
    };

    return (
        <div className="space-y-6">
            {/* Claimable Earnings Card */}
            <div className={clsx(
                'rounded-2xl p-5 sm:p-6 border-2 shadow-lg relative overflow-hidden',
                totalClaimable > 0
                    ? 'bg-gradient-to-br from-positive-50 via-positive-100 to-positive-50 border-positive-300'
                    : 'bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 dark:from-gray-800 dark:via-gray-850 dark:to-gray-800 border-gray-200 dark:border-gray-700'
            )}>
                {totalClaimable > 0 && (
                    <>
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-positive-200 rounded-full blur-2xl opacity-50" />
                        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-yellow-200 rounded-full blur-2xl opacity-40" />
                    </>
                )}

                <div className="relative">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <div className={clsx(
                                    'w-10 h-10 rounded-xl flex items-center justify-center',
                                    totalClaimable > 0 ? 'bg-positive-500' : 'bg-gray-400 dark:bg-gray-600'
                                )}>
                                    <Gift className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className={clsx(
                                        'text-lg font-bold',
                                        totalClaimable > 0 ? 'text-positive-800' : 'text-gray-700 dark:text-gray-300'
                                    )}>Claimable Earnings</h3>
                                    <p className={clsx(
                                        'text-xs',
                                        totalClaimable > 0 ? 'text-positive-600' : 'text-gray-500 dark:text-gray-400'
                                    )}>
                                        {claimableTickets.length > 0
                                            ? `${claimableTickets.length} ticket${claimableTickets.length !== 1 ? 's' : ''} ready to claim`
                                            : 'No tickets to claim'
                                        }
                                    </p>
                                </div>
                            </div>

                            {totalClaimable > 0 && (
                                <div className="mt-4 space-y-2">
                                    {claimableWinnings > 0 && (
                                        <div className="flex items-center justify-between bg-white/60 rounded-lg px-3 py-2">
                                            <div className="flex items-center gap-2">
                                                <Trophy className="w-4 h-4 text-positive-600" />
                                                <span className="text-sm text-positive-700">Winnings</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-bold text-positive-700">{usdToSol(claimableWinnings).toFixed(4)} SOL</span>
                                            </div>
                                        </div>
                                    )}
                                    {claimableRefunds > 0 && (
                                        <div className="flex items-center justify-between bg-white/60 rounded-lg px-3 py-2">
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-yellow-600" />
                                                <span className="text-sm text-yellow-700">Refunds</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-bold text-yellow-700">{usdToSol(claimableRefunds).toFixed(4)} SOL</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col items-center lg:items-end gap-3">
                            <div className="text-center lg:text-right">
                                <p className={clsx(
                                    'text-xs uppercase tracking-wider font-medium',
                                    totalClaimable > 0 ? 'text-positive-600' : 'text-gray-500 dark:text-gray-400'
                                )}>Total Available</p>
                                <p className={clsx(
                                    'text-3xl sm:text-4xl font-bold',
                                    totalClaimable > 0 ? 'text-positive-700' : 'text-gray-400 dark:text-gray-500'
                                )}>{usdToSol(totalClaimable).toFixed(4)} SOL</p>
                            </div>

                            <button
                                onClick={handleClaimAll}
                                disabled={isClaiming || totalClaimable === 0}
                                className={clsx(
                                    'flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-lg',
                                    totalClaimable > 0
                                        ? isClaiming
                                            ? 'bg-positive-400 text-white cursor-not-allowed'
                                            : 'bg-gradient-to-r from-positive-500 to-positive-600 hover:from-positive-600 hover:to-positive-700 text-white hover:shadow-xl hover:scale-[1.02]'
                                        : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                )}
                            >
                                {isClaiming ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Claiming...
                                    </>
                                ) : totalClaimable > 0 ? (
                                    <>
                                        <DollarSign className="w-5 h-5" />
                                        Claim {usdToSol(totalClaimable).toFixed(4)} SOL
                                    </>
                                ) : (
                                    <>
                                        <DollarSign className="w-5 h-5" />
                                        Nothing to Claim
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-gradient-to-br from-positive-100 to-positive-50 dark:from-positive-900/30 dark:to-positive-800/30 rounded-xl p-4 sm:p-5 border border-positive-200 dark:border-positive-800">
                    <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-4 h-4 text-positive-600 dark:text-positive-400" />
                        <p className="text-xs text-positive-700 dark:text-positive-300 uppercase tracking-wider font-medium">Total Bets</p>
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-text-primary dark:text-white">{stats?.totalTickets || 0}</p>
                </div>

                <div className="bg-gradient-to-br from-positive-100 to-positive-50 dark:from-positive-900/30 dark:to-positive-800/30 rounded-xl p-4 sm:p-5 border border-positive-200 dark:border-positive-800">
                    <div className="flex items-center gap-2 mb-2">
                        <Trophy className="w-4 h-4 text-positive-600 dark:text-positive-400" />
                        <p className="text-xs text-positive-700 dark:text-positive-300 uppercase tracking-wider font-medium">Total Wins</p>
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-positive-600">{(stats?.wonTickets || 0) + (stats?.claimedTickets || 0)}</p>
                    <p className="text-sm text-positive-600 dark:text-positive-400 font-medium mt-1">
                        +{usdToSol(Number(stats?.totalWinnings) || 0).toFixed(4)} SOL
                    </p>
                </div>

                <div className="bg-gradient-to-br from-negative-100 to-negative-50 dark:from-negative-900/30 dark:to-negative-800/30 rounded-xl p-4 sm:p-5 border border-negative-200 dark:border-negative-800">
                    <div className="flex items-center gap-2 mb-2">
                        <XCircle className="w-4 h-4 text-negative-500 dark:text-negative-400" />
                        <p className="text-xs text-negative-600 dark:text-negative-300 uppercase tracking-wider font-medium">Total Losses</p>
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-negative-500 dark:text-negative-400">{stats?.lostTickets || 0}</p>
                </div>

                <div className="bg-gradient-to-br from-brand-100 to-brand-50 dark:from-brand-900/30 dark:to-brand-800/30 rounded-xl p-4 sm:p-5 border border-brand-200 dark:border-brand-800">
                    <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                        <p className="text-xs text-brand-700 dark:text-brand-300 uppercase tracking-wider font-medium">Total Volume</p>
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-brand-600 dark:text-brand-400">{usdToSol(Number(stats?.totalSpent) || 0).toFixed(4)} SOL</p>
                </div>
            </div>

            {/* Ticket History */}
            <div className="bg-background-card dark:bg-gray-900 rounded-2xl border border-border dark:border-gray-800 overflow-hidden shadow-card">
                <div className="p-4 sm:p-5 border-b border-border">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                        <div className="flex items-center gap-2">
                            <Ticket className="w-5 h-5 text-brand-600" />
                            <h2 className="text-lg font-bold text-text-primary dark:text-white">Ticket History</h2>
                        </div>
                        <span className="text-xs text-text-muted bg-background-secondary px-2 py-1 rounded-full">
                            {filteredTickets.length} ticket{filteredTickets.length !== 1 ? 's' : ''}
                        </span>
                    </div>

                    {/* Status Tabs */}
                    <div className="border-b border-border dark:border-gray-700 -mx-4 sm:-mx-5 mb-4">
                        <nav className="flex gap-1 px-4 sm:px-5 overflow-x-auto scrollbar-hide -mb-px">
                            {[
                                { value: 'active', label: 'Active Bets', color: 'text-blue-500 border-blue-500', count: tickets.filter(t => t.status === 'active').length },
                                { value: 'won', label: 'Won', color: 'text-green-500 border-green-500', count: tickets.filter(t => t.status === 'won' || t.status === 'claimed').length },
                                { value: 'lost', label: 'Lost', color: 'text-red-500 border-red-500', count: tickets.filter(t => t.status === 'lost').length },
                            ].map(tab => (
                                <button
                                    key={tab.value}
                                    onClick={() => { setStatusFilter(tab.value as any); setCurrentPage(1); }}
                                    className={clsx(
                                        'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                                        statusFilter === tab.value
                                            ? tab.color
                                            : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-300'
                                    )}
                                >
                                    {tab.label}
                                    <span className={clsx(
                                        'px-2 py-0.5 text-xs rounded-full',
                                        statusFilter === tab.value ? 'bg-current/10' : 'bg-gray-100 dark:bg-gray-800'
                                    )}>
                                        {tab.count}
                                    </span>
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                        <input
                            type="text"
                            placeholder="Search by Ticket ID..."
                            value={searchTicketId}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-background-secondary border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-500 text-sm"
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="p-12 text-center">
                        <Loader2 className="w-10 h-10 animate-spin text-brand-600 mx-auto" />
                    </div>
                ) : filteredTickets.length === 0 ? (
                    <div className="p-12 text-center">
                        <Ticket className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-50" />
                        <p className="text-text-muted">{searchTicketId ? 'No tickets found' : 'No tickets yet'}</p>
                    </div>
                ) : (
                    <>
                        <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
                            {paginatedTickets.map((ticket: any) => (
                                <div key={ticket.id} className="p-4 sm:p-5 hover:bg-background-secondary/50 transition-colors">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-1.5 bg-background-secondary px-2.5 py-1 rounded-lg border border-border">
                                                <Hash className="w-3.5 h-3.5 text-brand-600" />
                                                <span className="text-xs font-mono font-semibold text-gray-900 dark:text-white">
                                                    {formatTicketId(ticket.id)}
                                                </span>
                                                <button
                                                    onClick={() => copyTicketId(ticket.id)}
                                                    className="p-0.5 hover:bg-border rounded transition-colors ml-1"
                                                >
                                                    {copiedTicketId === ticket.id ? (
                                                        <Check className="w-3 h-3 text-positive-600" />
                                                    ) : (
                                                        <Copy className="w-3 h-3 text-text-muted" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        <span className={clsx(
                                            'text-xs uppercase font-bold px-2.5 py-1 rounded-full',
                                            (ticket.status === 'won' || ticket.status === 'claimed') && 'bg-positive-100 dark:bg-positive-900/50 text-positive-700 dark:text-positive-300 border border-positive-200 dark:border-positive-700',
                                            ticket.status === 'lost' && 'bg-negative-100 dark:bg-negative-900/50 text-negative-600 dark:text-negative-300 border border-negative-200 dark:border-negative-700',
                                            ticket.status === 'active' && 'bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-700',
                                            ticket.status === 'refunded' && 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700'
                                        )}>
                                            {ticket.status === 'claimed' ? 'WON' : ticket.status}
                                        </span>
                                    </div>

                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div className="flex items-start sm:items-center gap-3">
                                            <div className={clsx(
                                                'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                                                (ticket.status === 'won' || ticket.status === 'claimed') && 'bg-gradient-to-br from-positive-100 to-positive-50 dark:from-positive-900/40 dark:to-positive-800/40 border border-positive-200 dark:border-positive-700',
                                                ticket.status === 'lost' && 'bg-gradient-to-br from-negative-100 to-negative-50 dark:from-negative-900/40 dark:to-negative-800/40 border border-negative-200 dark:border-negative-700',
                                                ticket.status === 'active' && 'bg-gradient-to-br from-brand-100 to-brand-50 dark:from-brand-900/40 dark:to-brand-800/40 border border-brand-200 dark:border-brand-700'
                                            )}>
                                                {(ticket.status === 'won' || ticket.status === 'claimed') && <Trophy className="w-5 h-5 text-positive-600" />}
                                                {ticket.status === 'lost' && <XCircle className="w-5 h-5 text-negative-500" />}
                                                {ticket.status === 'active' && <Clock className="w-5 h-5 text-brand-600" />}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <p className="text-text-primary dark:text-white font-semibold truncate text-sm">
                                                    {ticket.event?.title || 'Unknown Event'}
                                                </p>
                                                <div className="flex flex-wrap items-center gap-x-2 text-xs text-gray-600 dark:text-gray-400 mt-1">
                                                    <span>Pick: <span className="font-medium text-gray-900 dark:text-white">{ticket.optionLabel}</span></span>
                                                    <span className="text-gray-500 dark:text-gray-500">{format(new Date(ticket.createdAt), 'MMM dd, yyyy')}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <p className={clsx(
                                                'text-lg font-bold',
                                                (ticket.status === 'won' || ticket.status === 'claimed') && 'text-positive-600 dark:text-positive-400',
                                                ticket.status === 'lost' && 'text-negative-500 dark:text-negative-400',
                                                ticket.status === 'active' && 'text-gray-900 dark:text-white'
                                            )}>
                                                {(ticket.status === 'won' || ticket.status === 'claimed') && `+${usdToSol(ticket.payoutAmount || ticket.purchasePrice).toFixed(4)} SOL`}
                                                {ticket.status === 'lost' && `-${usdToSol(ticket.purchasePrice).toFixed(4)} SOL`}
                                                {ticket.status === 'active' && `${usdToSol(ticket.purchasePrice).toFixed(4)} SOL`}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
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

                                    <span className="text-sm text-text-secondary">
                                        Page <span className="font-semibold text-text-primary">{currentPage}</span> of <span className="font-semibold text-text-primary">{totalPages}</span>
                                    </span>

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

            {/* Verify Payment Button */}
            <div className="bg-background-card dark:bg-gray-900 rounded-2xl border border-border dark:border-gray-800 p-4 sm:p-5 shadow-card">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-text-primary dark:text-white">Having payment issues?</h3>
                        <p className="text-sm text-text-muted dark:text-gray-400">Paid but didn't receive your ticket? Verify your payment here.</p>
                    </div>
                    <button
                        onClick={() => setShowVerifyModal(true)}
                        className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium transition-colors"
                    >
                        Verify Payment
                    </button>
                </div>
            </div>

            {/* Verify Payment Modal */}
            {showVerifyModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-xl border border-gray-200 dark:border-gray-700">
                        <div className="p-5 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Verify Your Payment</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                Enter your transaction details to claim your ticket
                            </p>
                        </div>

                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Transaction Signature
                                </label>
                                <input
                                    type="text"
                                    value={verifyTx}
                                    onChange={(e) => setVerifyTx(e.target.value)}
                                    placeholder="e.g., 5xY8k2..."
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:border-brand-500"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Find this in your wallet transaction history
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Event ID
                                </label>
                                <input
                                    type="text"
                                    value={verifyEventId}
                                    onChange={(e) => setVerifyEventId(e.target.value)}
                                    placeholder="Event ID from the event page URL"
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:border-brand-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Option ID (A, B, C...)
                                </label>
                                <input
                                    type="text"
                                    value={verifyOptionId}
                                    onChange={(e) => setVerifyOptionId(e.target.value.toUpperCase())}
                                    placeholder="e.g., A or B"
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:border-brand-500"
                                />
                            </div>
                        </div>

                        <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end">
                            <button
                                onClick={() => {
                                    setShowVerifyModal(false);
                                    setVerifyTx('');
                                    setVerifyEventId('');
                                    setVerifyOptionId('');
                                }}
                                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleVerifyPayment}
                                disabled={isVerifying || !verifyTx.trim() || !verifyEventId.trim() || !verifyOptionId.trim()}
                                className="px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                            >
                                {isVerifying ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Verifying...
                                    </>
                                ) : (
                                    'Verify & Claim Ticket'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
