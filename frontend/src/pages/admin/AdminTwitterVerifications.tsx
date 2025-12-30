import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, Clock, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { api } from '@/services/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';

type VerificationStatus = 'pending' | 'approved' | 'rejected';

interface TwitterVerification {
    id: string;
    userId: string;
    twitterHandle: string;
    status: VerificationStatus;
    createdAt: string;
    reviewedAt?: string;
    adminNote?: string;
    user?: {
        walletAddress: string;
        email: string;
        displayName?: string;
    };
}

export default function AdminTwitterVerifications() {
    const queryClient = useQueryClient();
    const [statusFilter, setStatusFilter] = useState<VerificationStatus>('pending');
    const [rejectReason, setRejectReason] = useState('');
    const [rejectingId, setRejectingId] = useState<string | null>(null);

    // Fetch verifications
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['admin-twitter-verifications', statusFilter],
        queryFn: () => api.getTwitterVerifications(statusFilter),
    });

    const verifications = (data?.data || []) as TwitterVerification[];

    // Approve mutation
    const approveMutation = useMutation({
        mutationFn: (id: string) => api.approveTwitterVerification(id),
        onSuccess: () => {
            toast.success('Twitter verification approved');
            queryClient.invalidateQueries({ queryKey: ['admin-twitter-verifications'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to approve');
        },
    });

    // Reject mutation
    const rejectMutation = useMutation({
        mutationFn: ({ id, reason }: { id: string; reason: string }) =>
            api.rejectTwitterVerification(id, reason),
        onSuccess: () => {
            toast.success('Twitter verification rejected');
            setRejectingId(null);
            setRejectReason('');
            queryClient.invalidateQueries({ queryKey: ['admin-twitter-verifications'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to reject');
        },
    });

    const handleReject = (id: string) => {
        if (!rejectReason.trim()) {
            toast.error('Please provide a reason for rejection');
            return;
        }
        rejectMutation.mutate({ id, reason: rejectReason });
    };

    const openTwitterProfile = (handle: string) => {
        window.open(`https://x.com/${handle}`, '_blank');
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary dark:text-white">
                        Twitter Verifications
                    </h1>
                    <p className="text-text-muted dark:text-gray-400">
                        Review and verify user Twitter accounts for the referral program
                    </p>
                </div>
                <button
                    onClick={() => refetch()}
                    className="flex items-center gap-2 px-4 py-2 bg-background-secondary dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg text-text-primary dark:text-white hover:bg-border-light dark:hover:bg-gray-700 transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Status Filter */}
            <div className="flex gap-2">
                {(['pending', 'approved', 'rejected'] as VerificationStatus[]).map((status) => (
                    <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={clsx(
                            'px-4 py-2 rounded-lg font-medium capitalize transition-colors',
                            statusFilter === status
                                ? 'bg-brand-600 text-white'
                                : 'bg-background-secondary dark:bg-gray-800 text-text-primary dark:text-white hover:bg-border-light dark:hover:bg-gray-700'
                        )}
                    >
                        {status}
                    </button>
                ))}
            </div>

            {/* Verifications List */}
            <div className="bg-background-card dark:bg-gray-900 rounded-2xl border border-border dark:border-gray-800 overflow-hidden">
                {isLoading ? (
                    <div className="p-12 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-brand-600 mx-auto" />
                    </div>
                ) : verifications.length === 0 ? (
                    <div className="p-12 text-center">
                        <Clock className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-50" />
                        <p className="text-text-muted dark:text-gray-400">
                            No {statusFilter} verifications
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-border dark:divide-gray-800">
                        {verifications.map((v) => (
                            <div key={v.id} className="p-4 sm:p-6">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    {/* User Info */}
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-400 to-positive-400 flex items-center justify-center text-white font-bold">
                                            {v.twitterHandle[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => openTwitterProfile(v.twitterHandle)}
                                                    className="font-semibold text-text-primary dark:text-white hover:text-brand-600 flex items-center gap-1"
                                                >
                                                    @{v.twitterHandle}
                                                    <ExternalLink className="w-3 h-3" />
                                                </button>
                                            </div>
                                            <p className="text-sm text-text-muted dark:text-gray-400">
                                                {v.user?.displayName || v.user?.walletAddress?.slice(0, 8) + '...' || 'Unknown User'}
                                            </p>
                                            <p className="text-xs text-text-muted dark:text-gray-500 mt-1">
                                                Submitted: {format(new Date(v.createdAt), 'MMM d, yyyy h:mm a')}
                                            </p>
                                            {v.adminNote && (
                                                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                                                    Note: {v.adminNote}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    {v.status === 'pending' && (
                                        <div className="flex items-center gap-2">
                                            {rejectingId === v.id ? (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={rejectReason}
                                                        onChange={(e) => setRejectReason(e.target.value)}
                                                        placeholder="Rejection reason"
                                                        className="px-3 py-2 bg-background-secondary dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg text-sm text-text-primary dark:text-white w-48"
                                                    />
                                                    <button
                                                        onClick={() => handleReject(v.id)}
                                                        disabled={rejectMutation.isPending}
                                                        className="px-3 py-2 bg-negative-600 hover:bg-negative-700 text-white rounded-lg text-sm font-medium"
                                                    >
                                                        Confirm
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setRejectingId(null);
                                                            setRejectReason('');
                                                        }}
                                                        className="px-3 py-2 bg-background-secondary dark:bg-gray-800 text-text-primary dark:text-white rounded-lg text-sm"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => approveMutation.mutate(v.id)}
                                                        disabled={approveMutation.isPending}
                                                        className="flex items-center gap-1 px-4 py-2 bg-positive-600 hover:bg-positive-700 text-white rounded-lg font-medium transition-colors"
                                                    >
                                                        {approveMutation.isPending ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <Check className="w-4 h-4" />
                                                        )}
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => setRejectingId(v.id)}
                                                        className="flex items-center gap-1 px-4 py-2 bg-negative-600 hover:bg-negative-700 text-white rounded-lg font-medium transition-colors"
                                                    >
                                                        <X className="w-4 h-4" />
                                                        Reject
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {v.status === 'approved' && (
                                        <span className="flex items-center gap-1 px-3 py-1.5 bg-positive-100 dark:bg-positive-900/30 text-positive-700 dark:text-positive-400 rounded-lg text-sm font-medium">
                                            <Check className="w-4 h-4" />
                                            Approved
                                        </span>
                                    )}

                                    {v.status === 'rejected' && (
                                        <span className="flex items-center gap-1 px-3 py-1.5 bg-negative-100 dark:bg-negative-900/30 text-negative-700 dark:text-negative-400 rounded-lg text-sm font-medium">
                                            <X className="w-4 h-4" />
                                            Rejected
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Instructions */}
            <div className="bg-brand-50 dark:bg-brand-900/20 rounded-xl p-4 border border-brand-200 dark:border-brand-800">
                <h3 className="font-semibold text-brand-700 dark:text-brand-300 mb-2">
                    Verification Instructions
                </h3>
                <ul className="text-sm text-brand-600 dark:text-brand-400 space-y-1">
                    <li>1. Click on the Twitter handle to open their profile</li>
                    <li>2. Verify they follow @BetPot on Twitter/X</li>
                    <li>3. Approve if they follow, reject with reason if they don't</li>
                    <li>4. Points will be awarded when both Discord and Twitter are verified</li>
                </ul>
            </div>
        </div>
    );
}
