import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, ExternalLink, Copy, Ticket, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { api } from '@/services/api';
import clsx from 'clsx';

export function AdminPaymentIssues() {
    const queryClient = useQueryClient();
    const [selectedStatus, setSelectedStatus] = useState('pending');
    const [processingId, setProcessingId] = useState<string | null>(null);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['failed-transactions', selectedStatus],
        queryFn: () => api.getFailedTransactions(selectedStatus),
    });

    const resolveMutation = useMutation({
        mutationFn: ({ id, note }: { id: string; note?: string }) =>
            api.resolveFailedTransaction(id, note),
        onSuccess: (response) => {
            toast.success(`Issued ${response.data?.quantity || 'tickets'} tickets successfully`);
            queryClient.invalidateQueries({ queryKey: ['failed-transactions'] });
            setProcessingId(null);
        },
        onError: () => {
            toast.error('Failed to resolve transaction');
            setProcessingId(null);
        },
    });

    const refundMutation = useMutation({
        mutationFn: ({ id, note }: { id: string; note?: string }) =>
            api.refundFailedTransaction(id, undefined, note),
        onSuccess: () => {
            toast.success('Marked as refunded');
            queryClient.invalidateQueries({ queryKey: ['failed-transactions'] });
            setProcessingId(null);
        },
        onError: () => {
            toast.error('Failed to mark as refunded');
            setProcessingId(null);
        },
    });

    const rejectMutation = useMutation({
        mutationFn: ({ id, reason }: { id: string; reason: string }) =>
            api.rejectFailedTransaction(id, reason),
        onSuccess: () => {
            toast.success('Transaction rejected');
            queryClient.invalidateQueries({ queryKey: ['failed-transactions'] });
            setProcessingId(null);
        },
        onError: () => {
            toast.error('Failed to reject');
            setProcessingId(null);
        },
    });

    const transactions = data?.data || [];
    const count = data?.count || 0;

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied!');
    };

    const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Payment Issues</h1>
                    <p className="text-dark-400 mt-1">Resolve failed ticket purchases</p>
                </div>
                <button onClick={() => refetch()} className="btn btn-secondary">
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Status Filter */}
            <div className="flex gap-2">
                {['pending', 'resolved', 'refunded', 'rejected'].map((status) => (
                    <button
                        key={status}
                        onClick={() => setSelectedStatus(status)}
                        className={clsx(
                            'px-4 py-2 rounded-lg font-medium text-sm capitalize transition-all',
                            selectedStatus === status
                                ? 'bg-primary-500 text-white'
                                : 'bg-dark-800 text-dark-400 hover:text-white'
                        )}
                    >
                        {status}
                    </button>
                ))}
            </div>

            {/* Summary */}
            {selectedStatus === 'pending' && count > 0 && (
                <div className="card p-4 bg-yellow-500/10 border-yellow-500/20">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-6 h-6 text-yellow-400" />
                        <div>
                            <p className="text-yellow-400 font-bold">{count} pending issue{count !== 1 ? 's' : ''}</p>
                            <p className="text-yellow-400/70 text-sm">Users paid but didn't receive tickets</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Transactions List */}
            {isLoading ? (
                <div className="text-center py-12">
                    <RefreshCw className="w-8 h-8 text-dark-400 animate-spin mx-auto" />
                </div>
            ) : transactions.length === 0 ? (
                <div className="card p-12 text-center">
                    <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                    <p className="text-dark-400">No {selectedStatus} transactions</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {transactions.map((tx: any) => (
                        <div key={tx.id} className="card p-6 space-y-4">
                            {/* Header Row */}
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                                        <AlertTriangle className="w-5 h-5 text-red-400" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-white">Failed Purchase</p>
                                        <p className="text-xs text-dark-400">{format(new Date(tx.createdAt), 'MMM dd, yyyy HH:mm')}</p>
                                    </div>
                                </div>
                                <span className={clsx(
                                    'px-3 py-1 rounded-full text-xs font-bold uppercase',
                                    tx.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' :
                                        tx.status === 'resolved' ? 'bg-green-500/10 text-green-400' :
                                            tx.status === 'refunded' ? 'bg-blue-500/10 text-blue-400' :
                                                'bg-red-500/10 text-red-400'
                                )}>
                                    {tx.status}
                                </span>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <p className="text-dark-500">Wallet</p>
                                    <div className="flex items-center gap-1">
                                        <p className="text-white font-mono">{formatAddress(tx.walletAddress)}</p>
                                        <button onClick={() => copyToClipboard(tx.walletAddress)} className="text-dark-400 hover:text-white">
                                            <Copy className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-dark-500">Amount</p>
                                    <p className="text-white font-bold">${tx.amount.toFixed(2)}</p>
                                </div>
                                <div>
                                    <p className="text-dark-500">Quantity</p>
                                    <p className="text-white">{tx.quantity} tickets</p>
                                </div>
                                <div>
                                    <p className="text-dark-500">Event</p>
                                    <p className="text-white truncate">{tx.event?.title || tx.eventId.slice(0, 8)}</p>
                                </div>
                            </div>

                            {/* Error Message */}
                            <div className="p-3 bg-dark-800 rounded-lg">
                                <p className="text-xs text-dark-500 mb-1">Error</p>
                                <p className="text-sm text-red-400">{tx.errorMessage}</p>
                            </div>

                            {/* Transaction Signature */}
                            <div className="flex items-center gap-2 text-xs">
                                <p className="text-dark-500">TX:</p>
                                <code className="text-dark-400 font-mono">{formatAddress(tx.transactionSignature)}</code>
                                <button onClick={() => copyToClipboard(tx.transactionSignature)} className="text-dark-400 hover:text-white">
                                    <Copy className="w-3 h-3" />
                                </button>
                                <a
                                    href={`https://explorer.solana.com/tx/${tx.transactionSignature}?cluster=devnet`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary-400 hover:text-primary-300"
                                >
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>

                            {/* Resolution Note (for resolved items) */}
                            {tx.resolutionNote && (
                                <div className="p-3 bg-dark-800 rounded-lg">
                                    <p className="text-xs text-dark-500 mb-1">Resolution</p>
                                    <p className="text-sm text-dark-300">{tx.resolutionNote}</p>
                                </div>
                            )}

                            {/* Action Buttons (only for pending) */}
                            {tx.status === 'pending' && (
                                <div className="flex gap-3 pt-2 border-t border-dark-800">
                                    <button
                                        onClick={() => {
                                            setProcessingId(tx.id);
                                            resolveMutation.mutate({ id: tx.id });
                                        }}
                                        disabled={processingId === tx.id}
                                        className="flex-1 btn btn-success"
                                    >
                                        <Ticket className="w-4 h-4" />
                                        {processingId === tx.id && resolveMutation.isPending ? 'Issuing...' : 'Issue Tickets'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setProcessingId(tx.id);
                                            refundMutation.mutate({ id: tx.id, note: 'Manual refund by admin' });
                                        }}
                                        disabled={processingId === tx.id}
                                        className="flex-1 btn btn-secondary"
                                    >
                                        <DollarSign className="w-4 h-4" />
                                        Mark Refunded
                                    </button>
                                    <button
                                        onClick={() => {
                                            const reason = window.prompt('Enter rejection reason:');
                                            if (reason) {
                                                setProcessingId(tx.id);
                                                rejectMutation.mutate({ id: tx.id, reason });
                                            }
                                        }}
                                        disabled={processingId === tx.id}
                                        className="btn btn-ghost text-red-400"
                                    >
                                        <XCircle className="w-4 h-4" />
                                        Reject
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
